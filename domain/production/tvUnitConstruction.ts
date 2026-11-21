import {
  calculateCabinetConstruction,
  validateCabinetConstructionRequest
} from "./cabinetConstruction.ts";
import type {
  CabinetConstructionPart,
  CabinetConstructionRequest,
  CabinetConstructionResult,
  EdgeBandingEdges
} from "./cabinetConstruction.ts";

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
const ROOT_KEYS = [
  "schemaVersion",
  "family",
  "mounting",
  "furniture",
  "profile",
  "materials",
  "panelMaterialOverrides",
  "verticalDividers",
  "shelves"
] as const;
const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SHELF_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const DIVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export type TvUnitGrainDirection = "width" | "length" | "none";

export interface TvUnitShelfSpec {
  id: string;
  /** Left edge from the inside face of the left side panel, in mm. */
  leftOffsetMm: number;
  /** Right edge from the inside face of the left side panel, in mm. */
  rightOffsetMm: number;
  /** Bottom face from the clear inside bottom reference, in mm. */
  heightFromInnerBottomMm: number;
  /** Front edge from the inside front reference plane, in mm. */
  frontOffsetMm: number;
  depthMm: number;
  thicknessMm: number;
  materialId: string;
  edgeBanding: EdgeBandingEdges;
  grainDirection: TvUnitGrainDirection;
}

export interface TvUnitVerticalDividerSpec {
  id: string;
  /** Left face from the inside face of the left side panel, in mm. */
  leftOffsetMm: number;
  /** Bottom face from the clear inside bottom reference, in mm. */
  bottomOffsetMm: number;
  /** Explicit panel height in mm; no full-height assumption is inferred. */
  heightMm: number;
  /** Front edge from the inside front reference plane, in mm. */
  frontOffsetMm: number;
  /** Explicit panel depth in mm. */
  depthMm: number;
  thicknessMm: number;
  materialId: string;
  edgeBanding: EdgeBandingEdges;
  grainDirection: TvUnitGrainDirection;
}

export interface TvUnitConstructionRequest {
  schemaVersion: 1;
  family: "tv-unit";
  mounting: "floor-standing";
  furniture: unknown;
  profile: unknown;
  materials: unknown;
  panelMaterialOverrides?: unknown;
  /** Optional explicit vertical panels; omitted or [] preserves existing behavior. */
  verticalDividers?: readonly TvUnitVerticalDividerSpec[];
  /** Optional explicit shelf placements; omitted or [] preserves cabinet shelfCount behavior. */
  shelves?: readonly TvUnitShelfSpec[];
}

export interface TvUnitShelfPart extends CabinetConstructionPart {
  leftOffsetMm: number;
  rightOffsetMm: number;
  heightFromInnerBottomMm: number;
  frontOffsetMm: number;
  grainDirection: TvUnitGrainDirection;
}

export interface TvUnitVerticalDividerPart extends CabinetConstructionPart {
  leftOffsetMm: number;
  bottomOffsetMm: number;
  heightMm: number;
  frontOffsetMm: number;
  depthMm: number;
  grainDirection: TvUnitGrainDirection;
}

export type TvUnitConstructionPart =
  | CabinetConstructionPart
  | TvUnitShelfPart
  | TvUnitVerticalDividerPart;

export interface TvUnitConstructionResult {
  family: "tv-unit";
  mounting: "floor-standing";
  innerDimensionsMm: CabinetConstructionResult["innerDimensionsMm"];
  parts: TvUnitConstructionPart[];
}

