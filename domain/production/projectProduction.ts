import { calculateCabinetConstruction } from "./cabinetConstruction.ts";
import { calculateBookshelfConstruction } from "./bookshelfConstruction.ts";
import { calculateTableConstruction } from "./tableConstruction.ts";
import { calculateWardrobeConstruction } from "./wardrobeConstruction.ts";
import { calculateTvUnitConstruction } from "./tvUnitConstruction.ts";
import type { TvUnitConstructionPart } from "./tvUnitConstruction.ts";
import type {
  CabinetConstructionPart,
  CabinetInnerDimensionsMm
} from "./cabinetConstruction.ts";
import { calculateDrawerBoxConstruction } from "./drawerBoxConstruction.ts";
import { calculatePanelCutoutGeometry } from "./panelCutoutGeometry.ts";
import type { PanelCutoutGeometryResult } from "./panelCutoutGeometry.ts";
import type { DrawerBoxConstructionPart } from "./drawerBoxConstruction.ts";
import type { TableConstructionPart, TableConstructionResult } from "./tableConstruction.ts";
import type { WardrobeConstructionPart } from "./wardrobeConstruction.ts";

const edgeBandingIdPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
export type ProjectEdgeBandingEdge = (typeof EDGE_KEYS)[number];

export interface CabinetProjectProductionRequest {
  schemaVersion: 1;
  furniture: readonly unknown[];
  /** Optional drawer-box requests, each attached to a furniture entry above. */
  drawerBoxes?: readonly unknown[];
  /** Optional explicit through-cutout geometry, attached to existing Part IDs. */
  panelCutouts?: readonly unknown[];
  /** Optional user-supplied hardware BOM rows; no specifications are inferred. */
  hardwareItems?: readonly unknown[];
  /** Optional one-resource-per-Part edge-band assignment; all banded edges on that Part share it. */
  edgeBandingAssignments?: readonly unknown[];
}

