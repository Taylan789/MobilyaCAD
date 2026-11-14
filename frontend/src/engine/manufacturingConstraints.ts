import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import type { Part } from "../types/part";
import { calculateCabinetParts } from "./cabinetParts";

// Üretim kısıtları. Değerler milimetredir ve atölye parametreleridir;
// üretici verisi olmadan varsayılan kurallar olarak kullanılır.
export interface ManufacturingConstraints {
  minPanelWidth: number;
  minPanelLength: number;
  minDoorWidth: number;
  minDrawerFrontHeight: number;
  kerfWidth: number;
  cuttingTolerance: number;
  edgeBandingAllowance: number;
}

export const defaultManufacturingConstraints: ManufacturingConstraints = {
  minPanelWidth: 40,
  minPanelLength: 100,
  minDoorWidth: 120,
  minDrawerFrontHeight: 100,
  kerfWidth: 3,
  cuttingTolerance: 0.5,
  edgeBandingAllowance: 0.5
};

export interface ConstraintViolation {
  partId: string;
  partName: string;
  message: string;
}

// Tek bir parçayı üretim kısıtlarına göre doğrular.
export function validatePartConstraints(
  part: Part,
  constraints: ManufacturingConstraints
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  if (part.width < constraints.minPanelWidth) {
    violations.push({
      partId: part.id,
      partName: part.name,
      message: `Genişlik ${part.width} mm, minimum ${constraints.minPanelWidth} mm altında.`
    });
  }

  if (part.length < constraints.minPanelLength) {
    violations.push({
      partId: part.id,
      partName: part.name,
      message: `Uzunluk ${part.length} mm, minimum ${constraints.minPanelLength} mm altında.`
    });
  }

  if (part.width < constraints.kerfWidth * 2 || part.length < constraints.kerfWidth * 2) {
    violations.push({
      partId: part.id,
      partName: part.name,
      message: `Parça kesim payı (${constraints.kerfWidth} mm) ile kesilemez.`
    });
  }

  if (part.name === "Dolap Kapağı" && part.width < constraints.minDoorWidth) {
    violations.push({
      partId: part.id,
      partName: part.name,
      message: `Kapak genişliği ${part.width} mm, minimum kapak genişliği ${constraints.minDoorWidth} mm altında.`
    });
  }

  if (
    part.name === "Çekmece Ön Yüzü" &&
    part.length < constraints.minDrawerFrontHeight
  ) {
    violations.push({
      partId: part.id,
      partName: part.name,
      message: `Çekmece ön yüz yüksekliği ${part.length} mm, minimum ${constraints.minDrawerFrontHeight} mm altında.`
    });
  }

  return violations;
}

// Mobilya üretim parçalarını üretim kısıtlarına göre doğrular.
// Dönen liste boşsa yapılandırma üretim açısından geçerlidir.
export function validateFurnitureConstraints(
  furniture: Furniture,
  rules: CabinetConstructionRules,
  constraints: ManufacturingConstraints = defaultManufacturingConstraints
): ConstraintViolation[] {
  const parts = calculateCabinetParts(furniture, rules);
  const violations: ConstraintViolation[] = [];

  for (const part of parts) {
    violations.push(...validatePartConstraints(part, constraints));
  }

  return violations;
}