interface ResolvedTvUnitInput {
  cabinetRequest: CabinetConstructionRequest;
  baseResult: CabinetConstructionResult;
  innerDimensionsMm: CabinetConstructionResult["innerDimensionsMm"];
  verticalDividers: TvUnitVerticalDividerSpec[];
  shelves: TvUnitShelfSpec[];
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

function validateShelf(value: unknown, index: number): TvUnitShelfSpec {
  const shelf = requireRecord(value, "TV ünitesi rafının " + (index + 1) + ". kaydı");
  const allowedKeys = [
    "id", "leftOffsetMm", "rightOffsetMm", "heightFromInnerBottomMm",
    "frontOffsetMm", "depthMm", "thicknessMm", "materialId", "edgeBanding", "grainDirection"
  ];
  for (const key of Object.keys(shelf)) {
    if (!allowedKeys.includes(key)) {
      throw new Error("TV ünitesi rafında desteklenmeyen alan: " + key + ".");
    }
  }

  const id = requireIdentifier(shelf.id, "TV ünitesi raf kimliği");
  if (!SHELF_ID_PATTERN.test(id)) {
    throw new Error("TV ünitesi raf kimliği yalnızca küçük harf, rakam, nokta, alt çizgi ve tire içerebilir.");
  }
  const materialId = requireIdentifier(shelf.materialId, "TV ünitesi raf malzeme kimliği");
  if (!MATERIAL_ID_PATTERN.test(materialId)) {
    throw new Error("TV ünitesi raf malzeme kimliği geçersiz.");
  }
  if (
    shelf.grainDirection !== "width" &&
    shelf.grainDirection !== "length" &&
    shelf.grainDirection !== "none"
  ) {
    throw new Error("TV ünitesi raf damar yönü width, length veya none olmalıdır.");
  }

  return {
    id,
    leftOffsetMm: toTenthsMm(
      requireNonNegativeMm(shelf.leftOffsetMm, "TV ünitesi raf sol ofseti"),
      "TV ünitesi raf sol ofseti"
    ) / 10,
    rightOffsetMm: toTenthsMm(
      requirePositiveMm(shelf.rightOffsetMm, "TV ünitesi raf sağ ofseti"),
      "TV ünitesi raf sağ ofseti"
    ) / 10,
    heightFromInnerBottomMm: toTenthsMm(
      requireNonNegativeMm(shelf.heightFromInnerBottomMm, "TV ünitesi raf alt yüzey kotu"),
      "TV ünitesi raf alt yüzey kotu"
    ) / 10,
    frontOffsetMm: toTenthsMm(
      requireNonNegativeMm(shelf.frontOffsetMm, "TV ünitesi raf ön ofseti"),
      "TV ünitesi raf ön ofseti"
    ) / 10,
    depthMm: toTenthsMm(
      requirePositiveMm(shelf.depthMm, "TV ünitesi raf derinliği"),
      "TV ünitesi raf derinliği"
    ) / 10,
    thicknessMm: toTenthsMm(
      requirePositiveMm(shelf.thicknessMm, "TV ünitesi raf kalınlığı"),
      "TV ünitesi raf kalınlığı"
    ) / 10,
    materialId,
    edgeBanding: validateEdgeBanding(shelf.edgeBanding, "TV ünitesi rafı " + id),
    grainDirection: shelf.grainDirection
  };
}

function validateVerticalDivider(value: unknown, index: number): TvUnitVerticalDividerSpec {
  const divider = requireRecord(value, "TV ünitesi dikey bölücüsünün " + (index + 1) + ". kaydı");
  const allowedKeys = [
    "id", "leftOffsetMm", "bottomOffsetMm", "heightMm", "frontOffsetMm",
    "depthMm", "thicknessMm", "materialId", "edgeBanding", "grainDirection"
  ];
  for (const key of Object.keys(divider)) {
    if (!allowedKeys.includes(key)) {
      throw new Error("TV ünitesi dikey bölücüsünde desteklenmeyen alan: " + key + ".");
    }
  }

  const id = requireIdentifier(divider.id, "TV ünitesi dikey bölücü kimliği");
  if (!DIVIDER_ID_PATTERN.test(id)) {
    throw new Error("TV ünitesi dikey bölücü kimliği yalnızca küçük harf, rakam, nokta, alt çizgi ve tire içerebilir.");
  }
  const materialId = requireIdentifier(divider.materialId, "TV ünitesi dikey bölücü malzeme kimliği");
  if (!MATERIAL_ID_PATTERN.test(materialId)) {
    throw new Error("TV ünitesi dikey bölücü malzeme kimliği geçersiz.");
  }
  if (
    divider.grainDirection !== "width" &&
    divider.grainDirection !== "length" &&
    divider.grainDirection !== "none"
  ) {
    throw new Error("TV ünitesi dikey bölücü damar yönü width, length veya none olmalıdır.");
  }

  return {
    id,
    leftOffsetMm: toTenthsMm(
      requireNonNegativeMm(divider.leftOffsetMm, "TV ünitesi dikey bölücü sol ofseti"),
      "TV ünitesi dikey bölücü sol ofseti"
    ) / 10,
    bottomOffsetMm: toTenthsMm(
      requireNonNegativeMm(divider.bottomOffsetMm, "TV ünitesi dikey bölücü alt ofseti"),
      "TV ünitesi dikey bölücü alt ofseti"
    ) / 10,
    heightMm: toTenthsMm(
      requirePositiveMm(divider.heightMm, "TV ünitesi dikey bölücü yüksekliği"),
      "TV ünitesi dikey bölücü yüksekliği"
    ) / 10,
    frontOffsetMm: toTenthsMm(
      requireNonNegativeMm(divider.frontOffsetMm, "TV ünitesi dikey bölücü ön ofseti"),
      "TV ünitesi dikey bölücü ön ofseti"
    ) / 10,
    depthMm: toTenthsMm(
      requirePositiveMm(divider.depthMm, "TV ünitesi dikey bölücü derinliği"),
      "TV ünitesi dikey bölücü derinliği"
    ) / 10,
    thicknessMm: toTenthsMm(
      requirePositiveMm(divider.thicknessMm, "TV ünitesi dikey bölücü kalınlığı"),
      "TV ünitesi dikey bölücü kalınlığı"
    ) / 10,
    materialId,
    edgeBanding: validateEdgeBanding(divider.edgeBanding, "TV ünitesi dikey bölücüsü " + id),
    grainDirection: divider.grainDirection
  };
}

function resolveTvUnitInput(value: unknown): ResolvedTvUnitInput {
  const root = requireRecord(value, "TV ünitesi konstrüksiyon isteği");
  for (const key of Object.keys(root)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) {
      throw new Error("TV ünitesi isteğinde desteklenmeyen alan: " + key + ".");
    }
  }
  if (root.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen TV ünitesi konstrüksiyon şema sürümü.");
  }
  if (root.family !== "tv-unit") {
    throw new Error("TV ünitesi family alanı tv-unit olmalıdır.");
  }
  if (root.mounting !== "floor-standing") {
    throw new Error("TV ünitesi v1 yalnızca floor-standing gövdeyi destekler; duvar montajı için doğrulanmış bağlantı standardı gerekir.");
  }

