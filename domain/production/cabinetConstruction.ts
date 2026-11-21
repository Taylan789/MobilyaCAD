import {
  BODY_PANEL_GROUPS,
  resolveCabinetBodyPanelParts
} from "./bodyPanelMaterials.ts";
import type {
  BodyPanelGroup,
  BodyPanelMaterialCatalogEntry
} from "./bodyPanelMaterials.ts";

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
type EdgeKey = (typeof EDGE_KEYS)[number];

export interface EdgeBandingEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export type BackPanelConstruction =
  | { enabled: false }
  | { enabled: true; thicknessMm: number; installation: "overlay" }
  | { enabled: true; thicknessMm: number; installation: "grooved"; grooveDepthMm: number }
  | { enabled: true; thicknessMm: number; installation: "inset"; insetMm: number };

export type DoorConstruction =
  | { enabled: false; count: 0 }
  | {
      enabled: true;
      count: number;
      style: "full-overlay" | "half-overlay" | "inset";
      gapMm: number;
    };

export interface CabinetConstructionProfile {
  panelThicknessMm: number;
  /** Optional per-group mm overrides; omitted groups retain panelThicknessMm. */
  panelThicknessMmByGroup?: Partial<Record<BodyPanelGroup, number>>;
  carcassStyle: "between-sides" | "over-sides";
  backPanel: BackPanelConstruction;
  shelfCount: number;
  doors: DoorConstruction;
  edgeBandingByGroup: Readonly<Record<BodyPanelGroup, EdgeBandingEdges>>;
}

export interface CabinetConstructionFurniture {
  id: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  material: string;
  materialId?: string;
}

export interface CabinetConstructionRequest {
  schemaVersion: 1;
  furniture: CabinetConstructionFurniture;
  profile: CabinetConstructionProfile;
  materials: readonly BodyPanelMaterialCatalogEntry[];
  panelMaterialOverrides?: unknown;
}

export interface CabinetInnerDimensionsMm {
  width: number;
  height: number;
  depth: number;
}

/** Dimensions are millimetres; quantity is a positive piece count. */
export interface CabinetConstructionPart {
  id: string;
  furnitureId: string;
  name: string;
  width: number;
  length: number;
  thickness: number;
  quantity: number;
  material: string;
  materialId?: string;
  edgeBanding: EdgeBandingEdges;
}

export interface CabinetConstructionResult {
  innerDimensionsMm: CabinetInnerDimensionsMm;
  parts: CabinetConstructionPart[];
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

function requireString(value: unknown, label: string): string {
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

function requireCount(value: unknown, label: string, allowZero: boolean): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new Error(label + (allowZero
      ? " sıfır veya pozitif güvenli bir tam sayı olmalıdır."
      : " pozitif güvenli bir tam sayı olmalıdır."));
  }
  return value;
}

function validateBackPanel(value: unknown): BackPanelConstruction {
  const back = requireRecord(value, "Arkalık konstrüksiyonu");
  if (back.enabled === false) return { enabled: false };
  if (back.enabled !== true) {
    throw new Error("Arkalık etkinlik durumu açıkça true veya false olmalıdır.");
  }

  const thicknessMm = requirePositiveMm(back.thicknessMm, "Arkalık kalınlığı");
  if (back.installation === "overlay") {
    return { enabled: true, thicknessMm, installation: "overlay" };
  }
  if (back.installation === "grooved") {
    return {
      enabled: true,
      thicknessMm,
      installation: "grooved",
      grooveDepthMm: requirePositiveMm(back.grooveDepthMm, "Arkalık kanal derinliği")
    };
  }
  if (back.installation === "inset") {
    return {
      enabled: true,
      thicknessMm,
      installation: "inset",
      insetMm: requireNonNegativeMm(back.insetMm, "Arkalık içe alma payı")
    };
  }
  throw new Error("Desteklenmeyen arkalık montaj yöntemi.");
}

