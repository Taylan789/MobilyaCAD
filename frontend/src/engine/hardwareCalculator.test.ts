import { describe, it, expect } from "vitest";
import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import {
  calculateHardwareQuantities,
  defaultHardwareRules
} from "./hardwareCalculator";

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
    drawerCount: 0,
    shelfCount: 2,
    ...overrides
  };
}

describe("hardwareCalculator", () => {
  it("kapak başına menteşe ve tutamaç üretir", () => {
    const quantities = calculateHardwareQuantities(furniture(), rules);

    const hinge = quantities.find(q => q.type === "hinge");
    const handle = quantities.find(q => q.name === "Kapak Tutamaç");

    expect(hinge?.quantity).toBe(4);
    expect(handle?.quantity).toBe(2);
  });

  it("çekmece başına kaydırıcı üretir", () => {
    const quantities = calculateHardwareQuantities(
      furniture({ drawerCount: 3, doorCount: 0 }),
      rules
    );

    const slide = quantities.find(q => q.type === "drawer-slide");
    expect(slide?.quantity).toBe(6);
  });

  it("ayarlanabilir raf için pin üretir", () => {
    const quantities = calculateHardwareQuantities(furniture(), rules);
    const pin = quantities.find(q => q.type === "shelf-pin");
    expect(pin?.quantity).toBe(8);
  });

  it("sabit raf için pin üretmez", () => {
    const quantities = calculateHardwareQuantities(
      furniture(),
      { ...rules, shelfStyle: "fixed" }
    );
    expect(quantities.find(q => q.type === "shelf-pin")).toBeUndefined();
  });

  it("üst ve alt tabla için minifix üretir", () => {
    const quantities = calculateHardwareQuantities(furniture(), rules);
    const minifix = quantities.find(q => q.type === "minifix");
    expect(minifix?.quantity).toBe(4);
  });

  it("özel kurallara göre adedi değiştirir", () => {
    const quantities = calculateHardwareQuantities(
      furniture({ doorCount: 1 }),
      rules,
      { ...defaultHardwareRules, hingesPerDoor: 3 }
    );
    expect(quantities.find(q => q.type === "hinge")?.quantity).toBe(3);
  });

  it("sıfır adedin donanımı listelemez", () => {
    const quantities = calculateHardwareQuantities(
      furniture({ doorCount: 0, drawerCount: 0, shelfCount: 0 }),
      rules
    );
    expect(quantities.every(q => q.quantity > 0)).toBe(true);
  });
});
