export const SHEET_GRAIN_DIRECTIONS = ["length", "width", "none"] as const;

export type SheetGrainDirection = (typeof SHEET_GRAIN_DIRECTIONS)[number];
export type SheetNestingRotation = 0 | 90;

export interface SheetNestingSheet {
  materialId: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  grainDirection: SheetGrainDirection;
}

export interface SheetNestingPart {
  id: string;
  materialId: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  quantity: number;
  grainDirection: SheetGrainDirection;
  /** Only explicit rectangular geometry is accepted by this first-stage input contract. */
  geometry: "rectangular";
}

export interface SheetNestingNormalizedPart extends SheetNestingPart {
  allowedRotationsDeg: readonly SheetNestingRotation[];
}

export interface SheetNestingBatchResult {
  schemaVersion: 1;
  sheet: SheetNestingSheet;
  kerfMm: number;
  parts: SheetNestingNormalizedPart[];
  /** Sum of quantities without expanding rows into individual physical pieces. */
  totalPieceCount: number;
}

export type SheetNestingInputReport =
  | {
      schemaVersion: 1;
      status: "ready" | "empty";
      result: SheetNestingBatchResult;
      diagnostics: [];
    }
  | {
      schemaVersion: 1;
      status: "blocked";
      result: null;
      diagnostics: string[];
    };

const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const ALLOWED_ROTATIONS: readonly SheetNestingRotation[] = [0, 90];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string
): void {
  const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) {
    throw new Error(label + " için desteklenmeyen alan: " + unknownKey + ".");
  }
}

function requireIdentifier(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim() !== value
  ) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function requireMaterialId(value: unknown, label: string): string {
  if (typeof value !== "string" || !MATERIAL_ID_PATTERN.test(value)) {
    throw new Error(label + " geçerli bir katalog malzeme kimliği olmalıdır.");
  }
  return value;
}

function normalizeMm(value: unknown, label: string, allowZero: boolean): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new Error(label + (allowZero
      ? " sıfır veya pozitif ve sonlu bir mm değeri olmalıdır."
      : " sıfırdan büyük ve sonlu bir mm değeri olmalıdır."));
  }

  const scaled = value * 10;
  if (!Number.isFinite(scaled)) {
    throw new Error(label + " 0.1 mm normalizasyon aralığını aşıyor.");
  }

  const normalized = Math.round(scaled + Number.EPSILON * 10) / 10;
  if (!Number.isFinite(normalized) || (!allowZero && normalized <= 0)) {
    throw new Error(label + " 0.1 mm normalizasyonundan sonra geçerli kalmalıdır.");
  }
  return normalized === 0 ? 0 : normalized;
}

function readGrainDirection(value: unknown, label: string): SheetGrainDirection {
  if (
    value !== "length" &&
    value !== "width" &&
    value !== "none"
  ) {
    throw new Error(label + " length, width veya none olmalıdır.");
  }
  return value;
}

function grainCompatibleRotations(
  sheetDirection: SheetGrainDirection,
  partDirection: SheetGrainDirection
): SheetNestingRotation[] {
  if (sheetDirection === "none" || partDirection === "none") {
    return [...ALLOWED_ROTATIONS];
  }
  return sheetDirection === partDirection ? [0] : [90];
}

