import { describe, it, expect } from "vitest";
import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import {
  validatePartConstraints,
  validateFurnitureConstraints,
  defaultManufacturingConstraints
} from "./manufacturingConstraints";
import type { Part } from "../types/part";

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

function furniture(overrides: Partial<Furniture> = {}): Furniture {
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
    ...overrides
  };
}

describe("manufacturingConstraints", () => {
  it("geçerli parçada ihlal bulmaz", () => {
    const part: Part = {
      id: "p1",
      furnitureId: "f1",
      name: "Üst Tabla",
      width: 564,
      length: 560,
      thickness: 18,
      quantity: 1,
      edgeBanding: { top: false, bottom: false, left: false, right: false },
      material: "Suntalam",
      cncOperations: [],
      grainDirection: "length"
    };

    expect(validatePartConstraints(part, defaultManufacturingConstraints)).toEqual([]);
  });

  it("minimum genişlik altındaki parçayı ihlal olarak bildirir", () => {
    const part: Part = {
      id: "p1",
      furnitureId: "f1",
      name: "Raf",
      width: 20,
      length: 500,
      thickness: 18,
      quantity: 1,
      edgeBanding: { top: true, bottom: false, left: false, right: false },
      material: "Suntalam",
      cncOperations: [],
      grainDirection: "length"
    };

    const violations = validatePartConstraints(part, defaultManufacturingConstraints);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("minimum");
  });

  it("kesim payı nedeniyle imkansız parçayı bildirir", () => {
    const part: Part = {
      id: "p1",
      furnitureId: "f1",
      name: "Dolap Kapağı",
      width: 5,
      length: 500,
      thickness: 18,
      quantity: 1,
      edgeBanding: { top: true, bottom: true, left: true, right: true },
      material: "Suntalam",
      cncOperations: [],
      grainDirection: "length"
    };

    const violations = validatePartConstraints(part, defaultManufacturingConstraints);
    expect(violations.some(v => v.message.includes("kesim payı"))).toBe(true);
  });

  it("dar kapak genişliğini ihlal olarak bildirir", () => {
    const violations = validateFurnitureConstraints(
      furniture({ width: 300, doorCount: 3 }),
      rules
    );

    expect(
      violations.some(
        v => v.partName === "Dolap Kapağı" && v.message.includes("minimum kapak genişliği")
      )
    ).toBe(true);
  });

  it("geçerli dolap için ihlal üretmez", () => {
    const violations = validateFurnitureConstraints(furniture(), rules);
    expect(violations).toEqual([]);
  });

  it("çok küçük dolap için birden fazla ihlal bildirir", () => {
    const violations = validateFurnitureConstraints(
      furniture({ width: 120, height: 150, depth: 100 }),
      rules
    );
    expect(violations.length).toBeGreaterThan(1);
  });

  it("özelleştirilmiş kısıtlara uyur", () => {
    const violations = validateFurnitureConstraints(furniture(), rules, {
      ...defaultManufacturingConstraints,
      minDoorWidth: 500
    });

    expect(
      violations.some(v => v.partName === "Dolap Kapağı")
    ).toBe(true);
  });
});
