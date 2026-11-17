import type { CabinetProjectProductionResult } from "./projectProduction.ts";
import { calculatePanelCutoutGeometry } from "./panelCutoutGeometry.ts";

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
type EdgeKey = (typeof EDGE_KEYS)[number];
const materialIdPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface ProjectEdgeBandingSummaryMm {
  /** Banded top/bottom edges, which run along part width. */
  widthEdgesLengthMm: number;
  /** Banded left/right edges, which run along part length. */
  lengthEdgesLengthMm: number;
  totalLengthMm: number;
  /** Individual banded edges, including each part's quantity. */
  edgeCount: number;
}

export interface ProjectMaterialConsumptionSummary {
  /** Trimmed material label; catalogue identity and thickness remain separate. */
  material: string;
  /** Stable catalogue identity; omitted for legacy/free-text material rows. */
  materialId?: string;
  /** Part thickness in millimetres. */
  thicknessMm: number;
  /** Number of distinct production Part rows in this group. */
  partLineCount: number;
  /** Sum of each Part row's quantity. */
  totalQuantity: number;
  /** Net panel face area in square metres; excludes waste and board yield. */
  panelAreaM2: number;
  /** Net panel volume in cubic metres; excludes machining allowance. */
  volumeM3: number;
  /** Explicit edge-banding demand; no roll or waste allowance is inferred. */
  edgeBanding: ProjectEdgeBandingSummaryMm;
}

export interface ProjectEdgeBandingConsumptionSummary {
  edgeBandingId: string | null;
  unit: "mm" | "m";
  partLineCount: number;
  totalQuantity: number;
  totalLengthMm: number;
  edgeCount: number;
  partIds: string[];
  furnitureIds: string[];
}

interface EdgeBandingAccumulator {
  edgeBandingId: string | null;
  unit: "mm" | "m";
  partLineCount: number;
  totalLengthMm: number;
  edgeCount: number;
  partIds: Set<string>;
  furnitureIds: Set<string>;
}

interface MaterialAccumulator {
  material: string;
  materialId?: string;
  thicknessMm: number;
  partLineCount: number;
  totalQuantity: number;
  panelAreaMm2: number;
  volumeMm3: number;
  widthEdgesLengthMm: number;
  lengthEdgesLengthMm: number;
  edgeCount: number;
}

interface ValidatedPart {
  id: string;
  furnitureId: string;
  width: number;
  length: number;
  thickness: number;
  quantity: number;
  material: string;
  materialId?: string;
  edgeBandingMaterialId?: string;
  edgeBandingUnit?: "mm" | "m";
  edgeBanding: Record<EdgeKey, boolean>;
  panelAreaMm2: number;
  volumeMm3: number;
  widthEdgesLengthMm: number;
  lengthEdgesLengthMm: number;
  edgeCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value;
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

function requirePositiveMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }
  return value;
}

function validateEdgeBanding(value: unknown, label: string): Record<EdgeKey, boolean> {
  const source = requireRecord(value, label);
  for (const key of Object.keys(source)) {
    if (!(EDGE_KEYS as readonly string[]).includes(key)) {
      throw new Error(label + " için desteklenmeyen kenar: " + key + ".");
    }
  }

  const result = {} as Record<EdgeKey, boolean>;
  for (const edge of EDGE_KEYS) {
    if (typeof source[edge] !== "boolean") {
      throw new Error(label + " " + edge + " kenarı boolean olmalıdır.");
    }
    result[edge] = source[edge] as boolean;
  }
  return result;
}

