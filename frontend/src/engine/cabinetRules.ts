import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import type { PlacedFurniture } from "../types/placedFurniture";
import { calculateDrawerBoxParts } from "./drawerBoxParts";
import {
  isDrawerBoxProjectConfig,
  isValidDrawerBoxProjectSpecs,
  resolveDrawerPanelMaterialAssignments
} from "./drawerBoxProject";
import type { MaterialCatalogEntry } from "./materialCatalog";

export function resolveCabinetConstructionRules(
  baseRules: CabinetConstructionRules,
  furniture: Pick<PlacedFurniture, "doorCount" | "shelfCount" | "backThickness">
): CabinetConstructionRules {
  return {
    ...baseRules,
    doorCount: furniture.doorCount,
    shelfCount: furniture.shelfCount,
    backThickness: furniture.backThickness
  };
}

export function getCabinetCutListExportBlockReason(
  furniture: Pick<PlacedFurniture, "drawerCount" | "drawerBoxSpecs">,
  materials: readonly MaterialCatalogEntry[] = []
): string | null {
  if (furniture.drawerCount <= 0) return null;
  const configs = furniture.drawerBoxSpecs;
  if (!isValidDrawerBoxProjectSpecs(configs)) {
    return "Çekmece yapılandırmaları geçersiz; kesim listesi dışa aktarılamaz.";
  }
  if (!configs || configs.length === 0) {
    return "Kesim listesi için tüm çekmece kutusu ölçülerini ve üretim ayarlarını tanımla.";
  }
  const configuredCount = configs.reduce((total, config) => total + config.spec.quantity, 0);
  if (configuredCount !== furniture.drawerCount) {
    return `Tanımlı çekmece adedi (${configuredCount}) mobilyadaki çekmece adediyle (${furniture.drawerCount}) eşleşmelidir.`;
  }
  for (const config of configs) {
    if (!isDrawerBoxProjectConfig(config)) {
      return "Çekmece yapılandırması geçersiz; kesim listesi dışa aktarılamaz.";
    }
    try {
      const panelMaterials = resolveDrawerPanelMaterialAssignments(config.spec, materials);
      calculateDrawerBoxParts("export-validation", config.id, config.spec, panelMaterials);
    } catch {
      return "Çekmece ölçülerinden geçerli üretim parçaları hesaplanamıyor; ölçüleri kontrol et.";
    }
  }
  return null;
}
