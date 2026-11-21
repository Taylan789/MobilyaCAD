import type { FurnitureCatalogItem } from "../data/furnitureCatalog";
import type { DrawerBoxProjectConfig } from "../engine/drawerBoxProject";

export interface FurniturePart {
  id: string;
  name: string;
  type: "door" | "drawer" | "shelf" | "panel";
  width: number;
  height: number;
  depth: number;
  position: [number, number, number];
  rotation: number;
  color: string;
  material: string;
}

export interface PlacedFurniture {
  id: string;
  catalogId: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  position: [number, number, number];
  rotation: number;
  color: string;
  doorCount: number;
  drawerCount: number;
  shelfCount: number;
  hasBackPanel: boolean;
  backThickness: number;
  edgeBanding: boolean;
  material: string;
  materialId?: string;
  drawerBoxSpecs?: DrawerBoxProjectConfig[];
  parts: FurniturePart[];
}

type FurniturePartCounts = Pick<
  PlacedFurniture,
  "doorCount" | "drawerCount" | "shelfCount"
>;

function normalizePartCount(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

// Mobilyanın bağımsız düzenlenebilir parçalarını aynı adet ayarlarıyla oluşturur.
function createFurnitureParts(
  item: FurnitureCatalogItem,
  counts: FurniturePartCounts
): FurniturePart[] {
  const parts: FurniturePart[] = [];

  const thickness = 18;
  const width = item.width;
  const height = item.height;
  const depth = item.depth;
  const { doorCount, drawerCount, shelfCount } = counts;

  const drawerHeight = drawerCount > 0
    ? Math.floor(Math.min(240, height * 0.4 / drawerCount))
    : 0;

  const doorHeight = height - drawerHeight * drawerCount;

  // Kapak parçaları
  for (let i = 0; i < doorCount; i++) {
    const doorWidth = width / Math.max(1, doorCount) - 3;

    parts.push({
      id: crypto.randomUUID(),
      name: `Kapak ${i + 1}`,
      type: "door",
      width: doorWidth,
      height: doorHeight - 6,
      depth: thickness,
      position: [
        -width / 2000 + (i + 0.5) * (width / doorCount) / 1000,
        drawerCount > 0
          ? drawerHeight * drawerCount / 2000
          : 0,
        depth / 2000
      ],
      rotation: 0,
      color: item.color,
      material: item.material ?? "Suntalam"
    });
  }

  // Çekmece parçaları
  for (let i = 0; i < drawerCount; i++) {
    parts.push({
      id: crypto.randomUUID(),
      name: `Çekmece ${i + 1}`,
      type: "drawer",
      width: width - thickness * 2,
      height: drawerHeight - 6,
      depth: thickness,
      position: [
        0,
        -height / 2000 + drawerHeight * (i + 0.5) / 1000,
        depth / 2000
      ],
      rotation: 0,
      color: item.color,
      material: item.material ?? "Suntalam"
    });
  }

  // Raf parçaları
  for (let i = 0; i < shelfCount; i++) {
    const shelfY =
      -height / 2000 +
      (height / 1000) * (i + 1) / (shelfCount + 1);

    parts.push({
      id: crypto.randomUUID(),
      name: `Raf ${i + 1}`,
      type: "shelf",
      width: width - thickness * 2,
      height: thickness,
      depth: depth - thickness,
      position: [0, shelfY, 0],
      rotation: 0,
      color: item.color,
      material: item.material ?? "Suntalam"
    });
  }

  return parts;
}

// Katalog ürününden yeni mobilya oluşturur.
export function createPlacedFurniture(
  item: FurnitureCatalogItem,
  position: [number, number, number]
): PlacedFurniture {
  const counts: FurniturePartCounts = {
    doorCount: normalizePartCount(item.doorCount, 2),
    drawerCount: normalizePartCount(item.drawerCount, 0),
    shelfCount: normalizePartCount(item.shelfCount, 2)
  };

  return {
    id: crypto.randomUUID(),
    catalogId: item.id,
    name: item.name,
    width: item.width,
    height: item.height,
    depth: item.depth,
    position,
    rotation: 0,
    color: item.color,
    ...counts,
    hasBackPanel: item.hasBackPanel ?? true,
    backThickness: item.backThickness ?? 8,
    edgeBanding: item.edgeBanding ?? true,
    material: item.material ?? "Suntalam",
    parts: createFurnitureParts(item, counts)
  };
}
