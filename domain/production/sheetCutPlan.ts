import { MAX_SHEET_NESTING_LAYOUT_PIECES } from "./sheetNestingLayout.ts";
import {
  validateSheetNestingInput,
  type SheetNestingBatchResult,
  type SheetNestingRotation
} from "./sheetNestingInput.ts";

export interface SheetCutPlanSourcePart {
  id: string;
  materialId: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  quantity: number;
  grainDirection: SheetNestingBatchResult["parts"][number]["grainDirection"];
  geometry: "rectangular";
}
export interface SheetCutPlanPlacement {
  sourcePartId: string;
  pieceNumber: number;
  sheetIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  lengthMm: number;
  rotationDeg: SheetNestingRotation;
}
export interface SheetCutPlanSheet {
  index: number;
  pieceCount: number;
  placements: SheetCutPlanPlacement[];
}
export interface SheetCutPlanResult {
  schemaVersion: 1;
  strategy: "deterministic-shelf-v1";
  stockSheet: SheetNestingBatchResult["sheet"];
  kerfMm: number;
  sourceParts: SheetCutPlanSourcePart[];
  sheets: SheetCutPlanSheet[];
  totalPieceCount: number;
}
export type SheetCutPlanReport =
  | { schemaVersion: 1; status: "ready" | "empty"; result: SheetCutPlanResult; diagnostics: [] }
  | { schemaVersion: 1; status: "blocked"; result: null; diagnostics: string[] };

type Rec = Record<string, unknown>;
type Part = SheetNestingBatchResult["parts"][number];

function record(value: unknown, label: string): Rec {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value as Rec;
}
function closed(value: Rec, allowed: readonly string[], label: string): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== undefined) throw new Error(label + " için desteklenmeyen alan: " + extra + ".");
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}
function mm(value: unknown, label: string, zero: boolean): number {
  if (typeof value !== "number" || !Number.isFinite(value) || (zero ? value < 0 : value <= 0)) {
    throw new Error(label + (zero
      ? " sıfır veya pozitif ve sonlu bir mm değeri olmalıdır."
      : " sıfırdan büyük ve sonlu bir mm değeri olmalıdır."));
  }
  const scaled = value * 10;
  if (!Number.isSafeInteger(scaled)) throw new Error(label + " güvenli 0.1 mm hassasiyet aralığını aşıyor.");
  const normalized = Math.round(scaled + Number.EPSILON * 10) / 10;
  if (normalized !== value) throw new Error(label + " 0.1 mm hassasiyetinde normalize edilmiş olmalıdır.");
  return normalized === 0 ? 0 : value;
}
function addMm(a: number, b: number, label: string): number {
  const value = a + b;
  const scaled = value * 10;
  if (!Number.isSafeInteger(scaled)) {
    throw new Error(label + " güvenli 0.1 mm koordinat aralığını aşıyor.");
  }
  return Math.round(scaled + Number.EPSILON * 10) / 10;
}
function fail(error: unknown): SheetCutPlanReport {
  return {
    schemaVersion: 1,
    status: "blocked",
    result: null,
    diagnostics: [error instanceof Error ? error.message : String(error)]
  };
}

type ExpandedPlacement = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  topIndex: number;
  bottomIndex: number;
};

function safeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(label + " güvenli 0.1 mm koordinat aralığını aşıyor.");
  }
  return value;
}

function mmTicks(value: number, label: string): number {
  return safeInteger(value * 10, label);
}

function safeAddInteger(a: number, b: number, label: string): number {
  return safeInteger(a + b, label);
}

function safeSubtractInteger(a: number, b: number, label: string): number {
  return safeInteger(a - b, label);
}

function safeDoubleInteger(value: number, label: string): number {
  return safeInteger(value * 2, label);
}

/** Range-add / range-maximum tree over compressed Y intervals. */
class IntervalCoverageTree {
  private readonly segmentCount: number;
  private readonly maximum: Int32Array;
  private readonly lazy: Int32Array;

