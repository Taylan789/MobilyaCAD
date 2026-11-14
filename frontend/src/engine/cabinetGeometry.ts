import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { validateMeasurement, roundMeasurement } from "./measurement";

export interface CabinetInnerDimensions {
  width: number;
  height: number;
  depth: number;
}

// Gövde yapısına göre yan panel yüksekliğini hesaplar.
// "between-sides": üst/alt tablalar yan panellerin arasındadır,
// yan paneller dış yüksekliğe eşittir.
// "over-sides": üst/alt tablalar yan panellerin üstündedir,
// yan paneller üst ve alt tabla kalınlığı kadar kısadır.
export function calculateSidePanelHeight(
  furniture: Furniture,
  rules: CabinetConstructionRules
): number {
  validateMeasurement(furniture.height, "Dolap yüksekliği");
  validateMeasurement(rules.panelThickness, "Panel kalınlığı");

  return rules.carcassStyle === "over-sides"
    ? roundMeasurement(furniture.height - rules.panelThickness * 2)
    : roundMeasurement(furniture.height);
}

export function calculateCabinetInnerDimensions(
  furniture: Furniture,
  rules: CabinetConstructionRules
): CabinetInnerDimensions {
  validateMeasurement(furniture.width, "Dolap genişliği");
  validateMeasurement(furniture.height, "Dolap yüksekliği");
  validateMeasurement(furniture.depth, "Dolap derinliği");
  validateMeasurement(rules.panelThickness, "Panel kalınlığı");
  validateMeasurement(rules.backThickness, "Arkalık kalınlığı");
  if (!Number.isFinite(rules.backInset) || rules.backInset < 0) {
    throw new Error("Arkalık konumu geçersiz.");
  }

  const kalinlik = rules.panelThickness;

  // Her iki gövde stilinde de iç yükseklik, üst ve alt tabla
  // kalınlıkları dışındaki alandır.
  const innerWidth = furniture.width - kalinlik * 2;
  const innerHeight = furniture.height - kalinlik * 2;

  let innerDepth: number;

  if (rules.backInstallation === "overlay") {
    innerDepth = furniture.depth;
  } else if (rules.backInstallation === "grooved") {
    validateMeasurement(rules.backGrooveDepth, "Arkalık kanal derinliği");
    innerDepth = furniture.depth - rules.backGrooveDepth;
  } else {
    innerDepth = furniture.depth - rules.backThickness - rules.backInset;
  }

  if (innerWidth <= 0 || innerHeight <= 0 || innerDepth <= 0) {
    throw new Error("Dolap iç ölçüleri geçersiz.");
  }

  return {
    width: roundMeasurement(innerWidth),
    height: roundMeasurement(innerHeight),
    depth: roundMeasurement(innerDepth)
  };
}