function validatePart(value: unknown, index: number): ValidatedPart {
  const part = requireRecord(value, "Proje üretim listesinin " + (index + 1) + ". parçası");
  const id = requireIdentifier(part.id, "Üretim parçası kimliği");
  const furnitureId = requireIdentifier(part.furnitureId, id + " mobilya kimliği");
  const name = requireIdentifier(part.name, id + " parça adı");
  const width = requirePositiveMm(part.width, name + " genişliği");
  const length = requirePositiveMm(part.length, name + " uzunluğu");
  const thickness = requirePositiveMm(part.thickness, name + " kalınlığı");

  if (!Number.isSafeInteger(part.quantity) || (part.quantity as number) < 1) {
    throw new Error(name + " adet değeri pozitif güvenli tam sayı olmalıdır.");
  }
  if (typeof part.material !== "string" || part.material.trim() === "") {
    throw new Error(name + " için malzeme adı belirtilmelidir.");
  }

  const materialId = part.materialId;
  if (
    materialId !== undefined &&
    (typeof materialId !== "string" ||
      materialId.trim() !== materialId ||
      !materialIdPattern.test(materialId))
  ) {
    throw new Error(name + " malzeme kimliği geçersiz.");
  }

  const edgeBanding = validateEdgeBanding(part.edgeBanding, name + " kenar bantlama");
  const outerWidthEdgeCount = Number(edgeBanding.top) + Number(edgeBanding.bottom);
  const outerLengthEdgeCount = Number(edgeBanding.left) + Number(edgeBanding.right);
  let panelAreaMm2 = width * length;
  let volumeMm3 = panelAreaMm2 * thickness;
  let widthEdgesLengthMm = width * outerWidthEdgeCount;
  let lengthEdgesLengthMm = length * outerLengthEdgeCount;
  let edgeCount = outerWidthEdgeCount + outerLengthEdgeCount;

  if (part.panelGeometry !== undefined) {
    const rawGeometry = requireRecord(part.panelGeometry, name + " panel kesit geometrisi");
    if (rawGeometry.schemaVersion !== 1) throw new Error(name + " panel kesit geometrisi şema sürümü desteklenmiyor.");
    const geometryOuterEdges = validateEdgeBanding(rawGeometry.outerEdgeBanding, name + " panel kesit dış kenar bantlama");
    for (const edge of EDGE_KEYS) {
      if (geometryOuterEdges[edge] !== edgeBanding[edge]) {
        throw new Error(name + " panel kesit dış kenar bantlaması üretim parçasıyla eşleşmelidir.");
      }
    }
    const geometry = calculatePanelCutoutGeometry({
      schemaVersion: rawGeometry.schemaVersion,
      widthMm: rawGeometry.widthMm,
      lengthMm: rawGeometry.lengthMm,
      thicknessMm: rawGeometry.thicknessMm,
      outerEdgeBanding: geometryOuterEdges,
      cutouts: rawGeometry.cutouts
    });
    if (
      geometry.widthMm !== normalizePanelMm(width, name + " genişliği") ||
      geometry.lengthMm !== normalizePanelMm(length, name + " uzunluğu") ||
      geometry.thicknessMm !== normalizePanelMm(thickness, name + " kalınlığı")
    ) throw new Error(name + " panel kesit geometrisi ölçüleri üretim parçasıyla eşleşmelidir.");
    panelAreaMm2 = geometry.netFaceAreaMm2;
    volumeMm3 = geometry.netVolumeMm3;
    for (const opening of geometry.cutouts) {
      const openingWidthEdgeCount = Number(opening.edgeBanding.top) + Number(opening.edgeBanding.bottom);
      const openingLengthEdgeCount = Number(opening.edgeBanding.left) + Number(opening.edgeBanding.right);
      widthEdgesLengthMm += opening.widthMm * openingWidthEdgeCount;
      lengthEdgesLengthMm += opening.lengthMm * openingLengthEdgeCount;
      edgeCount += openingWidthEdgeCount + openingLengthEdgeCount;
    }
  }

  const edgeBandingMaterialId = part.edgeBandingMaterialId;
  const edgeBandingUnit = part.edgeBandingUnit;
  if ((edgeBandingMaterialId === undefined) !== (edgeBandingUnit === undefined)) {
    throw new Error(name + " kenar bandı katalog kimliği ve birimi birlikte verilmelidir.");
  }
  if (
    edgeBandingMaterialId !== undefined &&
    (typeof edgeBandingMaterialId !== "string" ||
      edgeBandingMaterialId.trim() !== edgeBandingMaterialId ||
      !materialIdPattern.test(edgeBandingMaterialId))
  ) {
    throw new Error(name + " kenar bandı katalog kimliği geçersiz.");
  }
  if (edgeBandingUnit !== undefined && edgeBandingUnit !== "mm" && edgeBandingUnit !== "m") {
    throw new Error(name + " kenar bandı birimi yalnızca mm veya m olabilir.");
  }
  if (edgeBandingMaterialId !== undefined && edgeCount === 0) {
    throw new Error(name + " bantlanmış kenarı olmadığı halde kenar bandı katalog kimliği taşıyor.");
  }

  return {
    id,
    furnitureId,
    width,
    length,
    thickness,
    quantity: part.quantity as number,
    material: (part.material as string).trim(),
    ...(materialId === undefined ? {} : { materialId: materialId as string }),
    ...(edgeBandingMaterialId === undefined ? {} : { edgeBandingMaterialId }),
    ...(edgeBandingUnit === undefined ? {} : { edgeBandingUnit }),
    edgeBanding,
    panelAreaMm2,
    volumeMm3,
    widthEdgesLengthMm,
    lengthEdgesLengthMm,
    edgeCount
  };
}

