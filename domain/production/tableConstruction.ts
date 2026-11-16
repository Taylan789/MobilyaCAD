import type { BodyPanelMaterialCatalogEntry } from "./bodyPanelMaterials.ts";
import type { EdgeBandingEdges } from "./cabinetConstruction.ts";

export const TABLE_PART_GROUPS = ["top", "legs", "longApron", "shortApron"] as const;
export type TablePartGroup = (typeof TABLE_PART_GROUPS)[number];
export type TableGrainDirection = "length" | "width" | "none";

export interface TableConstructionFurniture {
  id: string;
  /** Tabletop width in mm. */
  widthMm: number;
  /** Tabletop length in mm. */
  lengthMm: number;
  /** Overall height from floor to tabletop surface in mm. */
  heightMm: number;
  material: string;
  materialId?: string;
}

export type TableApronConstruction =
  | { enabled: false }
  | {
      enabled: true;
      heightMm: number;
      thicknessMm: number;
      longApronLengthMm: number;
      longApronCount: number;
      shortApronLengthMm: number;
      shortApronCount: number;
    };

export interface TableConstructionProfile {
  topThicknessMm: number;
  legWidthMm: number;
  legDepthMm: number;
  legCount: number;
  aprons: TableApronConstruction;
  edgeBandingByGroup: Readonly<Record<TablePartGroup, EdgeBandingEdges>>;
  grainDirectionByGroup: Readonly<Record<TablePartGroup, TableGrainDirection>>;
  materialIdByGroup?: Partial<Record<TablePartGroup, string>>;
}

export interface TableConstructionRequest {
  schemaVersion: 1;
  family: "table";
  furniture: TableConstructionFurniture;
  profile: TableConstructionProfile;
  materials: readonly BodyPanelMaterialCatalogEntry[];
}

export interface TableConstructionPart {
  id: string;
  furnitureId: string;
  group: TablePartGroup;
  name: string;
  width: number;
  length: number;
  thickness: number;
  quantity: number;
  material: string;
  materialId?: string;
  edgeBanding: EdgeBandingEdges;
  grainDirection: TableGrainDirection;
}

export interface TableConstructionResult {
  schemaVersion: 1;
  family: "table";
  overallDimensionsMm: {
    width: number;
    length: number;
    height: number;
  };
  parts: TableConstructionPart[];
}

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
const GRAIN_DIRECTIONS = ["length", "width", "none"] as const;
const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): RecordValue {
  if (!isRecord(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value;
}

function requireOnlyKeys(value: RecordValue, allowed: readonly string[], label: string): void {
  const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) {
    throw new Error(label + " için desteklenmeyen alan: " + unknownKey + ".");
  }
}

function requireIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function requireMaterialId(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !MATERIAL_ID_PATTERN.test(value)
  ) {
    throw new Error(label + " geçerli bir katalog malzeme kimliği olmalıdır.");
  }
  return value;
}

function roundMm(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }
  const rounded = Math.round(value * 10) / 10;
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error(label + " 0.1 mm hassasiyetinde pozitif kalmalıdır.");
  }
  return rounded;
}

function requirePositiveMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }
  return roundMm(value, label);
}

function requireNonNegativeMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(label + " sıfır veya pozitif ve sonlu bir mm değeri olmalıdır.");
  }
  const rounded = Math.round(value * 10) / 10;
  if (!Number.isFinite(rounded) || rounded < 0) {
    throw new Error(label + " geçerli bir mm değeri olmalıdır.");
  }
  return rounded;
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

function normalizeMaterials(value: unknown): BodyPanelMaterialCatalogEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("Masa panel malzeme kataloğu bir liste olmalıdır.");
  }

  const seenIds = new Set<string>();
  return value.map((entry, index) => {
    const material = requireRecord(entry, "Panel malzeme kataloğunun " + (index + 1) + ". kaydı");
    requireOnlyKeys(
      material,
      ["id", "name", "category", "thicknessesMm", "unit", "decor"],
      "Panel malzeme kataloğu kaydı"
    );

    const id = requireMaterialId(material.id, "Panel malzeme kataloğu kimliği");
    if (seenIds.has(id)) {
      throw new Error("Yinelenen panel malzeme kimliği: " + id + ".");
    }
    seenIds.add(id);

    if (typeof material.name !== "string" || material.name.trim() === "") {
      throw new Error(id + " panel malzemesinin adı boş olamaz.");
    }
    if (material.category !== "panel" || material.unit !== "mm") {
      throw new Error(id + " yalnızca mm birimli panel malzemesi olabilir.");
    }
    if (!Array.isArray(material.thicknessesMm) || material.thicknessesMm.length === 0) {
      throw new Error(id + " için en az bir panel kalınlığı tanımlanmalıdır.");
    }
    if (material.decor !== undefined && typeof material.decor !== "string") {
      throw new Error(id + " dekor etiketi metin olmalıdır.");
    }

    const seenThicknesses = new Set<number>();
    const thicknessesMm = material.thicknessesMm.map((thickness) => {
      const normalized = requirePositiveMm(thickness, id + " panel kalınlığı");
      if (seenThicknesses.has(normalized)) {
        throw new Error(id + " için yinelenen panel kalınlığı bulundu.");
      }
      seenThicknesses.add(normalized);
      return normalized;
    });

    return {
      id,
      name: material.name.trim(),
      category: "panel",
      thicknessesMm,
      unit: "mm"
    };
  });
}

