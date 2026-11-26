import {
  validateBodyPanelMaterialOverrides
} from "./bodyPanelMaterials.ts";
import type {
  BodyPanelGroup,
  BodyPanelMaterialCatalogEntry
} from "./bodyPanelMaterials.ts";
import {
  calculateCabinetConstruction,
  validateCabinetConstructionRequest
} from "./cabinetConstruction.ts";
import type {
  BackPanelConstruction,
  CabinetConstructionFurniture,
  CabinetConstructionResult,
  EdgeBandingEdges
} from "./cabinetConstruction.ts";

export type BookshelfPanelGroup = Exclude<BodyPanelGroup, "door">;

export const BOOKSHELF_PANEL_GROUPS: readonly BookshelfPanelGroup[] = [
  "leftSide",
  "rightSide",
  "top",
  "bottom",
  "shelf",
  "back"
];

export interface BookshelfConstructionProfile {
  panelThicknessMm: number;
  /** Optional per-group mm overrides; omitted groups use panelThicknessMm. */
  panelThicknessMmByGroup?: Partial<Record<BookshelfPanelGroup, number>>;
  carcassStyle: "between-sides" | "over-sides";
  backPanel: BackPanelConstruction;
  shelfCount: number;
  edgeBandingByGroup: Readonly<Record<BookshelfPanelGroup, EdgeBandingEdges>>;
}

export type BookshelfGrainDirection = "width" | "length" | "none";

export interface BookshelfVerticalDividerSpec {
  id: string;
  /** Left face offset from the inside face of the left side panel, in mm. */
  offsetFromInnerLeftMm: number;
  thicknessMm: number;
  materialId: string;
  edgeBanding: EdgeBandingEdges;
  grainDirection: BookshelfGrainDirection;
}

export interface BookshelfConstructionRequest {
  schemaVersion: 1;
  family: "bookshelf";
  furniture: CabinetConstructionFurniture;
  profile: BookshelfConstructionProfile;
  materials: readonly BodyPanelMaterialCatalogEntry[];
  panelMaterialOverrides?: unknown;
  /** Optional in v1 for backward compatibility; omitted or [] means no dividers. */
  verticalDividers?: readonly BookshelfVerticalDividerSpec[];
}

export interface BookshelfDividerPart extends CabinetConstructionPart {
  offsetFromInnerLeftMm: number;
  grainDirection: BookshelfGrainDirection;
}

export type BookshelfConstructionPart = CabinetConstructionPart | BookshelfDividerPart;

export interface BookshelfConstructionResult extends Omit<CabinetConstructionResult, "parts"> {
  family: "bookshelf";
  parts: BookshelfConstructionPart[];
}

const NO_DOOR_BANDING: EdgeBandingEdges = {
  top: false,
  bottom: false,
  left: false,
  right: false
};

const ROOT_KEYS = [
  "schemaVersion",
  "family",
  "furniture",
  "profile",
  "materials",
  "panelMaterialOverrides",
  "verticalDividers"
] as const;

const PROFILE_KEYS = [
  "panelThicknessMm",
  "panelThicknessMmByGroup",
  "carcassStyle",
  "backPanel",
  "shelfCount",
  "edgeBandingByGroup"
] as const;

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
const DIVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MAX_VERTICAL_DIVIDERS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
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

