import type { DrawerBoxConstructionSpec } from "./drawerBoxParts";

export interface DrawerBoxProjectConfig {
  id: string;
  spec: DrawerBoxConstructionSpec;
}

const panelGroups = ["sidePanels", "frontBackPanels", "bottomPanel", "visibleFrontPanel"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveMeasurement(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Missing configuration remains valid for legacy v1 files; malformed supplied data is rejected. */
export function isDrawerBoxProjectConfig(value: unknown): value is DrawerBoxProjectConfig {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.trim() === "") return false;
  const spec = value.spec;
  if (!isRecord(spec)) return false;

  const dimensions = [
    spec.outerWidth, spec.sideHeight, spec.outerDepth, spec.sideThickness,
    spec.frontBackThickness, spec.bottomThickness, spec.visibleFrontWidth,
    spec.visibleFrontHeight, spec.visibleFrontThickness
  ];
  if (!dimensions.every(isPositiveMeasurement)) return false;
  if (!Number.isSafeInteger(spec.quantity) || Number(spec.quantity) < 1) return false;
  if (typeof spec.material !== "string" || spec.material.trim() === "") return false;
  if (
    spec.materialId !== undefined &&
    (typeof spec.materialId !== "string" || spec.materialId.trim() === "")
  ) return false;
  if (spec.bottomFit !== "between-sides-and-front-back") return false;
  const edgeBanding = spec.edgeBanding;
  const grainDirection = spec.grainDirection;
  if (!isRecord(edgeBanding) || !isRecord(grainDirection)) return false;

  return panelGroups.every((group) => {
    const banding = edgeBanding[group];
    const grain = grainDirection[group];
    return isRecord(banding) &&
      typeof banding.top === "boolean" &&
      typeof banding.bottom === "boolean" &&
      typeof banding.left === "boolean" &&
      typeof banding.right === "boolean" &&
      (grain === "length" || grain === "width" || grain === "none");
  });
}

export function isValidDrawerBoxProjectSpecs(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;

  const ids = new Set<string>();
  for (const config of value) {
    if (!isDrawerBoxProjectConfig(config) || ids.has(config.id)) return false;
    ids.add(config.id);
  }

  return true;
}
