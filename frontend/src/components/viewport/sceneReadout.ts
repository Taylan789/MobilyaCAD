import type { PlacedFurniture } from "../../types/placedFurniture";

export interface ViewportSceneReadoutInput {
  furniture: readonly PlacedFurniture[];
  visibleFurniture: readonly PlacedFurniture[];
  selectedFurnitureId: string | null;
  selectedPartId: string | null;
}

export interface ViewportSceneReadoutSelection {
  kind: "furniture" | "part";
  name: string;
  dimensions: [number, number, number];
}

export interface ViewportSceneReadoutModel {
  visibleFurnitureCount: number;
  totalFurnitureCount: number;
  selection: ViewportSceneReadoutSelection | null;
}

export function createViewportSceneReadout({
  furniture,
  visibleFurniture,
  selectedFurnitureId,
  selectedPartId
}: ViewportSceneReadoutInput): ViewportSceneReadoutModel {
  const selectedFurniture = selectedFurnitureId
    ? visibleFurniture.find((item) => item.id === selectedFurnitureId)
    : undefined;
  const selectedPart = selectedFurniture && selectedPartId
    ? selectedFurniture.parts.find((part) => part.id === selectedPartId)
    : undefined;

  const selection: ViewportSceneReadoutSelection | null = selectedPart
    ? {
        kind: "part",
        name: selectedPart.name,
        dimensions: [selectedPart.width, selectedPart.height, selectedPart.depth]
      }
    : selectedFurniture
      ? {
          kind: "furniture",
          name: selectedFurniture.name,
          dimensions: [
            selectedFurniture.width,
            selectedFurniture.height,
            selectedFurniture.depth
          ]
        }
      : null;

  return {
    visibleFurnitureCount: visibleFurniture.length,
    totalFurnitureCount: furniture.length,
    selection
  };
}

export function formatMillimeterReadout(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1
  }).format(value);
}
