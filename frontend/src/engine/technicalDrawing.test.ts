import { describe, it, expect } from "vitest";
import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import {
  generateFrontElevationSvg,
  isValidSvgDrawing
} from "./technicalDrawing";

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
    name: "Test Dolap",
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
    ...overrides
  };
}

describe("technicalDrawing", () => {
  it("geçerli bir SVG ön yüz elevasyonu üretir", () => {
    const svg = generateFrontElevationSvg(furniture(), rules);

    expect(isValidSvgDrawing(svg)).toBe(true);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("kapak sayısı kadar kapak dikdörtgeni çizer", () => {
    const svg = generateFrontElevationSvg(furniture(), rules);

    const doorCount = (svg.match(/class="door"/g) ?? []).length;
    expect(doorCount).toBe(2);
  });

  it("çekmece sayısı kadar çekmece ön yüzü çizer", () => {
    const svg = generateFrontElevationSvg(
      furniture({ drawerCount: 3, doorCount: 0 }),
      rules
    );

    const drawerCount = (svg.match(/class="drawer"/g) ?? []).length;
    expect(drawerCount).toBe(3);
  });

  it("raf sayısı kadar rafta çizgisi çizer", () => {
    const svg = generateFrontElevationSvg(furniture(), rules);

    const shelfCount = (svg.match(/stroke-dasharray="4 3"/g) ?? []).length;
    expect(shelfCount).toBe(2);
  });

  it("genişlik ve yükseklik boyut etiketlerini içerir", () => {
    const svg = generateFrontElevationSvg(furniture(), rules);

    expect(svg).toContain("600 mm");
    expect(svg).toContain("850 mm");
  });

  it("özel ölçek faktörüne uyar", () => {
    const svg = generateFrontElevationSvg(furniture(), rules, { scale: 0.2 });

    expect(svg).toContain('width="120');
  });

  it("başlık metninde XML karakterlerini esc'ler", () => {
    const svg = generateFrontElevationSvg(
      furniture({ name: '<A & "B">' }),
      rules
    );

    expect(svg).toContain("&lt;A &amp; &quot;B&quot;&gt;");
    expect(svg).not.toContain("<A &");
  });

  it("geçersiz SVG metnini tanımlar", () => {
    expect(isValidSvgDrawing("<div></div>")).toBe(false);
    expect(isValidSvgDrawing("<svg>yüzey</svg>")).toBe(false);
  });
});