function validateDoors(value: unknown): DoorConstruction {
  const doors = requireRecord(value, "Kapak konstrüksiyonu");
  if (typeof doors.enabled !== "boolean") {
    throw new Error("Kapak etkinlik durumu açıkça belirtilmelidir.");
  }
  const count = requireCount(doors.count, "Kapak adedi", true);
  if (!doors.enabled) {
    if (count !== 0) {
      throw new Error("Kapaklar devre dışıyken kapak adedi sıfır olmalıdır.");
    }
    return { enabled: false, count: 0 };
  }
  if (count === 0) {
    throw new Error("Kapaklar etkin olduğunda kapak adedi pozitif olmalıdır.");
  }
  if (
    doors.style !== "full-overlay" &&
    doors.style !== "half-overlay" &&
    doors.style !== "inset"
  ) {
    throw new Error("Desteklenmeyen kapak konstrüksiyonu.");
  }
  return {
    enabled: true,
    count,
    style: doors.style,
    gapMm: requirePositiveMm(doors.gapMm, "Kapak boşluğu")
  };
}

function validateEdgeBandingByGroup(
  value: unknown
): Record<BodyPanelGroup, EdgeBandingEdges> {
  const source = requireRecord(value, "Parça grubu kenar bantlama ayarları");
  const allowedGroups = BODY_PANEL_GROUPS as readonly string[];
  for (const key of Object.keys(source)) {
    if (!allowedGroups.includes(key)) {
      throw new Error("Desteklenmeyen kenar bantlama grubu: " + key + ".");
    }
  }

  const result = {} as Record<BodyPanelGroup, EdgeBandingEdges>;
  for (const group of BODY_PANEL_GROUPS) {
    const rawEdges = requireRecord(source[group], group + " kenar bantlama");
    for (const key of Object.keys(rawEdges)) {
      if (!(EDGE_KEYS as readonly string[]).includes(key)) {
        throw new Error(group + " için desteklenmeyen kenar: " + key + ".");
      }
    }

    const edges = {} as EdgeBandingEdges;
    for (const edge of EDGE_KEYS) {
      if (typeof rawEdges[edge] !== "boolean") {
        throw new Error(group + " grubunun " + edge + " kenar bantlama değeri boolean olmalıdır.");
      }
      edges[edge as EdgeKey] = rawEdges[edge] as boolean;
    }
    result[group] = edges;
  }
  return result;
}

function validatePanelThicknessMmByGroup(
  value: unknown
): Partial<Record<BodyPanelGroup, number>> | undefined {
  if (value === undefined) return undefined;
  const source = requireRecord(value, "Panel grubu kalınlık ayarları");
  const result: Partial<Record<BodyPanelGroup, number>> = {};
  for (const [group, thickness] of Object.entries(source)) {
    if (!(BODY_PANEL_GROUPS as readonly string[]).includes(group)) {
      throw new Error("Desteklenmeyen panel kalınlık grubu: " + group + ".");
    }
    result[group as BodyPanelGroup] = requirePositiveMm(thickness, group + " panel kalınlığı");
  }
  return result;
}

/**
 * Validates the versioned, frontend-independent cabinet construction input.
 * All geometry is expressed in mm; no material, gap, hardware or CNC default
 * is inferred from a missing field.
 */
