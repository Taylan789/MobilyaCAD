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
const ROOT_KEYS = ["schemaVersion", "family", "furniture", "profile", "materials", "panelMaterialOverrides", "verticalDividers", "shelves"] as const;
const PROFILE_KEYS = ["panelThicknessMm", "panelThicknessMmByGroup", "carcassStyle", "backPanel", "shelfCount", "doors", "edgeBandingByGroup"] as const;
const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const DIVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SHELF_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

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

export interface WardrobeShelfSpec {
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
  /** Optional explicit shelves; omitted or [] means that no custom shelf is used. */
  shelves?: readonly WardrobeShelfSpec[];
}

export interface WardrobeDividerPart extends CabinetConstructionPart {
  offsetFromInnerLeftMm: number;
  grainDirection: WardrobeGrainDirection;
}

export interface WardrobeShelfPart extends CabinetConstructionPart {
  leftOffsetMm: number;
  rightOffsetMm: number;
  heightFromInnerBottomMm: number;
  frontOffsetMm: number;
  grainDirection: WardrobeGrainDirection;
}

export type WardrobeConstructionPart = CabinetConstructionPart | WardrobeDividerPart | WardrobeShelfPart;

export interface WardrobeConstructionResult {
  family: "wardrobe";
  /** Clear cavity dimensions between the carcass panels, in mm. */
  innerDimensionsMm: CabinetConstructionResult["innerDimensionsMm"];
  parts: WardrobeConstructionPart[];
}

