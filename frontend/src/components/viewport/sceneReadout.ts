import type { PlacedFurniture } from "../../types/placedFurniture";

export interface ViewportSceneReadoutInput {
  room: {
    width: number;
    length: number;
    height: number;
  };
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
  roomDimensions: [number, number, number];
  visibleFurnitureCount: number;
  totalFurnitureCount: number;
  selection: ViewportSceneReadoutSelection | null;
}

export function createViewportSceneReadout({
  room,
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
    roomDimensions: [room.width, room.length, room.height],
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
