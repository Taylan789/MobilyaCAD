import { calculateCabinetConstruction } from "./cabinetConstruction.ts";
import { calculateBookshelfConstruction } from "./bookshelfConstruction.ts";
import type {
  CabinetConstructionPart,
  CabinetInnerDimensionsMm
} from "./cabinetConstruction.ts";
import { calculateDrawerBoxConstruction } from "./drawerBoxConstruction.ts";
import type { DrawerBoxConstructionPart } from "./drawerBoxConstruction.ts";

export interface CabinetProjectProductionRequest {
  schemaVersion: 1;
  furniture: readonly unknown[];
  /** Optional drawer-box requests, each attached to a furniture entry above. */
  drawerBoxes?: readonly unknown[];
}

export interface CabinetProjectFurnitureResult {
  furnitureId: string;
  /** Present for explicit family-discriminated requests; legacy cabinet results omit it. */
  family?: "cabinet" | "bookshelf";
  innerDimensionsMm: CabinetInnerDimensionsMm;
}

export interface DrawerGroupProductionResult {
  furnitureId: string;
  drawerGroupId: string;
  innerWidthMm: number;
  bottomLengthMm: number;
}

export type ProjectProductionPart = CabinetConstructionPart | DrawerBoxConstructionPart;

export interface CabinetProjectProductionResult {
  schemaVersion: 1;
  furniture: CabinetProjectFurnitureResult[];
  /** Present only when at least one drawer-box request was calculated. */
  drawerGroups?: DrawerGroupProductionResult[];
  parts: ProjectProductionPart[];
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

function readFurnitureFamily(value: unknown, index: number): "cabinet" | "bookshelf" {
  if (!isRecord(value)) {
    throw new Error("Projenin " + (index + 1) + ". mobilya ailesi okunamadı.");
  }
  if (value.family === undefined || value.family === "cabinet") return "cabinet";
  if (value.family === "bookshelf") return "bookshelf";
  throw new Error("Projenin " + (index + 1) + ". mobilya ailesi desteklenmiyor: " + String(value.family) + ".");
}

function readDrawerGroupId(value: unknown, index: number): string {
  if (!isRecord(value) || !isRecord(value.drawerGroup)) {
    throw new Error(`Projenin ${index + 1}. çekmece grubu isteği geçersiz.`);
  }

  const id = value.drawerGroup.id;
  if (typeof id !== "string" || id.trim() === "" || id.trim() !== id) {
    throw new Error(`Projenin ${index + 1}. çekmece grubu kimliği geçersiz.`);
  }
  return id;
}

/**
 * Calculates and combines explicit cabinet and optional drawer-box requests.
 *
 * Each cabinet is calculated independently using its own profile and material
 * catalogue. Drawer groups must reference one of those furniture IDs. The
 * shared Part list preserves source IDs, mm dimensions, quantities, material
 * references and edge flags; drawer rows additionally retain drawerGroupId
 * and grainDirection. No rows are merged and no missing construction defaults
 * are inferred. This is a domain aggregation primitive, not a CNC-ready export.
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
  if (value.drawerBoxes !== undefined && !Array.isArray(value.drawerBoxes)) {
    throw new Error("Proje çekmece kutusu konstrüksiyon istekleri bir liste olmalıdır.");
  }

  const furniture: CabinetProjectFurnitureResult[] = [];
  const drawerGroups: DrawerGroupProductionResult[] = [];
  const parts: ProjectProductionPart[] = [];
  const seenFurnitureIds = new Set<string>();
  const seenDrawerGroupIds = new Set<string>();
  const seenPartIds = new Set<string>();

  for (const [index, request] of value.furniture.entries()) {
    const furnitureId = readFurnitureId(request, index);
    if (seenFurnitureIds.has(furnitureId)) {
      throw new Error(`Proje içinde yinelenen mobilya kimliği: ${furnitureId}.`);
    }
    seenFurnitureIds.add(furnitureId);

    const family = readFurnitureFamily(request, index);
    const result = family === "bookshelf"
      ? calculateBookshelfConstruction(request)
      : calculateCabinetConstruction(request);
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

    const hasExplicitFamily = isRecord(request) && request.family !== undefined;
    furniture.push({
      furnitureId,
      ...(hasExplicitFamily ? { family } : {}),
      innerDimensionsMm: { ...result.innerDimensionsMm }
    });
  }

  const drawerRequests = value.drawerBoxes ?? [];
  for (const [index, request] of drawerRequests.entries()) {
    const furnitureId = readFurnitureId(request, index);
    if (!seenFurnitureIds.has(furnitureId)) {
      throw new Error(`${furnitureId} çekmece grubu için proje mobilya listesinde bulunamadı.`);
    }

    const drawerGroupId = readDrawerGroupId(request, index);
    const groupKey = JSON.stringify([furnitureId, drawerGroupId]);
    if (seenDrawerGroupIds.has(groupKey)) {
      throw new Error(`Proje içinde yinelenen çekmece grubu kimliği: ${furnitureId}/${drawerGroupId}.`);
    }
    seenDrawerGroupIds.add(groupKey);

    const result = calculateDrawerBoxConstruction(request);
    for (const part of result.parts) {
      if (part.furnitureId !== furnitureId || part.drawerGroupId !== drawerGroupId) {
        throw new Error(`${part.id} parçasının mobilya veya çekmece grubu kimliği proje girdisiyle eşleşmiyor.`);
      }
      if (seenPartIds.has(part.id)) {
        throw new Error(`Proje içinde yinelenen üretim parçası kimliği: ${part.id}.`);
      }
      seenPartIds.add(part.id);
      parts.push(part);
    }

    drawerGroups.push({
      furnitureId,
      drawerGroupId,
      innerWidthMm: result.innerWidthMm,
      bottomLengthMm: result.bottomLengthMm
    });
  }

  return {
    schemaVersion: 1,
    furniture,
    ...(drawerGroups.length === 0 ? {} : { drawerGroups }),
    parts
  };
}