function validateAprons(value: unknown): TableApronConstruction {
  const apron = requireRecord(value, "Masa kayıt konstrüksiyonu");
  if (apron.enabled === false) {
    requireOnlyKeys(apron, ["enabled"], "Masa kayıt konstrüksiyonu");
    return { enabled: false };
  }
  if (apron.enabled !== true) {
    throw new Error("Masa kayıt etkinliği açıkça true veya false olmalıdır.");
  }

  requireOnlyKeys(
    apron,
    [
      "enabled",
      "heightMm",
      "thicknessMm",
      "longApronLengthMm",
      "longApronCount",
      "shortApronLengthMm",
      "shortApronCount"
    ],
    "Masa kayıt konstrüksiyonu"
  );

  const longApronCount = requireCount(apron.longApronCount, "Uzun kayıt adedi", true);
  const shortApronCount = requireCount(apron.shortApronCount, "Kısa kayıt adedi", true);
  if (longApronCount + shortApronCount === 0 ||
      !Number.isSafeInteger(longApronCount + shortApronCount)) {
    throw new Error("Etkin masa kayıtlarında en az bir güvenli parça adedi tanımlanmalıdır.");
  }

  const longApronLengthMm = longApronCount === 0
    ? requireNonNegativeMm(apron.longApronLengthMm, "Uzun kayıt uzunluğu")
    : requirePositiveMm(apron.longApronLengthMm, "Uzun kayıt uzunluğu");
  const shortApronLengthMm = shortApronCount === 0
    ? requireNonNegativeMm(apron.shortApronLengthMm, "Kısa kayıt uzunluğu")
    : requirePositiveMm(apron.shortApronLengthMm, "Kısa kayıt uzunluğu");

  if (longApronCount === 0 && longApronLengthMm !== 0) {
    throw new Error("Uzun kayıt adedi sıfırken uzun kayıt uzunluğu da sıfır olmalıdır.");
  }
  if (shortApronCount === 0 && shortApronLengthMm !== 0) {
    throw new Error("Kısa kayıt adedi sıfırken kısa kayıt uzunluğu da sıfır olmalıdır.");
  }

  return {
    enabled: true,
    heightMm: requirePositiveMm(apron.heightMm, "Kayıt yüksekliği"),
    thicknessMm: requirePositiveMm(apron.thicknessMm, "Kayıt kalınlığı"),
    longApronLengthMm,
    longApronCount,
    shortApronLengthMm,
    shortApronCount
  };
}

function validateEdgeBandingByGroup(value: unknown): Record<TablePartGroup, EdgeBandingEdges> {
  const source = requireRecord(value, "Masa parça grubu kenar bantlama ayarları");
  for (const key of Object.keys(source)) {
    if (!(TABLE_PART_GROUPS as readonly string[]).includes(key)) {
      throw new Error("Desteklenmeyen masa parça grubu: " + key + ".");
    }
  }

  const result = {} as Record<TablePartGroup, EdgeBandingEdges>;
  for (const group of TABLE_PART_GROUPS) {
    const rawEdges = requireRecord(source[group], group + " kenar bantlama ayarları");
    requireOnlyKeys(rawEdges, EDGE_KEYS, group + " kenar bantlama ayarları");
    const edges = {} as EdgeBandingEdges;
    for (const edge of EDGE_KEYS) {
      if (typeof rawEdges[edge] !== "boolean") {
        throw new Error(group + " grubunun " + edge + " kenar bantlama değeri boolean olmalıdır.");
      }
      edges[edge] = rawEdges[edge] as boolean;
    }
    result[group] = edges;
  }
  return result;
}

