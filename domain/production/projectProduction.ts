import { calculateCabinetConstruction } from "./cabinetConstruction.ts";
import { calculateBookshelfConstruction } from "./bookshelfConstruction.ts";
import { calculateTableConstruction } from "./tableConstruction.ts";
import { calculateWardrobeConstruction } from "./wardrobeConstruction.ts";
import type {
  CabinetConstructionPart,
  CabinetInnerDimensionsMm
} from "./cabinetConstruction.ts";
import { calculateDrawerBoxConstruction } from "./drawerBoxConstruction.ts";
import type { DrawerBoxConstructionPart } from "./drawerBoxConstruction.ts";
import type { TableConstructionPart, TableConstructionResult } from "./tableConstruction.ts";
import type { WardrobeConstructionPart } from "./wardrobeConstruction.ts";

export interface CabinetProjectProductionRequest {
  schemaVersion: 1;
  furniture: readonly unknown[];
  /** Optional drawer-box requests, each attached to a furniture entry above. */
  drawerBoxes?: readonly unknown[];
}

export type CabinetProjectFurnitureResult =
  | {
      furnitureId: string;
      /** Present for explicit cabinet/bookshelf requests; legacy cabinet results omit it. */
      family?: "cabinet" | "bookshelf" | "wardrobe";
      innerDimensionsMm: CabinetInnerDimensionsMm;
    }
  | {
      furnitureId: string;
      family: "table";
      overallDimensionsMm: TableConstructionResult["overallDimensionsMm"];
    };

export interface DrawerGroupProductionResult {
  furnitureId: string;
  drawerGroupId: string;
  innerWidthMm: number;
  bottomLengthMm: number;
}

export type ProjectProductionPart = CabinetConstructionPart | DrawerBoxConstructionPart | TableConstructionPart | WardrobeConstructionPart;

export interface CabinetProjectProductionResult {
  schemaVersion: 1;
  furniture: CabinetProjectFurnitureResult[];
  /** Present only when at least one drawer-box request was calculated. */
  drawerGroups?: DrawerGroupProductionResult[];
  parts: ProjectProductionPart[];
}


export type SupportedProjectFurnitureFamily = "cabinet" | "bookshelf" | "table" | "wardrobe";

export interface ProjectProductionFurnitureDiagnostic {
  furnitureId: string | null;
  family: string | null;
  code: "unsupported-family" | "invalid-request" | "invalid-construction" | "invalid-drawer";
  message: string;
}