function normalizePanelMm(value: number, label: string): number {
  const scaled = value * 10;
  if (!Number.isFinite(scaled)) throw new Error(label + " 0.1 mm normalizasyon aralığını aşıyor.");
  return Math.round(scaled + Number.EPSILON * 10) / 10;
}

function roundTo(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  const scaled = value * factor;
  if (!Number.isFinite(scaled)) {
    throw new Error("Proje malzeme tüketimi yuvarlama aralığını aşıyor.");
  }
  return Math.round(scaled + Number.EPSILON * factor) / factor;
}

/**
 * Calculates quantity-weighted net material use from the exact Part rows
 * returned by calculateCabinetProjectProduction.
 *
 * Groups are keyed by catalogue ID (when present), material label and panel
 * thickness. Legacy rows without an ID are grouped by label and thickness.
 * All dimensions are millimetres. No waste, sheet yield, kerf, band thickness,
 * roll allowance, hardware, machining or CNC operation is inferred.
 */
export function calculateProjectMaterialConsumptionSummary(
  value: CabinetProjectProductionResult
): ProjectMaterialConsumptionSummary[] {
  const project = requireRecord(value, "Proje üretim sonucu");
  if (project.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen proje üretim sonucu şema sürümü.");
  }
  if (!Array.isArray(project.furniture)) {
    throw new Error("Proje mobilya sonuçları bir liste olmalıdır.");
  }
  if (!Array.isArray(project.parts)) {
    throw new Error("Proje üretim parçaları bir liste olmalıdır.");
  }

  const furnitureIds = new Set<string>();
  for (const [index, entry] of project.furniture.entries()) {
    const furniture = requireRecord(entry, "Projenin " + (index + 1) + ". mobilya sonucu");
    const furnitureId = requireIdentifier(furniture.furnitureId, "Proje mobilya kimliği");
    if (furnitureIds.has(furnitureId)) {
      throw new Error("Proje üretim sonucunda yinelenen mobilya kimliği: " + furnitureId + ".");
    }
    furnitureIds.add(furnitureId);
  }

  const groups = new Map<string, MaterialAccumulator>();
  const seenPartIds = new Set<string>();

  for (const [index, rawPart] of project.parts.entries()) {
    const part = validatePart(rawPart, index);
    if (!furnitureIds.has(part.furnitureId)) {
      throw new Error(part.id + " parçasının mobilya kimliği proje sonuçlarında bulunamadı.");
    }
    if (seenPartIds.has(part.id)) {
      throw new Error("Proje üretim sonucunda yinelenen parça kimliği: " + part.id + ".");
    }
    seenPartIds.add(part.id);

    const key = JSON.stringify([part.materialId ?? null, part.material, part.thickness]);
    let group = groups.get(key);
    if (!group) {
      group = {
        material: part.material,
        ...(part.materialId === undefined ? {} : { materialId: part.materialId }),
        thicknessMm: part.thickness,
        partLineCount: 0,
        totalQuantity: 0,
        panelAreaMm2: 0,
        volumeMm3: 0,
        widthEdgesLengthMm: 0,
        lengthEdgesLengthMm: 0,
        edgeCount: 0
      };
      groups.set(key, group);
    }

    const areaContribution = part.panelAreaMm2 * part.quantity;
    const volumeContribution = part.volumeMm3 * part.quantity;
    const widthBandingContribution = part.widthEdgesLengthMm * part.quantity;
    const lengthBandingContribution = part.lengthEdgesLengthMm * part.quantity;
    const edgeCountContribution = part.edgeCount * part.quantity;

    group.partLineCount += 1;
    group.totalQuantity += part.quantity;
    group.panelAreaMm2 += areaContribution;
    group.volumeMm3 += volumeContribution;
    group.widthEdgesLengthMm += widthBandingContribution;
    group.lengthEdgesLengthMm += lengthBandingContribution;
    group.edgeCount += edgeCountContribution;

    if (
      !Number.isSafeInteger(group.partLineCount) ||
      !Number.isSafeInteger(group.totalQuantity) ||
      !Number.isFinite(group.panelAreaMm2) ||
      !Number.isFinite(group.volumeMm3) ||
      !Number.isFinite(group.widthEdgesLengthMm) ||
      !Number.isFinite(group.lengthEdgesLengthMm) ||
      !Number.isSafeInteger(group.edgeCount)
    ) {
      throw new Error("Proje malzeme tüketimi toplamı güvenli aralıkta hesaplanamadı.");
    }
  }

  return [...groups.values()]
    .sort((first, second) =>
      first.material.localeCompare(second.material, "tr") ||
      (first.materialId ?? "").localeCompare(second.materialId ?? "") ||
      first.thicknessMm - second.thicknessMm
    )
    .map((group) => {
      const totalBandingLengthMm = group.widthEdgesLengthMm + group.lengthEdgesLengthMm;
      if (!Number.isFinite(totalBandingLengthMm)) {
        throw new Error("Proje kenar bantlama toplamı güvenli aralıkta hesaplanamadı.");
      }

      return {
        material: group.material,
        ...(group.materialId === undefined ? {} : { materialId: group.materialId }),
        thicknessMm: group.thicknessMm,
        partLineCount: group.partLineCount,
        totalQuantity: group.totalQuantity,
        panelAreaM2: roundTo(group.panelAreaMm2 / 1_000_000, 6),
        volumeM3: roundTo(group.volumeMm3 / 1_000_000_000, 9),
        edgeBanding: {
          widthEdgesLengthMm: roundTo(group.widthEdgesLengthMm, 1),
          lengthEdgesLengthMm: roundTo(group.lengthEdgesLengthMm, 1),
          totalLengthMm: roundTo(totalBandingLengthMm, 1),
          edgeCount: group.edgeCount
        }
      };
    });
}