  const rawDividers = root.verticalDividers === undefined ? [] : root.verticalDividers;
  if (!Array.isArray(rawDividers)) {
    throw new Error("TV ünitesi dikey bölücüleri bir liste olmalıdır.");
  }
  const rawShelves = root.shelves === undefined ? [] : root.shelves;
  if (!Array.isArray(rawShelves)) {
    throw new Error("TV ünitesi rafları bir liste olmalıdır.");
  }

  const cabinetRequest = validateCabinetConstructionRequest({
    schemaVersion: 1,
    furniture: root.furniture,
    profile: root.profile,
    materials: root.materials,
    ...(root.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: root.panelMaterialOverrides })
  });

  const seenDividerIds = new Set<string>();
  const verticalDividers = rawDividers.map((entry, index) => {
    const divider = validateVerticalDivider(entry, index);
    if (seenDividerIds.has(divider.id)) {
      throw new Error("TV ünitesi içinde yinelenen dikey bölücü kimliği: " + divider.id + ".");
    }
    seenDividerIds.add(divider.id);
    return divider;
  });

  const seenShelfIds = new Set<string>();
  const shelves = rawShelves.map((entry, index) => {
    const shelf = validateShelf(entry, index);
    if (seenShelfIds.has(shelf.id)) {
      throw new Error("TV ünitesi içinde yinelenen raf kimliği: " + shelf.id + ".");
    }
    seenShelfIds.add(shelf.id);
    return shelf;
  });

  if (verticalDividers.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Dikey TV ünitesi bölücüleri tanımlandığında tam genişlik raf adedi sıfır olmalıdır.");
  }
  if (shelves.length > 0 && cabinetRequest.profile.shelfCount > 0) {
    throw new Error("Açık ölçülü TV ünitesi rafları tanımlandığında tam genişlik raf adedi sıfır olmalıdır.");
  }

  const baseResult = calculateCabinetConstruction(cabinetRequest);
  const outerHeightTenths = toTenthsMm(
    cabinetRequest.furniture.heightMm,
    "TV ünitesi dış yüksekliği"
  );
  const topThicknessTenths = toTenthsMm(
    cabinetRequest.profile.panelThicknessMmByGroup?.top ?? cabinetRequest.profile.panelThicknessMm,
    "TV ünitesi üst panel kalınlığı"
  );
  const bottomThicknessTenths = toTenthsMm(
    cabinetRequest.profile.panelThicknessMmByGroup?.bottom ?? cabinetRequest.profile.panelThicknessMm,
    "TV ünitesi alt panel kalınlığı"
  );
  const innerHeightTenths = outerHeightTenths - topThicknessTenths - bottomThicknessTenths;
  if (!Number.isSafeInteger(innerHeightTenths) || innerHeightTenths <= 0) {
    throw new Error("TV ünitesi net iç yüksekliği üst ve alt panel kalınlıklarından sonra pozitif kalmalıdır.");
  }
  const innerDimensionsMm = {
    ...baseResult.innerDimensionsMm,
    height: innerHeightTenths / 10
  };

  const innerWidthTenths = toTenthsMm(baseResult.innerDimensionsMm.width, "TV ünitesi iç genişliği");
  const innerDepthTenths = toTenthsMm(baseResult.innerDimensionsMm.depth, "TV ünitesi iç derinliği");
  const dividerIntervals: Array<{
    id: string;
    left: number;
    right: number;
    bottom: number;
    top: number;
    front: number;
    back: number;
  }> = [];

  for (const divider of verticalDividers) {
    const left = toTenthsMm(divider.leftOffsetMm, "TV ünitesi dikey bölücü sol ofseti");
    const thickness = toTenthsMm(divider.thicknessMm, "TV ünitesi dikey bölücü kalınlığı");
    const right = left + thickness;
    const bottom = toTenthsMm(divider.bottomOffsetMm, "TV ünitesi dikey bölücü alt ofseti");
    const height = toTenthsMm(divider.heightMm, "TV ünitesi dikey bölücü yüksekliği");
    const top = bottom + height;
    const front = toTenthsMm(divider.frontOffsetMm, "TV ünitesi dikey bölücü ön ofseti");
    const depth = toTenthsMm(divider.depthMm, "TV ünitesi dikey bölücü derinliği");
    const back = front + depth;

    if (
      !Number.isSafeInteger(right) ||
      !Number.isSafeInteger(top) ||
      !Number.isSafeInteger(back) ||
      thickness <= 0 ||
      height <= 0 ||
      depth <= 0
    ) {
      throw new Error(divider.id + " dikey bölücüsü 0.1 mm hassasiyetinde güvenli ve pozitif ölçüler taşımalıdır.");
    }
    if (right > innerWidthTenths) {
      throw new Error(divider.id + " dikey bölücüsü TV ünitesi iç genişlik sınırını aşıyor.");
    }
    if (top > innerHeightTenths) {
      throw new Error(divider.id + " dikey bölücüsü TV ünitesi net iç yüksekliğini aşıyor.");
    }
    if (back > innerDepthTenths) {
      throw new Error(divider.id + " dikey bölücüsü TV ünitesi iç derinlik sınırını aşıyor.");
    }

    for (const previous of dividerIntervals) {
      const overlapsX = left < previous.right && right > previous.left;
      const overlapsY = bottom < previous.top && top > previous.bottom;
      const overlapsZ = front < previous.back && back > previous.front;
      if (overlapsX && overlapsY && overlapsZ) {
        throw new Error(divider.id + " dikey bölücüsü " + previous.id + " dikey bölücüsüyle hacimsel olarak çakışamaz.");
      }
    }

    const material = cabinetRequest.materials.find((entry) => entry.id === divider.materialId);
    if (!material) {
      throw new Error(divider.id + " dikey bölücüsü için " + divider.materialId + " malzemesi katalogda bulunamadı.");
    }
    if (!material.thicknessesMm.includes(divider.thicknessMm)) {
      throw new Error(
        divider.id + " dikey bölücüsü için " + material.name + " malzemesinde " +
        divider.thicknessMm + " mm kalınlık katalogda tanımlı değil."
      );
    }

    dividerIntervals.push({ id: divider.id, left, right, bottom, top, front, back });
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
    const left = toTenthsMm(shelf.leftOffsetMm, "TV ünitesi raf sol ofseti");
    const right = toTenthsMm(shelf.rightOffsetMm, "TV ünitesi raf sağ ofseti");
    const bottom = toTenthsMm(shelf.heightFromInnerBottomMm, "TV ünitesi raf alt yüzey kotu");
    const thickness = toTenthsMm(shelf.thicknessMm, "TV ünitesi raf kalınlığı");
    const front = toTenthsMm(shelf.frontOffsetMm, "TV ünitesi raf ön ofseti");
    const depth = toTenthsMm(shelf.depthMm, "TV ünitesi raf derinliği");
    const top = bottom + thickness;
    const back = front + depth;

    if (right <= left) {
      throw new Error(shelf.id + " rafının sağ ofseti sol ofsetinden büyük olmalıdır.");
    }
    if (thickness <= 0 || depth <= 0) {
      throw new Error(shelf.id + " raf kalınlığı ve derinliği 0.1 mm hassasiyetinde pozitif kalmalıdır.");
    }
    if (!Number.isSafeInteger(top) || !Number.isSafeInteger(back)) {
      throw new Error(shelf.id + " raf yerleşimi güvenli mm aralığını aşıyor.");
    }
    if (right > innerWidthTenths) {
      throw new Error(shelf.id + " rafı TV ünitesi iç genişlik sınırını aşıyor.");
    }
    if (top > innerHeightTenths) {
      throw new Error(shelf.id + " rafı TV ünitesi net iç yüksekliğini aşıyor.");
    }
    if (back > innerDepthTenths) {
      throw new Error(shelf.id + " rafı TV ünitesi iç derinlik sınırını aşıyor.");
    }

    for (const divider of dividerIntervals) {
      const overlapsX = left < divider.right && right > divider.left;
      const overlapsY = bottom < divider.top && top > divider.bottom;
      const overlapsZ = front < divider.back && back > divider.front;
      if (overlapsX && overlapsY && overlapsZ) {
        throw new Error(shelf.id + " rafı " + divider.id + " dikey bölücüsüyle çakışamaz.");
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
      throw new Error(
        shelf.id + " rafı için " + material.name + " malzemesinde " +
        shelf.thicknessMm + " mm kalınlık katalogda tanımlı değil."
      );
    }

    shelfIntervals.push({ id: shelf.id, left, right, bottom, top, front, back });
  }

  return { cabinetRequest, baseResult, innerDimensionsMm, verticalDividers, shelves };
}