function validateBookshelfDivider(value: unknown, index: number): BookshelfVerticalDividerSpec {
  const divider = requireRecord(value, "Kitaplık dikey bölücüsünün " + (index + 1) + ". kaydı");
  const allowedKeys = [
    "id", "offsetFromInnerLeftMm", "thicknessMm", "materialId", "edgeBanding", "grainDirection"
  ];
  for (const key of Object.keys(divider)) {
    if (!allowedKeys.includes(key)) {
      throw new Error("Kitaplık dikey bölücüsünde desteklenmeyen alan: " + key + ".");
    }
  }

  const id = divider.id;
  if (typeof id !== "string" || id.trim() === "" || id.trim() !== id || !DIVIDER_ID_PATTERN.test(id)) {
    throw new Error("Kitaplık dikey bölücü kimliği geçersiz.");
  }
  const materialId = divider.materialId;
  if (typeof materialId !== "string" || materialId.trim() !== materialId ||
      !MATERIAL_ID_PATTERN.test(materialId)) {
    throw new Error("Kitaplık dikey bölücü malzeme kimliği geçersiz.");
  }
  if (divider.grainDirection !== "width" &&
      divider.grainDirection !== "length" &&
      divider.grainDirection !== "none") {
    throw new Error("Kitaplık dikey bölücü damar yönü width, length veya none olmalıdır.");
  }

  const rawEdges = requireRecord(divider.edgeBanding, "Kitaplık dikey bölücü kenar bantlama ayarları");
  for (const key of Object.keys(rawEdges)) {
    if (!(EDGE_KEYS as readonly string[]).includes(key)) {
      throw new Error("Kitaplık dikey bölücüsünde desteklenmeyen kenar: " + key + ".");
    }
  }
  const edgeBanding = {} as EdgeBandingEdges;
  for (const edge of EDGE_KEYS) {
    if (typeof rawEdges[edge] !== "boolean") {
      throw new Error("Kitaplık dikey bölücü " + edge + " kenar bantlama değeri boolean olmalıdır.");
    }
    edgeBanding[edge] = rawEdges[edge] as boolean;
  }

  const offsetTenths = toTenthsMm(
    requireNonNegativeMm(divider.offsetFromInnerLeftMm, "Kitaplık dikey bölücü iç sol kenar ofseti"),
    "Kitaplık dikey bölücü iç sol kenar ofseti"
  );
  const thicknessTenths = toTenthsMm(
    requirePositiveMm(divider.thicknessMm, "Kitaplık dikey bölücü kalınlığı"),
    "Kitaplık dikey bölücü kalınlığı"
  );
  if (thicknessTenths <= 0) {
    throw new Error("Kitaplık dikey bölücü kalınlığı 0.1 mm hassasiyetinde pozitif kalmalıdır.");
  }

  return {
    id,
    offsetFromInnerLeftMm: offsetTenths / 10,
    thicknessMm: thicknessTenths / 10,
    materialId,
    edgeBanding,
    grainDirection: divider.grainDirection
  };
}

/**
 * Validates an open bookshelf profile and adapts it to the shared carcass
 * geometry engine. Door settings and door-panel overrides are deliberately
 * excluded from this family rather than silently ignored.
 */