/**
 * Groups measured edge-band demand by the explicitly assigned catalogue ID and
 * unit. Unassigned legacy banded Parts remain visible as a null-ID mm row so
 * pricing cannot silently treat them as covered.
 *
 * Geometry is measured in mm. A Part explicitly assigned unit "m" receives the
 * exact mm-to-m conversion; no roll, waste, thickness or price is inferred.
 */
export function calculateProjectEdgeBandingConsumptionSummary(
  value: CabinetProjectProductionResult
): ProjectEdgeBandingConsumptionSummary[] {
  const project = requireRecord(value, "Proje üretim sonucu");
  if (project.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen proje üretim sonucu şema sürümü.");
  }
  if (!Array.isArray(project.furniture)) {
    throw new Error("Proje mobilya sonuçları bir liste olmalıdır.");
  }
  if (!Array.isArray(project.parts)) {
    throw new Error("Proje üretim parçaları bir liste olmalıdır.");
  }

  const furnitureIds = new Set<string>();
  for (const [index, entry] of project.furniture.entries()) {
    const furniture = requireRecord(entry, "Projenin " + (index + 1) + ". mobilya sonucu");
    const furnitureId = requireIdentifier(furniture.furnitureId, "Proje mobilya kimliği");
    if (furnitureIds.has(furnitureId)) {
      throw new Error("Proje üretim sonucunda yinelenen mobilya kimliği: " + furnitureId + ".");
    }
    furnitureIds.add(furnitureId);
  }

  const groups = new Map<string, EdgeBandingAccumulator>();
  const seenPartIds = new Set<string>();
  for (const [index, rawPart] of project.parts.entries()) {
    const part = validatePart(rawPart, index);
    if (!furnitureIds.has(part.furnitureId)) {
      throw new Error(part.id + " parçasının mobilya kimliği proje sonuçlarında bulunamadı.");
    }
    if (seenPartIds.has(part.id)) {
      throw new Error("Proje üretim sonucunda yinelenen parça kimliği: " + part.id + ".");
    }
    seenPartIds.add(part.id);
    if (part.edgeCount === 0) continue;

    const edgeBandingId = part.edgeBandingMaterialId ?? null;
    const unit = part.edgeBandingUnit ?? "mm";
    const key = JSON.stringify([edgeBandingId, unit]);
    let group = groups.get(key);
    if (!group) {
      group = {
        edgeBandingId,
        unit,
        partLineCount: 0,
        totalLengthMm: 0,
        edgeCount: 0,
        partIds: new Set<string>(),
        furnitureIds: new Set<string>()
      };
      groups.set(key, group);
    }

    const lengthContribution = (part.widthEdgesLengthMm + part.lengthEdgesLengthMm) * part.quantity;
    const edgeCountContribution = part.edgeCount * part.quantity;
    group.partLineCount += 1;
    group.totalLengthMm += lengthContribution;
    group.edgeCount += edgeCountContribution;
    group.partIds.add(part.id);
    group.furnitureIds.add(part.furnitureId);

    if (
      !Number.isSafeInteger(group.partLineCount) ||
      !Number.isFinite(group.totalLengthMm) ||
      !Number.isSafeInteger(group.edgeCount)
    ) {
      throw new Error("Proje kenar bandı tüketimi toplamı güvenli aralıkta hesaplanamadı.");
    }
  }

  return [...groups.values()]
    .sort((first, second) =>
      (first.edgeBandingId ?? "").localeCompare(second.edgeBandingId ?? "") ||
      first.unit.localeCompare(second.unit)
    )
    .map((group) => ({
      edgeBandingId: group.edgeBandingId,
      unit: group.unit,
      partLineCount: group.partLineCount,
      totalQuantity: group.unit === "mm"
        ? roundTo(group.totalLengthMm, 1)
        : roundTo(group.totalLengthMm / 1000, 4),
      totalLengthMm: roundTo(group.totalLengthMm, 1),
      edgeCount: group.edgeCount,
      partIds: [...group.partIds].sort((first, second) => first.localeCompare(second)),
      furnitureIds: [...group.furnitureIds].sort((first, second) => first.localeCompare(second))
    }));
}

