import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import type { PlacedFurniture } from "../types/placedFurniture";

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
  furniture: Pick<PlacedFurniture, "drawerCount">
): string | null {
  if (furniture.drawerCount > 0) {
    return "Çekmece parçaları henüz hesaplanmadığı için bu modülün kesim listesi CSV olarak dışa aktarılamaz.";
  }

  return null;
}