export interface CabinetProjectProductionReport {
  schemaVersion: 1;
  status: "ready" | "blocked" | "empty";
  /** False for blocked or empty projects; partial part lists are never returned. */
  canExport: boolean;
  isEmpty: boolean;
  supportedFurniture: Array<{
    furnitureId: string;
    family: SupportedProjectFurnitureFamily;
  }>;
  unsupportedFurniture: ProjectProductionFurnitureDiagnostic[];
  blockedFurniture: ProjectProductionFurnitureDiagnostic[];
  projectErrors: string[];
  firstError: string | null;
  /** Null whenever any furniture, drawer group or project-level validation fails. */
  result: CabinetProjectProductionResult | null;
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

function readFurnitureFamily(value: unknown, index: number): SupportedProjectFurnitureFamily {
  if (!isRecord(value)) {
    throw new Error("Projenin " + (index + 1) + ". mobilya ailesi okunamadı.");
  }
  if (value.family === undefined || value.family === "cabinet") return "cabinet";
  if (value.family === "bookshelf") return "bookshelf";
  if (value.family === "table") return "table";
  if (value.family === "wardrobe") return "wardrobe";
  throw new Error("Projenin " + (index + 1) + ". mobilya ailesi desteklenmiyor: " + String(value.family) + ".");
}



function calculateFurnitureRequest(
  request: unknown,
  family: SupportedProjectFurnitureFamily,
  furnitureId: string
): {
  furniture: CabinetProjectFurnitureResult;
  parts: readonly ProjectProductionPart[];
} {
  if (family === "table") {
    const result = calculateTableConstruction(request);
    return {
      furniture: {
        furnitureId,
        family: "table",
        overallDimensionsMm: { ...result.overallDimensionsMm }
      },
      parts: result.parts
    };
  }

  const result = family === "bookshelf"
    ? calculateBookshelfConstruction(request)
    : family === "wardrobe"
      ? calculateWardrobeConstruction(request)
      : calculateCabinetConstruction(request);
  const hasExplicitFamily = isRecord(request) && request.family !== undefined;

  return {
    furniture: {
      furnitureId,
      ...(hasExplicitFamily ? { family } : {}),
      innerDimensionsMm: { ...result.innerDimensionsMm }
    },
    parts: result.parts
  };
}

function diagnosticFamily(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (value.family === undefined) return "cabinet";
  return typeof value.family === "string" ? value.family : null;
}

function diagnosticMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Validates a complete project without exposing a partial cut list.
 * Unsupported families and invalid furniture/drawer configurations are
 * reported independently so the UI can explain every blocked item.
 */
export function calculateCabinetProjectProductionWithDiagnostics(
  value: unknown
): CabinetProjectProductionReport {
  const supportedFurniture: CabinetProjectProductionReport["supportedFurniture"] = [];
  const unsupportedFurniture: ProjectProductionFurnitureDiagnostic[] = [];
  const blockedFurniture: ProjectProductionFurnitureDiagnostic[] = [];
  const projectErrors: string[] = [];
  const furnitureResults: CabinetProjectFurnitureResult[] = [];
  const drawerGroups: DrawerGroupProductionResult[] = [];
  const parts: ProjectProductionPart[] = [];
  const seenFurnitureIds = new Set<string>();
  const calculatedFurnitureIds = new Set<string>();
  const familyByFurnitureId = new Map<string, SupportedProjectFurnitureFamily>();
  const seenDrawerGroupIds = new Set<string>();
  const seenPartIds = new Set<string>();
  let firstError: string | null = null;

  const addProjectError = (message: string): void => {
    projectErrors.push(message);
    firstError ??= message;
  };
  const addUnsupported = (
    furnitureId: string | null,
    family: string | null,
    message: string
  ): void => {
    unsupportedFurniture.push({
      furnitureId,
      family,
      code: "unsupported-family",
      message
    });
    firstError ??= message;
  };
  const addBlocked = (
    furnitureId: string | null,
    family: string | null,
    code: ProjectProductionFurnitureDiagnostic["code"],
    message: string
  ): void => {
    blockedFurniture.push({ furnitureId, family, code, message });
    firstError ??= message;
  };

  if (!isRecord(value)) {
    addProjectError("Proje üretim isteği geçerli bir nesne olmalıdır.");
  } else if (value.schemaVersion !== 1) {
    addProjectError("Desteklenmeyen proje üretim şema sürümü.");
  } else if (!Array.isArray(value.furniture)) {
    addProjectError("Proje mobilya konstrüksiyon istekleri bir liste olmalıdır.");
  } else if (value.drawerBoxes !== undefined && !Array.isArray(value.drawerBoxes)) {
    addProjectError("Proje çekmece kutusu konstrüksiyon istekleri bir liste olmalıdır.");
  }

  if (projectErrors.length > 0 || !isRecord(value) || !Array.isArray(value.furniture)) {
    return {
      schemaVersion: 1,
      status: "blocked",
      canExport: false,
      isEmpty: false,
      supportedFurniture,
      unsupportedFurniture,
      blockedFurniture,
      projectErrors,
      firstError,
      result: null
    };
  }

  for (const [index, request] of value.furniture.entries()) {
    let furnitureId: string;
    try {
      furnitureId = readFurnitureId(request, index);
    } catch (error) {
      addBlocked(null, diagnosticFamily(request), "invalid-request", diagnosticMessage(error));
      continue;
    }

    if (seenFurnitureIds.has(furnitureId)) {
      addProjectError(`Proje içinde yinelenen mobilya kimliği: ${furnitureId}.`);
      continue;
    }
    seenFurnitureIds.add(furnitureId);

    let family: SupportedProjectFurnitureFamily;
    try {
      family = readFurnitureFamily(request, index);
    } catch (error) {
      addUnsupported(furnitureId, diagnosticFamily(request), diagnosticMessage(error));
      continue;
    }
    familyByFurnitureId.set(furnitureId, family);

    try {
      const calculated = calculateFurnitureRequest(request, family, furnitureId);
      for (const part of calculated.parts) {
        if (part.furnitureId !== furnitureId) {
          throw new Error(`${part.id} parçasının mobilya kimliği proje girdisiyle eşleşmiyor.`);
        }
        if (seenPartIds.has(part.id)) {
          throw new Error(`Proje içinde yinelenen üretim parçası kimliği: ${part.id}.`);
        }
        seenPartIds.add(part.id);
      }

      furnitureResults.push(calculated.furniture);
      parts.push(...calculated.parts);
      calculatedFurnitureIds.add(furnitureId);
      supportedFurniture.push({ furnitureId, family });
    } catch (error) {
      addBlocked(furnitureId, family, "invalid-construction", diagnosticMessage(error));
    }
  }

  const drawerRequests = (value.drawerBoxes ?? []) as readonly unknown[];
  for (const [index, request] of drawerRequests.entries()) {
    let furnitureId: string;
    try {
      furnitureId = readFurnitureId(request, index);
    } catch (error) {
      addBlocked(null, null, "invalid-drawer", diagnosticMessage(error));
      continue;
    }

    const family = familyByFurnitureId.get(furnitureId) ?? null;
    if (!seenFurnitureIds.has(furnitureId)) {
      addBlocked(
        furnitureId,
        family,
        "invalid-drawer",
        `${furnitureId} çekmece grubu için proje mobilya listesinde bulunamadı.`
      );
      continue;
    }
    if (!calculatedFurnitureIds.has(furnitureId)) {
      addBlocked(
        furnitureId,
        family,
        "invalid-drawer",
        `${furnitureId} mobilyasının konstrüksiyonu doğrulanmadığı için çekmece grubu hesaplanamadı.`
      );
      continue;
    }

    let drawerGroupId: string;
    try {
      drawerGroupId = readDrawerGroupId(request, index);
    } catch (error) {
      addBlocked(furnitureId, family, "invalid-drawer", diagnosticMessage(error));
      continue;
    }

    const groupKey = JSON.stringify([furnitureId, drawerGroupId]);
    if (seenDrawerGroupIds.has(groupKey)) {
      addBlocked(
        furnitureId,
        family,
        "invalid-drawer",
        `Proje içinde yinelenen çekmece grubu kimliği: ${furnitureId}/${drawerGroupId}.`
      );
      continue;
    }
    seenDrawerGroupIds.add(groupKey);

    try {
      const result = calculateDrawerBoxConstruction(request);
      for (const part of result.parts) {
        if (part.furnitureId !== furnitureId || part.drawerGroupId !== drawerGroupId) {
          throw new Error(`${part.id} parçasının mobilya veya çekmece grubu kimliği proje girdisiyle eşleşmiyor.`);
        }
        if (seenPartIds.has(part.id)) {
          throw new Error(`Proje içinde yinelenen üretim parçası kimliği: ${part.id}.`);
        }
        seenPartIds.add(part.id);
      }

      parts.push(...result.parts);
      drawerGroups.push({
        furnitureId,
        drawerGroupId,
        innerWidthMm: result.innerWidthMm,
        bottomLengthMm: result.bottomLengthMm
      });
    } catch (error) {
      addBlocked(furnitureId, family, "invalid-drawer", diagnosticMessage(error));
    }
  }

  const isEmpty = value.furniture.length === 0 && drawerRequests.length === 0;
  const canCalculate = unsupportedFurniture.length === 0 &&
    blockedFurniture.length === 0 &&
    projectErrors.length === 0;
  const result: CabinetProjectProductionResult | null = canCalculate
    ? {
        schemaVersion: 1,
        furniture: furnitureResults,
        ...(drawerGroups.length === 0 ? {} : { drawerGroups }),
        parts
      }
    : null;

  return {
    schemaVersion: 1,
    status: !canCalculate ? "blocked" : isEmpty ? "empty" : "ready",
    canExport: canCalculate && !isEmpty,
    isEmpty,
    supportedFurniture,
    unsupportedFurniture,
    blockedFurniture,
    projectErrors,
    firstError,
    result
  };
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
 * Calculates and combines explicit cabinet, bookshelf, table, wardrobe and optional drawer-box requests.
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
  const report = calculateCabinetProjectProductionWithDiagnostics(value);
  if (report.result === null) {
    throw new Error(report.firstError ?? "Proje üretim isteği üretime hazır değil.");
  }
  return report.result;
}