interface ResolvedWardrobeInput {
  request: WardrobeConstructionRequest;
  baseResult: CabinetConstructionResult;
  innerDimensionsMm: CabinetConstructionResult["innerDimensionsMm"];
  shelves: WardrobeShelfSpec[];
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

function validateEdgeBanding(value: unknown, label: string): EdgeBandingEdges {
  const source = requireRecord(value, label + " kenar bantlama ayarları");
  for (const key of Object.keys(source)) {
    if (!(EDGE_KEYS as readonly string[]).includes(key)) {
      throw new Error(label + " için desteklenmeyen kenar: " + key + ".");
    }
  }
  const result = {} as EdgeBandingEdges;
  for (const edge of EDGE_KEYS) {
    if (typeof source[edge] !== "boolean") {
      throw new Error(label + " " + edge + " kenar bantlama değeri boolean olmalıdır.");
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
    edgeBanding: validateEdgeBanding(divider.edgeBanding, "Dikey bölücü"),
    grainDirection: divider.grainDirection
  };
}

function validateShelf(value: unknown, index: number): WardrobeShelfSpec {
  const shelf = requireRecord(value, "Gardırop rafının " + (index + 1) + ". kaydı");
  const allowedKeys = [
    "id", "leftOffsetMm", "rightOffsetMm", "heightFromInnerBottomMm",
    "frontOffsetMm", "depthMm", "thicknessMm", "materialId", "edgeBanding", "grainDirection"
  ];
  for (const key of Object.keys(shelf)) {
    if (!allowedKeys.includes(key)) throw new Error("Gardırop rafında desteklenmeyen alan: " + key + ".");
  }

  const id = requireIdentifier(shelf.id, "Gardırop raf kimliği");
  if (!SHELF_ID_PATTERN.test(id)) {
    throw new Error("Gardırop raf kimliği yalnızca küçük harf, rakam, nokta, alt çizgi ve tire içerebilir.");
  }
  const materialId = requireIdentifier(shelf.materialId, "Gardırop raf malzeme kimliği");
  if (!MATERIAL_ID_PATTERN.test(materialId)) throw new Error("Gardırop raf malzeme kimliği geçersiz.");
  if (shelf.grainDirection !== "width" && shelf.grainDirection !== "length" && shelf.grainDirection !== "none") {
    throw new Error("Gardırop raf damar yönü width, length veya none olmalıdır.");
  }

  return {
    id,
    leftOffsetMm: requireNonNegativeMm(shelf.leftOffsetMm, "Gardırop raf sol ofseti"),
    rightOffsetMm: requirePositiveMm(shelf.rightOffsetMm, "Gardırop raf sağ ofseti"),
    heightFromInnerBottomMm: requireNonNegativeMm(shelf.heightFromInnerBottomMm, "Gardırop raf alt yüzey kotu"),
    frontOffsetMm: requireNonNegativeMm(shelf.frontOffsetMm, "Gardırop raf ön ofseti"),
    depthMm: requirePositiveMm(shelf.depthMm, "Gardırop raf derinliği"),
    thicknessMm: requirePositiveMm(shelf.thicknessMm, "Gardırop raf kalınlığı"),
    materialId,
    edgeBanding: validateEdgeBanding(shelf.edgeBanding, "Gardırop rafı " + id),
    grainDirection: shelf.grainDirection
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
  const rawShelves = root.shelves === undefined ? [] : root.shelves;
  if (!Array.isArray(rawShelves)) throw new Error("Gardırop rafları bir liste olmalıdır.");

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

  const seenShelfIds = new Set<string>();
  const shelves = rawShelves.map((entry, index) => {
    const shelf = validateShelf(entry, index);
    if (seenShelfIds.has(shelf.id)) {
      throw new Error("Gardırop içinde yinelenen raf kimliği: " + shelf.id + ".");
    }
    seenShelfIds.add(shelf.id);
    return {
      ...shelf,
      leftOffsetMm: toTenthsMm(shelf.leftOffsetMm, "Gardırop raf sol ofseti") / 10,
      rightOffsetMm: toTenthsMm(shelf.rightOffsetMm, "Gardırop raf sağ ofseti") / 10,
      heightFromInnerBottomMm: toTenthsMm(shelf.heightFromInnerBottomMm, "Gardırop raf alt yüzey kotu") / 10,
      frontOffsetMm: toTenthsMm(shelf.frontOffsetMm, "Gardırop raf ön ofseti") / 10,
      depthMm: toTenthsMm(shelf.depthMm, "Gardırop raf derinliği") / 10,
      thicknessMm: toTenthsMm(shelf.thicknessMm, "Gardırop raf kalınlığı") / 10
    };
  });

  if (dividers.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Dikey bölücülü gardıropta tam genişlik rafları desteklenmez; bölme bazlı raflar tanımlanana kadar raf adedi sıfır olmalıdır.");
  }
  if (shelves.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Açık ölçülü raflar tanımlandığında tam genişlik raf adedi sıfır olmalıdır.");
  }

  const baseResult = calculateCabinetConstruction(cabinetRequest);
  const outerHeightTenths = toTenthsMm(cabinetRequest.furniture.heightMm, "Gardırop dış yüksekliği");
  const topThicknessTenths = toTenthsMm(
    cabinetRequest.profile.panelThicknessMmByGroup?.top ?? cabinetRequest.profile.panelThicknessMm,
    "Gardırop üst panel kalınlığı"
  );
  const bottomThicknessTenths = toTenthsMm(
    cabinetRequest.profile.panelThicknessMmByGroup?.bottom ?? cabinetRequest.profile.panelThicknessMm,
    "Gardırop alt panel kalınlığı"
  );
  const innerHeightTenths = outerHeightTenths - topThicknessTenths - bottomThicknessTenths;
  if (!Number.isSafeInteger(innerHeightTenths) || innerHeightTenths <= 0) {
    throw new Error("Gardırop net iç yüksekliği üst ve alt panel kalınlıklarından sonra pozitif kalmalıdır.");
  }
  const innerDimensionsMm = {
    ...baseResult.innerDimensionsMm,
    height: innerHeightTenths / 10
  };

  const innerWidthTenths = toTenthsMm(baseResult.innerDimensionsMm.width, "Gardırop iç genişliği");
  const innerDepthTenths = toTenthsMm(baseResult.innerDimensionsMm.depth, "Gardırop iç derinliği");
  const orderedDividers = [...dividers].sort((first, second) => first.offsetFromInnerLeftMm - second.offsetFromInnerLeftMm);
  const dividerIntervals: Array<{ start: number; end: number }> = [];
  let previousEndTenths = 0;

  for (const divider of orderedDividers) {
    const offsetTenths = toTenthsMm(divider.offsetFromInnerLeftMm, "Dikey bölücü iç sol kenar ofseti");
    const thicknessTenths = toTenthsMm(divider.thicknessMm, "Dikey bölücü kalınlığı");
    const endTenths = offsetTenths + thicknessTenths;
    if (thicknessTenths <= 0) throw new Error("Dikey bölücü kalınlığı 0.1 mm hassasiyetinde pozitif kalmalıdır.");
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
    dividerIntervals.push({ start: offsetTenths, end: endTenths });
    previousEndTenths = endTenths;
  }

  const shelfIntervals: Array<{
    id: string;
    left: number;
    right: number;
    bottom: number;
    top: number;
    front: number;
    back: number;
  }> = [];

  for (const shelf of shelves) {
    const left = toTenthsMm(shelf.leftOffsetMm, "Gardırop raf sol ofseti");
    const right = toTenthsMm(shelf.rightOffsetMm, "Gardırop raf sağ ofseti");
    const bottom = toTenthsMm(shelf.heightFromInnerBottomMm, "Gardırop raf alt yüzey kotu");
    const thickness = toTenthsMm(shelf.thicknessMm, "Gardırop raf kalınlığı");
    const front = toTenthsMm(shelf.frontOffsetMm, "Gardırop raf ön ofseti");
    const depth = toTenthsMm(shelf.depthMm, "Gardırop raf derinliği");
    const top = bottom + thickness;
    const back = front + depth;

    if (right <= left) throw new Error(shelf.id + " rafının sağ ofseti sol ofsetinden büyük olmalıdır.");
    if (thickness <= 0 || depth <= 0) {
      throw new Error(shelf.id + " raf kalınlığı ve derinliği 0.1 mm hassasiyetinde pozitif kalmalıdır.");
    }
    if (!Number.isSafeInteger(top) || !Number.isSafeInteger(back)) {
      throw new Error(shelf.id + " raf yerleşimi güvenli mm aralığını aşıyor.");
    }
    if (right > innerWidthTenths) throw new Error(shelf.id + " rafı gardırop iç genişlik sınırını aşıyor.");
    if (top > innerHeightTenths) throw new Error(shelf.id + " rafı gardırop net iç yüksekliğini aşıyor.");
    if (back > innerDepthTenths) throw new Error(shelf.id + " rafı gardırop iç derinlik sınırını aşıyor.");

    for (const divider of dividerIntervals) {
      if (left < divider.end && right > divider.start) {
        throw new Error(shelf.id + " rafı dikey bölücü alanına giremez; raf bir bölmenin içinde kalmalıdır.");
      }
    }

    for (const previous of shelfIntervals) {
      const overlapsX = left < previous.right && right > previous.left;
      const overlapsY = bottom < previous.top && top > previous.bottom;
      const overlapsZ = front < previous.back && back > previous.front;
      if (overlapsX && overlapsY && overlapsZ) {
        throw new Error(shelf.id + " rafı " + previous.id + " rafıyla çakışamaz.");
      }
    }

    const material = cabinetRequest.materials.find((entry) => entry.id === shelf.materialId);
    if (!material) {
      throw new Error(shelf.id + " rafı için " + shelf.materialId + " malzemesi katalogda bulunamadı.");
    }
    if (!material.thicknessesMm.includes(shelf.thicknessMm)) {
      throw new Error(shelf.id + " rafı için " + material.name + " malzemesinde " + shelf.thicknessMm + " mm kalınlık katalogda tanımlı değil.");
    }

    shelfIntervals.push({ id: shelf.id, left, right, bottom, top, front, back });
  }

  const request: WardrobeConstructionRequest = {
    schemaVersion: 1,
    family: "wardrobe",
    furniture: cabinetRequest.furniture,
    profile: cabinetRequest.profile,
    materials: cabinetRequest.materials,
    ...(cabinetRequest.panelMaterialOverrides === undefined ? {} : { panelMaterialOverrides: cabinetRequest.panelMaterialOverrides }),
    verticalDividers: dividers,
    ...(root.shelves === undefined ? {} : { shelves })
  };
  return { request, baseResult, innerDimensionsMm, shelves };
}

/** Explicit wardrobe carcass, dividers and optional shelves; no rail, hinge or CNC defaults are inferred. */
export function validateWardrobeConstructionRequest(value: unknown): WardrobeConstructionRequest {
  return resolveWardrobeInput(value).request;
}

/** Calculates the carcass, full-cavity dividers and explicitly positioned shelf panels. */
export function calculateWardrobeConstruction(value: unknown): WardrobeConstructionResult {
  const { request, baseResult, innerDimensionsMm, shelves } = resolveWardrobeInput(value);
  const dividerParts: WardrobeDividerPart[] = request.verticalDividers.map((divider) => {
    const material = request.materials.find((entry) => entry.id === divider.materialId);
    if (!material) throw new Error("Doğrulanmış dikey bölücü malzemesi katalogda bulunamadı.");
    return {
      id: request.furniture.id + "-vertical-divider-" + divider.id,
      furnitureId: request.furniture.id,
      name: "Dikey Bölücü " + divider.id,
      width: baseResult.innerDimensionsMm.depth,
      length: innerDimensionsMm.height,
      thickness: divider.thicknessMm,
      quantity: 1,
      material: material.name.trim(),
      materialId: divider.materialId,
      edgeBanding: { ...divider.edgeBanding },
      offsetFromInnerLeftMm: divider.offsetFromInnerLeftMm,
      grainDirection: divider.grainDirection
    };
  });
  const shelfParts: WardrobeShelfPart[] = shelves.map((shelf) => {
    const material = request.materials.find((entry) => entry.id === shelf.materialId);
    if (!material) throw new Error("Doğrulanmış gardırop raf malzemesi katalogda bulunamadı.");
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
  return {
    family: "wardrobe",
    innerDimensionsMm: { ...innerDimensionsMm },
    parts: [...baseResult.parts, ...dividerParts, ...shelfParts]
  };
}
