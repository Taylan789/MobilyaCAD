import { describe, it, expect } from "vitest";
import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import {
  calculateCabinetInnerDimensions,
  calculateSidePanelHeight
} from "./cabinetGeometry";

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

const furniture: Furniture = {
  id: "test",
  name: "Test",
  type: "kitchen",
  width: 600,
  height: 850,
  depth: 560,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotation: 0,
  materialThickness: 18
};

describe("cabinetGeometry", () => {
  it("between-sides iç ölçüleri hesaplar", () => {
    const ic = calculateCabinetInnerDimensions(furniture, rules);
    expect(ic.width).toBe(564);
    expect(ic.height).toBe(814);
    expect(ic.depth).toBe(552);
  });

  it("over-sides iç yükseklik aynıdır", () => {
    const ic = calculateCabinetInnerDimensions(furniture, {
      ...rules,
      carcassStyle: "over-sides"
    });
    expect(ic.height).toBe(814);
  });

  it("between-sides yan panel tam yüksekliktedir", () => {
    expect(calculateSidePanelHeight(furniture, rules)).toBe(850);
  });

  it("over-sides yan panel yüksekliği H - 2t dir", () => {
    expect(
      calculateSidePanelHeight(furniture, { ...rules, carcassStyle: "over-sides" })
    ).toBe(814);
  });

  it("overlay arkalıkta iç derinlik tam derinliktir", () => {
    const ic = calculateCabinetInnerDimensions(furniture, {
      ...rules,
      backInstallation: "overlay"
    });
    expect(ic.depth).toBe(560);
  });

  it("inset arkalıkta iç derinlik arkalık kalınlığı ve konumu kadar azalır", () => {
    const ic = calculateCabinetInnerDimensions(furniture, {
      ...rules,
      backInstallation: "inset",
      backInset: 5
    });
    expect(ic.depth).toBe(560 - 8 - 5);
  });

  it("geçersiz ölçüleri reddeder", () => {
    expect(() =>
      calculateCabinetInnerDimensions({ ...furniture, width: 0 }, rules)
    ).toThrow();
    expect(() =>
      calculateCabinetInnerDimensions({ ...furniture, width: -10 }, rules)
    ).toThrow();
    expect(() =>
      calculateCabinetInnerDimensions(
        { ...furniture, width: 20 },
        rules
      )
    ).toThrow("Dolap iç ölçüleri geçersiz.");
  });
});
