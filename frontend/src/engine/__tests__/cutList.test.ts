import { describe, expect, it } from "vitest";
import {
  buildCutList,
  cutListToCsv,
  cutListToJson,
  groupCutList
} from "../cutList";
import type { Part } from "../../types/part";

function part(name: string, overrides: Partial<Part> = {}): Part {
  return {
    id: "p-" + name,
    furnitureId: "f1",
    name,
    width: 100,
    length: 200,
    thickness: 18,
    quantity: 1,
    edgeBanding: { top: true, bottom: true, left: false, right: false },
    material: "Suntalam",
    cncOperations: [],
    grainDirection: "length",
    ...overrides
  };
}

describe("cutList", () => {
  it("birden fazla mobilyanın parçalarını birleştirmelidir", () => {
    const rows = buildCutList([
      { furnitureName: "Dolap 1", parts: [part("Yan Panel", { quantity: 2 })] },
      { furnitureName: "Dolap 2", parts: [part("Kapak")] }
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].furnitureName).toBe("Dolap 1");
    expect(rows[0].quantity).toBe(2);
    expect(rows[1].furnitureName).toBe("Dolap 2");
  });

  it("kenar bantlama bilgisini metin olarak özetlemelidir", () => {
    const rows = buildCutList([
      {
        furnitureName: "Dolap",
        parts: [
          part("Kapak", {
            edgeBanding: { top: true, bottom: true, left: true, right: true }
          })
        ]
      }
    ]);
    expect(rows[0].edgeBanding).toBe("Üst+Alt+Sol+Sağ");
  });

  it("malzemeye göre gruplamalıdır", () => {
    const rows = buildCutList([
      {
        furnitureName: "A",
        parts: [
          part("X", { material: "MDF" }),
          part("Y", { material: "Suntalam" })
        ]
      }
    ]);
    const groups = groupCutList(rows, "material");
    expect(groups.size).toBe(2);
    expect(groups.get("MDF")).toHaveLength(1);
    expect(groups.get("Suntalam")).toHaveLength(1);
  });

  it("kalınlığa göre gruplamalıdır", () => {
    const rows = buildCutList([
      {
        furnitureName: "A",
        parts: [part("X", { thickness: 18 }), part("Y", { thickness: 8 })]
      }
    ]);
    const groups = groupCutList(rows, "thickness");
    expect(groups.has("18 mm")).toBe(true);
    expect(groups.has("8 mm")).toBe(true);
  });

  it("CSV BOM, noktalı virgül ve Türkçe karakterleri korumalıdır", () => {
    const rows = buildCutList([
      {
        furnitureName: "Çekmeceli Dolap",
        parts: [part("Çekmece Ön Yüzü", { material: "MDF Lam" })]
      }
    ]);
    const csv = cutListToCsv(rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Çekmeceli Dolap");
    expect(csv).toContain("Çekmece Ön Yüzü");
    expect(csv).toContain("MDF Lam");
    expect(csv).toContain(";");
    expect(csv).toContain("\r\n");
  });

  it("CSV noktalı virgül ve tırnak içeren değerleri kaçıştırmalıdır", () => {
    const rows = buildCutList([
      {
        furnitureName: "A;B",
        parts: [part('Parça "X"')]
      }
    ]);
    const csv = cutListToCsv(rows);
    expect(csv).toContain('"A;B"');
    expect(csv).toContain('"Parça ""X"""');
  });

  it("JSON dışa aktarımı yapısal bilgileri içermelidir", () => {
    const rows = buildCutList([
      { furnitureName: "A", parts: [part("X")] }
    ]);
    const json = cutListToJson(rows);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe("MobilyaCAD");
    expect(parsed.formatVersion).toBe(2);
    expect(parsed.unit).toBe("mm");
    expect(parsed.rows).toHaveLength(1);
  });
});
