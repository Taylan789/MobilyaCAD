import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { validateMeasurement, roundMeasurement } from "./measurement";

export interface CabinetInnerDimensions {
  width: number;
  height: number;
  depth: number;
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

  const innerWidth = furniture.width - kalinlik * 2;

  const innerHeight =
    rules.carcassStyle === "over-sides"
      ? furniture.height - kalinlik * 2
      : furniture.height;

  let innerDepth = furniture.depth - kalinlik;

  if (rules.backInstallation === "grooved") {
    validateMeasurement(rules.backGrooveDepth, "Arkalık kanal derinliği");
    innerDepth -= rules.backGrooveDepth;
  }

  if (rules.backInstallation === "inset") {
    innerDepth -= rules.backThickness + rules.backInset;
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