import { describe, it, expect } from "vitest";
import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { calculateCabinetParts } from "./cabinetParts";
import { roundMeasurement } from "./measurement";

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

function makeFurniture(
  overrides: Partial<Furniture> = {}
): Furniture {
  return {
    id: "cabinet-1",
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
    ...overrides
  };
}

describe("cabinetParts", () => {
  it("standart dolap için beklenen parçaları üretir", () => {
    const parts = calculateCabinetParts(makeFurniture(), rules);

    const names = parts.map(p => p.name);
    expect(names).toContain("Sol Yan Panel");
    expect(names).toContain("Sağ Yan Panel");
    expect(names).toContain("Üst Tabla");
    expect(names).toContain("Alt Tabla");
    expect(names).toContain("Raf");
    expect(names).toContain("Dolap Kapağı");
    expect(names).toContain("Arkalık");

    const yan = parts.find(p => p.id === "cabinet-1-left-side")!;
    expect(yan.width).toBe(560);
    expect(yan.length).toBe(850);
    expect(yan.thickness).toBe(18);

    const ust = parts.find(p => p.id === "cabinet-1-top")!;
    expect(ust.width).toBe(564);
    expect(ust.length).toBe(560);
    expect(ust.thickness).toBe(18);

    const raf = parts.find(p => p.id === "cabinet-1-shelf")!;
    expect(raf.width).toBe(564);
    expect(raf.length).toBe(552);
    expect(raf.quantity).toBe(2);

    const kapak = parts.find(p => p.id === "cabinet-1-door")!;
    expect(kapak.width).toBe(297);
    expect(kapak.length).toBe(846);
    expect(kapak.quantity).toBe(2);

    const arkalik = parts.find(p => p.id === "cabinet-1-back")!;
    expect(arkalik.width).toBe(580);
    expect(arkalik.length).toBe(830);
    expect(arkalik.thickness).toBe(8);
  });

  it("kapak yoksa kapak parça üretmez", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ doorCount: 0 }),
      rules
    );
    expect(parts.find(p => p.id.endsWith("-door"))).toBeUndefined();
  });

  it("raf sayısı 0 ise raf parça üretmez", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ shelfCount: 0 }),
      rules
    );
    expect(parts.find(p => p.id.endsWith("-shelf"))).toBeUndefined();
  });

  it("arkalık devre dışı ise arkalık parça üretmez", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ hasBackPanel: false }),
      rules
    );
    expect(parts.find(p => p.id.endsWith("-back"))).toBeUndefined();
  });

  it("birden fazla kapak ve raf için aded doğru hesaplanır", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ doorCount: 3, shelfCount: 4 }),
      rules
    );
    const kapak = parts.find(p => p.id.endsWith("-door"))!;
    expect(kapak.quantity).toBe(3);
    expect(kapak.width).toBe(roundMeasurement((600 - 8) / 3));

    const raf = parts.find(p => p.id.endsWith("-shelf"))!;
    expect(raf.quantity).toBe(4);
  });

  it("çekmeceli dolap için çekmece parçaları üretir", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ drawerCount: 3, doorCount: 0, shelfCount: 0 }),
      rules
    );

    const onYuz = parts.find(p => p.id.endsWith("-drawer-front"))!;
    expect(onYuz.quantity).toBe(3);
    expect(onYuz.width).toBe(560);

    const yan = parts.find(p => p.id.endsWith("-drawer-side"))!;
    expect(yan.quantity).toBe(6);
    expect(yan.thickness).toBe(12);

    const tabla = parts.find(p => p.id.endsWith("-drawer-bottom"))!;
    expect(tabla.quantity).toBe(3);
    expect(tabla.thickness).toBe(6);
  });

  it("half-overlay kapak genişliğini doğru hesaplar", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ doorCount: 2 }),
      { ...rules, doorStyle: "half-overlay" }
    );
    const kapak = parts.find(p => p.id.endsWith("-door"))!;
    expect(kapak.width).toBeCloseTo((600 + 18 - 6) / 2, 5);
  });

  it("inset kapak genişliğini ve yüksekliğini doğru hesaplar", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ doorCount: 2 }),
      { ...rules, doorStyle: "inset" }
    );
    const kapak = parts.find(p => p.id.endsWith("-door"))!;
    expect(kapak.width).toBeCloseTo((600 - 36 - 6) / 2, 5);
    expect(kapak.length).toBe(850 - 36 - 4);
  });

  it("farklı panel kalınlığını kıvrım ve iç ölçülere uygular", () => {
    const parts = calculateCabinetParts(
      makeFurniture(),
      { ...rules, panelThickness: 25 }
    );
    const ust = parts.find(p => p.id.endsWith("-top"))!;
    expect(ust.width).toBe(550);
    expect(ust.thickness).toBe(25);
  });

  it("geçersiz kapak sayısını reddeder", () => {
    expect(() =>
      calculateCabinetParts(makeFurniture({ doorCount: -1 }), rules)
    ).toThrow("Kapak sayısı geçersiz.");
  });

  it("mümkün olmayan kapak ölçülerinde hata verir", () => {
    expect(() =>
      calculateCabinetParts(
        makeFurniture({ width: 100, doorCount: 2 }),
        { ...rules, doorGap: 60 }
      )
    ).toThrow("Kapak ölçüleri geçersiz.");
  });

  it("her parçanın izlenebilir üretim notu ve malzemesi olur", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ material: "Suntalam" }),
      rules
    );
    for (const part of parts) {
      expect(part.material).toBe("Suntalam");
      expect(part.productionNote?.length).toBeGreaterThan(0);
      expect(part.furnitureId).toBe("cabinet-1");
      expect(part.grainDirection).toBe("length");
    }
  });

  it("kenar bantlama kapalıyken hiçbir parça bantlamaz", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ edgeBanding: false }),
      rules
    );

    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      expect(part.edgeBanding).toEqual({
        top: false,
        bottom: false,
        left: false,
        right: false
      });
    }
  });

  it("kenar bantlama açıkken (varsayılan) kapaklar bantlı olur", () => {
    const parts = calculateCabinetParts(
      makeFurniture({ edgeBanding: true }),
      rules
    );

    const kapak = parts.find(p => p.name === "Dolap Kapağı")!;
    expect(kapak.edgeBanding.top).toBe(true);
    expect(kapak.edgeBanding.right).toBe(true);
  });
});