  constructor(segmentCount: number) {
    this.segmentCount = segmentCount;
    const capacity = Math.max(4, segmentCount * 4 + 4);
    this.maximum = new Int32Array(capacity);
    this.lazy = new Int32Array(capacity);
  }

  add(start: number, end: number, delta: number): void {
    this.update(1, 0, this.segmentCount - 1, start, end, delta);
  }

  max(start: number, end: number): number {
    return this.query(1, 0, this.segmentCount - 1, start, end);
  }

  private update(
    node: number,
    left: number,
    right: number,
    queryLeft: number,
    queryRight: number,
    delta: number
  ): void {
    if (queryLeft <= left && right <= queryRight) {
      this.maximum[node] = (this.maximum[node] ?? 0) + delta;
      this.lazy[node] = (this.lazy[node] ?? 0) + delta;
      return;
    }

    const middle = Math.floor((left + right) / 2);
    if (queryLeft <= middle) {
      this.update(node * 2, left, middle, queryLeft, queryRight, delta);
    }
    if (queryRight > middle) {
      this.update(node * 2 + 1, middle + 1, right, queryLeft, queryRight, delta);
    }
    this.maximum[node] = (this.lazy[node] ?? 0) +
      Math.max(this.maximum[node * 2] ?? 0, this.maximum[node * 2 + 1] ?? 0);
  }

  private query(
    node: number,
    left: number,
    right: number,
    queryLeft: number,
    queryRight: number
  ): number {
    if (queryLeft <= left && right <= queryRight) {
      return this.maximum[node] ?? 0;
    }

    const middle = Math.floor((left + right) / 2);
    let result = Number.NEGATIVE_INFINITY;
    if (queryLeft <= middle) {
      result = Math.max(
        result,
        this.query(node * 2, left, middle, queryLeft, queryRight)
      );
    }
    if (queryRight > middle) {
      result = Math.max(
        result,
        this.query(node * 2 + 1, middle + 1, right, queryLeft, queryRight)
      );
    }
    return (this.lazy[node] ?? 0) + result;
  }
}

/**
 * Detects any pair whose expanded rectangles overlap with positive area.
 * Expanding each rectangle by kerf / 2 on all sides makes this equivalent to
 * requiring at least kerf clearance in one axis for every pair. A sweep line
 * plus a compressed-Y range-max tree keeps the check O(n log n), not O(n²).
 */