export function validateBookshelfConstructionRequest(
  value: unknown
): BookshelfConstructionRequest {
  const root = requireRecord(value, "Kitaplık konstrüksiyon isteği");
  for (const key of Object.keys(root)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) {
      throw new Error("Kitaplık isteğinde desteklenmeyen alan: " + key + ".");
    }
  }
  if (root.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen kitaplık konstrüksiyon şema sürümü.");
  }
  if (root.family !== "bookshelf") {
    throw new Error("Kitaplık konstrüksiyon ailesi açıkça bookshelf olmalıdır.");
  }
  if (!Array.isArray(root.materials)) {
    throw new Error("Panel malzeme kataloğu bir liste olmalıdır.");
  }

  const profile = requireRecord(root.profile, "Kitaplık konstrüksiyon profili");
  for (const key of Object.keys(profile)) {
    if (!(PROFILE_KEYS as readonly string[]).includes(key)) {
      throw new Error("Kitaplık profilinde desteklenmeyen alan: " + key + ".");
    }
  }

  const rawEdges = requireRecord(profile.edgeBandingByGroup, "Kitaplık panel grubu kenar bantlama ayarları");
  for (const key of Object.keys(rawEdges)) {
    if (!(BOOKSHELF_PANEL_GROUPS as readonly string[]).includes(key)) {
      throw new Error("Kitaplık için desteklenmeyen panel grubu: " + key + ".");
    }
  }
  for (const group of BOOKSHELF_PANEL_GROUPS) {
    if (!Object.prototype.hasOwnProperty.call(rawEdges, group)) {
      throw new Error("Kitaplık " + group + " panel grubu kenar bantlama ayarı eksik.");
    }
  }

  const rawPanelThicknesses = profile.panelThicknessMmByGroup === undefined
    ? undefined
    : requireRecord(profile.panelThicknessMmByGroup, "Kitaplık panel grubu kalınlıkları");
  if (rawPanelThicknesses !== undefined) {
    for (const key of Object.keys(rawPanelThicknesses)) {
      if (!(BOOKSHELF_PANEL_GROUPS as readonly string[]).includes(key)) {
        throw new Error("Kitaplık için desteklenmeyen panel kalınlık grubu: " + key + ".");
      }
    }
  }

  const panelMaterialOverrides = validateBodyPanelMaterialOverrides(root.panelMaterialOverrides);
  if (Object.prototype.hasOwnProperty.call(panelMaterialOverrides, "door")) {
    throw new Error("Kitaplık konstrüksiyonunda kapak malzeme override alanı kullanılamaz.");
  }

  const cabinetRequest = validateCabinetConstructionRequest({
    schemaVersion: 1,
    furniture: root.furniture,
    profile: {
      panelThicknessMm: profile.panelThicknessMm,
      ...(rawPanelThicknesses === undefined ? {} : { panelThicknessMmByGroup: rawPanelThicknesses }),
      carcassStyle: profile.carcassStyle,
      backPanel: profile.backPanel,
      shelfCount: profile.shelfCount,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: {
        ...rawEdges,
        door: NO_DOOR_BANDING
      }
    },
    materials: root.materials,
    ...(root.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides })
  });

  for (const group of BOOKSHELF_PANEL_GROUPS) {
    const thickness = cabinetRequest.profile.panelThicknessMmByGroup?.[group];
    if (thickness === undefined) continue;

    const materialId = panelMaterialOverrides[group] ?? cabinetRequest.furniture.materialId;
    if (materialId === undefined) {
      throw new Error(group + " panel grubu kalınlığı için katalog malzeme kimliği gereklidir.");
    }
    const material = cabinetRequest.materials.find((entry) => entry.id === materialId);
    if (!material) {
      throw new Error(group + " panel grubu için " + materialId + " malzeme kimliği katalogda bulunamadı.");
    }
    if (!Array.isArray(material.thicknessesMm) || !material.thicknessesMm.includes(thickness)) {
      throw new Error(group + " panel grubu için " + material.name + " malzemesinde " + thickness + " mm kalınlık katalogda tanımlı değil.");
    }
  }

  const rawDividers = root.verticalDividers === undefined ? [] : root.verticalDividers;
  if (!Array.isArray(rawDividers) || rawDividers.length > MAX_VERTICAL_DIVIDERS) {
    throw new Error("Kitaplık dikey bölücüleri en fazla " + MAX_VERTICAL_DIVIDERS + " kayıt içeren bir liste olmalıdır.");
  }
  const seenDividerIds = new Set<string>();
  const verticalDividers = rawDividers.map((entry, index) => {
    const divider = validateBookshelfDivider(entry, index);
    if (seenDividerIds.has(divider.id)) {
      throw new Error("Kitaplık içinde yinelenen dikey bölücü kimliği: " + divider.id + ".");
    }
    seenDividerIds.add(divider.id);
    return divider;
  });

  if (verticalDividers.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Kitaplık dikey bölücülerinde tam genişlik raf adedi sıfır olmalıdır; bölme bazlı raflar ayrı bir dilimde tanımlanacaktır.");
  }

  if (verticalDividers.length > 0) {
    const baseResult = calculateCabinetConstruction(cabinetRequest);
    const innerWidthTenths = toTenthsMm(baseResult.innerDimensionsMm.width, "Kitaplık iç genişliği");
    const orderedDividers = [...verticalDividers].sort(
      (first, second) => first.offsetFromInnerLeftMm - second.offsetFromInnerLeftMm
    );
    let previousEndTenths = 0;

    for (const divider of orderedDividers) {
      const offsetTenths = toTenthsMm(divider.offsetFromInnerLeftMm, "Kitaplık dikey bölücü iç sol kenar ofseti");
      const thicknessTenths = toTenthsMm(divider.thicknessMm, "Kitaplık dikey bölücü kalınlığı");
      const endTenths = offsetTenths + thicknessTenths;
      if (!Number.isSafeInteger(endTenths)) {
        throw new Error("Kitaplık dikey bölücü yerleşimi güvenli mm aralığını aşıyor.");
      }
      if (offsetTenths < previousEndTenths) {
        throw new Error("Kitaplık dikey bölücüleri birbiriyle çakışamaz.");
      }
      if (endTenths > innerWidthTenths) {
        throw new Error("Kitaplık dikey bölücüsü iç genişlik sınırını aşıyor.");
      }

      const material = cabinetRequest.materials.find((entry) => entry.id === divider.materialId);
      if (!material) {
        throw new Error(divider.id + " kitaplık dikey bölücüsü için " + divider.materialId + " malzemesi katalogda bulunamadı.");
      }
      if (!material.thicknessesMm.includes(divider.thicknessMm)) {
        throw new Error(divider.id + " kitaplık dikey bölücüsü için " + material.name + " malzemesinde " + divider.thicknessMm + " mm kalınlık katalogda tanımlı değil.");
      }
      previousEndTenths = endTenths;
    }
  }

  const edgeBandingByGroup = {} as Record<BookshelfPanelGroup, EdgeBandingEdges>;
  for (const group of BOOKSHELF_PANEL_GROUPS) {
    edgeBandingByGroup[group] = { ...cabinetRequest.profile.edgeBandingByGroup[group] };
  }

  return {
    schemaVersion: 1,
    family: "bookshelf",
    furniture: cabinetRequest.furniture,
    profile: {
      panelThicknessMm: cabinetRequest.profile.panelThicknessMm,
      ...(cabinetRequest.profile.panelThicknessMmByGroup === undefined
        ? {}
        : { panelThicknessMmByGroup: cabinetRequest.profile.panelThicknessMmByGroup as Partial<Record<BookshelfPanelGroup, number>> }),
      carcassStyle: cabinetRequest.profile.carcassStyle,
      backPanel: cabinetRequest.profile.backPanel,
      shelfCount: cabinetRequest.profile.shelfCount,
      edgeBandingByGroup
    },
    materials: cabinetRequest.materials,
    ...(root.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides }),
    ...(root.verticalDividers === undefined ? {} : { verticalDividers })
  };
}