/**
 * Calculates a floor-standing TV-unit carcass using the shared cabinet
 * geometry and material rules, plus explicitly positioned shelf panels.
 * Feet, plinths, wall anchors, loads, hardware and CNC remain outside v1.
 */
export function calculateTvUnitConstruction(
  value: unknown
): TvUnitConstructionResult {
  const { cabinetRequest, baseResult, innerDimensionsMm, verticalDividers, shelves } = resolveTvUnitInput(value);
  const dividerParts: TvUnitVerticalDividerPart[] = verticalDividers.map((divider) => {
    const material = cabinetRequest.materials.find((entry) => entry.id === divider.materialId);
    if (!material) {
      throw new Error("Doğrulanmış TV ünitesi dikey bölücü malzemesi katalogda bulunamadı.");
    }
    return {
      id: cabinetRequest.furniture.id + "-vertical-divider-" + divider.id,
      furnitureId: cabinetRequest.furniture.id,
      name: "TV Ünitesi Dikey Bölücüsü " + divider.id,
      width: divider.depthMm,
      length: divider.heightMm,
      thickness: divider.thicknessMm,
      quantity: 1,
      material: material.name.trim(),
      materialId: divider.materialId,
      edgeBanding: { ...divider.edgeBanding },
      leftOffsetMm: divider.leftOffsetMm,
      bottomOffsetMm: divider.bottomOffsetMm,
      heightMm: divider.heightMm,
      frontOffsetMm: divider.frontOffsetMm,
      depthMm: divider.depthMm,
      grainDirection: divider.grainDirection
    };
  });
  const shelfParts: TvUnitShelfPart[] = shelves.map((shelf) => {
    const material = cabinetRequest.materials.find((entry) => entry.id === shelf.materialId);
    if (!material) {
      throw new Error("Doğrulanmış TV ünitesi raf malzemesi katalogda bulunamadı.");
    }
    return {
      id: cabinetRequest.furniture.id + "-shelf-" + shelf.id,
      furnitureId: cabinetRequest.furniture.id,
      name: "TV Ünitesi Rafı " + shelf.id,
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
    family: "tv-unit",
    mounting: "floor-standing",
    innerDimensionsMm: { ...innerDimensionsMm },
    parts: [...baseResult.parts, ...dividerParts, ...shelfParts]
  };
}