export type CabinetProjectFurnitureResult =
  | {
      furnitureId: string;
      /** Present for explicit non-table family requests; legacy family-less cabinet results omit it. */
      family?: "cabinet" | "bookshelf" | "wardrobe" | "tv-unit" | "bathroom-vanity";
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

/** Explicit hardware BOM row; quantity and unit are preserved without inference. */
export interface ProjectHardwareItem {
  id: string;
  furnitureId: string;
  hardwareId: string;
  name: string;
  quantity: number;
  unit: string;
  sourceReference?: string;
}

/** Explicit catalogue identity and price unit for one Part or one directional edge. */
export interface ProjectEdgeBandingAssignment {
  partId: string;
  /** Omitted for the legacy whole-Part default; explicit values override that fallback. */
  edge?: ProjectEdgeBandingEdge;
  edgeBandingId: string;
  unit: "mm" | "m";
}

export interface ProjectEdgeBandingByEdge {
  edgeBandingId: string;
  unit: "mm" | "m";
}

export type ProjectProductionPart = (
  CabinetConstructionPart | DrawerBoxConstructionPart | TableConstructionPart | WardrobeConstructionPart | TvUnitConstructionPart
) & {
  /** Optional, explicitly validated panel profile; absent on legacy rectangular parts. */
  panelGeometry?: PanelCutoutGeometryResult;
  /** Legacy Part-level edge-band default. Explicit edge entries take precedence. */
  edgeBandingMaterialId?: string;
  /** Legacy Part-level price unit; conversion from mm to m is only explicit. */
  edgeBandingUnit?: "mm" | "m";
  /** Optional per-direction overrides for outer and cutout edges that are actually banded. */
  edgeBandingByEdge?: Partial<Record<ProjectEdgeBandingEdge, ProjectEdgeBandingByEdge>>;
};

export interface CabinetProjectProductionResult {
  schemaVersion: 1;
  furniture: CabinetProjectFurnitureResult[];
  /** Present only when at least one drawer-box request was calculated. */
  drawerGroups?: DrawerGroupProductionResult[];
  /** Present only when explicit user-supplied hardware BOM rows were validated. */
  hardwareItems?: ProjectHardwareItem[];
  parts: ProjectProductionPart[];
}


export type SupportedProjectFurnitureFamily = "cabinet" | "bookshelf" | "table" | "wardrobe" | "tv-unit" | "bathroom-vanity";

export interface ProjectProductionFurnitureDiagnostic {
  furnitureId: string | null;
  family: string | null;
  code: "unsupported-family" | "invalid-request" | "invalid-construction" | "invalid-drawer" | "invalid-panel-geometry" | "invalid-hardware" | "invalid-edge-banding";
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
  /** Export adapters must explicitly support panelGeometry before these blockers can be cleared. */
  exportBlockers: string[];
  firstError: string | null;
  /** Null whenever any furniture, drawer group or project-level validation fails. */
  result: CabinetProjectProductionResult | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  return value;
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
  if (value.family === "tv-unit") return "tv-unit";
  if (value.family === "bathroom-vanity") return "bathroom-vanity";
  throw new Error("Projenin " + (index + 1) + ". mobilya ailesi desteklenmiyor: " + String(value.family) + ".");
}

function readProjectHardwareItem(value: unknown, index: number): ProjectHardwareItem {
  const entry = requireRecord(value, "Projenin " + (index + 1) + ". donanım kalemi");
  const allowed = ["id", "furnitureId", "hardwareId", "name", "quantity", "unit", "sourceReference"];
  const unknownKey = Object.keys(entry).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) throw new Error("Donanım kaleminde desteklenmeyen alan: " + unknownKey + ".");
  const readText = (raw: unknown, label: string): string => {
    if (typeof raw !== "string" || raw.trim() === "" || raw.trim() !== raw) {
      throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
    }
    return raw;
  };
  const id = readText(entry.id, "Donanım kalemi kimliği");
  const furnitureId = readText(entry.furnitureId, id + " mobilya kimliği");
  const hardwareId = readText(entry.hardwareId, id + " donanım kimliği");
  const name = readText(entry.name, id + " donanım adı");
  const unit = readText(entry.unit, id + " donanım birimi");
  if (typeof entry.quantity !== "number" || !Number.isFinite(entry.quantity) ||
      entry.quantity <= 0 || entry.quantity > Number.MAX_SAFE_INTEGER) {
    throw new Error(id + " donanım adedi pozitif, sonlu ve güvenli sayısal aralıkta olmalıdır.");
  }
  const sourceReference = entry.sourceReference === undefined
    ? undefined
    : readText(entry.sourceReference, id + " kaynak referansı");
  return {
    id, furnitureId, hardwareId, name, quantity: entry.quantity, unit,
    ...(sourceReference === undefined ? {} : { sourceReference })
  };
}



function readProjectEdgeBandingAssignment(value: unknown, index: number): ProjectEdgeBandingAssignment {
  const entry = requireRecord(value, "Projenin " + (index + 1) + ". kenar bandı ataması");
  const allowed = ["partId", "edge", "edgeBandingId", "unit"];
  const unknownKey = Object.keys(entry).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) {
    throw new Error("Kenar bandı atamasında desteklenmeyen alan: " + unknownKey + ".");
  }
  const readText = (raw: unknown, label: string): string => {
    if (typeof raw !== "string" || raw.trim() === "" || raw.trim() !== raw) {
      throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
    }
    return raw;
  };
  const partId = readText(entry.partId, "Kenar bandı parça kimliği");
  const edgeBandingId = readText(entry.edgeBandingId, partId + " kenar bandı katalog kimliği");
  if (!edgeBandingIdPattern.test(edgeBandingId)) {
    throw new Error(partId + " kenar bandı katalog kimliği geçersiz.");
  }
  if (entry.unit !== "mm" && entry.unit !== "m") {
    throw new Error(partId + " kenar bandı birimi yalnızca mm veya m olabilir.");
  }
  const edge = entry.edge;
  if (edge !== undefined && !(EDGE_KEYS as readonly string[]).includes(edge as string)) {
    throw new Error(partId + " kenar bandı yönü top, bottom, left veya right olmalıdır.");
  }
  return { partId, edgeBandingId, unit: entry.unit, ...(edge === undefined ? {} : { edge: edge as ProjectEdgeBandingEdge }) };
}

