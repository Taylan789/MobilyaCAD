// Üretim hesaplama motoru.
// Parametrik yapılandırma → üretim parçaları (Part[]) + yapısal uyarılar.
// Bütün ölçüler milimetredir. Her parça türetilebilir kurala sahiptir.

import type { FurnitureConfig } from "../types/furnitureModel";
import type { Part } from "../types/part";
import { generateComponents } from "./componentGenerator";
import type { GenerationResult } from "./componentGenerator";
import type { FurnitureComponent } from "../types/furnitureModel";
import { roundMeasurement } from "./measurement";

export interface ManufacturingResult {
  parts: Part[];
  components: FurnitureComponent[];
  issues: import("../types/furnitureModel").ConfigIssue[];
}

// Bileşenin kesim yüzeyini (width × length) ve kalınlığını belirler.
function partFace(component: FurnitureComponent): {
  width: number;
  length: number;
  thickness: number;
} {
  switch (component.kind) {
    case "side":
    case "divider":
    case "drawer-side":
      return {
        width: component.depth,
        length: component.height,
        thickness: component.thickness
      };
    case "door":
    case "drawer-front":
    case "back":
      return {
        width: component.width,
        length: component.height,
        thickness: component.thickness
      };
    default:
      return {
        width: component.width,
        length: component.depth,
        thickness: component.thickness
      };
  }
}

// Yapısal bileşenleri üretim parçalarına dönüştürür; özdeş parçaları birleştirir.
export function calculateManufacturingParts(
  furnitureId: string,
  config: FurnitureConfig
): ManufacturingResult {
  const generated: GenerationResult = generateComponents(config);

  const grouped = new Map<
    string,
    { component: FurnitureComponent; quantity: number; firstIndex: number }
  >();

  generated.components.forEach((component, index) => {
    const face = partFace(component);
    const key = [
      component.kind,
      roundMeasurement(face.width),
      roundMeasurement(face.length),
      component.thickness,
      component.material,
      component.edgeBanding.top,
      component.edgeBanding.bottom,
      component.edgeBanding.left,
      component.edgeBanding.right,
      component.grainDirection
    ].join("|");

    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      grouped.set(key, { component, quantity: 1, firstIndex: index });
    }
  });

  const parts: Part[] = [];
  grouped.forEach((entry) => {
    const face = partFace(entry.component);
    parts.push({
      id: `${furnitureId}-${entry.component.id}`,
      furnitureId,
      name: entry.component.name,
      width: roundMeasurement(face.width),
      length: roundMeasurement(face.length),
      thickness: entry.component.thickness,
      quantity: entry.quantity,
      edgeBanding: { ...entry.component.edgeBanding },
      material: entry.component.material,
      cncOperations: [],
      grainDirection: entry.component.grainDirection,
      productionNote: `Kural: ${entry.component.rule} | Formül: ${entry.component.formula}`
    });
  });

  return {
    parts,
    components: generated.components,
    issues: generated.issues
  };
}