function assertKerfSeparated(
  placements: readonly SheetCutPlanPlacement[],
  kerfMm: number,
  sheetIndex: number
): void {
  if (placements.length < 2) return;

  const kerfTicks = mmTicks(kerfMm, "Kerf");
  const expanded = placements.map((item) => {
    const x = mmTicks(item.xMm, "Placement X");
    const y = mmTicks(item.yMm, "Placement Y");
    const width = mmTicks(item.widthMm, "Placement genişliği");
    const length = mmTicks(item.lengthMm, "Placement uzunluğu");
    const right = safeAddInteger(x, width, "Placement sağ sınırı");
    const bottom = safeAddInteger(y, length, "Placement alt sınırı");

    return {
      left: safeSubtractInteger(safeDoubleInteger(x, "Placement X"), kerfTicks, "Genişletilmiş sol sınır"),
      right: safeAddInteger(safeDoubleInteger(right, "Placement sağ sınırı"), kerfTicks, "Genişletilmiş sağ sınır"),
      top: safeSubtractInteger(safeDoubleInteger(y, "Placement Y"), kerfTicks, "Genişletilmiş üst sınır"),
      bottom: safeAddInteger(safeDoubleInteger(bottom, "Placement alt sınırı"), kerfTicks, "Genişletilmiş alt sınır"),
      topIndex: -1,
      bottomIndex: -1
    };
  });

  const yCoordinates = Array.from(
    new Set(expanded.flatMap((item) => [item.top, item.bottom]))
  ).sort((a, b) => a - b);
  const yIndices = new Map<number, number>(
    yCoordinates.map((coordinate, index) => [coordinate, index])
  );

  const intervals: ExpandedPlacement[] = expanded.map((item) => {
    const topIndex = yIndices.get(item.top);
    const bottomIndex = yIndices.get(item.bottom);
    if (topIndex === undefined || bottomIndex === undefined || bottomIndex <= topIndex) {
      throw new Error("Yerleşim kerf denetimi için Y aralığı geçersiz.");
    }
    return { ...item, topIndex, bottomIndex: bottomIndex - 1 };
  });

  const byStart = [...intervals].sort((a, b) =>
    a.left - b.left || a.right - b.right || a.top - b.top || a.bottom - b.bottom
  );
  const byEnd = [...intervals].sort((a, b) =>
    a.right - b.right || a.left - b.left || a.top - b.top || a.bottom - b.bottom
  );
  const coverage = new IntervalCoverageTree(yCoordinates.length - 1);
  let nextEnd = 0;

  for (const current of byStart) {
    while (nextEnd < byEnd.length && byEnd[nextEnd]!.right <= current.left) {
      const expired = byEnd[nextEnd]!;
      coverage.add(expired.topIndex, expired.bottomIndex, -1);
      nextEnd += 1;
    }

    if (coverage.max(current.topIndex, current.bottomIndex) > 0) {
      throw new Error(
        "Levha " + sheetIndex +
        " üzerindeki placement'lar çakışıyor veya gereken kerf aralığını korumuyor."
      );
    }
    coverage.add(current.topIndex, current.bottomIndex, 1);
  }
}
function normalizeBatch(value: unknown): SheetNestingBatchResult {
  const input = record(value, "Levha nesting batch sonucu");
  closed(input, ["schemaVersion", "sheet", "kerfMm", "parts", "totalPieceCount"], "Levha nesting batch sonucu");
  if (input.schemaVersion !== 1) throw new Error("Desteklenmeyen levha nesting batch şema sürümü.");
  if (!Array.isArray(input.parts)) throw new Error("Levha nesting batch parçaları bir liste olmalıdır.");
  const parts = input.parts.map((raw, index) => {
    const part = record(raw, "Levha nesting batch parçasının " + (index + 1) + ". kaydı");
    closed(part, [
      "id", "materialId", "widthMm", "lengthMm", "thicknessMm",
      "quantity", "grainDirection", "geometry", "allowedRotationsDeg"
    ], "Levha nesting batch parçası");
    return {
      id: part.id, materialId: part.materialId, widthMm: part.widthMm,
      lengthMm: part.lengthMm, thicknessMm: part.thicknessMm,
      quantity: part.quantity, grainDirection: part.grainDirection, geometry: part.geometry
    };
  });
  const validated = validateSheetNestingInput({
    schemaVersion: 1, sheet: input.sheet, kerfMm: input.kerfMm, parts
  });
  if (validated.status === "blocked" || validated.result === null) {
    throw new Error(validated.diagnostics.join(" "));
  }
  if (
    typeof input.totalPieceCount !== "number" ||
    !Number.isSafeInteger(input.totalPieceCount) ||
    input.totalPieceCount !== validated.result.totalPieceCount
  ) throw new Error("Levha nesting batch toplam parça adedi içerikle eşleşmiyor.");
  if (validated.result.totalPieceCount > MAX_SHEET_NESTING_LAYOUT_PIECES) {
    throw new Error("Kesim planı tek seferde en fazla " + MAX_SHEET_NESTING_LAYOUT_PIECES + " fiziksel parçayı destekler.");
  }
  return validated.result;
}

