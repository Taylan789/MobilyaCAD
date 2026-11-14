import { describe, it, expect } from "vitest";
import { furnitureCatalog } from "../data/furnitureCatalog";
import {
  createPlacedFurniture,
  regenerateFurnitureParts
} from "../types/placedFurniture";

describe("placedFurniture", () => {
  it("katalog ürününden mobilya oluşturur ve parçaları ölçülerle uyumlu olur", () => {
    const item = furnitureCatalog.find(f => f.id === "base-cabinet")!;
    const placed = createPlacedFurniture(item, [0, 0.425, 0]);

    expect(placed.id).toBeTruthy();
    expect(placed.width).toBe(item.width);
    expect(placed.height).toBe(item.height);
    expect(placed.depth).toBe(item.depth);
    expect(placed.parts.length).toBeGreaterThan(0);

    for (const part of placed.parts) {
      expect(part.width).toBeGreaterThan(0);
      expect(part.height).toBeGreaterThan(0);
      expect(part.depth).toBeGreaterThan(0);
    }
  });

  it("kapak sayısı 0 ise kapak parça üretmez", () => {
    const item = furnitureCatalog.find(f => f.id === "base-cabinet")!;
    const placed = createPlacedFurniture(
      { ...item, doorCount: 0, drawerCount: 0, shelfCount: 0 },
      [0, 0.425, 0]
    );
    expect(placed.parts.filter(p => p.type === "door")).toHaveLength(0);
    expect(placed.parts.filter(p => p.type === "drawer")).toHaveLength(0);
    expect(placed.parts.filter(p => p.type === "shelf")).toHaveLength(0);
  });

  it("boyutlandırıldığında parçalar yeni ölçülerle yeniden üretilir", () => {
    const item = furnitureCatalog.find(f => f.id === "base-cabinet")!;
    let placed = createPlacedFurniture(item, [0, 0.425, 0]);

    const eskiKapakGenislik = placed.parts.find(p => p.type === "door")!.width;

    placed = regenerateFurnitureParts({
      ...placed,
      width: 1200,
      height: 2000,
      depth: 600
    });

    const yeniKapak = placed.parts.find(p => p.type === "door")!;
    expect(yeniKapak).toBeDefined();
    expect(yeniKapak.width).not.toBe(eskiKapakGenislik);
    expect(yeniKapak.width).toBeCloseTo(1200 / 2 - 3, 5);
  });
});
