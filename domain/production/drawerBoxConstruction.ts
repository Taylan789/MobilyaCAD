/**
 * Versioned, frontend-independent drawer-box construction domain.
 *
 * All dimensions are millimetres. The bottom panel is explicitly defined as
 * fitting between the side, front and rear panels. No slide clearance,
 * reveal, joinery, hardware, machining allowance or CNC coordinate is inferred.
 */

export const DRAWER_PANEL_GROUPS = [
  "sidePanels",
  "frontBackPanels",
  "bottomPanel",
  "visibleFrontPanel"
] as const;

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
const GRAIN_DIRECTIONS = ["length", "width", "none"] as const;
const MATERIAL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export type DrawerPanelGroup = (typeof DRAWER_PANEL_GROUPS)[number];
export type DrawerGrainDirection = (typeof GRAIN_DIRECTIONS)[number];

export interface DrawerEdgeBandingEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export type DrawerEdgeBanding = Readonly<Record<DrawerPanelGroup, DrawerEdgeBandingEdges>>;
export type DrawerGrainDirections = Readonly<Record<DrawerPanelGroup, DrawerGrainDirection>>;

export interface DrawerPanelMaterialCatalogEntry {
  id: string;
  name: string;
  category: "panel";
  decor?: string;
  thicknessesMm: readonly number[];
  unit: "mm";
}

export interface DrawerBoxConstructionSpec {
  outerWidth: number;
  sideHeight: number;
  outerDepth: number;
  sideThickness: number;
  frontBackThickness: number;
  bottomThickness: number;
  visibleFrontWidth: number;
  visibleFrontHeight: number;
  visibleFrontThickness: number;
  quantity: number;
  material: string;
  materialId?: string;
  panelMaterialIds?: Readonly<Partial<Record<DrawerPanelGroup, string>>>;
  bottomFit: "between-sides-and-front-back";
  edgeBanding: DrawerEdgeBanding;
  grainDirection: DrawerGrainDirections;
}

export interface DrawerBoxConstructionRequest {
  schemaVersion: 1;
  furniture: { id: string };
  drawerGroup: { id: string };
  spec: DrawerBoxConstructionSpec;
  materials: readonly DrawerPanelMaterialCatalogEntry[];
}

export interface DrawerBoxConstructionPart {
  id: string;
  furnitureId: string;
  drawerGroupId: string;
  name: string;
  width: number;
  length: number;
  thickness: number;
  quantity: number;
  material: string;
  materialId?: string;
  edgeBanding: DrawerEdgeBandingEdges;
  grainDirection: DrawerGrainDirection;
}

export interface DrawerBoxConstructionResult {
  schemaVersion: 1;
  innerWidthMm: number;
  bottomLengthMm: number;
  parts: DrawerBoxConstructionPart[];
}

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

function requirePositiveMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }
  return value;
}

function requirePositiveCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(label + " pozitif güvenli bir tam sayı olmalıdır.");
  }
  return value;
}

function normalizeMaterialCatalog(value: unknown): DrawerPanelMaterialCatalogEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("Çekmece panel malzeme kataloğu bir liste olmalıdır.");
  }

  const seenIds = new Set<string>();
  return value.map((entry, index) => {
    const material = requireRecord(entry, "Panel malzeme kataloğunun " + (index + 1) + ". kaydı");
    requireOnlyKeys(
      material,
      ["id", "name", "category", "decor", "thicknessesMm", "unit"],
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

    const seenThicknesses = new Set<number>();
    const thicknessesMm = material.thicknessesMm.map((thickness) => {
      const normalizedThickness = requirePositiveMm(thickness, id + " panel kalınlığı");
      if (seenThicknesses.has(normalizedThickness)) {
        throw new Error(id + " için yinelenen panel kalınlığı bulundu.");
      }
      seenThicknesses.add(normalizedThickness);
      return normalizedThickness;
    });

    let decor: string | undefined;
    if (material.decor !== undefined) {
      if (typeof material.decor !== "string") {
        throw new Error(id + " dekor etiketi metin olmalıdır.");
      }
      if (material.decor.trim() !== "") decor = material.decor.trim();
    }

    return {
      id,
      name: material.name.trim(),
      category: "panel",
      ...(decor === undefined ? {} : { decor }),
      thicknessesMm,
      unit: "mm"
    };
  });
}

function validateEdgeBanding(value: unknown): DrawerEdgeBanding {
  const source = requireRecord(value, "Çekmece panel grubu kenar bantlama ayarları");
  for (const key of Object.keys(source)) {
    if (!(DRAWER_PANEL_GROUPS as readonly string[]).includes(key)) {
      throw new Error("Desteklenmeyen çekmece panel grubu: " + key + ".");
    }
  }

  const result = {} as Record<DrawerPanelGroup, DrawerEdgeBandingEdges>;
  for (const group of DRAWER_PANEL_GROUPS) {
    const edges = requireRecord(source[group], group + " kenar bantlama ayarları");
    requireOnlyKeys(edges, EDGE_KEYS, group + " kenar bantlama ayarları");
    const normalized = {} as DrawerEdgeBandingEdges;
    for (const edge of EDGE_KEYS) {
      if (typeof edges[edge] !== "boolean") {
        throw new Error(group + " grubunun " + edge + " kenar bantlama değeri boolean olmalıdır.");
      }
      normalized[edge] = edges[edge] as boolean;
    }
    result[group] = normalized;
  }
  return result;
}