/** Quantity-only summary for explicit hardware BOM rows; no price or unit conversion is inferred. */
export interface ProjectHardwareConsumptionSummary {
  hardwareId: string;
  name: string;
  unit: string;
  /** Number of source BOM rows grouped into this hardware identity and unit. */
  lineCount: number;
  /** Exact decimal sum of source quantities, expressed in the original unit. */
  totalQuantity: number;
  furnitureCount: number;
  furnitureIds: string[];
  /** Unique user-supplied references; omitted when no row provides one. */
  sourceReferences?: string[];
}

interface HardwareAccumulator {
  hardwareId: string;
  name: string;
  unit: string;
  lineCount: number;
  quantities: number[];
  furnitureIds: Set<string>;
  sourceReferences: Set<string>;
}

function decimalParts(value: number): { coefficient: bigint; scale: number } {
  const [mantissa, exponentText] = value.toString().toLowerCase().split("e");
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const [integerPart, fractionalPart = ""] = mantissa.split(".");
  let coefficient = BigInt(integerPart + fractionalPart);
  let scale = fractionalPart.length - exponent;
  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { coefficient, scale };
}

function sumHardwareQuantities(values: readonly number[]): number {
  const parts = values.map(decimalParts);
  const scale = Math.max(0, ...parts.map((part) => part.scale));
  const total = parts.reduce(
    (sum, part) => sum + part.coefficient * 10n ** BigInt(scale - part.scale),
    0n
  );
  const result = Number(total.toString() + "e-" + scale);
  if (!Number.isFinite(result) || result <= 0 || result > Number.MAX_SAFE_INTEGER) {
    throw new Error("Donanım miktar toplamı güvenli sayısal aralıkta hesaplanamadı.");
  }

  // Do not silently lose a fractional quantity when converting the exact decimal sum
  // back to the public JavaScript number representation.
  const converted = decimalParts(result);
  const commonScale = Math.max(scale, converted.scale);
  const expected = total * 10n ** BigInt(commonScale - scale);
  const actual = converted.coefficient * 10n ** BigInt(commonScale - converted.scale);
  if (expected !== actual) {
    throw new Error("Donanım miktar toplamı güvenli sayısal aralıkta tam temsil edilemiyor.");
  }
  return result;
}

/**
 * Aggregates explicit hardware BOM rows by hardware identity and their original
 * unit. Decimal quantities are summed without unit conversion; furniture and
 * source references remain traceable. No prices, stock, mounting or CNC data
 * are inferred.
 */