function validateGrainDirectionsByGroup(
  value: unknown
): Record<TablePartGroup, TableGrainDirection> {
  const source = requireRecord(value, "Masa parça grubu damar yönleri");
  for (const key of Object.keys(source)) {
    if (!(TABLE_PART_GROUPS as readonly string[]).includes(key)) {
      throw new Error("Desteklenmeyen masa damar yönü grubu: " + key + ".");
    }
  }

  const result = {} as Record<TablePartGroup, TableGrainDirection>;
  for (const group of TABLE_PART_GROUPS) {
    const direction = source[group];
    if (!(GRAIN_DIRECTIONS as readonly unknown[]).includes(direction)) {
      throw new Error(group + " parça grubu damar yönü geçersiz.");
    }
    result[group] = direction as TableGrainDirection;
  }
  return result;
}

function validateMaterialIdsByGroup(
  value: unknown
): Partial<Record<TablePartGroup, string>> {
  if (value === undefined) return {};
  const source = requireRecord(value, "Masa parça grubu malzeme atamaları");
  const result: Partial<Record<TablePartGroup, string>> = {};
  for (const [group, materialId] of Object.entries(source)) {
    if (!(TABLE_PART_GROUPS as readonly string[]).includes(group)) {
      throw new Error("Desteklenmeyen masa malzeme grubu: " + group + ".");
    }
    result[group as TablePartGroup] = requireMaterialId(
      materialId,
      group + " parça grubu malzeme kimliği"
    );
  }
  return result;
}

/** Validates a versioned table cut-part request without inferring joinery or placement. */
export function validateTableConstructionRequest(value: unknown): TableConstructionRequest {
  const root = requireRecord(value, "Masa konstrüksiyon isteği");
  requireOnlyKeys(
    root,
    ["schemaVersion", "family", "furniture", "profile", "materials"],
    "Masa konstrüksiyon isteği"
  );
  if (root.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen masa konstrüksiyon şema sürümü.");
  }
  if (root.family !== "table") {
    throw new Error("Masa konstrüksiyon ailesi açıkça table olmalıdır.");
  }

  const furniture = requireRecord(root.furniture, "Masa ölçüleri");
  requireOnlyKeys(
    furniture,
    ["id", "widthMm", "lengthMm", "heightMm", "material", "materialId"],
    "Masa ölçüleri"
  );
  const profile = requireRecord(root.profile, "Masa konstrüksiyon profili");
  requireOnlyKeys(
    profile,
    [
      "topThicknessMm",
      "legWidthMm",
      "legDepthMm",
      "legCount",
      "aprons",
      "edgeBandingByGroup",
      "grainDirectionByGroup",
      "materialIdByGroup"
    ],
    "Masa konstrüksiyon profili"
  );

  const materialId = furniture.materialId === undefined
    ? undefined
    : requireMaterialId(furniture.materialId, "Varsayılan masa malzeme kimliği");
  const normalizedFurniture: TableConstructionFurniture = {
    id: requireIdentifier(furniture.id, "Masa kimliği"),
    widthMm: requirePositiveMm(furniture.widthMm, "Masa tablası genişliği"),
    lengthMm: requirePositiveMm(furniture.lengthMm, "Masa tablası uzunluğu"),
    heightMm: requirePositiveMm(furniture.heightMm, "Masa toplam yüksekliği"),
    material: requireIdentifier(furniture.material, "Varsayılan masa malzeme adı"),
    ...(materialId === undefined ? {} : { materialId })
  };

  const topThicknessMm = requirePositiveMm(profile.topThicknessMm, "Masa tablası kalınlığı");
  const legWidthMm = requirePositiveMm(profile.legWidthMm, "Masa ayağı genişliği");
  const legDepthMm = requirePositiveMm(profile.legDepthMm, "Masa ayağı derinliği");
  const legCount = requireCount(profile.legCount, "Masa ayağı adedi", false);
  const aprons = validateAprons(profile.aprons);
  const materials = normalizeMaterials(root.materials);

  return {
    schemaVersion: 1,
    family: "table",
    furniture: normalizedFurniture,
    profile: {
      topThicknessMm,
      legWidthMm,
      legDepthMm,
      legCount,
      aprons,
      edgeBandingByGroup: validateEdgeBandingByGroup(profile.edgeBandingByGroup),
      grainDirectionByGroup: validateGrainDirectionsByGroup(profile.grainDirectionByGroup),
      ...(profile.materialIdByGroup === undefined
        ? {}
        : { materialIdByGroup: validateMaterialIdsByGroup(profile.materialIdByGroup) })
    },
    materials
  };
}

