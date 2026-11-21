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

export interface BookshelfConstructionRequest {
  schemaVersion: 1;
  family: "bookshelf";
  furniture: CabinetConstructionFurniture;
  profile: BookshelfConstructionProfile;
  materials: readonly BodyPanelMaterialCatalogEntry[];
  panelMaterialOverrides?: unknown;
}

export interface BookshelfConstructionResult extends CabinetConstructionResult {
  family: "bookshelf";
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
  "panelMaterialOverrides"
] as const;

const PROFILE_KEYS = [
  "panelThicknessMm",
  "panelThicknessMmByGroup",
  "carcassStyle",
  "backPanel",
  "shelfCount",
  "edgeBandingByGroup"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value;
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
      : { panelMaterialOverrides })
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

  return { ...result, family: "bookshelf" };
}