function partHasBandedEdges(part: ProjectProductionPart): boolean {
  const hasOuterEdges = EDGE_KEYS.some((edge) => part.edgeBanding[edge]);
  const hasOpeningEdges = part.panelGeometry?.cutouts.some((opening) =>
    EDGE_KEYS.some((edge) => opening.edgeBanding[edge])
  ) ?? false;
  return hasOuterEdges || hasOpeningEdges;
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
      : family === "tv-unit"
        ? calculateTvUnitConstruction(request)
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

function normalizePanelMm(value: number, label: string): number {
  const scaled = value * 10;
  if (!Number.isFinite(scaled)) {
    throw new Error(label + " 0.1 mm normalizasyon aralığını aşıyor.");
  }
  return Math.round(scaled + Number.EPSILON * 10) / 10;
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
  const hardwareItems: ProjectHardwareItem[] = [];
  const parts: ProjectProductionPart[] = [];
  const seenFurnitureIds = new Set<string>();
  const calculatedFurnitureIds = new Set<string>();
  const familyByFurnitureId = new Map<string, SupportedProjectFurnitureFamily>();
  const seenDrawerGroupIds = new Set<string>();
  const seenHardwareItemIds = new Set<string>();
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
  } else if (value.panelCutouts !== undefined && !Array.isArray(value.panelCutouts)) {
    addProjectError("Proje panel açıklığı istekleri bir liste olmalıdır.");
  } else if (value.hardwareItems !== undefined && !Array.isArray(value.hardwareItems)) {
    addProjectError("Proje donanım kalemleri bir liste olmalıdır.");
  } else if (value.edgeBandingAssignments !== undefined && !Array.isArray(value.edgeBandingAssignments)) {
    addProjectError("Proje kenar bandı atamaları bir liste olmalıdır.");
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
      exportBlockers: [],
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

  const hardwareRequests = (value.hardwareItems ?? []) as readonly unknown[];
  for (const [index, request] of hardwareRequests.entries()) {
    let item: ProjectHardwareItem;
    try {
      item = readProjectHardwareItem(request, index);
    } catch (error) {
      addBlocked(null, null, "invalid-hardware", diagnosticMessage(error));
      continue;
    }
    const family = familyByFurnitureId.get(item.furnitureId) ?? null;
    if (!seenFurnitureIds.has(item.furnitureId)) {
      addBlocked(item.furnitureId, family, "invalid-hardware",
        item.furnitureId + " donanım kalemi için proje mobilya listesinde bulunamadı.");
      continue;
    }
    if (!calculatedFurnitureIds.has(item.furnitureId)) {
      addBlocked(item.furnitureId, family, "invalid-hardware",
        item.furnitureId + " mobilyasının konstrüksiyonu doğrulanmadığı için donanım kalemi eklenemedi.");
      continue;
    }
    if (seenHardwareItemIds.has(item.id)) {
      addBlocked(item.furnitureId, family, "invalid-hardware",
        "Yinelenen donanım kalemi kimliği: " + item.id + ".");
      continue;
    }
    seenHardwareItemIds.add(item.id);
    hardwareItems.push(item);
  }

  const panelCutoutRequests = (value.panelCutouts ?? []) as readonly unknown[];
  const partById = new Map<string, ProjectProductionPart>(parts.map((part) => [part.id, part] as const));
  const panelGeometryByPartId = new Map<string, PanelCutoutGeometryResult>();
  const seenPanelCutoutPartIds = new Set<string>();

  for (const [index, request] of panelCutoutRequests.entries()) {
    let partId: string | null = null;
    let part: ProjectProductionPart | undefined;
    try {
      const entry = requireRecord(request, "Projenin " + (index + 1) + ". panel açıklığı isteği");
      const unknownKey = Object.keys(entry).find((key) => key !== "partId" && key !== "geometry");
      if (unknownKey !== undefined) throw new Error("Panel açıklığı isteği için desteklenmeyen alan: " + unknownKey + ".");
      if (typeof entry.partId !== "string" || entry.partId.trim() === "" || entry.partId.trim() !== entry.partId) {
        throw new Error("Panel açıklığı parça kimliği geçerli olmalıdır.");
      }
      partId = entry.partId;
      if (seenPanelCutoutPartIds.has(partId)) throw new Error(partId + " parçası için yinelenen panel açıklığı geometrisi.");
      seenPanelCutoutPartIds.add(partId);
      part = partById.get(partId);
      if (!part) throw new Error(partId + " panel açıklığı için proje üretim listesinde bulunamadı.");

      const geometry = calculatePanelCutoutGeometry(entry.geometry);
      if (
        geometry.widthMm !== normalizePanelMm(part.width, part.name + " genişliği") ||
        geometry.lengthMm !== normalizePanelMm(part.length, part.name + " uzunluğu") ||
        geometry.thicknessMm !== normalizePanelMm(part.thickness, part.name + " kalınlığı")
      ) throw new Error(partId + " panel kesit geometrisi ölçüleri üretim parçasıyla eşleşmelidir.");
      for (const edge of ["top", "bottom", "left", "right"] as const) {
        if (geometry.outerEdgeBanding[edge] !== part.edgeBanding[edge]) {
          throw new Error(partId + " panel kesit geometrisinin dış kenar bantlaması üretim parçasıyla eşleşmelidir.");
        }
      }
      panelGeometryByPartId.set(partId, geometry);
    } catch (error) {
      const matchedPart = part ?? (partId === null ? undefined : partById.get(partId));
      addBlocked(
        matchedPart?.furnitureId ?? null,
        matchedPart ? familyByFurnitureId.get(matchedPart.furnitureId) ?? null : null,
        "invalid-panel-geometry",
        diagnosticMessage(error)
      );
    }
  }

  // A bathroom vanity is currently a cabinet carcass with one or more explicitly
  // measured rectangular through-openings in its top panel. No sink template,
  // plumbing clearance, mounting, feet or plinth geometry is inferred.
  for (const furniture of furnitureResults) {
    if (furniture.family !== "bathroom-vanity") continue;

    const topPartId = furniture.furnitureId + "-top";
    const topGeometry = panelGeometryByPartId.get(topPartId);
    if (topGeometry && topGeometry.cutouts.length > 0) continue;

    const alreadyBlocked = blockedFurniture.some((item) =>
      item.furnitureId === furniture.furnitureId && item.code === "invalid-panel-geometry"
    );
    if (!alreadyBlocked) {
      addBlocked(
        furniture.furnitureId,
        "bathroom-vanity",
        "invalid-panel-geometry",
        furniture.furnitureId + " banyo dolabı üst paneli için en az bir açık dikdörtgen geçiş açıklığı geometrisi gereklidir."
      );
    }
  }

  const productionParts = parts.map((part) => {
    const panelGeometry = panelGeometryByPartId.get(part.id);
    return panelGeometry === undefined ? part : { ...part, panelGeometry };
  });
  const productionPartById = new Map(productionParts.map((part) => [part.id, part] as const));
  const edgeBandingRequests = (value.edgeBandingAssignments ?? []) as readonly unknown[];
  const edgeBandingAssignments: ProjectEdgeBandingAssignment[] = [];
  const seenLegacyEdgeBandingPartIds = new Set<string>();
  const seenDirectionalEdgeBandingKeys = new Set<string>();

  for (const [index, rawAssignment] of edgeBandingRequests.entries()) {
    let assignment: ProjectEdgeBandingAssignment;
    try {
      assignment = readProjectEdgeBandingAssignment(rawAssignment, index);
    } catch (error) {
      addBlocked(null, null, "invalid-edge-banding", diagnosticMessage(error));
      continue;
    }
    const part = productionPartById.get(assignment.partId);
    if (!part) {
      addBlocked(null, null, "invalid-edge-banding",
        assignment.partId + " kenar bandı ataması için proje üretim parçasında bulunamadı.");
      continue;
    }
    const family = familyByFurnitureId.get(part.furnitureId) ?? null;
    if (assignment.edge === undefined) {
      if (!partHasBandedEdges(part)) {
        addBlocked(part.furnitureId, family, "invalid-edge-banding",
          part.id + " parçasında kenar bandı atanabilecek bantlı kenar bulunmuyor.");
        continue;
      }
      if (seenLegacyEdgeBandingPartIds.has(part.id)) {
        addBlocked(part.furnitureId, family, "invalid-edge-banding",
          part.id + " parçası için yinelenen kenar bandı ataması.");
        continue;
      }
      seenLegacyEdgeBandingPartIds.add(part.id);
    } else {
      if (!partHasBandedEdge(part, assignment.edge)) {
        addBlocked(part.furnitureId, family, "invalid-edge-banding",
          part.id + " parçasında " + assignment.edge + " kenarı için kenar bandı bulunmuyor.");
        continue;
      }
      const key = JSON.stringify([part.id, assignment.edge]);
      if (seenDirectionalEdgeBandingKeys.has(key)) {
        addBlocked(part.furnitureId, family, "invalid-edge-banding",
          part.id + " parçasının " + assignment.edge + " kenarı için yinelenen kenar bandı ataması.");
        continue;
      }
      seenDirectionalEdgeBandingKeys.add(key);
    }
    edgeBandingAssignments.push(assignment);
  }


  const legacyAssignmentByPartId = new Map<string, ProjectEdgeBandingAssignment>();
  const edgeAssignmentsByPartId = new Map<string, Partial<Record<ProjectEdgeBandingEdge, ProjectEdgeBandingByEdge>>>();
  for (const assignment of edgeBandingAssignments) {
    if (assignment.edge === undefined) {
      legacyAssignmentByPartId.set(assignment.partId, assignment);
      continue;
    }
    let assignmentsByEdge = edgeAssignmentsByPartId.get(assignment.partId);
    if (assignmentsByEdge === undefined) {
      assignmentsByEdge = {};
      edgeAssignmentsByPartId.set(assignment.partId, assignmentsByEdge);
    }
    assignmentsByEdge[assignment.edge] = { edgeBandingId: assignment.edgeBandingId, unit: assignment.unit };
  }
  const productionPartsWithAssignments = productionParts.map((part) => {
    const legacyAssignment = legacyAssignmentByPartId.get(part.id);
    const edgeAssignments = edgeAssignmentsByPartId.get(part.id);
    if (legacyAssignment === undefined && edgeAssignments === undefined) return part;
    return {
      ...part,
      ...(legacyAssignment === undefined ? {} : {
        edgeBandingMaterialId: legacyAssignment.edgeBandingId,
        edgeBandingUnit: legacyAssignment.unit
      }),
      ...(edgeAssignments === undefined ? {} : { edgeBandingByEdge: edgeAssignments })
    };
  });

  const isEmpty = value.furniture.length === 0 &&
    drawerRequests.length === 0 &&
    hardwareRequests.length === 0 &&
    edgeBandingRequests.length === 0;
  const canCalculate = unsupportedFurniture.length === 0 &&
    blockedFurniture.length === 0 &&
    projectErrors.length === 0;
  const exportBlockers: string[] = [];
  if (canCalculate && panelGeometryByPartId.size > 0) {
    exportBlockers.push("Kesitli panel geometrisi mevcut; JSON v1/CSV dışa aktarıcısı panelGeometry alanını kayıpsız destekleyene kadar dışa aktarım kapalıdır.");
  }
  if (canCalculate && hardwareItems.length > 0) {
    exportBlockers.push("Açık donanım BOM satırları mevcut; JSON v1/CSV dışa aktarıcısı hardwareItems alanını kayıpsız destekleyene kadar dışa aktarım kapalıdır.");
  }
  if (canCalculate && edgeBandingAssignments.length > 0) {
    exportBlockers.push("Kenar bandı katalog atamaları mevcut; JSON v1/CSV dışa aktarıcısı edgeBandingMaterialId, edgeBandingUnit ve edgeBandingByEdge alanlarını kayıpsız destekleyene kadar dışa aktarım kapalıdır.");
  }
  const result: CabinetProjectProductionResult | null = canCalculate
    ? {
        schemaVersion: 1,
        furniture: furnitureResults,
        ...(drawerGroups.length === 0 ? {} : { drawerGroups }),
        ...(hardwareItems.length === 0 ? {} : { hardwareItems }),
        parts: productionPartsWithAssignments
      }
    : null;

  return {
    schemaVersion: 1,
    status: !canCalculate ? "blocked" : isEmpty ? "empty" : "ready",
    canExport: canCalculate && !isEmpty && exportBlockers.length === 0,
    isEmpty,
    supportedFurniture,
    unsupportedFurniture,
    blockedFurniture,
    projectErrors,
    exportBlockers,
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
 * Calculates and combines explicit cabinet, bookshelf, table, wardrobe, floor-standing TV-unit, bathroom-vanity and optional drawer-box requests.
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
