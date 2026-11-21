import type { FurnitureCatalogItem } from "../data/furnitureCatalog";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import type { Part } from "../types/part";
import type { PlacedFurniture } from "../types/placedFurniture";
import type { MaterialCatalogEntry } from "./materialCatalog";
import { resolveCabinetConstructionRules } from "./cabinetRules";
import {
  calculateCabinetProjectProductionWithDiagnostics
} from "../../../domain/production/projectProduction.ts";
import type {
  CabinetProjectProductionReport,
  ProjectProductionPart
} from "../../../domain/production/projectProduction.ts";

export interface ProjectProductionIssue {
  furnitureId: string;
  furnitureName: string;
  reason: string;
}

export interface UnsupportedProjectFurniture {
  furnitureId: string;
  furnitureName: string;
  reason: string;
}

export interface ProjectProductionResult {
  parts: Part[];
  furnitureNames: Map<string, string>;
  supportedFurnitureCount: number;
  unsupportedFurniture: UnsupportedProjectFurniture[];
  blockedFurniture: ProjectProductionIssue[];
  errors: ProjectProductionIssue[];
  status: CabinetProjectProductionReport["status"];
  canExport: boolean;
  exportBlockers: string[];
  exportBlockReason: string | null;
  /** The validated domain report remains available without lossy field projection. */
  domainReport: CabinetProjectProductionReport;
}

const supportedCabinetCatalogId = /^(base-cabinet|wall-cabinet|parametric-(1|2|6)-[1-4])$/;

type EdgeBandingEdges = {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
};

function noBanding(): EdgeBandingEdges {
  return { top: false, bottom: false, left: false, right: false };
}

function allBanding(): EdgeBandingEdges {
  return { top: true, bottom: true, left: true, right: true };
}

/**
 * The legacy editor has one explicit furniture-level edge-banding switch.
 * Its existing cabinet generator bands only the shelf's top edge and all
 * four door edges; all other carcass edges remain unbanded. This adapter
 * carries that exact behavior into the domain profile rather than inferring
 * additional banded edges.
 */
function createCabinetEdgeBandingByGroup(
  placed: PlacedFurniture
): Record<string, EdgeBandingEdges> {
  const none = noBanding();
  return {
    leftSide: none,
    rightSide: none,
    top: none,
    bottom: none,
    shelf: placed.edgeBanding === false
      ? noBanding()
      : { top: true, bottom: false, left: false, right: false },
    back: noBanding(),
    door: placed.edgeBanding === false ? noBanding() : allBanding()
  };
}

function createCabinetConstructionRequest(
  placed: PlacedFurniture,
  baseRules: CabinetConstructionRules,
  materials: readonly MaterialCatalogEntry[]
): Record<string, unknown> {
  const rules = resolveCabinetConstructionRules(baseRules, placed);
  const assignedMaterial = placed.materialId === undefined
    ? undefined
    : materials.find((material) => material.id === placed.materialId);

  const backPanel = placed.hasBackPanel === false
    ? { enabled: false }
    : rules.backInstallation === "grooved"
      ? {
          enabled: true,
          thicknessMm: rules.backThickness,
          installation: "grooved",
          grooveDepthMm: rules.backGrooveDepth
        }
      : rules.backInstallation === "inset"
        ? {
            enabled: true,
            thicknessMm: rules.backThickness,
            installation: "inset",
            insetMm: rules.backInset
          }
        : {
            enabled: true,
            thicknessMm: rules.backThickness,
            installation: "overlay"
          };

  // Keep invalid non-zero counts intact so the domain validator blocks them.
  const doors = {
    enabled: rules.doorCount > 0,
    count: rules.doorCount,
    ...(rules.doorCount > 0
      ? { style: rules.doorStyle, gapMm: rules.doorGap }
      : {})
  };

  return {
    schemaVersion: 1,
    furniture: {
      id: placed.id,
      widthMm: placed.width,
      heightMm: placed.height,
      depthMm: placed.depth,
      material: assignedMaterial?.name ?? placed.material,
      ...(placed.materialId === undefined ? {} : { materialId: placed.materialId })
    },
    profile: {
      panelThicknessMm: rules.panelThickness,
      carcassStyle: rules.carcassStyle,
      backPanel,
      shelfCount: rules.shelfCount,
      doors,
      edgeBandingByGroup: createCabinetEdgeBandingByGroup(placed)
    },
    materials
  };
}