export function validateCabinetConstructionRequest(
  value: unknown
): CabinetConstructionRequest {
  const root = requireRecord(value, "Dolap konstrüksiyon isteği");
  if (root.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen dolap konstrüksiyon şema sürümü.");
  }

  const furniture = requireRecord(root.furniture, "Mobilya ölçüleri");
  const profile = requireRecord(root.profile, "Dolap konstrüksiyon profili");
  if (!Array.isArray(root.materials)) {
    throw new Error("Panel malzeme kataloğu bir liste olmalıdır.");
  }

  const materialId = furniture.materialId;
  if (
    materialId !== undefined &&
    (typeof materialId !== "string" || materialId.trim() === "" || materialId.trim() !== materialId)
  ) {
    throw new Error("Varsayılan panel malzeme kimliği geçersiz.");
  }

  if (profile.carcassStyle !== "between-sides" && profile.carcassStyle !== "over-sides") {
    throw new Error("Desteklenmeyen gövde konstrüksiyonu.");
  }

  const normalizedFurniture: CabinetConstructionFurniture = {
    id: requireString(furniture.id, "Mobilya kimliği"),
    widthMm: requirePositiveMm(furniture.widthMm, "Dolap genişliği"),
    heightMm: requirePositiveMm(furniture.heightMm, "Dolap yüksekliği"),
    depthMm: requirePositiveMm(furniture.depthMm, "Dolap derinliği"),
    material: requireString(furniture.material, "Varsayılan malzeme adı"),
    ...(materialId === undefined ? {} : { materialId: materialId as string })
  };

  const panelThicknessMm = requirePositiveMm(profile.panelThicknessMm, "Gövde panel kalınlığı");
  const panelThicknessMmByGroup = validatePanelThicknessMmByGroup(profile.panelThicknessMmByGroup);
  const backPanel = validateBackPanel(profile.backPanel);
  const shelfCount = requireCount(profile.shelfCount, "Raf adedi", true);
  const doors = validateDoors(profile.doors);
  if (!backPanel.enabled && panelThicknessMmByGroup?.back !== undefined) {
    throw new Error("Arkalık kapalıyken back panel kalınlığı tanımlanamaz.");
  }
  if (shelfCount === 0 && panelThicknessMmByGroup?.shelf !== undefined) {
    throw new Error("Raf adedi sıfırken shelf panel kalınlığı tanımlanamaz.");
  }
  if (!doors.enabled && panelThicknessMmByGroup?.door !== undefined) {
    throw new Error("Kapaklar kapalıyken door panel kalınlığı tanımlanamaz.");
  }

  return {
    schemaVersion: 1,
    furniture: normalizedFurniture,
    profile: {
      panelThicknessMm,
      ...(panelThicknessMmByGroup === undefined ? {} : { panelThicknessMmByGroup }),
      carcassStyle: profile.carcassStyle,
      backPanel,
      shelfCount,
      doors,
      edgeBandingByGroup: validateEdgeBandingByGroup(profile.edgeBandingByGroup)
    },
    materials: root.materials as BodyPanelMaterialCatalogEntry[],
    ...(root.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: root.panelMaterialOverrides })
  };
}

function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}

function createPart(
  request: CabinetConstructionRequest,
  group: BodyPanelGroup,
  partKey: string,
  name: string,
  widthMm: number,
  lengthMm: number,
  thicknessMm: number,
  quantity: number
): CabinetConstructionPart {
  const width = roundMm(requirePositiveMm(widthMm, name + " genişliği"));
  const length = roundMm(requirePositiveMm(lengthMm, name + " uzunluğu"));
  const thickness = roundMm(requirePositiveMm(thicknessMm, name + " kalınlığı"));
  if (width <= 0 || length <= 0 || thickness <= 0) {
    throw new Error(name + " ölçüleri 0.1 mm hassasiyetinde pozitif kalmalıdır.");
  }
  requireCount(quantity, name + " adedi", false);

  return {
    id: request.furniture.id + "-" + partKey,
    furnitureId: request.furniture.id,
    name,
    width,
    length,
    thickness,
    quantity,
    material: request.furniture.material,
    ...(request.furniture.materialId === undefined
      ? {}
      : { materialId: request.furniture.materialId }),
    edgeBanding: { ...request.profile.edgeBandingByGroup[group] }
  };
}

/**
 * Creates a straight carcass part list from an explicit construction profile,
 * then applies the shared per-group material resolver. The result is a domain
 * calculation only; it does not claim drilling, hardware, nesting or CNC data.
 */