function fitsSheetEnvelope(
  widthMm: number,
  lengthMm: number,
  sheet: SheetNestingSheet,
  rotation: SheetNestingRotation
): boolean {
  return rotation === 0
    ? widthMm <= sheet.widthMm && lengthMm <= sheet.lengthMm
    : lengthMm <= sheet.widthMm && widthMm <= sheet.lengthMm;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Validates one user-defined stock-sheet batch before any nesting algorithm runs.
 * It checks material/thickness identity, mm dimensions, quantity, grain-compatible
 * 0/90-degree orientations and rectangular sheet-envelope fit. It does not place
 * parts, consume kerf, calculate yield or produce CNC/machine instructions.
 */
export function validateSheetNestingInput(value: unknown): SheetNestingInputReport {
  try {
    const request = requireRecord(value, "Levha yerleşim girdisi");
    rejectUnknownKeys(
      request,
      ["schemaVersion", "sheet", "kerfMm", "parts"],
      "Levha yerleşim girdisi"
    );

    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen levha yerleşim girdisi şema sürümü.");
    }

    const rawSheet = requireRecord(request.sheet, "Levha");
    rejectUnknownKeys(
      rawSheet,
      ["materialId", "widthMm", "lengthMm", "thicknessMm", "grainDirection"],
      "Levha"
    );

    const sheet: SheetNestingSheet = {
      materialId: requireMaterialId(rawSheet.materialId, "Levha malzeme kimliği"),
      widthMm: normalizeMm(rawSheet.widthMm, "Levha genişliği", false),
      lengthMm: normalizeMm(rawSheet.lengthMm, "Levha uzunluğu", false),
      thicknessMm: normalizeMm(rawSheet.thicknessMm, "Levha kalınlığı", false),
      grainDirection: readGrainDirection(rawSheet.grainDirection, "Levha damar yönü")
    };
    const kerfMm = normalizeMm(request.kerfMm, "Testere kesim payı (kerf)", true);

    if (!Array.isArray(request.parts)) {
      throw new Error("Levha yerleşim parçaları bir liste olmalıdır.");
    }

    const seenIds = new Set<string>();
    let totalPieceCount = 0;

    const parts: SheetNestingNormalizedPart[] = request.parts.map((rawPart, index) => {
      const label = "Levha yerleşim parçasının " + (index + 1) + ". kaydı";
      const part = requireRecord(rawPart, label);
      rejectUnknownKeys(
        part,
        [
          "id", "materialId", "widthMm", "lengthMm", "thicknessMm",
          "quantity", "grainDirection", "geometry"
        ],
        "Levha yerleşim parçası"
      );

      const id = requireIdentifier(part.id, "Levha yerleşim parçası kimliği");
      if (seenIds.has(id)) {
        throw new Error("Yinelenen levha yerleşim parçası kimliği: " + id + ".");
      }
      seenIds.add(id);

      if (part.geometry !== "rectangular") {
        throw new Error(id + " parçasının geometrisi desteklenmiyor; yalnızca rectangular kabul edilir.");
      }

      const materialId = requireMaterialId(part.materialId, id + " malzeme kimliği");
      if (materialId !== sheet.materialId) {
        throw new Error(id + " parçasının malzeme kimliği levha malzemesiyle eşleşmiyor.");
      }

      const widthMm = normalizeMm(part.widthMm, id + " genişliği", false);
      const lengthMm = normalizeMm(part.lengthMm, id + " uzunluğu", false);
      const thicknessMm = normalizeMm(part.thicknessMm, id + " kalınlığı", false);
      if (thicknessMm !== sheet.thicknessMm) {
        throw new Error(id + " parçasının kalınlığı levha kalınlığıyla eşleşmiyor.");
      }

      if (
        typeof part.quantity !== "number" ||
        !Number.isSafeInteger(part.quantity) ||
        part.quantity <= 0
      ) {
        throw new Error(id + " parça adedi pozitif güvenli bir tam sayı olmalıdır.");
      }
      totalPieceCount += part.quantity;
      if (!Number.isSafeInteger(totalPieceCount)) {
        throw new Error("Toplam parça adedi güvenli tam sayı aralığını aşıyor.");
      }

      const grainDirection = readGrainDirection(part.grainDirection, id + " damar yönü");
      const grainRotations = grainCompatibleRotations(sheet.grainDirection, grainDirection);
      const allowedRotationsDeg = grainRotations.filter((rotation) =>
        fitsSheetEnvelope(widthMm, lengthMm, sheet, rotation)
      );

      if (allowedRotationsDeg.length === 0) {
        throw new Error(id + " parçası damar yönünü koruyan 0/90 derece yönlerde levha sınırlarına sığmıyor.");
      }

      return {
        id,
        materialId,
        widthMm,
        lengthMm,
        thicknessMm,
        quantity: part.quantity,
        grainDirection,
        geometry: "rectangular",
        allowedRotationsDeg
      };
    });

    const result: SheetNestingBatchResult = {
      schemaVersion: 1,
      sheet,
      kerfMm,
      parts,
      totalPieceCount
    };

    return {
      schemaVersion: 1,
      status: parts.length === 0 ? "empty" : "ready",
      result,
      diagnostics: []
    };
  } catch (error) {
    return {
      schemaVersion: 1,
      status: "blocked",
      result: null,
      diagnostics: [errorMessage(error)]
    };
  }
}
