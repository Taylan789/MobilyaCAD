import { describe, it, expect } from "vitest";
import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import {
  buildCutList,
  groupCutList,
  cutListToCsv,
  cutListToJson,
  summarizeCutList
} from "./cutList";

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
    doorCount: 2,
    ...overrides
  };
}

describe("cutList", () => {
  it("birden fazla mobilya için kesim listesi oluşturur", () => {
    const rows = buildCutList([
      furniture({ id: "f1", name: "Dolap A" }),
      furniture({ id: "f2", name: "Dolap B", doorCount: 3 })
    ], rules);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter(r => r.furnitureName === "Dolap A").length).toBe(
      rows.filter(r => r.furnitureName === "Dolap B").length
    );
  });

  it("malzeme bazında gruplar", () => {
    const rows = buildCutList([furniture()], rules);
    const groups = groupCutList(rows, "material");

    expect(groups.size).toBeGreaterThanOrEqual(1);
    for (const [key] of groups) {
      expect(key).toBe("Belirtilmemiş");
    }
  });

  it("parça tipi bazında gruplar", () => {
    const rows = buildCutList(
      [furniture({ doorCount: 2, shelfCount: 2 })],
      rules
    );
    const groups = groupCutList(rows, "partType");

    expect(groups.has("Dolap Kapağı")).toBe(true);
    expect(groups.has("Raf")).toBe(true);
  });

  it("CSV Türkçe karakter, BOM ve noktalı virgül içerir", () => {
    const rows = buildCutList([furniture()], rules);
    const csv = cutListToCsv(rows);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Mobilya;Parça");
    expect(csv).toContain("Dolap Kapağı");
    expect(csv).toContain("\r\n");
  });

  it("CSV özel karakterleri kaçırır", () => {
    const rows = buildCutList(
      [furniture({ name: 'Dolap; "özel"' })],
      rules
    );
    const csv = cutListToCsv(rows);

    expect(csv).toContain('"Dolap; ""özel"""');
  });

  it("JSON yapılandırılmış veri döndürür", () => {
    const rows = buildCutList([furniture()], rules);
    const json = JSON.parse(cutListToJson(rows));

    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toHaveProperty("furniture");
    expect(json[0]).toHaveProperty("width");
    expect(json[0]).toHaveProperty("edgeBanding");
  });

  it("özet istatistikleri hesaplar", () => {
    const rows = buildCutList([furniture()], rules);
    const summary = summarizeCutList(rows);

    expect(summary.totalPartCount).toBeGreaterThan(0);
    expect(summary.totalAreaSquareMeters).toBeGreaterThan(0);
    expect(summary.totalEdgeBandingLengthMm).toBeGreaterThan(0);
    expect(summary.distinctMaterials).toBeGreaterThanOrEqual(1);
  });
});
