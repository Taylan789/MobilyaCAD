import { describe, it, expect } from "vitest";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
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
  drawerFrontMaxHeight: 240,
};

describe("furnitureCalculator", () => {
  it("mutfak dolabı için dolap parçaları üretir", () => {
    const parts = calculateFurnitureParts(
      {
        id: "f1",
        name: "Alt Mutfak Dolabı",
        type: "kitchen",
        width: 600,
        height: 850,
        depth: 560,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotation: 0,
        materialThickness: 18,
        doorCount: 2
      },
      rules
    );
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.map(p => p.name)).toContain("Dolap Kapağı");
  });

  it("tezgâh için slab parça üretir", () => {
    const parts = calculateFurnitureParts(
      {
        id: "f2",
        name: "Mutfak Mermeri",
        type: "custom",
        width: 600,
        height: 40,
        depth: 600,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotation: 0,
        materialThickness: 18
      },
      rules
    );
    expect(parts).toHaveLength(1);
    expect(parts[0].name).toBe("Tezgâh Tablası");
    expect(parts[0].thickness).toBe(40);
  });

  it("masa için üst tabla ve ayak üretir", () => {
    const parts = calculateFurnitureParts(
      {
        id: "f3",
        name: "Çalışma Masası",
        type: "desk",
        width: 1200,
        height: 750,
        depth: 600,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotation: 0,
        materialThickness: 18
      },
      rules
    );
    const ust = parts.find(p => p.name === "Masa Üst Tablası");
    const ayak = parts.find(p => p.name === "Masa Ayakları");
    expect(ust).toBeDefined();
    expect(ust!.width).toBe(1200);
    expect(ust!.length).toBe(600);
    expect(ayak).toBeDefined();
    expect(ayak!.quantity).toBe(4);
    expect(ayak!.length).toBe(750 - 18);
  });

  it("çekmeceli masa için dolap parçaları üretir", () => {
    const parts = calculateFurnitureParts(
      {
        id: "f4",
        name: "Ofis Çekmeceli Keson",
        type: "desk",
        width: 450,
        height: 600,
        depth: 500,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        rotation: 0,
        materialThickness: 18,
        drawerCount: 3
      },
      rules
    );
    expect(parts.map(p => p.name)).toContain("Çekmece Ön Yüzü");
  });

  it("geçersiz ölçüleri reddeder", () => {
    expect(() =>
      calculateFurnitureParts(
        {
          id: "f5",
          name: "X",
          type: "kitchen",
          width: 0,
          height: 850,
          depth: 560,
          positionX: 0,
          positionY: 0,
          positionZ: 0,
          rotation: 0,
          materialThickness: 18
        },
        rules
      )
    ).toThrow();
  });
});