export function calculateProjectHardwareConsumptionSummary(
  value: CabinetProjectProductionResult
): ProjectHardwareConsumptionSummary[] {
  const project = requireRecord(value, "Proje üretim sonucu");
  if (project.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen proje üretim sonucu şema sürümü.");
  }
  if (!Array.isArray(project.furniture)) {
    throw new Error("Proje mobilya sonuçları bir liste olmalıdır.");
  }
  if (!Array.isArray(project.parts)) {
    throw new Error("Proje üretim parçaları bir liste olmalıdır.");
  }

  const furnitureIds = new Set<string>();
  for (const [index, entry] of project.furniture.entries()) {
    const furniture = requireRecord(entry, "Projenin " + (index + 1) + ". mobilya sonucu");
    const furnitureId = requireIdentifier(furniture.furnitureId, "Proje mobilya kimliği");
    if (furnitureIds.has(furnitureId)) {
      throw new Error("Proje üretim sonucunda yinelenen mobilya kimliği: " + furnitureId + ".");
    }
    furnitureIds.add(furnitureId);
  }

  if (project.hardwareItems === undefined) return [];
  if (!Array.isArray(project.hardwareItems)) {
    throw new Error("Proje donanım kalemleri bir liste olmalıdır.");
  }

  const groups = new Map<string, HardwareAccumulator>();
  const seenHardwareItemIds = new Set<string>();
  for (const [index, rawItem] of project.hardwareItems.entries()) {
    const item = requireRecord(rawItem, "Projenin " + (index + 1) + ". donanım kalemi");
    const allowedKeys = ["id", "furnitureId", "hardwareId", "name", "quantity", "unit", "sourceReference"];
    const unknownKey = Object.keys(item).find((key) => !allowedKeys.includes(key));
    if (unknownKey !== undefined) {
      throw new Error("Donanım kaleminde desteklenmeyen alan: " + unknownKey + ".");
    }

    const id = requireIdentifier(item.id, "Donanım kalemi kimliği");
    const furnitureId = requireIdentifier(item.furnitureId, id + " mobilya kimliği");
    const hardwareId = requireIdentifier(item.hardwareId, id + " donanım kimliği");
    const name = requireIdentifier(item.name, id + " donanım adı");
    const unit = requireIdentifier(item.unit, id + " donanım birimi");
    const quantity = item.quantity;
    if (typeof quantity !== "number" || !Number.isFinite(quantity) ||
        quantity <= 0 || quantity > Number.MAX_SAFE_INTEGER) {
      throw new Error(id + " donanım miktarı pozitif, sonlu ve güvenli sayısal aralıkta olmalıdır.");
    }
    const sourceReference = item.sourceReference === undefined
      ? undefined
      : requireIdentifier(item.sourceReference, id + " kaynak referansı");

    if (!furnitureIds.has(furnitureId)) {
      throw new Error(id + " donanım kaleminin mobilya kimliği proje sonuçlarında bulunamadı.");
    }
    if (seenHardwareItemIds.has(id)) {
      throw new Error("Proje üretim sonucunda yinelenen donanım kalemi kimliği: " + id + ".");
    }
    seenHardwareItemIds.add(id);

    const key = JSON.stringify([hardwareId, unit]);
    let group = groups.get(key);
    if (!group) {
      group = {
        hardwareId,
        name,
        unit,
        lineCount: 0,
        quantities: [],
        furnitureIds: new Set<string>(),
        sourceReferences: new Set<string>()
      };
      groups.set(key, group);
    } else if (group.name !== name) {
      throw new Error(hardwareId + " donanım kimliği ve " + unit + " birimi için ad tutarlı olmalıdır.");
    }

    group.lineCount += 1;
    group.quantities.push(quantity);
    group.furnitureIds.add(furnitureId);
    if (sourceReference !== undefined) group.sourceReferences.add(sourceReference);
    if (!Number.isSafeInteger(group.lineCount)) {
      throw new Error("Donanım BOM satır sayısı güvenli sayısal aralıkta hesaplanamadı.");
    }
  }

  return [...groups.values()]
    .sort((first, second) =>
      first.hardwareId.localeCompare(second.hardwareId, "tr") ||
      first.unit.localeCompare(second.unit, "tr")
    )
    .map((group) => {
      const totalQuantity = sumHardwareQuantities(group.quantities);
      const sourceReferences = [...group.sourceReferences].sort((a, b) => a.localeCompare(b, "tr"));
      return {
        hardwareId: group.hardwareId,
        name: group.name,
        unit: group.unit,
        lineCount: group.lineCount,
        totalQuantity,
        furnitureCount: group.furnitureIds.size,
        furnitureIds: [...group.furnitureIds].sort((a, b) => a.localeCompare(b, "tr")),
        ...(sourceReferences.length === 0 ? {} : { sourceReferences })
      };
    });
}
