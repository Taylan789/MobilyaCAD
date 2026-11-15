import type { FurnitureCatalogItem } from "../data/furnitureCatalog";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import type { Furniture } from "../types/furniture";
import type { Part } from "../types/part";
import type { PlacedFurniture } from "../types/placedFurniture";
import type { MaterialCatalogEntry } from "./materialCatalog";
import { resolveMaterialThickness } from "./materialCatalog";
import { calculateCabinetParts } from "./cabinetParts";
import { calculateDrawerBoxParts } from "./drawerBoxParts";
import {
  getCabinetCutListExportBlockReason,
  resolveCabinetConstructionRules
} from "./cabinetRules";

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
  exportBlockReason: string | null;
}

const supportedCabinetCatalogId = /^(base-cabinet|wall-cabinet|parametric-(1|2|6)-[1-4])$/;

/**
 * Only straight, generic carcass families are currently safe for production
 * calculation. Corner, appliance and sink variants need dedicated geometry
 * before their cut lists can be considered complete.
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Bilinmeyen hesaplama hatası.";
}

function createCabinetFurniture(
  placed: PlacedFurniture,
  catalogItem: FurnitureCatalogItem,
  rules: CabinetConstructionRules,
  material?: MaterialCatalogEntry
): Furniture {
  return {
    id: placed.id,
    name: placed.name,
    type: catalogItem.type,
    width: placed.width,
    height: placed.height,
    depth: placed.depth,
    positionX: placed.position[0],
    positionY: placed.position[1],
    positionZ: placed.position[2],
    rotation: placed.rotation,
    materialThickness: rules.panelThickness,
    doorCount: placed.doorCount,
    drawerCount: placed.drawerCount,
    shelfCount: placed.shelfCount,
    hasBackPanel: placed.hasBackPanel,
    backThickness: placed.backThickness,
    edgeBanding: placed.edgeBanding,
    material: material?.name ?? placed.material,
    ...(placed.materialId ? { materialId: placed.materialId } : {})
  };
}

/**
 * Builds one project-wide production list from the currently supported
 * straight kitchen carcass families. Each placed furniture instance is
 * calculated independently, so generated part IDs remain traceable to the
 * source furniture. Unsupported families are reported rather than guessed.
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
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const result: ProjectProductionResult = {
    parts: [],
    furnitureNames: new Map<string, string>(),
    supportedFurnitureCount: 0,
    unsupportedFurniture: [],
    blockedFurniture: [],
    errors: [],
    exportBlockReason: null
  };
  const seenFurnitureIds = new Set<string>();
  const seenPartIds = new Set<string>();

  for (const placed of furniture) {
    const furnitureId = typeof placed?.id === "string" ? placed.id.trim() : "";
    const furnitureName = typeof placed?.name === "string" && placed.name.trim() !== ""
      ? placed.name.trim()
      : "İsimsiz mobilya";

    if (furnitureId === "") {
      result.errors.push({
        furnitureId: "",
        furnitureName,
        reason: "Mobilya kimliği eksik."
      });
      continue;
    }

    if (seenFurnitureIds.has(furnitureId)) {
      result.errors.push({
        furnitureId,
        furnitureName,
        reason: "Projede yinelenen mobilya kimliği var; parça listesi güvenle birleştirilemez."
      });
      continue;
    }
    seenFurnitureIds.add(furnitureId);

    if (furnitureName === "İsimsiz mobilya") {
      result.errors.push({
        furnitureId,
        furnitureName,
        reason: "Mobilya adı eksik."
      });
      continue;
    }

    const catalogItem = catalogById.get(placed.catalogId);
    if (!isSupportedCabinetCatalogItem(catalogItem)) {
      const reason = !catalogItem
        ? "Katalog kaydı bulunamadı."
        : catalogItem.type !== "kitchen"
          ? "Bu mobilya ailesi için üretim parça ağacı henüz uygulanmadı."
          : "Bu katalog varyasyonu köşe, cihaz veya evye boşluğu gerektiriyor; özel geometri hesaplanmadan kesim listesine eklenmez.";
      result.unsupportedFurniture.push({ furnitureId, furnitureName, reason });
      continue;
    }

    result.supportedFurnitureCount += 1;
    result.furnitureNames.set(furnitureId, furnitureName);

    const assignedMaterial = placed.materialId === undefined
      ? undefined
      : materialById.get(placed.materialId);
    if (placed.materialId !== undefined && !assignedMaterial) {
      result.errors.push({
        furnitureId,
        furnitureName,
        reason: `Malzeme kataloğunda ${placed.materialId} kimliği bulunamadı.`
      });
      continue;
    }

    const resolvedRules = resolveCabinetConstructionRules(baseRules, placed);
    if (assignedMaterial) {
      try {
        resolveMaterialThickness(assignedMaterial, resolvedRules.panelThickness);
        if (placed.hasBackPanel) {
          resolveMaterialThickness(assignedMaterial, resolvedRules.backThickness);
        }
      } catch (error) {
        result.errors.push({
          furnitureId,
          furnitureName,
          reason: getErrorMessage(error)
        });
        continue;
      }
    }

    if (!Number.isSafeInteger(placed.drawerCount) || placed.drawerCount < 0) {
      result.errors.push({
        furnitureId,
        furnitureName,
        reason: "Çekmece adedi sıfır veya pozitif güvenli tam sayı olmalıdır."
      });
      continue;
    }

    const drawerConfigs = Array.isArray(placed.drawerBoxSpecs)
      ? placed.drawerBoxSpecs
      : [];
    if (placed.drawerBoxSpecs !== undefined && !Array.isArray(placed.drawerBoxSpecs)) {
      result.errors.push({
        furnitureId,
        furnitureName,
        reason: "Çekmece yapılandırma listesi geçersiz."
      });
      continue;
    }

    let drawerBlockReason: string | null = null;
    try {
      drawerBlockReason = getCabinetCutListExportBlockReason(placed);
    } catch (error) {
      result.errors.push({
        furnitureId,
        furnitureName,
        reason: getErrorMessage(error)
      });
      continue;
    }

    if (placed.drawerCount === 0 && drawerConfigs.length > 0) {
      drawerBlockReason = "Çekmece adedi sıfır olmasına rağmen çekmece parça yapılandırması bulunuyor.";
    }
    if (drawerBlockReason) {
      result.blockedFurniture.push({
        furnitureId,
        furnitureName,
        reason: drawerBlockReason
      });
    }

    let cabinetParts: Part[];
    try {
      const cabinetFurniture = createCabinetFurniture(
        placed,
        catalogItem,
        baseRules,
        assignedMaterial
      );
      cabinetParts = calculateCabinetParts(cabinetFurniture, resolvedRules);
    } catch (error) {
      result.errors.push({
        furnitureId,
        furnitureName,
        reason: getErrorMessage(error)
      });
      continue;
    }

    const drawerParts: Part[] = [];
    if (placed.drawerCount > 0) {
      for (const config of drawerConfigs) {
        try {
          const drawerMaterial = config.spec.materialId === undefined
            ? undefined
            : materialById.get(config.spec.materialId);
          if (config.spec.materialId !== undefined && !drawerMaterial) {
            throw new Error(
              `Çekmece malzeme kataloğunda ${config.spec.materialId} kimliği bulunamadı.`
            );
          }
          if (drawerMaterial) {
            resolveMaterialThickness(drawerMaterial, config.spec.sideThickness);
            resolveMaterialThickness(drawerMaterial, config.spec.frontBackThickness);
            resolveMaterialThickness(drawerMaterial, config.spec.bottomThickness);
            resolveMaterialThickness(drawerMaterial, config.spec.visibleFrontThickness);
          }
          const drawerSpec = drawerMaterial
            ? { ...config.spec, material: drawerMaterial.name }
            : config.spec;
          drawerParts.push(...calculateDrawerBoxParts(furnitureId, config.id, drawerSpec));
        } catch (error) {
          result.errors.push({
            furnitureId,
            furnitureName,
            reason: "Çekmece parçası hesaplanamadı: " + getErrorMessage(error)
          });
        }
      }
    }

    for (const part of [...cabinetParts, ...drawerParts]) {
      if (part.furnitureId !== furnitureId) {
        result.errors.push({
          furnitureId,
          furnitureName,
          reason: "Üretilen parça yanlış mobilya kimliğine bağlı."
        });
        continue;
      }
      if (seenPartIds.has(part.id)) {
        result.errors.push({
          furnitureId,
          furnitureName,
          reason: "Yinelenen parça kimliği bulundu; kesim listesi birleştirilemez."
        });
        continue;
      }
      seenPartIds.add(part.id);
      result.parts.push(part);
    }
  }

  if (result.supportedFurnitureCount === 0) {
    result.exportBlockReason = "Projede üretim hesabı desteklenen düz mutfak gövdesi bulunmuyor.";
  } else if (result.errors.length > 0) {
    const issue = result.errors[0];
    result.exportBlockReason = issue.furnitureName + ": " + issue.reason;
  } else if (result.blockedFurniture.length > 0) {
    const issue = result.blockedFurniture[0];
    result.exportBlockReason = issue.furnitureName + ": " + issue.reason;
  } else if (result.parts.length === 0) {
    result.exportBlockReason = "Dışa aktarılabilecek üretim parçası hesaplanamadı.";
  }

  return result;
}
