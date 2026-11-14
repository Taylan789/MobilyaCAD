import { describe, expect, it } from "vitest";
import { generateComponents } from "../componentGenerator";
import { createDefaultConfig } from "../../types/furnitureModel";

describe("componentGenerator", () => {
  it("standart dolap için beklenen gövde bileşenlerini üretmelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 2,
      shelfCount: 0,
      drawerCount: 0
    });

    const { components } = generateComponents(config);

    const sides = components.filter((c) => c.kind === "side");
    expect(sides).toHaveLength(2);
    for (const side of sides) {
      expect(side.width).toBe(18);
      expect(side.height).toBe(850);
      expect(side.depth).toBe(560);
      expect(Math.abs(side.center.x)).toBe(291);
      expect(side.center.y).toBe(425);
    }

    const top = components.find((c) => c.kind === "top");
    expect(top).toBeDefined();
    expect(top!.width).toBe(564);
    expect(top!.height).toBe(18);
    expect(top!.depth).toBe(560);
    expect(top!.center.y).toBe(841);
    expect(top!.center.z).toBe(0);

    const bottom = components.find((c) => c.kind === "bottom");
    expect(bottom!.center.y).toBe(9);

    const back = components.find((c) => c.kind === "back");
    expect(back!.width).toBe(580);
    expect(back!.height).toBe(830);
    expect(back!.thickness).toBe(8);
    expect(back!.center.z).toBe(-276);
  });

  it("kapak sayısı sıfırsa kapak bileşeni üretmemelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 0
    });
    const { components } = generateComponents(config);
    expect(components.filter((c) => c.kind === "door")).toHaveLength(0);
  });

  it("kapak genişliğini ve konumunu doğru hesaplamalıdır", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 2
    });
    const { components } = generateComponents(config);
    const doors = components.filter((c) => c.kind === "door");
    expect(doors).toHaveLength(2);
    expect(doors[0].width).toBeCloseTo(297, 6);
    expect(doors[0].height).toBeCloseTo(844, 6);
    expect(doors[0].center.z).toBe(289);
    expect(doors[0].center.x).toBeCloseTo(-149.5, 6);
    expect(doors[1].center.x).toBeCloseTo(149.5, 6);
  });

  it("çekmece ön yüzlerini ve kutularını üretmelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      doorCount: 0,
      drawerCount: 3
    });
    const { components, issues } = generateComponents(config);

    const fronts = components.filter((c) => c.kind === "drawer-front");
    expect(fronts).toHaveLength(3);
    for (const front of fronts) {
      expect(front.height).toBe(240);
    }

    const boxSides = components.filter((c) => c.kind === "drawer-side");
    // 3 çekmece × (sol yan + sağ yan + arka) = 9
    expect(boxSides).toHaveLength(9);
    const bottoms = components.filter((c) => c.kind === "drawer-bottom");
    expect(bottoms).toHaveLength(3);

    const blocking = issues.filter((issue) => issue.severity === "error");
    expect(blocking).toHaveLength(0);
  });

  it("çok sayıda çekmece impossible ölçüde uyarı üretmelidir", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 200,
      depth: 560,
      drawerCount: 5
    });
    const { components, issues } = generateComponents(config);
    expect(components.filter((c) => c.kind === "drawer-front")).toHaveLength(0);
    expect(
      issues.some(
        (issue) => issue.field === "drawerCount" && issue.severity === "warning"
      )
    ).toBe(true);
  });

  it("rafları eşit aralıklı üretmelidir", () => {
    const config = createDefaultConfig("bookcase", {
      width: 800,
      height: 1800,
      depth: 300,
      shelfCount: 2,
      doorCount: 0
    });
    const { components } = generateComponents(config);
    const shelves = components.filter((c) => c.kind === "shelf");
    expect(shelves).toHaveLength(2);
    expect(shelves[0].center.y).toBeCloseTo(606, 6);
    expect(shelves[1].center.y).toBeCloseTo(1194, 6);
    expect(shelves[0].width).toBe(764);
  });

  it("bölücü varsa rafları bölümlendirmelidir", () => {
    const config = createDefaultConfig("wardrobe", {
      width: 1800,
      height: 2200,
      depth: 650,
      dividerCount: 1,
      shelfCount: 2,
      doorCount: 0
    });
    const { components } = generateComponents(config);
    const dividers = components.filter((c) => c.kind === "divider");
    expect(dividers).toHaveLength(1);
    expect(dividers[0].center.x).toBeCloseTo(0, 6);

    const shelves = components.filter((c) => c.kind === "shelf");
    expect(shelves).toHaveLength(4);
    expect(shelves[0].width).toBeCloseTo(873, 6);
  });

  it("kaide varsa gövdeyi yukarı taşımalıdır", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      hasPlinth: true,
      plinthHeight: 100,
      doorCount: 0
    });
    const { components } = generateComponents(config);
    const side = components.find((c) => c.kind === "side")!;
    expect(side.height).toBe(750);
    expect(side.center.y).toBe(475);

    const plinth = components.find((c) => c.kind === "plinth")!;
    expect(plinth.height).toBe(100);
    expect(plinth.center.y).toBe(50);
  });

  it("tezgâh varsa üstü taşımalıdır", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 900,
      depth: 560,
      hasWorktop: true,
      worktopThickness: 38,
      doorCount: 0
    });
    const { components } = generateComponents(config);
    const worktop = components.find((c) => c.kind === "worktop")!;
    expect(worktop.width).toBe(600);
    expect(worktop.height).toBe(38);
    expect(worktop.depth).toBe(580);
    expect(worktop.center.y).toBe(881);
  });

  it("düşük yükseklik özel modül için tek parça üretmelidir", () => {
    const config = createDefaultConfig("custom", {
      width: 600,
      height: 40,
      depth: 600,
      doorCount: 0,
      shelfCount: 0
    });
    const { components } = generateComponents(config);
    expect(components).toHaveLength(1);
    expect(components[0].kind).toBe("worktop");
    expect(components[0].width).toBe(600);
    expect(components[0].height).toBe(40);
    expect(components[0].depth).toBe(600);
  });

  it("masa modunda üst ve 4 bacak üretmelidir", () => {
    const config = createDefaultConfig("desk", {
      width: 1200,
      height: 750,
      depth: 600,
      doorCount: 0,
      drawerCount: 0,
      shelfCount: 0
    });
    const { components } = generateComponents(config);
    const legs = components.filter((c) => c.name.startsWith("Bacak"));
    expect(legs).toHaveLength(4);
    expect(legs[0].width).toBe(48);
    expect(legs[0].height).toBe(732);
    const top = components.find((c) => c.kind === "top")!;
    expect(top.center.y).toBe(750 - 9);
  });

  it("geçersiz yapılandırma için bileşen üretmemelidir", () => {
    const config = createDefaultConfig("kitchen", { width: 50 });
    const { components, issues } = generateComponents(config);
    expect(components).toHaveLength(0);
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("arkalık overlay modunda tam genişlik olmalıdır", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      backInstallation: "overlay",
      doorCount: 0
    });
    const { components } = generateComponents(config);
    const back = components.find((c) => c.kind === "back")!;
    expect(back.width).toBe(600);
    expect(back.height).toBe(850);
  });

  it("arkalık inset modunda iç açılış içinde olmalıdır", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      backInstallation: "inset",
      backInset: 10,
      doorCount: 0
    });
    const { components } = generateComponents(config);
    const back = components.find((c) => c.kind === "back")!;
    expect(back.width).toBe(564);
    expect(back.center.z).toBe(-280 + 10 + 4);
  });

  it("her bileşen için kenar bantlama ve tarla yönü tanımlı olmalıdır", () => {
    const config = createDefaultConfig("kitchen", {
      width: 600,
      height: 850,
      depth: 560,
      shelfCount: 1,
      doorCount: 1
    });
    const { components } = generateComponents(config);
    for (const component of components) {
      expect(component.edgeBanding).toBeDefined();
      expect(["length", "width", "none"]).toContain(component.grainDirection);
      expect(component.rule.length).toBeGreaterThan(0);
      expect(component.formula.length).toBeGreaterThan(0);
    }
  });
});
