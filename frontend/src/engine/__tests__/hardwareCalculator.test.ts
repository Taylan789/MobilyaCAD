import { describe, expect, it } from "vitest";
import { calculateHardware } from "../hardwareCalculator";
import { createDefaultConfig } from "../../types/furnitureModel";

describe("hardwareCalculator", () => {
  it("kapak genişliğine göre menteşe sayısını belirlemelidir", () => {
    // 600 mm genişlikte 2 kapak: kapak genişliği 297 mm → 2 menteşe/kapak.
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 2
    });
    const hardware = calculateHardware(config);
    const hinges = hardware.find((h) => h.type === "hinge")!;
    expect(hinges.quantity).toBe(4);
    expect(hinges.rule).toBe("hinge-per-door");
  });

  it("geniş kapaklar için 3 menteşe kullanmalıdır", () => {
    const config = createDefaultConfig("wardrobe", {
      width: 1800,
      height: 2200,
      depth: 650,
      doorCount: 2
    });
    const hardware = calculateHardware(config);
    const hinges = hardware.find((h) => h.type === "hinge")!;
    expect(hinges.quantity).toBe(6);
  });

  it("çekmece için ray çifti ve tutamaç üretmelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 0,
      drawerCount: 3
    });
    const hardware = calculateHardware(config);
    const slides = hardware.find((h) => h.type === "drawer-slide")!;
    expect(slides.quantity).toBe(6);
    const handles = hardware.filter((h) => h.type === "handle");
    expect(handles.reduce((sum, h) => sum + h.quantity, 0)).toBe(3);
  });

  it("ayarlanabilir raflar için pim hesabı yapmalıdır", () => {
    const config = createDefaultConfig("bookcase", {
      width: 800,
      height: 1800,
      depth: 300,
      shelfCount: 3,
      shelfStyle: "adjustable",
      doorCount: 0
    });
    const hardware = calculateHardware(config);
    const pins = hardware.find((h) => h.type === "shelf-pin")!;
    expect(pins.quantity).toBe(12);
  });

  it("sabit raflar için destek hesabı yapmalıdır", () => {
    const config = createDefaultConfig("bookcase", {
      width: 800,
      height: 1800,
      depth: 300,
      shelfCount: 2,
      shelfStyle: "fixed",
      doorCount: 0
    });
    const hardware = calculateHardware(config);
    const supports = hardware.find((h) => h.type === "shelf-pin")!;
    expect(supports.quantity).toBe(4);
  });

  it("gövde birleşimleri için minifix ve kavela üretmelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 0
    });
    const hardware = calculateHardware(config);
    const minifix = hardware.find((h) => h.type === "minifix")!;
    expect(minifix.quantity).toBe(4);
    const dowels = hardware.find((h) => h.type === "dowel")!;
    expect(dowels.quantity).toBe(8);
  });

  it("arkalık varsa çevresine göre sabitleme üretmelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      hasBackPanel: true,
      doorCount: 0
    });
    const hardware = calculateHardware(config);
    const fasteners = hardware.find((h) => h.name === "Arkalık Pimi/Civata")!;
    expect(fasteners.quantity).toBe(Math.max(4, Math.round(2 * (600 + 850) / 300)));
  });

  it("arkalık yoksa arkalık sabitlemesi üretmemelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      hasBackPanel: false,
      doorCount: 0
    });
    const hardware = calculateHardware(config);
    expect(hardware.some((h) => h.name === "Arkalık Pimi/Civata")).toBe(false);
  });
});