/** Creates a machine-independent plan; it does not emit cut order, saw paths or CNC instructions. */
export function createSheetCutPlan(value: unknown): SheetCutPlanReport {
  try {
    const request = record(value, "Makine bağımsız kesim planı isteği");
    closed(request, ["schemaVersion", "batch", "layout"], "Makine bağımsız kesim planı isteği");
    if (request.schemaVersion !== 1) throw new Error("Desteklenmeyen makine bağımsız kesim planı şema sürümü.");
    const batch = normalizeBatch(request.batch);

    const report = record(request.layout, "Levha yerleşim raporu");
    closed(report, ["schemaVersion", "status", "result", "diagnostics"], "Levha yerleşim raporu");
    if (report.schemaVersion !== 1) throw new Error("Desteklenmeyen levha yerleşim raporu şema sürümü.");
    if (report.status === "blocked") {
      if (report.result !== null || !Array.isArray(report.diagnostics)) {
        throw new Error("Blocked yerleşim raporu geçerli tanı ve null sonuç taşımalıdır.");
      }
      const diagnostics = report.diagnostics.filter(
        (item): item is string => typeof item === "string" && item.trim() !== ""
      );
      if (diagnostics.length !== report.diagnostics.length || diagnostics.length === 0) {
        throw new Error("Blocked yerleşim raporu boş olmayan metin tanıları taşımalıdır.");
      }
      throw new Error(diagnostics.join(" "));
    }
    if (report.status !== "ready" && report.status !== "empty") {
      throw new Error("Yerleşim raporu ready, empty veya blocked durumunda olmalıdır.");
    }
    if (!Array.isArray(report.diagnostics) || report.diagnostics.length !== 0) {
      throw new Error("Ready/empty yerleşim raporu tanı içermemelidir.");
    }

    const layout = record(report.result, "Levha yerleşim sonucu");
    closed(layout, ["schemaVersion", "strategy", "sheet", "kerfMm", "sheets", "totalPieceCount"], "Levha yerleşim sonucu");
    if (layout.schemaVersion !== 1 || layout.strategy !== "deterministic-shelf-v1") {
      throw new Error("Desteklenmeyen levha yerleşim sonucu sürümü veya stratejisi.");
    }
    const stock = record(layout.sheet, "Yerleşim levhası");
    closed(stock, ["materialId", "widthMm", "lengthMm", "thicknessMm", "grainDirection"], "Yerleşim levhası");
    for (const key of ["materialId", "widthMm", "lengthMm", "thicknessMm", "grainDirection"] as const) {
      if (stock[key] !== batch.sheet[key]) {
        throw new Error("Yerleşim levhası " + key + " alanı doğrulanmış batch ile eşleşmiyor.");
      }
    }
    const kerfMm = mm(layout.kerfMm, "Yerleşim kerf değeri", true);
    if (kerfMm !== batch.kerfMm) throw new Error("Yerleşim kerf değeri doğrulanmış batch ile eşleşmiyor.");
    if (
      typeof layout.totalPieceCount !== "number" ||
      !Number.isSafeInteger(layout.totalPieceCount) ||
      layout.totalPieceCount !== batch.totalPieceCount
    ) throw new Error("Yerleşim toplam parça adedi doğrulanmış batch ile eşleşmiyor.");
    if (!Array.isArray(layout.sheets)) throw new Error("Yerleşim levhaları bir liste olmalıdır.");
    if (
      (batch.totalPieceCount === 0 && (report.status !== "empty" || layout.sheets.length !== 0)) ||
      (batch.totalPieceCount > 0 && (report.status !== "ready" || layout.sheets.length === 0))
    ) throw new Error("Yerleşim empty/ready durumu batch parça adediyle eşleşmiyor.");

    const partsById = new Map<string, Part>();
    for (const part of batch.parts) partsById.set(part.id, part);
    const seen = new Set<string>();
    let placementCount = 0;
    const sheets: SheetCutPlanSheet[] = layout.sheets.map((rawSheet, offset) => {
      const sheet = record(rawSheet, "Yerleşim levhası kaydı");
      closed(sheet, ["index", "placements", "pieceCount"], "Yerleşim levhası kaydı");
      const index = offset + 1;
      if (sheet.index !== index) throw new Error("Yerleşim levha indeksleri 1'den başlayan kesintisiz sırada olmalıdır.");
      if (!Array.isArray(sheet.placements) || sheet.placements.length === 0) {
        throw new Error("Yerleşim levhası boş olmayan placement listesi taşımalıdır.");
      }
      if (
        typeof sheet.pieceCount !== "number" ||
        !Number.isSafeInteger(sheet.pieceCount) ||
        sheet.pieceCount !== sheet.placements.length
      ) throw new Error("Yerleşim levhası parça adedi placement sayısıyla eşleşmiyor.");

      const placements: SheetCutPlanPlacement[] = sheet.placements.map((rawPlacement, placementOffset) => {
        const item = record(rawPlacement, "Yerleşim placement kaydının " + (placementOffset + 1) + ". öğesi");
        closed(item, [
          "sourcePartId", "pieceNumber", "xMm", "yMm", "widthMm", "lengthMm", "rotationDeg"
        ], "Yerleşim placement kaydı");
        const sourcePartId = identifier(item.sourcePartId, "Placement kaynak parça kimliği");
        const part = partsById.get(sourcePartId);
        if (!part) throw new Error("Placement projede bulunmayan kaynak Part ID içeriyor: " + sourcePartId + ".");
        if (
          typeof item.pieceNumber !== "number" ||
          !Number.isSafeInteger(item.pieceNumber) ||
          item.pieceNumber <= 0 ||
          item.pieceNumber > part.quantity
        ) throw new Error(sourcePartId + " placement parça numarası kaynak quantity sınırını aşıyor.");
        const pieceKey = JSON.stringify([sourcePartId, item.pieceNumber]);
        if (seen.has(pieceKey)) throw new Error(sourcePartId + " kaynak parçasının aynı fiziksel parça numarası birden fazla yerleştirilmiş.");
        seen.add(pieceKey);

        if (item.rotationDeg !== 0 && item.rotationDeg !== 90) {
          throw new Error(sourcePartId + " placement dönüşü yalnızca 0 veya 90 derece olabilir.");
        }
        const rotationDeg = item.rotationDeg as SheetNestingRotation;
        if (!part.allowedRotationsDeg.includes(rotationDeg)) {
          throw new Error(sourcePartId + " placement dönüşü damar yönü kısıtıyla uyumlu değil.");
        }
        const xMm = mm(item.xMm, sourcePartId + " X koordinatı", true);
        const yMm = mm(item.yMm, sourcePartId + " Y koordinatı", true);
        const widthMm = mm(item.widthMm, sourcePartId + " yerleşim genişliği", false);
        const lengthMm = mm(item.lengthMm, sourcePartId + " yerleşim uzunluğu", false);
        const expectedWidth = rotationDeg === 0 ? part.widthMm : part.lengthMm;
        const expectedLength = rotationDeg === 0 ? part.lengthMm : part.widthMm;
        if (widthMm !== expectedWidth || lengthMm !== expectedLength) {
          throw new Error(sourcePartId + " placement ölçüleri kaynak Part ve dönüş ile eşleşmiyor.");
        }
        if (
          addMm(xMm, widthMm, sourcePartId + " sağ sınırı") > batch.sheet.widthMm ||
          addMm(yMm, lengthMm, sourcePartId + " alt sınırı") > batch.sheet.lengthMm
        ) throw new Error(sourcePartId + " placement kullanıcı levhası sınırlarının dışına taşıyor.");

        placementCount += 1;
        return { sourcePartId, pieceNumber: item.pieceNumber, sheetIndex: index, xMm, yMm, widthMm, lengthMm, rotationDeg };
      });
      assertKerfSeparated(placements, kerfMm, index);
      return { index, pieceCount: placements.length, placements };
    });

    if (placementCount !== batch.totalPieceCount) {
      throw new Error("Kesim planı placement toplamı kaynak batch quantity toplamıyla eşleşmiyor.");
    }
    for (const part of batch.parts) {
      for (let pieceNumber = 1; pieceNumber <= part.quantity; pieceNumber += 1) {
        if (!seen.has(JSON.stringify([part.id, pieceNumber]))) {
          throw new Error(part.id + " kaynak parçasının " + pieceNumber + ". fiziksel adedi yerleşimde eksik.");
        }
      }
    }

    const result: SheetCutPlanResult = {
      schemaVersion: 1,
      strategy: "deterministic-shelf-v1",
      stockSheet: { ...batch.sheet },
      kerfMm: batch.kerfMm,
      sourceParts: batch.parts.map((part) => ({
        id: part.id, materialId: part.materialId, widthMm: part.widthMm,
        lengthMm: part.lengthMm, thicknessMm: part.thicknessMm,
        quantity: part.quantity, grainDirection: part.grainDirection, geometry: part.geometry
      })),
      sheets,
      totalPieceCount: placementCount
    };
    return {
      schemaVersion: 1,
      status: batch.totalPieceCount === 0 ? "empty" : "ready",
      result,
      diagnostics: []
    };
  } catch (error) {
    return fail(error);
  }
}

