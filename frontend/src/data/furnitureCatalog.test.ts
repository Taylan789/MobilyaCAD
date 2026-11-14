import { describe, it, expect } from "vitest";
import {
  furnitureCatalog,
  normalizeCatalogItem
} from "./furnitureCatalog";
import type { RawFurnitureCatalogItem } from "./furnitureCatalog";
import { createPlacedFurniture } from "../types/placedFurniture";

describe("furnitureCatalog", () => {
  it("tüm katalog öğelerinde yapılandırma tanımlıdır", () => {
    expect(furnitureCatalog.length).toBe(100);

    for (const item of furnitureCatalog) {
      expect(Number.isFinite(item.doorCount)).toBe(true);
      expect(Number.isFinite(item.drawerCount)).toBe(true);
      expect(Number.isFinite(item.shelfCount)).toBe(true);
      expect(typeof item.hasBackPanel).toBe("boolean");
      expect(Number.isFinite(item.backThickness)).toBe(true);
      expect(typeof item.edgeBanding).toBe("boolean");
      expect(item.material.length).toBeGreaterThan(0);
    }
  });

  it("normalizeCatalogItem tek varsayılan politikayı uygular", () => {
    const raw: RawFurnitureCatalogItem = {
      id: "x",
      name: "X",
      type: "custom",
      width: 100,
      height: 100,
      depth: 100,
      color: "#000000",
      category: "Test"
    };

    expect(normalizeCatalogItem(raw)).toMatchObject({
      doorCount: 0,
      drawerCount: 0,
      shelfCount: 2,
      hasBackPanel: true,
      backThickness: 8,
      edgeBanding: true,
      material: "Suntalam"
    });
  });

  it("normalizeCatalogItem açık değerleri değiştirmez", () => {
    const normalized = normalizeCatalogItem({
      id: "x",
      name: "X",
      type: "kitchen",
      width: 100,
      height: 100,
      depth: 100,
      color: "#000000",
      category: "Test",
      doorCount: 3,
      drawerCount: 1,
      shelfCount: 5,
      hasBackPanel: false,
      backThickness: 12,
      edgeBanding: false,
      material: "Meşe"
    });

    expect(normalized.doorCount).toBe(3);
    expect(normalized.drawerCount).toBe(1);
    expect(normalized.shelfCount).toBe(5);
    expect(normalized.hasBackPanel).toBe(false);
    expect(normalized.backThickness).toBe(12);
    expect(normalized.edgeBanding).toBe(false);
    expect(normalized.material).toBe("Meşe");
  });

  it("tezgâh, masa ve kitap rafında hayalet kapak/raf yoktur", () => {
    const countertop = furnitureCatalog.find(f => f.id === "countertop")!;
    const desk = furnitureCatalog.find(f => f.id === "desk")!;
    const bookcase = furnitureCatalog.find(f => f.id === "bookcase")!;

    expect(countertop.doorCount).toBe(0);
    expect(countertop.shelfCount).toBe(0);
    expect(desk.doorCount).toBe(0);
    expect(desk.shelfCount).toBe(0);
    expect(bookcase.doorCount).toBe(0);
  });

  it("createPlacedFurniture kataloğu olduğu gibi kopyalar", () => {
    const item = furnitureCatalog.find(f => f.id === "base-cabinet")!;
    const placed = createPlacedFurniture(item, [0, 0, 0]);

    expect(placed.doorCount).toBe(item.doorCount);
    expect(placed.drawerCount).toBe(item.drawerCount);
    expect(placed.shelfCount).toBe(item.shelfCount);
    expect(placed.hasBackPanel).toBe(item.hasBackPanel);
    expect(placed.backThickness).toBe(item.backThickness);
    expect(placed.edgeBanding).toBe(item.edgeBanding);
    expect(placed.material).toBe(item.material);
  });
});
