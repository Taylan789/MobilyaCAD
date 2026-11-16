import type { CabinetProjectProductionResult } from "./projectProduction.ts";

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
  edgeBanding: Record<EdgeKey, boolean>;
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

  return {
    id,
    furnitureId,
    width,
    length,
    thickness,
    quantity: part.quantity as number,
    material: (part.material as string).trim(),
    ...(materialId === undefined ? {} : { materialId: materialId as string }),
    edgeBanding: validateEdgeBanding(part.edgeBanding, name + " kenar bantlama")
  };
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

    const widthEdgeCount = Number(part.edgeBanding.top) + Number(part.edgeBanding.bottom);
    const lengthEdgeCount = Number(part.edgeBanding.left) + Number(part.edgeBanding.right);
    const areaContribution = part.width * part.length * part.quantity;
    const volumeContribution = areaContribution * part.thickness;
    const widthBandingContribution = part.width * widthEdgeCount * part.quantity;
    const lengthBandingContribution = part.length * lengthEdgeCount * part.quantity;
    const edgeCountContribution = (widthEdgeCount + lengthEdgeCount) * part.quantity;

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
