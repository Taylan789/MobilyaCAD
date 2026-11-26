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
  CabinetConstructionPart,
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

export interface BookshelfShelfSupportHardwareSpec {
  id: string;
  /** Exact manufacturer-catalogue item identity supplied by the operator. */
  hardwareId: string;
  /** Catalogue name; no generic fitting name is inferred. */
  name: string;
  /** Explicit BOM quantity and unit; no support count is calculated from shelf geometry. */
  quantity: number;
  unit: string;
  /** Manufacturer catalogue URL, document/page or part-number reference. */
  sourceReference: string;
}

export interface BookshelfShelfSpec {
  id: string;
  /** Left edge from the inside face of the left side panel, in mm. */
  leftOffsetMm: number;
  /** Right edge from the inside face of the left side panel, in mm. */
  rightOffsetMm: number;
  /** Bottom face from the inside face of the bottom panel, in mm. */
  heightFromInnerBottomMm: number;
  /** Front edge from the inside front reference plane, in mm. */
  frontOffsetMm: number;
  depthMm: number;
  thicknessMm: number;
  materialId: string;
  edgeBanding: EdgeBandingEdges;
  grainDirection: BookshelfGrainDirection;
  /** Optional user-supplied manufacturer-catalogue BOM rows for this exact shelf. */
  supportHardware?: readonly BookshelfShelfSupportHardwareSpec[];
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
  /** Optional explicit shelves; omitted or [] means no custom shelf is used. */
  shelves?: readonly BookshelfShelfSpec[];
}

export interface BookshelfDividerPart extends CabinetConstructionPart {
  offsetFromInnerLeftMm: number;
  grainDirection: BookshelfGrainDirection;
}

export interface BookshelfShelfPart extends CabinetConstructionPart {
  leftOffsetMm: number;
  rightOffsetMm: number;
  heightFromInnerBottomMm: number;
  frontOffsetMm: number;
  grainDirection: BookshelfGrainDirection;
}

export interface BookshelfConstructionHardwareItem {
  id: string;
  furnitureId: string;
  hardwareId: string;
  name: string;
  quantity: number;
  unit: string;
  sourceReference: string;
  sourcePartIds: string[];
}

export type BookshelfConstructionPart =
  CabinetConstructionPart | BookshelfDividerPart | BookshelfShelfPart;

export interface BookshelfConstructionResult extends Omit<CabinetConstructionResult, "parts"> {
  family: "bookshelf";
  parts: BookshelfConstructionPart[];
  /** Present only when explicit shelf-support catalogue rows were supplied. */
  hardwareItems?: BookshelfConstructionHardwareItem[];
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
  "verticalDividers",
  "shelves"
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
const SHELF_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MAX_VERTICAL_DIVIDERS = 100;
const MAX_BOOKSHELF_SHELVES = 500;
const MAX_SHELF_SUPPORT_HARDWARE_ITEMS = 100;
const MAX_BOOKSHELF_SUPPORT_HARDWARE_ITEMS = 1000;

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

function validateBookshelfShelfSupportHardware(value: unknown, index: number): BookshelfShelfSupportHardwareSpec {
  const item = requireRecord(value, "Kitaplık raf destek donanımının " + (index + 1) + ". kaydı");
  const allowedKeys = ["id", "hardwareId", "name", "quantity", "unit", "sourceReference"];
  for (const key of Object.keys(item)) {
    if (!allowedKeys.includes(key)) {
      throw new Error("Kitaplık raf destek donanımında desteklenmeyen alan: " + key + ".");
    }
  }
  const readText = (raw: unknown, label: string, maxLength: number): string => {
    if (typeof raw !== "string" || raw.trim() === "" || raw.trim() !== raw || raw.length > maxLength) {
      throw new Error(label + " boş olmayan, sınırlandırılmış ve kenar boşluğu içermeyen bir metin olmalıdır.");
    }
    return raw;
  };
  const id = readText(item.id, "Kitaplık raf destek donanımı satır kimliği", 64);
  if (!SHELF_ID_PATTERN.test(id)) throw new Error("Kitaplık raf destek donanımı satır kimliği geçersiz.");
  const hardwareId = readText(item.hardwareId, id + " üretici katalog donanım kimliği", 128);
  const name = readText(item.name, id + " üretici katalog donanım adı", 256);
  const unit = readText(item.unit, id + " donanım birimi", 32);
  const sourceReference = readText(item.sourceReference, id + " üretici katalog kaynak referansı", 2048);
  if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) ||
      item.quantity <= 0 || item.quantity > Number.MAX_SAFE_INTEGER) {
    throw new Error(id + " donanım adedi pozitif, sonlu ve güvenli sayısal aralıkta olmalıdır.");
  }
  return { id, hardwareId, name, quantity: item.quantity, unit, sourceReference };
}

