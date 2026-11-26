import type { BodyPanelMaterialCatalogEntry } from "./bodyPanelMaterials.ts";
import type { EdgeBandingEdges } from "./cabinetConstruction.ts";

export type PanelGrainDirection = "length" | "width" | "none";

export interface PanelConstructionFurniture {
  id: string;
  name: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  quantity: number;
  material: string;
  materialId?: string;
}

export interface PanelConstructionProfile {
  edgeBanding: EdgeBandingEdges;
  grainDirection: PanelGrainDirection;
}

export interface PanelConstructionRequest {
  schemaVersion: 1;
  family: "panel";
  furniture: PanelConstructionFurniture;
  profile: PanelConstructionProfile;
  materials: readonly BodyPanelMaterialCatalogEntry[];
}

export interface PanelConstructionPart {
  id: string;
  furnitureId: string;
  group: "panel";
  name: string;
  width: number;
  length: number;
  thickness: number;
  quantity: number;
  material: string;
  materialId?: string;
  edgeBanding: EdgeBandingEdges;
  grainDirection: PanelGrainDirection;
}

export interface PanelConstructionResult {
  schemaVersion: 1;
  family: "panel";
  overallDimensionsMm: {
    width: number;
    length: number;
    thickness: number;
  };
  parts: PanelConstructionPart[];
}

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
const GRAIN_DIRECTIONS = ["length", "width", "none"] as const;
const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): RecordValue {
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  return value;
}

function requireOnlyKeys(value: RecordValue, allowed: readonly string[], label: string): void {
  const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) throw new Error(label + " için desteklenmeyen alan: " + unknownKey + ".");
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function requireMaterialId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() !== value || !MATERIAL_ID_PATTERN.test(value)) {
    throw new Error(label + " geçerli bir katalog malzeme kimliği olmalıdır.");
  }
  return value;
}

function requirePositiveMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }
  const scaled = value * 10;
  if (!Number.isFinite(scaled)) throw new Error(label + " 0.1 mm normalizasyon aralığını aşıyor.");
  const rounded = Math.round(scaled + Number.EPSILON * 10) / 10;
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error(label + " 0.1 mm hassasiyetinde pozitif kalmalıdır.");
  }
  return rounded;
}

function requireQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Özel panel adedi pozitif güvenli bir tam sayı olmalıdır.");
  }
  return value;
}

function validateEdgeBanding(value: unknown): EdgeBandingEdges {
  const source = requireRecord(value, "Özel panel kenar bantlama ayarları");
  requireOnlyKeys(source, EDGE_KEYS, "Özel panel kenar bantlama ayarları");
  const result = {} as EdgeBandingEdges;
  for (const edge of EDGE_KEYS) {
    if (typeof source[edge] !== "boolean") {
      throw new Error("Özel panel " + edge + " kenar bantlama değeri boolean olmalıdır.");
    }
    result[edge] = source[edge] as boolean;
  }
  return result;
}

function normalizeMaterials(value: unknown): BodyPanelMaterialCatalogEntry[] {
  if (!Array.isArray(value)) throw new Error("Özel panel malzeme kataloğu bir liste olmalıdır.");
  const seenIds = new Set<string>();
  return value.map((rawEntry, index) => {
    const entry = requireRecord(rawEntry, "Özel panel malzeme kataloğunun " + (index + 1) + ". kaydı");
    requireOnlyKeys(entry, ["id", "name", "category", "thicknessesMm", "unit"], "Özel panel malzeme kataloğu kaydı");
    const id = requireMaterialId(entry.id, "Özel panel katalog kimliği");
    if (seenIds.has(id)) throw new Error("Yinelenen özel panel malzeme kimliği: " + id + ".");
    seenIds.add(id);
    if (typeof entry.name !== "string" || entry.name.trim() === "") {
      throw new Error(id + " panel malzemesinin adı boş olamaz.");
    }
    if (entry.category !== "panel" || entry.unit !== "mm") {
      throw new Error(id + " yalnızca mm birimli panel malzemesi olabilir.");
    }
    if (!Array.isArray(entry.thicknessesMm) || entry.thicknessesMm.length === 0) {
      throw new Error(id + " için en az bir panel kalınlığı tanımlanmalıdır.");
    }
    const seenThicknesses = new Set<number>();
    const thicknessesMm = entry.thicknessesMm.map((thickness) => {
      const normalized = requirePositiveMm(thickness, id + " panel kalınlığı");
      if (seenThicknesses.has(normalized)) throw new Error(id + " için yinelenen panel kalınlığı bulundu.");
      seenThicknesses.add(normalized);
      return normalized;
    });
    return { id, name: entry.name.trim(), category: "panel", thicknessesMm, unit: "mm" };
  });
}