export type SheetCutPlanJsonReport =
  | { schemaVersion: 1; status: "ready" | "empty"; json: string; diagnostics: [] }
  | { schemaVersion: 1; status: "blocked"; json: null; diagnostics: string[] };

function validateSheetCutPlanResult(value: unknown): SheetCutPlanReport {
  const plan = record(value, "Kesim planı JSON içeriği");
  closed(
    plan,
    ["schemaVersion", "strategy", "stockSheet", "kerfMm", "sourceParts", "sheets", "totalPieceCount"],
    "Kesim planı JSON içeriği"
  );
  if (plan.schemaVersion !== 1 || plan.strategy !== "deterministic-shelf-v1") {
    throw new Error("Desteklenmeyen kesim planı şema sürümü veya yerleşim stratejisi.");
  }
  if (!Array.isArray(plan.sourceParts)) {
    throw new Error("Kesim planı kaynak parçaları bir liste olmalıdır.");
  }

  const parts = plan.sourceParts.map((rawPart, offset) => {
    const part = record(rawPart, "Kesim planı kaynak parçasının " + (offset + 1) + ". kaydı");
    closed(
      part,
      ["id", "materialId", "widthMm", "lengthMm", "thicknessMm", "quantity", "grainDirection", "geometry"],
      "Kesim planı kaynak parçası"
    );
    return {
      id: part.id,
      materialId: part.materialId,
      widthMm: part.widthMm,
      lengthMm: part.lengthMm,
      thicknessMm: part.thicknessMm,
      quantity: part.quantity,
      grainDirection: part.grainDirection,
      geometry: part.geometry
    };
  });

  if (!Array.isArray(plan.sheets)) {
    throw new Error("Kesim planı levhaları bir liste olmalıdır.");
  }
  const sheets = plan.sheets.map((rawSheet, offset) => {
    const sheet = record(rawSheet, "Kesim planı levhasının " + (offset + 1) + ". kaydı");
    closed(sheet, ["index", "pieceCount", "placements"], "Kesim planı levhası");
    if (!Array.isArray(sheet.placements)) {
      throw new Error("Kesim planı placement kayıtları bir liste olmalıdır.");
    }
    const placements = sheet.placements.map((rawPlacement, placementOffset) => {
      const item = record(
        rawPlacement,
        "Kesim planı placement kaydının " + (placementOffset + 1) + ". öğesi"
      );
      closed(
        item,
        ["sourcePartId", "pieceNumber", "sheetIndex", "xMm", "yMm", "widthMm", "lengthMm", "rotationDeg"],
        "Kesim planı placement kaydı"
      );
      if (item.sheetIndex !== sheet.index) {
        throw new Error("Kesim planı placement sheetIndex değeri levha indeksiyle eşleşmiyor.");
      }
      return {
        sourcePartId: item.sourcePartId,
        pieceNumber: item.pieceNumber,
        xMm: item.xMm,
        yMm: item.yMm,
        widthMm: item.widthMm,
        lengthMm: item.lengthMm,
        rotationDeg: item.rotationDeg
      };
    });
    return { index: sheet.index, pieceCount: sheet.pieceCount, placements };
  });

  const totalPieceCount = plan.totalPieceCount;
  const empty = totalPieceCount === 0;
  return createSheetCutPlan({
    schemaVersion: 1,
    batch: {
      schemaVersion: 1,
      sheet: plan.stockSheet,
      kerfMm: plan.kerfMm,
      parts,
      totalPieceCount
    },
    layout: {
      schemaVersion: 1,
      status: empty ? "empty" : "ready",
      diagnostics: [],
      result: {
        schemaVersion: 1,
        strategy: plan.strategy,
        sheet: plan.stockSheet,
        kerfMm: plan.kerfMm,
        sheets,
        totalPieceCount
      }
    }
  });
}