function validateBookshelfShelf(value: unknown, index: number): BookshelfShelfSpec {
  const shelf = requireRecord(value, "Kitaplık rafının " + (index + 1) + ". kaydı");
  const allowedKeys = [
    "id", "leftOffsetMm", "rightOffsetMm", "heightFromInnerBottomMm",
    "frontOffsetMm", "depthMm", "thicknessMm", "materialId", "edgeBanding", "grainDirection", "supportHardware"
  ];
  for (const key of Object.keys(shelf)) {
    if (!allowedKeys.includes(key)) {
      throw new Error("Kitaplık rafında desteklenmeyen alan: " + key + ".");
    }
  }
  const id = shelf.id;
  if (typeof id !== "string" || id.trim() === "" || id.trim() !== id || !SHELF_ID_PATTERN.test(id)) {
    throw new Error("Kitaplık raf kimliği geçersiz.");
  }
  const materialId = shelf.materialId;
  if (typeof materialId !== "string" || materialId.trim() !== materialId ||
      !MATERIAL_ID_PATTERN.test(materialId)) {
    throw new Error("Kitaplık raf malzeme kimliği geçersiz.");
  }
  if (shelf.grainDirection !== "width" && shelf.grainDirection !== "length" && shelf.grainDirection !== "none") {
    throw new Error("Kitaplık raf damar yönü width, length veya none olmalıdır.");
  }
  const rawEdges = requireRecord(shelf.edgeBanding, "Kitaplık rafı kenar bantlama ayarları");
  for (const key of Object.keys(rawEdges)) {
    if (!(EDGE_KEYS as readonly string[]).includes(key)) {
      throw new Error("Kitaplık rafında desteklenmeyen kenar: " + key + ".");
    }
  }
  const edgeBanding = {} as EdgeBandingEdges;
  for (const edge of EDGE_KEYS) {
    if (typeof rawEdges[edge] !== "boolean") {
      throw new Error("Kitaplık rafı " + edge + " kenar bantlama değeri boolean olmalıdır.");
    }
    edgeBanding[edge] = rawEdges[edge] as boolean;
  }
  const rawSupportHardware = shelf.supportHardware;
  if (rawSupportHardware !== undefined &&
      (!Array.isArray(rawSupportHardware) || rawSupportHardware.length > MAX_SHELF_SUPPORT_HARDWARE_ITEMS)) {
    throw new Error(id + " raf destek donanımı en fazla " + MAX_SHELF_SUPPORT_HARDWARE_ITEMS + " katalog satırı içeren bir liste olmalıdır.");
  }
  const seenSupportHardwareIds = new Set<string>();
  const supportHardware = (rawSupportHardware ?? []).map((entry, hardwareIndex) => {
    const item = validateBookshelfShelfSupportHardware(entry, hardwareIndex);
    if (seenSupportHardwareIds.has(item.id)) {
      throw new Error(id + " rafında yinelenen destek donanımı satır kimliği: " + item.id + ".");
    }
    seenSupportHardwareIds.add(item.id);
    return item;
  });

  return {
    id,
    leftOffsetMm: requireNonNegativeMm(shelf.leftOffsetMm, "Kitaplık raf sol ofseti"),
    rightOffsetMm: requirePositiveMm(shelf.rightOffsetMm, "Kitaplık raf sağ ofseti"),
    heightFromInnerBottomMm: requireNonNegativeMm(shelf.heightFromInnerBottomMm, "Kitaplık raf alt yüzey kotu"),
    frontOffsetMm: requireNonNegativeMm(shelf.frontOffsetMm, "Kitaplık raf ön ofseti"),
    depthMm: requirePositiveMm(shelf.depthMm, "Kitaplık raf derinliği"),
    thicknessMm: requirePositiveMm(shelf.thicknessMm, "Kitaplık raf kalınlığı"),
    materialId,
    edgeBanding,
    grainDirection: shelf.grainDirection,
    ...(rawSupportHardware === undefined ? {} : { supportHardware })
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

  const rawShelves = root.shelves === undefined ? [] : root.shelves;
  if (!Array.isArray(rawShelves) || rawShelves.length > MAX_BOOKSHELF_SHELVES) {
    throw new Error("Kitaplık rafları en fazla " + MAX_BOOKSHELF_SHELVES + " kayıt içeren bir liste olmalıdır.");
  }
  const seenShelfIds = new Set<string>();
  const shelves = rawShelves.map((entry, index) => {
    const shelf = validateBookshelfShelf(entry, index);
    if (seenShelfIds.has(shelf.id)) {
      throw new Error("Kitaplık içinde yinelenen raf kimliği: " + shelf.id + ".");
    }
    seenShelfIds.add(shelf.id);
    return {
      ...shelf,
      leftOffsetMm: toTenthsMm(shelf.leftOffsetMm, "Kitaplık raf sol ofseti") / 10,
      rightOffsetMm: toTenthsMm(shelf.rightOffsetMm, "Kitaplık raf sağ ofseti") / 10,
      heightFromInnerBottomMm: toTenthsMm(shelf.heightFromInnerBottomMm, "Kitaplık raf alt yüzey kotu") / 10,
      frontOffsetMm: toTenthsMm(shelf.frontOffsetMm, "Kitaplık raf ön ofseti") / 10,
      depthMm: toTenthsMm(shelf.depthMm, "Kitaplık raf derinliği") / 10,
      thicknessMm: toTenthsMm(shelf.thicknessMm, "Kitaplık raf kalınlığı") / 10
    };
  });
  const totalSupportHardwareItems = shelves.reduce(
    (total, shelf) => total + (shelf.supportHardware?.length ?? 0),
    0
  );
  if (totalSupportHardwareItems > MAX_BOOKSHELF_SUPPORT_HARDWARE_ITEMS) {
    throw new Error("Kitaplık raf destek donanımı toplamı " + MAX_BOOKSHELF_SUPPORT_HARDWARE_ITEMS + " katalog satırını aşamaz.");
  }

  if (verticalDividers.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Kitaplık dikey bölücülerinde tam genişlik raf adedi sıfır olmalıdır; bölme rafları shelves alanında açıkça tanımlanmalıdır.");
  }
  if (shelves.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Açık ölçülü kitaplık rafları tanımlandığında tam genişlik raf adedi sıfır olmalıdır.");
  }

  if (verticalDividers.length > 0 || shelves.length > 0) {
    const baseResult = calculateCabinetConstruction(cabinetRequest);
    const innerWidthTenths = toTenthsMm(baseResult.innerDimensionsMm.width, "Kitaplık iç genişliği");
    const innerHeightTenths = toTenthsMm(baseResult.innerDimensionsMm.height, "Kitaplık iç yüksekliği");
    const innerDepthTenths = toTenthsMm(baseResult.innerDimensionsMm.depth, "Kitaplık iç derinliği");
    const orderedDividers = [...verticalDividers].sort(
      (first, second) => first.offsetFromInnerLeftMm - second.offsetFromInnerLeftMm
    );
    const dividerIntervals: Array<{ start: number; end: number }> = [];
    let previousEndTenths = 0;
    for (const divider of orderedDividers) {
      const offsetTenths = toTenthsMm(divider.offsetFromInnerLeftMm, "Kitaplık dikey bölücü iç sol kenar ofseti");
      const thicknessTenths = toTenthsMm(divider.thicknessMm, "Kitaplık dikey bölücü kalınlığı");
      const endTenths = offsetTenths + thicknessTenths;
      if (!Number.isSafeInteger(endTenths)) throw new Error("Kitaplık dikey bölücü yerleşimi güvenli mm aralığını aşıyor.");
      if (offsetTenths < previousEndTenths) throw new Error("Kitaplık dikey bölücüleri birbiriyle çakışamaz.");
      if (endTenths > innerWidthTenths) throw new Error("Kitaplık dikey bölücüsü iç genişlik sınırını aşıyor.");
      const material = cabinetRequest.materials.find((entry) => entry.id === divider.materialId);
      if (!material) throw new Error(divider.id + " kitaplık dikey bölücüsü için " + divider.materialId + " malzemesi katalogda bulunamadı.");
      if (!material.thicknessesMm.includes(divider.thicknessMm)) {
        throw new Error(divider.id + " kitaplık dikey bölücüsü için " + material.name + " malzemesinde " + divider.thicknessMm + " mm kalınlık katalogda tanımlı değil.");
      }
      dividerIntervals.push({ start: offsetTenths, end: endTenths });
      previousEndTenths = endTenths;
    }

    const shelfIntervals: Array<{ id: string; left: number; right: number; bottom: number; top: number; front: number; back: number }> = [];
    for (const shelf of shelves) {
      const left = toTenthsMm(shelf.leftOffsetMm, "Kitaplık raf sol ofseti");
      const right = toTenthsMm(shelf.rightOffsetMm, "Kitaplık raf sağ ofseti");
      const bottom = toTenthsMm(shelf.heightFromInnerBottomMm, "Kitaplık raf alt yüzey kotu");
      const thickness = toTenthsMm(shelf.thicknessMm, "Kitaplık raf kalınlığı");
      const front = toTenthsMm(shelf.frontOffsetMm, "Kitaplık raf ön ofseti");
      const depth = toTenthsMm(shelf.depthMm, "Kitaplık raf derinliği");
      const top = bottom + thickness;
      const back = front + depth;
      if (right <= left) throw new Error(shelf.id + " rafının sağ ofseti sol ofsetinden büyük olmalıdır.");
      if (thickness <= 0 || depth <= 0) throw new Error(shelf.id + " raf kalınlığı ve derinliği 0.1 mm hassasiyetinde pozitif kalmalıdır.");
      if (!Number.isSafeInteger(top) || !Number.isSafeInteger(back)) throw new Error(shelf.id + " raf yerleşimi güvenli mm aralığını aşıyor.");
      if (right > innerWidthTenths) throw new Error(shelf.id + " rafı kitaplık iç genişlik sınırını aşıyor.");
      if (top > innerHeightTenths) throw new Error(shelf.id + " rafı kitaplık net iç yüksekliğini aşıyor.");
      if (back > innerDepthTenths) throw new Error(shelf.id + " rafı kitaplık iç derinlik sınırını aşıyor.");
      for (const divider of dividerIntervals) {
        if (left < divider.end && right > divider.start) {
          throw new Error(shelf.id + " rafı dikey bölücü alanına giremez; raf bir bölmenin içinde kalmalıdır.");
        }
      }
      for (const previous of shelfIntervals) {
        const overlapsX = left < previous.right && right > previous.left;
        const overlapsY = bottom < previous.top && top > previous.bottom;
        const overlapsZ = front < previous.back && back > previous.front;
        if (overlapsX && overlapsY && overlapsZ) throw new Error(shelf.id + " rafı " + previous.id + " rafıyla çakışamaz.");
      }
      const material = cabinetRequest.materials.find((entry) => entry.id === shelf.materialId);
      if (!material) throw new Error(shelf.id + " rafı için " + shelf.materialId + " malzemesi katalogda bulunamadı.");
      if (!material.thicknessesMm.includes(shelf.thicknessMm)) {
        throw new Error(shelf.id + " rafı için " + material.name + " malzemesinde " + shelf.thicknessMm + " mm kalınlık katalogda tanımlı değil.");
      }
      shelfIntervals.push({ id: shelf.id, left, right, bottom, top, front, back });
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
    ...(root.verticalDividers === undefined ? {} : { verticalDividers }),
    ...(root.shelves === undefined ? {} : { shelves })
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
  const shelfParts: BookshelfShelfPart[] = (request.shelves ?? []).map((shelf) => {
    const material = request.materials.find((entry) => entry.id === shelf.materialId);
    if (!material) throw new Error("Doğrulanmış kitaplık raf malzemesi katalogda bulunamadı.");
    return {
      id: request.furniture.id + "-shelf-" + shelf.id,
      furnitureId: request.furniture.id,
      name: "Raf " + shelf.id,
      width: shelf.depthMm,
      length: shelf.rightOffsetMm - shelf.leftOffsetMm,
      thickness: shelf.thicknessMm,
      quantity: 1,
      material: material.name.trim(),
      materialId: shelf.materialId,
      edgeBanding: { ...shelf.edgeBanding },
      leftOffsetMm: shelf.leftOffsetMm,
      rightOffsetMm: shelf.rightOffsetMm,
      heightFromInnerBottomMm: shelf.heightFromInnerBottomMm,
      frontOffsetMm: shelf.frontOffsetMm,
      grainDirection: shelf.grainDirection
    };
  });

  const hardwareItems: BookshelfConstructionHardwareItem[] = (request.shelves ?? []).flatMap((shelf) =>
    (shelf.supportHardware ?? []).map((item) => ({
      id: request.furniture.id + "-shelf-" + shelf.id + "-hardware-" + item.id,
      furnitureId: request.furniture.id,
      hardwareId: item.hardwareId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      sourceReference: item.sourceReference,
      sourcePartIds: [request.furniture.id + "-shelf-" + shelf.id]
    }))
  );

  return {
    ...result,
    family: "bookshelf",
    parts: [...result.parts, ...dividerParts, ...shelfParts],
    ...(hardwareItems.length === 0 ? {} : { hardwareItems })
  };
}