function validateGrainDirections(value: unknown): DrawerGrainDirections {
  const source = requireRecord(value, "Çekmece panel grubu damar yönleri");
  for (const key of Object.keys(source)) {
    if (!(DRAWER_PANEL_GROUPS as readonly string[]).includes(key)) {
      throw new Error("Desteklenmeyen damar yönü panel grubu: " + key + ".");
    }
  }

  const result = {} as Record<DrawerPanelGroup, DrawerGrainDirection>;
  for (const group of DRAWER_PANEL_GROUPS) {
    const direction = source[group];
    if (!(GRAIN_DIRECTIONS as readonly unknown[]).includes(direction)) {
      throw new Error(group + " panel grubu damar yönü geçersiz.");
    }
    result[group] = direction as DrawerGrainDirection;
  }
  return result;
}

function validatePanelMaterialIds(value: unknown): Partial<Record<DrawerPanelGroup, string>> {
  if (value === undefined) return {};
  const source = requireRecord(value, "Çekmece panel malzeme atamaları");
  const result: Partial<Record<DrawerPanelGroup, string>> = {};

  for (const [group, materialId] of Object.entries(source)) {
    if (!(DRAWER_PANEL_GROUPS as readonly string[]).includes(group)) {
      throw new Error("Desteklenmeyen çekmece panel malzeme grubu: " + group + ".");
    }
    result[group as DrawerPanelGroup] = requireMaterialId(
      materialId,
      group + " panel grubu malzeme kimliği"
    );
  }
  return result;
}

