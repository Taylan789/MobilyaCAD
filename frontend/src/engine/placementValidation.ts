import type { PlacedFurniture } from "../types/placedFurniture";

export type PlacementIssueType = "collision" | "outside-room";

export interface PlacementIssue {
  type: PlacementIssueType;
  furnitureIds: string[];
  message: string;
}

interface Rectangle {
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  rotation: number;
}

function getRectangle(item: PlacedFurniture): Rectangle {
  const values = [
    item.width,
    item.depth,
    item.position[0],
    item.position[2],
    item.rotation
  ];

  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${item.name}: yerleşim ölçüleri sonlu sayılar olmalıdır.`);
  }
  if (item.width <= 0 || item.depth <= 0) {
    throw new Error(`${item.name}: genişlik ve derinlik pozitif olmalıdır.`);
  }

  return {
    centerX: item.position[0],
    centerZ: item.position[2],
    halfWidth: item.width / 2000,
    halfDepth: item.depth / 2000,
    rotation: (item.rotation * Math.PI) / 180
  };
}

function getAxes(rectangle: Rectangle): [[number, number], [number, number]] {
  const cosine = Math.cos(rectangle.rotation);
  const sine = Math.sin(rectangle.rotation);
  return [
    [cosine, -sine],
    [sine, cosine]
  ];
}

function getProjectionRadius(
  rectangle: Rectangle,
  axis: [number, number]
): number {
  const axes = getAxes(rectangle);
  return (
    rectangle.halfWidth * Math.abs(axes[0][0] * axis[0] + axes[0][1] * axis[1]) +
    rectangle.halfDepth * Math.abs(axes[1][0] * axis[0] + axes[1][1] * axis[1])
  );
}

function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  const axes = [...getAxes(a), ...getAxes(b)];
  const dx = b.centerX - a.centerX;
  const dz = b.centerZ - a.centerZ;

  for (const axis of axes) {
    const distance = Math.abs(dx * axis[0] + dz * axis[1]);
    const radii = getProjectionRadius(a, axis) + getProjectionRadius(b, axis);
    // Kenarların yalnızca birbirine değmesi çakışma sayılmaz.
    if (distance >= radii - 1e-9) return false;
  }

  return true;
}

/**
 * Checks horizontal furniture footprints against the room and one another.
 * Coordinates and dimensions use the application's metre/mm convention:
 * positions are metres; width/depth and room dimensions are millimetres.
 */
export function calculatePlacementIssues(
  furniture: readonly PlacedFurniture[],
  roomWidth: number,
  roomLength: number
): PlacementIssue[] {
  if (
    !Number.isFinite(roomWidth) ||
    !Number.isFinite(roomLength) ||
    roomWidth <= 0 ||
    roomLength <= 0
  ) {
    throw new Error("Oda genişliği ve uzunluğu pozitif olmalıdır.");
  }

  const rectangles = furniture.map((item) => ({
    item,
    rectangle: getRectangle(item)
  }));
  const issues: PlacementIssue[] = [];
  const outsideIds = new Set<string>();

  for (const { item, rectangle } of rectangles) {
    const axes = getAxes(rectangle);
    const extentX =
      rectangle.halfWidth * Math.abs(axes[0][0]) +
      rectangle.halfDepth * Math.abs(axes[1][0]);
    const extentZ =
      rectangle.halfWidth * Math.abs(axes[0][1]) +
      rectangle.halfDepth * Math.abs(axes[1][1]);
    const roomHalfWidth = roomWidth / 2000;
    const roomHalfLength = roomLength / 2000;

    if (
      rectangle.centerX - extentX < -roomHalfWidth - 1e-9 ||
      rectangle.centerX + extentX > roomHalfWidth + 1e-9 ||
      rectangle.centerZ - extentZ < -roomHalfLength - 1e-9 ||
      rectangle.centerZ + extentZ > roomHalfLength + 1e-9
    ) {
      outsideIds.add(item.id);
      issues.push({
        type: "outside-room",
        furnitureIds: [item.id],
        message: `${item.name} oda sınırlarının dışında.`
      });
    }
  }

  for (let i = 0; i < rectangles.length; i += 1) {
    for (let j = i + 1; j < rectangles.length; j += 1) {
      const a = rectangles[i];
      const b = rectangles[j];
      if (rectanglesOverlap(a.rectangle, b.rectangle)) {
        issues.push({
          type: "collision",
          furnitureIds: [a.item.id, b.item.id],
          message: `${a.item.name} ile ${b.item.name} çakışıyor.`
        });
      }
    }
  }

  return issues;
}
