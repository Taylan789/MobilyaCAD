import { describe, it, expect } from "vitest";
import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { addCncOperations } from "./cncOperations";
import { calculateFurnitureParts } from "./furnitureCalculator";

const rules: CabinetConstructionRules = {
  panelThickness: 18,
  backThickness: 8,
  backInstallation: "grooved",
  backInset: 0,
  carcassStyle: "between-sides",
  shelfCount: 2,
  shelfStyle: "adjustable",
  edgeBandThickness: 0.8,
  doorStyle: "full-overlay",
  doorGap: 2,
  doorCount: 2,
  backGrooveDepth: 8,
  drawerGap: 2,
  drawerBoxThickness: 12,
  drawerBottomThickness: 6,
  drawerFrontMaxHeight: 240
};

function makeFurniture(overrides: Partial<Furniture> = {}): Furniture {
  return {
    id: "f1",
    name: "Test",
    type: "kitchen",
    width: 600,
    height: 850,
    depth: 560,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotation: 0,
    materialThickness: 18,
    doorCount: 2,
    drawerCount: 0,
    shelfCount: 2,
    ...overrides
  };
}

describe("cncOperations", () => {
  it("kapaklara menteşe kupusu operasyonu üretir", () => {
    const parts = calculateFurnitureParts(makeFurniture(), rules);
    const doors = parts.filter(p => p.name === "Dolap Kapağı");

    // Kapaklar tek parçada adetlenmiş döner.
    expect(doors).toHaveLength(1);
    expect(doors[0].quantity).toBe(2);

    const door = doors[0];
    const cups = door.cncOperations.filter(op => op.type === "hinge-cup");
    expect(cups).toHaveLength(2);

    for (const cup of cups) {
      expect(cup.diameter).toBe(35);
      expect(cup.depth).toBe(12);
      expect(cup.x).toBe(22.5);
      // Dilik uçları içinde kalır.
      expect(cup.y).toBeGreaterThan(0);
      expect(cup.y).toBeLessThan(door.length);
    }
  });

  it("yan panellere raf pimi delikleri üretir", () => {
    const parts = calculateFurnitureParts(makeFurniture(), rules);
    const sides = parts.filter(
      p => p.name === "Sol Yan Panel" || p.name === "Sağ Yan Panel"
    );

    expect(sides.length).toBe(2);

    const pinCount = sides.reduce(
      (total, side) =>
        total + side.cncOperations.filter(op => op.type === "drill").length,
      0
    );

    // 2 raf × 2 pin × 2 panel
    expect(pinCount).toBe(8);

    for (const side of sides) {
      for (const op of side.cncOperations) {
        expect(op.x).toBeGreaterThan(0);
        expect(op.x).toBeLessThan(side.width);
        expect(op.y).toBeGreaterThan(0);
        expect(op.y).toBeLessThan(side.length);
      }
    }
  });

  it("yatay tablalara minifix ve çiftçeği operasyonları üretir", () => {
    const parts = calculateFurnitureParts(makeFurniture(), rules);
    const panels = parts.filter(
      p => p.name === "Üst Tabla" || p.name === "Alt Tabla"
    );

    expect(panels.length).toBe(2);

    for (const panel of panels) {
      const minifix = panel.cncOperations.filter(
        op => op.type === "minifix"
      );
      const dowels = panel.cncOperations.filter(op => op.type === "dowel");

      expect(minifix).toHaveLength(2);
      expect(dowels).toHaveLength(4);

      for (const op of panel.cncOperations) {
        expect(op.x).toBeGreaterThan(0);
        expect(op.x).toBeLessThan(panel.width);
        expect(op.y).toBeGreaterThan(0);
        expect(op.y).toBeLessThan(panel.length);
      }
    }
  });

  it("tezgâh slabında CNC operasyonu üretmez", () => {
    const parts = calculateFurnitureParts(
      makeFurniture({ type: "custom", height: 40 }),
      rules
    );

    for (const part of parts) {
      expect(part.cncOperations).toEqual([]);
    }
  });

  it("girdi parçaları değiştirilmez", () => {
    const input = calculateFurnitureParts(makeFurniture(), rules);
    const before = JSON.stringify(input);

    addCncOperations(input, rules);

    expect(JSON.stringify(input)).toBe(before);
  });

  it("desteklenmeyen parça isimleri olduğu gibi kalır", () => {
    const input = [
      {
        id: "x1",
        furnitureId: "f1",
        name: "Bilinmeyen Parça",
        width: 100,
        length: 100,
        thickness: 18,
        quantity: 1,
        edgeBanding: { top: false, bottom: false, left: false, right: false },
        material: "Suntalam",
        cncOperations: [],
        grainDirection: "length" as const
      }
    ];

    const output = addCncOperations(input, rules);

    expect(output[0].cncOperations).toEqual([]);
    expect(output[0].name).toBe("Bilinmeyen Parça");
  });
});