/** Validates the versioned request without inventing dimensions or catalogue entries. */
export function validateDrawerBoxConstructionRequest(
  value: unknown
): DrawerBoxConstructionRequest {
  const root = requireRecord(value, "Çekmece kutusu konstrüksiyon isteği");
  requireOnlyKeys(root, ["schemaVersion", "furniture", "drawerGroup", "spec", "materials"],
    "Çekmece kutusu konstrüksiyon isteği");
  if (root.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen çekmece kutusu konstrüksiyon şema sürümü.");
  }

  const furniture = requireRecord(root.furniture, "Mobilya kimliği");
  requireOnlyKeys(furniture, ["id"], "Mobilya");
  const drawerGroup = requireRecord(root.drawerGroup, "Çekmece grubu kimliği");
  requireOnlyKeys(drawerGroup, ["id"], "Çekmece grubu");
  const spec = requireRecord(root.spec, "Çekmece kutusu ölçüleri");
  requireOnlyKeys(
    spec,
    [
      "outerWidth", "sideHeight", "outerDepth", "sideThickness",
      "frontBackThickness", "bottomThickness", "visibleFrontWidth",
      "visibleFrontHeight", "visibleFrontThickness", "quantity", "material",
      "materialId", "panelMaterialIds", "bottomFit", "edgeBanding", "grainDirection"
    ],
    "Çekmece kutusu ölçüleri"
  );

  const normalizedMaterials = normalizeMaterialCatalog(root.materials);
  const materialById = new Map(normalizedMaterials.map((material) => [material.id, material]));
  const materialId = spec.materialId === undefined
    ? undefined
    : requireMaterialId(spec.materialId, "Varsayılan çekmece malzeme kimliği");
  const panelMaterialIds = validatePanelMaterialIds(spec.panelMaterialIds);

  if (materialId !== undefined && !materialById.has(materialId)) {
    throw new Error("Çekmece grubu malzeme kimliği " + materialId + " katalogda bulunamadı.");
  }

  const thicknessByGroup: Record<DrawerPanelGroup, number> = {
    sidePanels: requirePositiveMm(spec.sideThickness, "Çekmece yan panel kalınlığı"),
    frontBackPanels: requirePositiveMm(spec.frontBackThickness, "Çekmece ön/arka panel kalınlığı"),
    bottomPanel: requirePositiveMm(spec.bottomThickness, "Çekmece taban kalınlığı"),
    visibleFrontPanel: requirePositiveMm(spec.visibleFrontThickness, "Çekmece ön panel kalınlığı")
  };

  for (const group of DRAWER_PANEL_GROUPS) {
    const selectedMaterialId = panelMaterialIds[group] ?? materialId;
    if (selectedMaterialId === undefined) continue;
    const selectedMaterial = materialById.get(selectedMaterialId);
    if (!selectedMaterial) {
      throw new Error(group + " panel grubu için " + selectedMaterialId +
        " malzeme kimliği katalogda bulunamadı.");
    }
    if (!selectedMaterial.thicknessesMm.includes(thicknessByGroup[group])) {
      throw new Error(selectedMaterial.name + " için " + thicknessByGroup[group] +
        " mm kalınlık katalogda tanımlı değil.");
    }
  }

  if (spec.bottomFit !== "between-sides-and-front-back") {
    throw new Error("Desteklenmeyen çekmece taban konstrüksiyonu.");
  }

  const quantity = requirePositiveCount(spec.quantity, "Çekmece adedi");
  if (!Number.isSafeInteger(quantity * 2)) {
    throw new Error("Çekmece parça adedi güvenli sayı sınırını aşıyor.");
  }

  if (typeof spec.material !== "string" || spec.material.trim() === "") {
    throw new Error("Çekmece malzemesi belirtilmelidir.");
  }

  const normalizedSpec: DrawerBoxConstructionSpec = {
    outerWidth: requirePositiveMm(spec.outerWidth, "Çekmece kutusu dış genişliği"),
    sideHeight: requirePositiveMm(spec.sideHeight, "Çekmece yan panel yüksekliği"),
    outerDepth: requirePositiveMm(spec.outerDepth, "Çekmece kutusu dış derinliği"),
    sideThickness: thicknessByGroup.sidePanels,
    frontBackThickness: thicknessByGroup.frontBackPanels,
    bottomThickness: requirePositiveMm(spec.bottomThickness, "Çekmece taban kalınlığı"),
    visibleFrontWidth: requirePositiveMm(spec.visibleFrontWidth, "Çekmece ön panel genişliği"),
    visibleFrontHeight: requirePositiveMm(spec.visibleFrontHeight, "Çekmece ön panel yüksekliği"),
    visibleFrontThickness: thicknessByGroup.visibleFrontPanel,
    quantity,
    material: spec.material.trim(),
    ...(materialId === undefined ? {} : { materialId }),
    ...(Object.keys(panelMaterialIds).length === 0 ? {} : { panelMaterialIds }),
    bottomFit: "between-sides-and-front-back",
    edgeBanding: validateEdgeBanding(spec.edgeBanding),
    grainDirection: validateGrainDirections(spec.grainDirection)
  };

  return {
    schemaVersion: 1,
    furniture: { id: requireIdentifier(furniture.id, "Mobilya kimliği") },
    drawerGroup: { id: requireIdentifier(drawerGroup.id, "Çekmece grubu kimliği") },
    spec: normalizedSpec,
    materials: normalizedMaterials
  };
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

/**
 * Calculates the four grouped drawer-box panel rows. The visible front remains
 * independent from the box opening; no slide, reveal or hardware geometry is
 * inferred. All output dimensions are mm and quantities are piece counts.
 */
export function calculateDrawerBoxConstruction(value: unknown): DrawerBoxConstructionResult {
  const request = validateDrawerBoxConstructionRequest(value);
  const { furniture, drawerGroup, spec, materials } = request;
  const innerWidthMm = roundMm(
    spec.outerWidth - spec.sideThickness * 2,
    "Çekmece iç genişliği"
  );
  const bottomLengthMm = roundMm(
    spec.outerDepth - spec.frontBackThickness * 2,
    "Çekmece taban uzunluğu"
  );
  const materialById = new Map(materials.map((material) => [material.id, material]));

  function createPart(
    suffix: string,
    name: string,
    width: number,
    length: number,
    thickness: number,
    quantity: number,
    group: DrawerPanelGroup
  ): DrawerBoxConstructionPart {
    const selectedMaterialId = spec.panelMaterialIds?.[group] ?? spec.materialId;
    const selectedMaterial = selectedMaterialId === undefined
      ? undefined
      : materialById.get(selectedMaterialId);

    return {
      id: furniture.id + "-" + drawerGroup.id + "-" + suffix,
      furnitureId: furniture.id,
      drawerGroupId: drawerGroup.id,
      name,
      width: roundMm(width, name + " genişliği"),
      length: roundMm(length, name + " uzunluğu"),
      thickness: roundMm(thickness, name + " kalınlığı"),
      quantity,
      material: selectedMaterial?.name ?? spec.material,
      ...(selectedMaterialId === undefined ? {} : { materialId: selectedMaterialId }),
      edgeBanding: { ...spec.edgeBanding[group] },
      grainDirection: spec.grainDirection[group]
    };
  }

  return {
    schemaVersion: 1,
    innerWidthMm,
    bottomLengthMm,
    parts: [
      createPart(
        "side-panels",
        "Çekmece Yan Paneli",
        spec.sideHeight,
        spec.outerDepth,
        spec.sideThickness,
        spec.quantity * 2,
        "sidePanels"
      ),
      createPart(
        "front-back-panels",
        "Çekmece Ön/Arka Paneli",
        innerWidthMm,
        spec.sideHeight,
        spec.frontBackThickness,
        spec.quantity * 2,
        "frontBackPanels"
      ),
      createPart(
        "bottom-panel",
        "Çekmece Tabanı",
        innerWidthMm,
        bottomLengthMm,
        spec.bottomThickness,
        spec.quantity,
        "bottomPanel"
      ),
      createPart(
        "visible-front-panel",
        "Çekmece Ön Paneli",
        spec.visibleFrontWidth,
        spec.visibleFrontHeight,
        spec.visibleFrontThickness,
        spec.quantity,
        "visibleFrontPanel"
      )
    ]
  };
}
