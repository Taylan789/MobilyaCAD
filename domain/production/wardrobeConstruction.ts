import {
  calculateCabinetConstruction,
  validateCabinetConstructionRequest
} from "./cabinetConstruction.ts";
import type {
  CabinetConstructionPart,
  CabinetConstructionProfile,
  CabinetConstructionFurniture,
  CabinetConstructionResult,
  EdgeBandingEdges
} from "./cabinetConstruction.ts";
import type { BodyPanelMaterialCatalogEntry } from "./bodyPanelMaterials.ts";

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
const ROOT_KEYS = ["schemaVersion", "family", "furniture", "profile", "materials", "panelMaterialOverrides", "verticalDividers"] as const;
const PROFILE_KEYS = ["panelThicknessMm", "panelThicknessMmByGroup", "carcassStyle", "backPanel", "shelfCount", "doors", "edgeBandingByGroup"] as const;
const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const DIVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export type WardrobeGrainDirection = "width" | "length" | "none";

export interface WardrobeVerticalDividerSpec {
  id: string;
  /** Left face offset from the inside face of the left side panel, in mm. */
  offsetFromInnerLeftMm: number;
  thicknessMm: number;
  materialId: string;
  edgeBanding: EdgeBandingEdges;
  grainDirection: WardrobeGrainDirection;
}

export interface WardrobeConstructionRequest {
  schemaVersion: 1;
  family: "wardrobe";
  furniture: CabinetConstructionFurniture;
  profile: CabinetConstructionProfile;
  materials: readonly BodyPanelMaterialCatalogEntry[];
  panelMaterialOverrides?: unknown;
  /** Required explicitly; [] means that no internal divider is used. */
  verticalDividers: readonly WardrobeVerticalDividerSpec[];
}

export interface WardrobeDividerPart extends CabinetConstructionPart {
  offsetFromInnerLeftMm: number;
  grainDirection: WardrobeGrainDirection;
}

export type WardrobeConstructionPart = CabinetConstructionPart | WardrobeDividerPart;

export interface WardrobeConstructionResult {
  family: "wardrobe";
  innerDimensionsMm: CabinetConstructionResult["innerDimensionsMm"];
  parts: WardrobeConstructionPart[];
}

interface ResolvedWardrobeInput {
  request: WardrobeConstructionRequest;
  baseResult: CabinetConstructionResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  return value;
}

function requireIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
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

function requireNonNegativeMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(label + " sıfır veya pozitif ve sonlu bir mm değeri olmalıdır.");
  }
  return value;
}

function toTenthsMm(value: number, label: string): number {
  const scaled = value * 10;
  const rounded = Math.round(scaled);
  if (!Number.isFinite(scaled) || !Number.isSafeInteger(rounded)) {
    throw new Error(label + " güvenli 0.1 mm aralığında olmalıdır.");
  }
  return rounded;
}

function validateEdgeBanding(value: unknown): EdgeBandingEdges {
  const source = requireRecord(value, "Dikey bölücü kenar bantlama ayarları");
  for (const key of Object.keys(source)) {
    if (!(EDGE_KEYS as readonly string[]).includes(key)) {
      throw new Error("Dikey bölücü için desteklenmeyen kenar: " + key + ".");
    }
  }
  const result = {} as EdgeBandingEdges;
  for (const edge of EDGE_KEYS) {
    if (typeof source[edge] !== "boolean") {
      throw new Error("Dikey bölücünün " + edge + " kenar bantlama değeri boolean olmalıdır.");
    }
    result[edge] = source[edge] as boolean;
  }
  return result;
}

function validateDivider(value: unknown, index: number): WardrobeVerticalDividerSpec {
  const divider = requireRecord(value, "Gardırop dikey bölücüsünün " + (index + 1) + ". kaydı");
  const allowedKeys = ["id", "offsetFromInnerLeftMm", "thicknessMm", "materialId", "edgeBanding", "grainDirection"];
  for (const key of Object.keys(divider)) {
    if (!allowedKeys.includes(key)) throw new Error("Dikey bölücüde desteklenmeyen alan: " + key + ".");
  }
  const id = requireIdentifier(divider.id, "Dikey bölücü kimliği");
  if (!DIVIDER_ID_PATTERN.test(id)) {
    throw new Error("Dikey bölücü kimliği yalnızca küçük harf, rakam, nokta, alt çizgi ve tire içerebilir.");
  }
  const materialId = requireIdentifier(divider.materialId, "Dikey bölücü malzeme kimliği");
  if (!MATERIAL_ID_PATTERN.test(materialId)) throw new Error("Dikey bölücü malzeme kimliği geçersiz.");
  if (divider.grainDirection !== "width" && divider.grainDirection !== "length" && divider.grainDirection !== "none") {
    throw new Error("Dikey bölücü damar yönü width, length veya none olmalıdır.");
  }
  return {
    id,
    offsetFromInnerLeftMm: requireNonNegativeMm(divider.offsetFromInnerLeftMm, "Dikey bölücü iç sol kenar ofseti"),
    thicknessMm: requirePositiveMm(divider.thicknessMm, "Dikey bölücü kalınlığı"),
    materialId,
    edgeBanding: validateEdgeBanding(divider.edgeBanding),
    grainDirection: divider.grainDirection
  };
}