function resolvePartMaterial(
  group: TablePartGroup,
  thicknessMm: number,
  request: TableConstructionRequest,
  materialById: ReadonlyMap<string, BodyPanelMaterialCatalogEntry>
): { material: string; materialId?: string } {
  const materialId = request.profile.materialIdByGroup?.[group] ?? request.furniture.materialId;
  if (materialId === undefined) return { material: request.furniture.material };

  const selected = materialById.get(materialId);
  if (!selected) {
    throw new Error(group + " parça grubu için " + materialId + " malzeme kimliği katalogda bulunamadı.");
  }
  if (!selected.thicknessesMm.includes(thicknessMm)) {
    throw new Error(
      selected.name + " için " + thicknessMm + " mm kalınlık katalogda tanımlı değil."
    );
  }
  return { material: selected.name, materialId };
}

/**
 * Produces a table cut-part list from explicit tabletop, leg and optional apron
 * dimensions. Apron lengths/counts are supplied by the caller; no leg positions,
 * overhang, joinery, hardware, drilling or CNC coordinates are inferred.
 */
export function calculateTableConstruction(value: unknown): TableConstructionResult {
  const request = validateTableConstructionRequest(value);
  const { furniture, profile } = request;
  const legHeightMm = roundMm(
    furniture.heightMm - profile.topThicknessMm,
    "Masa ayağı yüksekliği"
  );

  if (profile.aprons.enabled && profile.aprons.heightMm > legHeightMm) {
    throw new Error("Kayıt yüksekliği masa ayağı yüksekliğini aşamaz.");
  }

  const activeGroups = new Set<TablePartGroup>(["top", "legs"]);
  if (profile.aprons.enabled && profile.aprons.longApronCount > 0) {
    activeGroups.add("longApron");
  }
  if (profile.aprons.enabled && profile.aprons.shortApronCount > 0) {
    activeGroups.add("shortApron");
  }
  for (const group of Object.keys(profile.materialIdByGroup ?? {})) {
    if (!activeGroups.has(group as TablePartGroup)) {
      throw new Error(group + " için masa parçası üretilmediğinden malzeme ataması yapılamaz.");
    }
  }

  const totalQuantity = 1 + profile.legCount +
    (profile.aprons.enabled ? profile.aprons.longApronCount + profile.aprons.shortApronCount : 0);
  if (!Number.isSafeInteger(totalQuantity)) {
    throw new Error("Masa toplam parça adedi güvenli sayı sınırını aşıyor.");
  }

  const materialById = new Map(request.materials.map((material) => [material.id, material]));
  const parts: TableConstructionPart[] = [];

  function createPart(
    group: TablePartGroup,
    suffix: string,
    name: string,
    width: number,
    length: number,
    thickness: number,
    quantity: number
  ): TableConstructionPart {
    const normalizedWidth = roundMm(width, name + " genişliği");
    const normalizedLength = roundMm(length, name + " uzunluğu");
    const normalizedThickness = roundMm(thickness, name + " kalınlığı");
    requireCount(quantity, name + " adedi", false);
    const material = resolvePartMaterial(group, normalizedThickness, request, materialById);

    return {
      id: furniture.id + "-" + suffix,
      furnitureId: furniture.id,
      group,
      name,
      width: normalizedWidth,
      length: normalizedLength,
      thickness: normalizedThickness,
      quantity,
      material: material.material,
      ...(material.materialId === undefined ? {} : { materialId: material.materialId }),
      edgeBanding: { ...profile.edgeBandingByGroup[group] },
      grainDirection: profile.grainDirectionByGroup[group]
    };
  }

  parts.push(createPart(
    "top",
    "top",
    "Masa Tablası",
    furniture.widthMm,
    furniture.lengthMm,
    profile.topThicknessMm,
    1
  ));
  parts.push(createPart(
    "legs",
    "legs",
    "Masa Ayağı",
    profile.legWidthMm,
    legHeightMm,
    profile.legDepthMm,
    profile.legCount
  ));

  if (profile.aprons.enabled && profile.aprons.longApronCount > 0) {
    parts.push(createPart(
      "longApron",
      "long-apron",
      "Uzun Masa Kaydı",
      profile.aprons.longApronLengthMm,
      profile.aprons.heightMm,
      profile.aprons.thicknessMm,
      profile.aprons.longApronCount
    ));
  }
  if (profile.aprons.enabled && profile.aprons.shortApronCount > 0) {
    parts.push(createPart(
      "shortApron",
      "short-apron",
      "Kısa Masa Kaydı",
      profile.aprons.shortApronLengthMm,
      profile.aprons.heightMm,
      profile.aprons.thicknessMm,
      profile.aprons.shortApronCount
    ));
  }

  return {
    schemaVersion: 1,
    family: "table",
    overallDimensionsMm: {
      width: furniture.widthMm,
      length: furniture.lengthMm,
      height: furniture.heightMm
    },
    parts
  };
}