/** Parses and fully revalidates the versioned machine-independent cut-plan JSON envelope. */
export function parseSheetCutPlanJson(value: unknown): SheetCutPlanReport {
  try {
    if (typeof value !== "string") {
      throw new Error("Kesim planı JSON içeriği metin olmalıdır.");
    }
    const envelope = record(JSON.parse(value) as unknown, "Kesim planı JSON zarfı");
    closed(envelope, ["format", "formatVersion", "plan"], "Kesim planı JSON zarfı");
    if (envelope.format !== "MobilyaCADSheetCutPlan" || envelope.formatVersion !== 1) {
      throw new Error("Desteklenmeyen kesim planı JSON formatı veya sürümü.");
    }
    return validateSheetCutPlanResult(envelope.plan);
  } catch (error) {
    return fail(error);
  }
}

/** Serializes only a ready/empty plan after a full geometry check and parser round-trip. */
export function serializeSheetCutPlanJson(value: unknown): SheetCutPlanJsonReport {
  try {
    const report = record(value, "Kesim planı raporu");
    closed(report, ["schemaVersion", "status", "result", "diagnostics"], "Kesim planı raporu");
    if (report.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen kesim planı rapor şema sürümü.");
    }
    if (report.status === "blocked") {
      if (report.result !== null || !Array.isArray(report.diagnostics)) {
        throw new Error("Blocked kesim planı raporu null sonuç ve tanı listesi taşımalıdır.");
      }
      const diagnostics = report.diagnostics.filter(
        (item): item is string => typeof item === "string" && item.trim() !== ""
      );
      if (diagnostics.length !== report.diagnostics.length || diagnostics.length === 0) {
        throw new Error("Blocked kesim planı raporu boş olmayan metin tanıları taşımalıdır.");
      }
      return { schemaVersion: 1, status: "blocked", json: null, diagnostics };
    }
    if (report.status !== "ready" && report.status !== "empty") {
      throw new Error("Kesim planı raporu ready, empty veya blocked durumunda olmalıdır.");
    }
    if (!Array.isArray(report.diagnostics) || report.diagnostics.length !== 0) {
      throw new Error("Ready/empty kesim planı raporu tanı içermemelidir.");
    }

    const validated = validateSheetCutPlanResult(report.result);
    if (validated.status !== report.status || validated.result === null) {
      throw new Error("Kesim planı rapor durumu içerikle eşleşmiyor.");
    }
    const json = JSON.stringify({
      format: "MobilyaCADSheetCutPlan",
      formatVersion: 1,
      plan: validated.result
    });
    const roundTrip = parseSheetCutPlanJson(json);
    if (
      roundTrip.status === "blocked" ||
      roundTrip.result === null ||
      JSON.stringify(roundTrip.result) !== JSON.stringify(validated.result)
    ) {
      throw new Error("Kesim planı JSON round-trip doğrulaması başarısız.");
    }
    return { schemaVersion: 1, status: validated.status, json, diagnostics: [] };
  } catch (error) {
    return {
      schemaVersion: 1,
      status: "blocked",
      json: null,
      diagnostics: [error instanceof Error ? error.message : String(error)]
    };
  }
}