function resolveWardrobeInput(value: unknown): ResolvedWardrobeInput {
  const root = requireRecord(value, "Gardırop konstrüksiyon isteği");
  for (const key of Object.keys(root)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) {
      throw new Error("Gardırop isteğinde desteklenmeyen alan: " + key + ".");
    }
  }
  if (root.schemaVersion !== 1) throw new Error("Desteklenmeyen gardırop konstrüksiyon şema sürümü.");
  if (root.family !== "wardrobe") throw new Error("Gardırop konstrüksiyon ailesi açıkça wardrobe olmalıdır.");
  if (!Array.isArray(root.materials)) throw new Error("Panel malzeme kataloğu bir liste olmalıdır.");
  if (!Array.isArray(root.verticalDividers)) throw new Error("Gardırop dikey bölücüleri açıkça bir liste olmalıdır.");

  const rawProfile = requireRecord(root.profile, "Gardırop konstrüksiyon profili");
  for (const key of Object.keys(rawProfile)) {
    if (!(PROFILE_KEYS as readonly string[]).includes(key)) {
      throw new Error("Gardırop profilinde desteklenmeyen alan: " + key + ".");
    }
  }

  const cabinetRequest = validateCabinetConstructionRequest({
    schemaVersion: 1,
    furniture: root.furniture,
    profile: root.profile,
    materials: root.materials,
    ...(root.panelMaterialOverrides === undefined ? {} : { panelMaterialOverrides: root.panelMaterialOverrides })
  });

  const seenDividerIds = new Set<string>();
  const dividers = root.verticalDividers.map((entry, index) => {
    const divider = validateDivider(entry, index);
    if (seenDividerIds.has(divider.id)) {
      throw new Error("Gardırop içinde yinelenen dikey bölücü kimliği: " + divider.id + ".");
    }
    seenDividerIds.add(divider.id);
    return {
      ...divider,
      offsetFromInnerLeftMm: toTenthsMm(divider.offsetFromInnerLeftMm, "Dikey bölücü iç sol kenar ofseti") / 10,
      thicknessMm: toTenthsMm(divider.thicknessMm, "Dikey bölücü kalınlığı") / 10
    };
  });

  if (dividers.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Dikey bölücülü gardıropta tam genişlik rafları desteklenmez; bölme bazlı raflar tanımlanana kadar raf adedi sıfır olmalıdır.");
  }

  const baseResult = calculateCabinetConstruction(cabinetRequest);
  const innerWidthTenths = toTenthsMm(baseResult.innerDimensionsMm.width, "Gardırop iç genişliği");
  const orderedDividers = [...dividers].sort((first, second) => first.offsetFromInnerLeftMm - second.offsetFromInnerLeftMm);
  let previousEndTenths = 0;

  for (const divider of orderedDividers) {
    const offsetTenths = toTenthsMm(divider.offsetFromInnerLeftMm, "Dikey bölücü iç sol kenar ofseti");
    const thicknessTenths = toTenthsMm(divider.thicknessMm, "Dikey bölücü kalınlığı");
    const endTenths = offsetTenths + thicknessTenths;
    if (!Number.isSafeInteger(endTenths)) throw new Error("Dikey bölücü yerleşimi güvenli mm aralığını aşıyor.");
    if (offsetTenths < previousEndTenths) throw new Error("Gardırop dikey bölücüleri birbiriyle çakışamaz.");
    if (endTenths > innerWidthTenths) throw new Error("Gardırop dikey bölücüsü iç genişlik sınırını aşıyor.");

    const material = cabinetRequest.materials.find((entry) => entry.id === divider.materialId);
    if (!material) {
      throw new Error(divider.id + " dikey bölücüsü için " + divider.materialId + " malzemesi katalogda bulunamadı.");
    }
    if (!material.thicknessesMm.includes(divider.thicknessMm)) {
      throw new Error(divider.id + " dikey bölücüsü için " + material.name + " malzemesinde " + divider.thicknessMm + " mm kalınlık katalogda tanımlı değil.");
    }
    previousEndTenths = endTenths;
  }

  const request: WardrobeConstructionRequest = {
    schemaVersion: 1,
    family: "wardrobe",
    furniture: cabinetRequest.furniture,
    profile: cabinetRequest.profile,
    materials: cabinetRequest.materials,
    ...(cabinetRequest.panelMaterialOverrides === undefined ? {} : { panelMaterialOverrides: cabinetRequest.panelMaterialOverrides }),
    verticalDividers: dividers
  };
  return { request, baseResult };
}

/** Explicit straight wardrobe carcass and full-height/full-depth dividers; no shelf, rail, hinge or CNC defaults are inferred. */
export function validateWardrobeConstructionRequest(value: unknown): WardrobeConstructionRequest {
  return resolveWardrobeInput(value).request;
}

/** Calculates the shared carcass and appends the explicitly positioned divider panel rows. */
export function calculateWardrobeConstruction(value: unknown): WardrobeConstructionResult {
  const { request, baseResult } = resolveWardrobeInput(value);
  const dividerParts: WardrobeDividerPart[] = request.verticalDividers.map((divider) => {
    const material = request.materials.find((entry) => entry.id === divider.materialId);
    if (!material) throw new Error("Doğrulanmış dikey bölücü malzemesi katalogda bulunamadı.");
    return {
      id: request.furniture.id + "-vertical-divider-" + divider.id,
      furnitureId: request.furniture.id,
      name: "Dikey Bölücü " + divider.id,
      width: baseResult.innerDimensionsMm.depth,
      length: baseResult.innerDimensionsMm.height,
      thickness: divider.thicknessMm,
      quantity: 1,
      material: material.name.trim(),
      materialId: divider.materialId,
      edgeBanding: { ...divider.edgeBanding },
      offsetFromInnerLeftMm: divider.offsetFromInnerLeftMm,
      grainDirection: divider.grainDirection
    };
  });
  return {
    family: "wardrobe",
    innerDimensionsMm: { ...baseResult.innerDimensionsMm },
    parts: [...baseResult.parts, ...dividerParts]
  };
}