function appendDrawerRequests(
  placed: PlacedFurniture,
  materials: readonly MaterialCatalogEntry[],
  drawerRequests: Record<string, unknown>[],
  adapterIssues: ProjectProductionIssue[]
): void {
  const addIssue = (reason: string): void => {
    adapterIssues.push({
      furnitureId: placed.id,
      furnitureName: placed.name,
      reason
    });
  };

  if (!Number.isSafeInteger(placed.drawerCount) || placed.drawerCount < 0) {
    addIssue("Çekmece adedi sıfır veya pozitif güvenli tam sayı olmalıdır.");
  }

  const rawConfigs: unknown = placed.drawerBoxSpecs;
  if (rawConfigs !== undefined && !Array.isArray(rawConfigs)) {
    addIssue("Çekmece yapılandırma listesi geçersiz.");
    return;
  }

  const configs = Array.isArray(rawConfigs) ? rawConfigs as unknown[] : [];
  if (placed.drawerCount === 0) {
    if (configs.length > 0) {
      addIssue("Çekmece adedi sıfır olmasına rağmen çekmece kutusu yapılandırması bulunuyor.");
    }
    return;
  }

  if (configs.length === 0) {
    addIssue("Kesim listesi için tüm çekmece kutusu ölçülerini ve üretim ayarlarını tanımla.");
    return;
  }

  let configuredCount = 0;
  let canCompareCount = true;

  for (const config of configs) {
    if (!isRecord(config) || !isRecord(config.spec) ||
        typeof config.id !== "string" || config.id.trim() === "") {
      addIssue("Çekmece yapılandırması geçersiz; çekmece kimliği ve ölçüleri doğrulanmalıdır.");
      canCompareCount = false;
      continue;
    }

    drawerRequests.push({
      schemaVersion: 1,
      furniture: { id: placed.id },
      drawerGroup: { id: config.id },
      spec: config.spec,
      materials
    });

    const quantity = config.spec.quantity;
    if (!Number.isSafeInteger(quantity) || Number(quantity) < 1) {
      canCompareCount = false;
    } else {
      configuredCount += Number(quantity);
    }
  }

  if (canCompareCount && configuredCount !== placed.drawerCount) {
    addIssue(
      `Tanımlı çekmece adedi (${configuredCount}) mobilyadaki çekmece adediyle (${placed.drawerCount}) eşleşmelidir.`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFrontendPart(part: ProjectProductionPart): Part {
  // Body-panel domain parts intentionally omit grain direction and CNC data.
  // "none" is the existing UI's neutral "not specified" value, not a machine
  // instruction. Drawer/table directions are copied only when domain supplied.
  const grainDirection = "grainDirection" in part ? part.grainDirection : "none";

  return {
    id: part.id,
    furnitureId: part.furnitureId,
    name: part.name,
    width: part.width,
    length: part.length,
    thickness: part.thickness,
    quantity: part.quantity,
    edgeBanding: { ...part.edgeBanding },
    material: part.material,
    ...(part.materialId === undefined ? {} : { materialId: part.materialId }),
    cncOperations: [],
    grainDirection,
    ...("drawerGroupId" in part ? { drawerGroupId: part.drawerGroupId } : {}),
    ...(part.panelGeometry === undefined ? {} : { panelGeometry: part.panelGeometry }),
    ...(part.edgeBandingMaterialId === undefined
      ? {}
      : { edgeBandingMaterialId: part.edgeBandingMaterialId }),
    ...(part.edgeBandingUnit === undefined
      ? {}
      : { edgeBandingUnit: part.edgeBandingUnit })
  };
}

function diagnosticIssue(
  furnitureId: string | null,
  family: string | null,
  reason: string,
  furnitureNames: ReadonlyMap<string, string>
): ProjectProductionIssue {
  const id = furnitureId ?? "";
  return {
    furnitureId: id,
    furnitureName: id
      ? furnitureNames.get(id) ?? family ?? "Mobilya"
      : family ?? "Proje",
    reason
  };
}

/**
 * Maps the real domain report into the existing workspace view model.
 * Export blockers remain authoritative; calculated parts can still be viewed
 * when the domain has a complete result but a serializer cannot preserve an
 * optional domain extension. Invalid/unsupported projects never expose a
 * partial part list.
 */
export function mapDomainProductionReport(
  report: CabinetProjectProductionReport,
  furnitureNames: ReadonlyMap<string, string>,
  adapterIssues: readonly ProjectProductionIssue[] = []
): ProjectProductionResult {
  const unsupportedFurniture = report.unsupportedFurniture.map((item) => ({
    furnitureId: item.furnitureId ?? "",
    furnitureName: item.furnitureId
      ? furnitureNames.get(item.furnitureId) ?? item.family ?? "Mobilya"
      : item.family ?? "Mobilya",
    reason: item.message
  }));

  const blockedFurniture = [
    ...report.blockedFurniture.map((item) =>
      diagnosticIssue(item.furnitureId, item.family, item.message, furnitureNames)
    ),
    ...adapterIssues
  ];

  const errors = report.projectErrors.map((reason) => ({
    furnitureId: "",
    furnitureName: "Proje",
    reason
  }));

  const canExport = report.canExport && adapterIssues.length === 0;
  const exportBlockers = [
    ...report.exportBlockers,
    ...adapterIssues.map((issue) => issue.reason)
  ];
  const exportBlockReason = adapterIssues[0]?.reason
    ?? report.firstError
    ?? report.exportBlockers[0]
    ?? (report.status === "empty"
      ? "Projede dışa aktarılabilecek üretim parçası bulunmuyor."
      : canExport
        ? null
        : "Proje üretim raporu dışa aktarım için hazır değil.");

  return {
    parts: report.result === null || adapterIssues.length > 0
      ? []
      : report.result.parts.map(toFrontendPart),
    furnitureNames: new Map(furnitureNames),
    supportedFurnitureCount: report.supportedFurniture.length,
    unsupportedFurniture,
    blockedFurniture,
    errors,
    status: adapterIssues.length > 0 ? "blocked" : report.status,
    canExport,
    exportBlockers,
    exportBlockReason,
    domainReport: report
  };
}

/**
 * The domain production report is the single source of truth for the project
 * cut list. Only the currently represented straight kitchen-cabinet profiles
 * can be adapted today; other families are explicitly reported as unsupported
 * until the frontend stores their required construction inputs.
 */
export function calculateProjectProduction(
  furniture: readonly PlacedFurniture[],
  catalog: readonly FurnitureCatalogItem[],
  baseRules: CabinetConstructionRules,
  materials: readonly MaterialCatalogEntry[] = []
): ProjectProductionResult {
  if (!Array.isArray(furniture) || !Array.isArray(catalog) || !Array.isArray(materials)) {
    throw new Error("Proje üretim hesabı için geçerli mobilya ve katalog listeleri gereklidir.");
  }

  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const furnitureNames = new Map<string, string>();
  const furnitureRequests: Record<string, unknown>[] = [];
  const drawerRequests: Record<string, unknown>[] = [];
  const adapterIssues: ProjectProductionIssue[] = [];

  for (const placed of furniture) {
    const furnitureId = typeof placed?.id === "string" ? placed.id : "";
    const hasFurnitureName = typeof placed?.name === "string" && placed.name.trim() !== "";
    const furnitureName = hasFurnitureName ? placed.name.trim() : "İsimsiz mobilya";
    if (furnitureId !== "") furnitureNames.set(furnitureId, furnitureName);
    if (!hasFurnitureName) {
      adapterIssues.push({
        furnitureId,
        furnitureName,
        reason: "Mobilya adı eksik."
      });
    }

    const catalogItem = catalogById.get(placed.catalogId);
    if (!isSupportedCabinetCatalogItem(catalogItem)) {
      furnitureRequests.push({
        family: "unsupported-" + (catalogItem?.type ?? "catalog-item"),
        furniture: { id: furnitureId }
      });
      continue;
    }

    furnitureRequests.push(createCabinetConstructionRequest(placed, baseRules, materials));
    appendDrawerRequests(placed, materials, drawerRequests, adapterIssues);
  }

  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: furnitureRequests,
    drawerBoxes: drawerRequests
  });

  return mapDomainProductionReport(report, furnitureNames, adapterIssues);
}

/**
 * Only straight, generic kitchen carcass families currently have all
 * construction inputs represented by the frontend project model.
 */
export function isSupportedCabinetCatalogItem(
  item: FurnitureCatalogItem | undefined
): boolean {
  return Boolean(
    item &&
    item.type === "kitchen" &&
    supportedCabinetCatalogId.test(item.id)
  );
}
