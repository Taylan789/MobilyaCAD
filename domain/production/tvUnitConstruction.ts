import { calculateCabinetConstruction } from "./cabinetConstruction.ts";
import type { CabinetConstructionResult } from "./cabinetConstruction.ts";

const ROOT_KEYS = [
  "schemaVersion",
  "family",
  "mounting",
  "furniture",
  "profile",
  "materials",
  "panelMaterialOverrides"
] as const;

export interface TvUnitConstructionRequest {
  schemaVersion: 1;
  family: "tv-unit";
  mounting: "floor-standing";
  furniture: unknown;
  profile: unknown;
  materials: unknown;
  panelMaterialOverrides?: unknown;
}

export interface TvUnitConstructionResult extends CabinetConstructionResult {
  family: "tv-unit";
  mounting: "floor-standing";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCabinetRequest(value: unknown): unknown {
  if (!isRecord(value)) {
    throw new Error("TV ünitesi konstrüksiyon isteği geçerli bir nesne olmalıdır.");
  }
  for (const key of Object.keys(value)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) {
      throw new Error("TV ünitesi isteğinde desteklenmeyen alan: " + key + ".");
    }
  }
  if (value.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen TV ünitesi konstrüksiyon şema sürümü.");
  }
  if (value.family !== "tv-unit") {
    throw new Error("TV ünitesi family alanı tv-unit olmalıdır.");
  }
  if (value.mounting !== "floor-standing") {
    throw new Error("TV ünitesi v1 yalnızca floor-standing gövdeyi destekler; duvar montajı için doğrulanmış bağlantı standardı gerekir.");
  }

  return {
    schemaVersion: value.schemaVersion,
    furniture: value.furniture,
    profile: value.profile,
    materials: value.materials,
    ...(value.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: value.panelMaterialOverrides })
  };
}

/**
 * Calculates an explicitly floor-standing TV-unit carcass using the shared
 * cabinet geometry and material rules. Feet, plinths, wall anchors, loads,
 * hardware and CNC operations are intentionally outside this v1 contract.
 */
export function calculateTvUnitConstruction(
  value: unknown
): TvUnitConstructionResult {
  const result = calculateCabinetConstruction(toCabinetRequest(value));
  return {
    family: "tv-unit",
    mounting: "floor-standing",
    innerDimensionsMm: { ...result.innerDimensionsMm },
    parts: result.parts
  };
}