/** Validates one custom, rectangular panel without inferring joinery or placement. */
export function validatePanelConstructionRequest(value: unknown): PanelConstructionRequest {
  const root = requireRecord(value, "Özel panel konstrüksiyon isteği");
  requireOnlyKeys(root, ["schemaVersion", "family", "furniture", "profile", "materials"], "Özel panel konstrüksiyon isteği");
  if (root.schemaVersion !== 1) throw new Error("Desteklenmeyen özel panel konstrüksiyon şema sürümü.");
  if (root.family !== "panel") throw new Error("Özel panel konstrüksiyon ailesi açıkça panel olmalıdır.");

  const furniture = requireRecord(root.furniture, "Özel panel ölçüleri");
  requireOnlyKeys(
    furniture,
    ["id", "name", "widthMm", "lengthMm", "thicknessMm", "quantity", "material", "materialId"],
    "Özel panel ölçüleri"
  );
  const profile = requireRecord(root.profile, "Özel panel profili");
  requireOnlyKeys(profile, ["edgeBanding", "grainDirection"], "Özel panel profili");
  const materialId = furniture.materialId === undefined
    ? undefined
    : requireMaterialId(furniture.materialId, "Özel panel malzeme kimliği");
  const normalizedFurniture: PanelConstructionFurniture = {
    id: requireText(furniture.id, "Özel panel kimliği"),
    name: requireText(furniture.name, "Özel panel adı"),
    widthMm: requirePositiveMm(furniture.widthMm, "Özel panel genişliği"),
    lengthMm: requirePositiveMm(furniture.lengthMm, "Özel panel uzunluğu"),
    thicknessMm: requirePositiveMm(furniture.thicknessMm, "Özel panel kalınlığı"),
    quantity: requireQuantity(furniture.quantity),
    material: requireText(furniture.material, "Özel panel malzeme adı"),
    ...(materialId === undefined ? {} : { materialId })
  };
  if (!(GRAIN_DIRECTIONS as readonly unknown[]).includes(profile.grainDirection)) {
    throw new Error("Özel panel damar yönü length, width veya none olmalıdır.");
  }
  return {
    schemaVersion: 1,
    family: "panel",
    furniture: normalizedFurniture,
    profile: {
      edgeBanding: validateEdgeBanding(profile.edgeBanding),
      grainDirection: profile.grainDirection as PanelGrainDirection
    },
    materials: normalizeMaterials(root.materials)
  };
}

function resolveMaterial(
  furniture: PanelConstructionFurniture,
  materials: readonly BodyPanelMaterialCatalogEntry[]
): { material: string; materialId?: string } {
  if (furniture.materialId === undefined) return { material: furniture.material };
  const selected = materials.find((entry) => entry.id === furniture.materialId);
  if (!selected) throw new Error(furniture.materialId + " özel panel malzeme kimliği katalogda bulunamadı.");
  if (!selected.thicknessesMm.includes(furniture.thicknessMm)) {
    throw new Error(selected.name + " için " + furniture.thicknessMm + " mm kalınlık katalogda tanımlı değil.");
  }
  return { material: selected.name, materialId: selected.id };
}

/** Produces one quantity-weighted Part row for an explicitly dimensioned custom panel. */
export function calculatePanelConstruction(value: unknown): PanelConstructionResult {
  const request = validatePanelConstructionRequest(value);
  const { furniture, profile } = request;
  const material = resolveMaterial(furniture, request.materials);
  const part: PanelConstructionPart = {
    id: furniture.id + "-panel",
    furnitureId: furniture.id,
    group: "panel",
    name: furniture.name,
    width: furniture.widthMm,
    length: furniture.lengthMm,
    thickness: furniture.thicknessMm,
    quantity: furniture.quantity,
    material: material.material,
    ...(material.materialId === undefined ? {} : { materialId: material.materialId }),
    edgeBanding: { ...profile.edgeBanding },
    grainDirection: profile.grainDirection
  };
  return {
    schemaVersion: 1,
    family: "panel",
    overallDimensionsMm: { width: furniture.widthMm, length: furniture.lengthMm, thickness: furniture.thicknessMm },
    parts: [part]
  };
}