export function calculateCabinetConstruction(
  value: unknown
): CabinetConstructionResult {
  const request = validateCabinetConstructionRequest(value);
  const { furniture, profile } = request;
  const panel = profile.panelThicknessMm;
  const thicknessForGroup = (group: BodyPanelGroup, fallback = panel): number =>
    profile.panelThicknessMmByGroup?.[group] ?? fallback;
  const leftSideThickness = thicknessForGroup("leftSide");
  const rightSideThickness = thicknessForGroup("rightSide");
  const topThickness = thicknessForGroup("top");
  const bottomThickness = thicknessForGroup("bottom");

  const innerWidth = furniture.widthMm - leftSideThickness - rightSideThickness;
  const innerHeight = profile.carcassStyle === "over-sides"
    ? furniture.heightMm - topThickness - bottomThickness
    : furniture.heightMm;
  let innerDepth = furniture.depthMm - panel;

  if (profile.backPanel.enabled) {
    if (profile.backPanel.installation === "grooved") {
      innerDepth -= profile.backPanel.grooveDepthMm;
    } else if (profile.backPanel.installation === "inset") {
      innerDepth -= thicknessForGroup("back", profile.backPanel.thicknessMm) + profile.backPanel.insetMm;
    }
  }

  const innerDimensionsMm = {
    width: roundMm(requirePositiveMm(innerWidth, "Dolap iç genişliği")),
    height: roundMm(requirePositiveMm(innerHeight, "Dolap iç yüksekliği")),
    depth: roundMm(requirePositiveMm(innerDepth, "Dolap iç derinliği"))
  };
  if (
    innerDimensionsMm.width <= 0 ||
    innerDimensionsMm.height <= 0 ||
    innerDimensionsMm.depth <= 0
  ) {
    throw new Error("Dolap iç ölçüleri 0.1 mm hassasiyetinde pozitif kalmalıdır.");
  }

  const parts: CabinetConstructionPart[] = [];
  const sideHeight = profile.carcassStyle === "over-sides"
    ? furniture.heightMm - topThickness - bottomThickness
    : furniture.heightMm;

  parts.push(createPart(request, "leftSide", "left-side", "Sol Yan Panel",
    furniture.depthMm, sideHeight, leftSideThickness, 1));
  parts.push(createPart(request, "rightSide", "right-side", "Sağ Yan Panel",
    furniture.depthMm, sideHeight, rightSideThickness, 1));
  parts.push(createPart(request, "top", "top", "Üst Tabla",
    innerDimensionsMm.width, furniture.depthMm - panel, topThickness, 1));
  parts.push(createPart(request, "bottom", "bottom", "Alt Tabla",
    innerDimensionsMm.width, furniture.depthMm - panel, bottomThickness, 1));

  if (profile.shelfCount > 0) {
    parts.push(createPart(request, "shelf", "shelf", "Raf",
      innerDimensionsMm.width, innerDimensionsMm.depth, thicknessForGroup("shelf"), profile.shelfCount));
  }

  if (profile.doors.enabled) {
    const totalGaps = profile.doors.gapMm * (profile.doors.count + 1);
    let totalDoorWidth: number;
    if (profile.doors.style === "full-overlay") {
      totalDoorWidth = furniture.widthMm - totalGaps;
    } else if (profile.doors.style === "half-overlay") {
      totalDoorWidth = furniture.widthMm + panel - totalGaps;
    } else {
      totalDoorWidth = furniture.widthMm - leftSideThickness - rightSideThickness - totalGaps;
    }

    const doorWidth = totalDoorWidth / profile.doors.count;
    const doorHeight = profile.doors.style === "inset"
      ? furniture.heightMm - topThickness - bottomThickness - profile.doors.gapMm * 2
      : furniture.heightMm - profile.doors.gapMm * 2;
    if (doorWidth <= 0 || doorHeight <= 0) {
      throw new Error("Kapak ölçüleri geçersiz.");
    }

    parts.push(createPart(request, "door", "door", "Dolap Kapağı",
      doorWidth, doorHeight, thicknessForGroup("door"), profile.doors.count));
  }

  if (profile.backPanel.enabled) {
    let backWidth = innerDimensionsMm.width;
    let backHeight = innerDimensionsMm.height;
    if (profile.backPanel.installation === "overlay") {
      backWidth = furniture.widthMm;
      backHeight = furniture.heightMm;
    } else if (profile.backPanel.installation === "grooved") {
      backWidth += profile.backPanel.grooveDepthMm * 2;
      backHeight += profile.backPanel.grooveDepthMm * 2;
    }

    parts.push(createPart(request, "back", "back", "Arkalık",
      backWidth, backHeight, thicknessForGroup("back", profile.backPanel.thicknessMm), 1));
  }

  const resolvedParts = resolveCabinetBodyPanelParts(
    furniture.id,
    parts,
    request.panelMaterialOverrides,
    request.materials
  );

  return { innerDimensionsMm, parts: resolvedParts };
}
