import type { Furniture } from "../types/furniture";
import type { Part } from "../types/part";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { calculateCabinetParts } from "./cabinetParts";
import { validateMeasurement, roundMeasurement } from "./measurement";

// Mobilya üretim parçalarını hesaplama motoru.
// Mobilya türüne göre uygun üretim kuralını seçer.
export function calculateFurnitureParts(
  furniture: Furniture,
  rules: CabinetConstructionRules
): Part[] {
  validateMeasurement(furniture.width, "Mobilya genişliği");
  validateMeasurement(furniture.height, "Mobilya yüksekliği");
  validateMeasurement(furniture.depth, "Mobilya derinliği");

  if (furniture.type === "custom" && furniture.height <= 40) {
    return calculateCountertopParts(furniture);
  }

  if (furniture.type === "desk" && (furniture.drawerCount ?? 0) === 0) {
    return calculateDeskParts(furniture, rules);
  }

  return calculateCabinetParts(furniture, rules);
}

// Düz slab üretim parçaları (ör. tezgâh).
function calculateCountertopParts(furniture: Furniture): Part[] {
  return [
    {
      id: `${furniture.id}-top`,
      furnitureId: furniture.id,
      name: "Tezgâh Tablası",
      width: furniture.width,
      length: furniture.depth,
      thickness: furniture.height,
      quantity: 1,
      edgeBanding: {
        top: true,
        bottom: true,
        left: true,
        right: true
      },
      material: furniture.material ?? "Belirtilmemiş",
      cncOperations: [],
      grainDirection: "length",
      productionNote: "Slab: dış ölçüler doğrultusunda tek parça."
    }
  ];
}

// Masa üretim parçaları: üst tabla ve dört ayak.
function calculateDeskParts(
  furniture: Furniture,
  rules: CabinetConstructionRules
): Part[] {
  const parcalar: Part[] = [];

  parcalar.push({
    id: `${furniture.id}-top`,
    furnitureId: furniture.id,
    name: "Masa Üst Tablası",
    width: furniture.width,
    length: furniture.depth,
    thickness: rules.panelThickness,
    quantity: 1,
    edgeBanding: {
      top: true,
      bottom: false,
      left: true,
      right: true
    },
    material: furniture.material ?? "Belirtilmemiş",
    cncOperations: [],
    grainDirection: "length",
    productionNote: "Üst tabla: dış genişlik ve derinlik doğrultusunda."
  });

  const ayakYuksekligi = roundMeasurement(
    furniture.height - rules.panelThickness
  );

  if (ayakYuksekligi > 0) {
    parcalar.push({
      id: `${furniture.id}-leg`,
      furnitureId: furniture.id,
      name: "Masa Ayakları",
      width: rules.panelThickness,
      length: ayakYuksekligi,
      thickness: rules.panelThickness,
      quantity: 4,
      edgeBanding: {
        top: false,
        bottom: false,
        left: false,
        right: false
      },
      material: furniture.material ?? "Belirtilmemiş",
      cncOperations: [],
      grainDirection: "length",
      productionNote: "Ayak: üst tabla altından tabana kadar."
    });
  }

  return parcalar;
}
