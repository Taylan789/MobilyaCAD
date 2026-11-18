import type { Part } from "../types/part";
import { roundMeasurement, validateMeasurement } from "./measurement";

export type DrawerPanelGroup =
  | "sidePanels"
  | "frontBackPanels"
  | "bottomPanel"
  | "visibleFrontPanel";

export interface DrawerPanelMaterialAssignment {
  materialId: string;
  material: string;
}

type DrawerEdgeBanding = Record<DrawerPanelGroup, Part["edgeBanding"]>;
type DrawerGrainDirection = Record<DrawerPanelGroup, Part["grainDirection"]>;

/**
 * A drawer box specification with all construction dimensions supplied explicitly.
 * The visible front is independent from the box opening; no reveal or runner
 * clearance is inferred. All dimensions are millimetres.
 */
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
  /** Optional project catalogue reference; absent for legacy free-text drawer materials. */
  materialId?: string;
  /** Optional per-panel-group catalogue overrides; each group falls back to materialId. */
  panelMaterialIds?: Partial<Record<DrawerPanelGroup, string>>;
  bottomFit: "between-sides-and-front-back";
  edgeBanding: DrawerEdgeBanding;
  grainDirection: DrawerGrainDirection;
}

const panelGroups: DrawerPanelGroup[] = [
  "sidePanels",
  "frontBackPanels",
  "bottomPanel",
  "visibleFrontPanel"
];

function roundedPositiveMeasurement(value: number, name: string): number {
  const rounded = roundMeasurement(value);
  validateMeasurement(rounded, name);
  return rounded;
}

function validateEdgeBanding(
  value: unknown,
  name: string
): asserts value is Part["edgeBanding"] {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${name} kenar bantlama ayarı eksik.`);
  }

  const flags = value as Record<string, unknown>;
  if (
    typeof flags.top !== "boolean" ||
    typeof flags.bottom !== "boolean" ||
    typeof flags.left !== "boolean" ||
    typeof flags.right !== "boolean"
  ) {
    throw new Error(`${name} kenar bantlama ayarı geçersiz.`);
  }
}

function validateGrainDirection(
  value: unknown,
  name: string
): asserts value is Part["grainDirection"] {
  if (value !== "length" && value !== "width" && value !== "none") {
    throw new Error(`${name} damar yönü geçersiz.`);
  }
}

function cloneEdgeBanding(
  flags: Part["edgeBanding"]
): Part["edgeBanding"] {
  return {
    top: flags.top,
    bottom: flags.bottom,
    left: flags.left,
    right: flags.right
  };
}

/**
 * Builds grouped cut-list rows for a simple drawer box whose bottom panel is
 * explicitly specified as fitting between the side, front and rear panels.
 *
 * This calculator does not infer slide clearances, reveal gaps, joinery,
 * hardware, machining operations, or CNC coordinates. The visible front
 * dimensions, panel thicknesses, edge flags and grain directions are inputs.
 */
export function calculateDrawerBoxParts(
  furnitureId: string,
  drawerGroupId: string,
  spec: DrawerBoxConstructionSpec,
  panelMaterials: Partial<Record<DrawerPanelGroup, DrawerPanelMaterialAssignment>> = {}
): Part[] {
  if (typeof furnitureId !== "string" || furnitureId.trim() === "") {
    throw new Error("Mobilya kimliği gereklidir.");
  }

  if (typeof drawerGroupId !== "string" || drawerGroupId.trim() === "") {
    throw new Error("Çekmece grubu kimliği gereklidir.");
  }

  if (!Number.isSafeInteger(spec.quantity) || spec.quantity < 0) {
    throw new Error("Çekmece adedi sıfır veya pozitif tam sayı olmalıdır.");
  }

  if (spec.quantity === 0) {
    return [];
  }

  if (!Number.isSafeInteger(spec.quantity * 2)) {
    throw new Error("Çekmece parça adedi güvenli sayı sınırını aşıyor.");
  }

  const bottomFit: unknown = spec.bottomFit;
  if (bottomFit !== "between-sides-and-front-back") {
    throw new Error("Desteklenmeyen çekmece taban konstrüksiyonu.");
  }

  validateMeasurement(spec.outerWidth, "Çekmece kutusu dış genişliği");
  validateMeasurement(spec.sideHeight, "Çekmece yan panel yüksekliği");
  validateMeasurement(spec.outerDepth, "Çekmece kutusu dış derinliği");
  validateMeasurement(spec.sideThickness, "Çekmece yan panel kalınlığı");
  validateMeasurement(spec.frontBackThickness, "Çekmece ön/arka panel kalınlığı");
  validateMeasurement(spec.bottomThickness, "Çekmece taban kalınlığı");
  validateMeasurement(spec.visibleFrontWidth, "Çekmece ön panel genişliği");
  validateMeasurement(spec.visibleFrontHeight, "Çekmece ön panel yüksekliği");
  validateMeasurement(spec.visibleFrontThickness, "Çekmece ön panel kalınlığı");

  if (typeof spec.material !== "string" || spec.material.trim() === "") {
    throw new Error("Çekmece malzemesi belirtilmelidir.");
  }

  for (const group of panelGroups) {
    validateEdgeBanding(spec.edgeBanding[group], group);
    validateGrainDirection(spec.grainDirection[group], group);
  }

  const innerWidth = roundedPositiveMeasurement(
    spec.outerWidth - spec.sideThickness * 2,
    "Çekmece iç genişliği"
  );
  const bottomLength = roundedPositiveMeasurement(
    spec.outerDepth - spec.frontBackThickness * 2,
    "Çekmece taban uzunluğu"
  );

  const material = spec.material.trim();
  const productionNote =
    "Açık çekmece kutusu geometrisi; ray, bağlantı elemanı ve CNC işlemleri dahil değildir.";

  function createPart(
    suffix: string,
    name: string,
    width: number,
    length: number,
    thickness: number,
    quantity: number,
    group: DrawerPanelGroup
  ): Part {
    const assignment = panelMaterials[group];
    if (spec.panelMaterialIds?.[group] && !assignment) {
      throw new Error(`${group} panel grubu katalog malzeme çözümlemesi gerektiriyor.`);
    }
    const partMaterial = assignment?.material ?? material;
    const partMaterialId = assignment?.materialId ?? spec.materialId;

    return {
      id: `${furnitureId}-${drawerGroupId}-${suffix}`,
      furnitureId,
      drawerGroupId,
      name,
      width: roundedPositiveMeasurement(width, `${name} genişliği`),
      length: roundedPositiveMeasurement(length, `${name} uzunluğu`),
      thickness: roundedPositiveMeasurement(thickness, `${name} kalınlığı`),
      quantity,
      edgeBanding: cloneEdgeBanding(spec.edgeBanding[group]),
      material: partMaterial,
      ...(partMaterialId ? { materialId: partMaterialId } : {}),
      cncOperations: [],
      grainDirection: spec.grainDirection[group],
      productionNote
    };
  }

  return [
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
      innerWidth,
      spec.sideHeight,
      spec.frontBackThickness,
      spec.quantity * 2,
      "frontBackPanels"
    ),
    createPart(
      "bottom-panel",
      "Çekmece Tabanı",
      innerWidth,
      bottomLength,
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
  ];
}
