
import type { FurnitureCatalogItem } from "../data/furnitureCatalog";

// Mobilyanın bağımsız düzenlenebilir parçaları
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

// Odaya yerleştirilen mobilyanın bilgileri
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

  parts: FurniturePart[];
}

const THICKNESS = 18;

// Mobilyanın parçalarını, mevcut dış ölçülerinden türetir.
// Parçalar her zaman mobilya ölçüleriyle senkronized kalır.
export function createFurnitureParts(
  dims: { width: number; height: number; depth: number },
  config: {
    doorCount: number;
    drawerCount: number;
    shelfCount: number;
    color: string;
    material?: string;
  }
): FurniturePart[] {
  const parts: FurniturePart[] = [];

  const thickness = THICKNESS;
  const width = dims.width;
  const height = dims.height;
  const depth = dims.depth;

  const doorCount = Math.max(0, Math.floor(config.doorCount || 0));
  const drawerCount = Math.max(0, Math.floor(config.drawerCount || 0));
  const shelfCount = Math.max(0, Math.floor(config.shelfCount || 0));

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
        (drawerHeight * drawerCount) / 2000,
        depth / 2000
      ],
      rotation: 0,
      color: config.color,
      material: config.material ?? "Suntalam"
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
      color: config.color,
      material: config.material ?? "Suntalam"
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
      color: config.color,
      material: config.material ?? "Suntalam"
    });
  }

  return parts;
}

// Katalog ürününden yeni mobilya oluşturur
export function createPlacedFurniture(
  item: FurnitureCatalogItem,
  position: [number, number, number]
): PlacedFurniture {
  const placedFurniture: PlacedFurniture = {
    id: crypto.randomUUID(),
    catalogId: item.id,
    name: item.name,

    width: item.width,
    height: item.height,
    depth: item.depth,

    position,
    rotation: 0,
    color: item.color,

    doorCount: item.doorCount ?? 2,
    drawerCount: item.drawerCount ?? 0,
    shelfCount: item.shelfCount ?? 2,

    hasBackPanel: item.hasBackPanel ?? true,
    backThickness: item.backThickness ?? 8,
    edgeBanding: item.edgeBanding ?? true,
    material: item.material ?? "Suntalam",

    parts: []
  };

  placedFurniture.parts = createFurnitureParts(placedFurniture, {
    doorCount: placedFurniture.doorCount,
    drawerCount: placedFurniture.drawerCount,
    shelfCount: placedFurniture.shelfCount,
    color: placedFurniture.color,
    material: placedFurniture.material
  });

  return placedFurniture;
}

// Mobilya ölçüleri veya yapılandırması değiştiğinde parçaları yeniler.
export function regenerateFurnitureParts(
  furniture: PlacedFurniture
): PlacedFurniture {
  return {
    ...furniture,
    parts: createFurnitureParts(furniture, {
      doorCount: furniture.doorCount,
      drawerCount: furniture.drawerCount,
      shelfCount: furniture.shelfCount,
      color: furniture.color,
      material: furniture.material
    })
  };
}
