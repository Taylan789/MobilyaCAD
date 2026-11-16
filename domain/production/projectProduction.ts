import { calculateCabinetConstruction } from "./cabinetConstruction.ts";
import type {
  CabinetConstructionPart,
  CabinetInnerDimensionsMm
} from "./cabinetConstruction.ts";

export interface CabinetProjectProductionRequest {
  schemaVersion: 1;
  furniture: readonly unknown[];
}

export interface CabinetProjectFurnitureResult {
  furnitureId: string;
  innerDimensionsMm: CabinetInnerDimensionsMm;
}

export interface CabinetProjectProductionResult {
  schemaVersion: 1;
  furniture: CabinetProjectFurnitureResult[];
  parts: CabinetConstructionPart[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFurnitureId(value: unknown, index: number): string {
  if (!isRecord(value) || !isRecord(value.furniture)) {
    throw new Error(`Projenin ${index + 1}. mobilya konstrüksiyon isteği geçersiz.`);
  }

  const id = value.furniture.id;
  if (typeof id !== "string" || id.trim() === "" || id.trim() !== id) {
    throw new Error(`Projenin ${index + 1}. mobilya kimliği geçersiz.`);
  }
  return id;
}

/**
 * Calculates and combines explicit cabinet construction requests for a project.
 *
 * Each furniture item is calculated independently using its own profile and
 * material catalogue. Part IDs, furniture IDs, dimensions and quantity values
 * are retained; no rows are merged and no missing construction defaults are
 * inferred. This is a domain aggregation primitive, not a CNC-ready export.
 */
export function calculateCabinetProjectProduction(
  value: unknown
): CabinetProjectProductionResult {
  if (!isRecord(value)) {
    throw new Error("Proje üretim isteği geçerli bir nesne olmalıdır.");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen proje üretim şema sürümü.");
  }
  if (!Array.isArray(value.furniture)) {
    throw new Error("Proje mobilya konstrüksiyon istekleri bir liste olmalıdır.");
  }

  const furniture: CabinetProjectFurnitureResult[] = [];
  const parts: CabinetConstructionPart[] = [];
  const seenFurnitureIds = new Set<string>();
  const seenPartIds = new Set<string>();

  for (const [index, request] of value.furniture.entries()) {
    const furnitureId = readFurnitureId(request, index);
    if (seenFurnitureIds.has(furnitureId)) {
      throw new Error(`Proje içinde yinelenen mobilya kimliği: ${furnitureId}.`);
    }
    seenFurnitureIds.add(furnitureId);

    const result = calculateCabinetConstruction(request);
    for (const part of result.parts) {
      if (part.furnitureId !== furnitureId) {
        throw new Error(`${part.id} parçasının mobilya kimliği proje girdisiyle eşleşmiyor.`);
      }
      if (seenPartIds.has(part.id)) {
        throw new Error(`Proje içinde yinelenen üretim parçası kimliği: ${part.id}.`);
      }
      seenPartIds.add(part.id);
      parts.push(part);
    }

    furniture.push({
      furnitureId,
      innerDimensionsMm: { ...result.innerDimensionsMm }
    });
  }

  return { schemaVersion: 1, furniture, parts };
}
