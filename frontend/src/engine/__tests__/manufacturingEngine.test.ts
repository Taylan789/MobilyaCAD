import { describe, expect, it } from "vitest";
import { calculateManufacturingParts } from "../manufacturingEngine";
import { createDefaultConfig } from "../../types/furnitureModel";

describe("manufacturingEngine", () => {
  const standard = createDefaultConfig("kitchen", {
    width: 600,
    height: 850,
    depth: 560,
    doorCount: 2,
    shelfCount: 0,
    drawerCount: 0,
    material: "Suntalam"
  });

  it("standart dolap için 5 gruplı üretim parçasını üretmelidir", () => {
    const { parts } = calculateManufacturingParts("f1", standard);
    expect(parts).toHaveLength(5);

    const sides = parts.find((p) => p.name === "Yan Panel")!;
    expect(sides.quantity).toBe(2);
    expect(sides.width).toBe(560);
    expect(sides.length).toBe(850);
    expect(sides.thickness).toBe(18);

    const doors = parts.find((p) => p.name === "Kapak")!;
    expect(doors.quantity).toBe(2);
    expect(doors.width).toBeCloseTo(297, 6);
    expect(doors.length).toBeCloseTo(844, 6);
    expect(doors.thickness).toBe(18);

    const back = parts.find((p) => p.name === "Arkalık")!;
    expect(back.thickness).toBe(8);
    expect(back.quantity).toBe(1);
  });

  it("parça adedi toplamı bileşen sayısına eşit olmalıdır", () => {
    const { parts, components } = calculateManufacturingParts("f1", standard);
    const totalQty = parts.reduce((sum, p) => sum + p.quantity, 0);
    expect(totalQty).toBe(components.length);
  });

  it("her parça malzeme, kenar bantlama ve tarla yönü taşımalıdır", () => {
    const { parts } = calculateManufacturingParts("f1", standard);
    for (const part of parts) {
      expect(part.material).toBe("Suntalam");
      expect(part.furnitureId).toBe("f1");
      expect(["length", "width", "none"]).toContain(part.grainDirection);
      expect(typeof part.edgeBanding.top).toBe("boolean");
    }
  });

  it("her parça izlenebilir kural ve formül notu taşımalıdır", () => {
    const { parts } = calculateManufacturingParts("f1", standard);
    for (const part of parts) {
      expect(part.productionNote).toContain("Kural:");
      expect(part.productionNote).toContain("Formül:");
      expect(part.productionNote!.length).toBeGreaterThan(10);
    }
  });

  it("kapak kenar bantlaması tüm kenarları kapsamalıdır", () => {
    const { parts } = calculateManufacturingParts("f1", standard);
    const door = parts.find((p) => p.name === "Kapak")!;
    expect(door.edgeBanding.top).toBe(true);
    expect(door.edgeBanding.bottom).toBe(true);
    expect(door.edgeBanding.left).toBe(true);
    expect(door.edgeBanding.right).toBe(true);
  });

  it("arkalık kenar bantlaması kapalı olmalıdır", () => {
    const { parts } = calculateManufacturingParts("f1", standard);
    const back = parts.find((p) => p.name === "Arkalık")!;
    expect(back.edgeBanding.top).toBe(false);
    expect(back.edgeBanding.bottom).toBe(false);
  });

  it("çekmeceli dolap için çekmece kutusu parçaları üretmelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 0,
      drawerCount: 2
    });
    const { parts } = calculateManufacturingParts("f2", config);
    const names = parts.map((p) => p.name);
    expect(names).toContain("Çekmece Ön Yüzü");
    expect(names).toContain("Çekmece 1 Sol Yan");
    expect(names).toContain("Çekmece 1 Tabanı");
    expect(names).toContain("Çekmece 1 Arka");

    const sides = parts.find((p) => p.name === "Çekmece 1 Sol Yan")!;
    expect(sides.quantity).toBe(4);
    const fronts = parts.find((p) => p.name === "Çekmece Ön Yüzü")!;
    expect(fronts.quantity).toBe(2);
  });

  it("geçersiz yapılandırma için parça üretmemelidir", () => {
    const config = createDefaultConfig("kitchen", { width: 50 });
    const { parts } = calculateManufacturingParts("f3", config);
    expect(parts).toHaveLength(0);
  });

  it("raflı dolap için raf adedini doğru gruplamalıdır", () => {
    const config = createDefaultConfig("bookcase", {
      width: 800,
      height: 1800,
      depth: 300,
      shelfCount: 3,
      doorCount: 0
    });
    const { parts } = calculateManufacturingParts("f4", config);
    const shelf = parts.find((p) => p.name === "Raf")!;
    expect(shelf.quantity).toBe(3);
    expect(shelf.width).toBe(764);
  });
});