/**
 * Calculates an open bookshelf using the shared carcass geometry rules.
 * The request must explicitly provide all six real panel-group edge settings;
 * the non-existent door group is disabled internally and is never emitted.
 */
export function calculateBookshelfConstruction(
  value: unknown
): BookshelfConstructionResult {
  const request = validateBookshelfConstructionRequest(value);
  const result = calculateCabinetConstruction({
    schemaVersion: 1,
    furniture: request.furniture,
    profile: {
      ...request.profile,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: {
        ...request.profile.edgeBandingByGroup,
        door: NO_DOOR_BANDING
      }
    },
    materials: request.materials,
    ...(request.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: request.panelMaterialOverrides })
  });

  const dividerParts: BookshelfDividerPart[] = (request.verticalDividers ?? []).map((divider) => {
    const material = request.materials.find((entry) => entry.id === divider.materialId);
    if (!material) throw new Error("Doğrulanmış kitaplık dikey bölücü malzemesi katalogda bulunamadı.");
    return {
      id: request.furniture.id + "-vertical-divider-" + divider.id,
      furnitureId: request.furniture.id,
      name: "Dikey Bölücü " + divider.id,
      width: result.innerDimensionsMm.depth,
      length: result.innerDimensionsMm.height,
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
    ...result,
    family: "bookshelf",
    parts: [...result.parts, ...dividerParts]
  };
}
