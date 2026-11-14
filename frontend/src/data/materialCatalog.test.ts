import { describe, it, expect } from "vitest";
import {
  materialCatalog,
  materialNames,
  findMaterialByName
} from "./materialCatalog";

describe("materialCatalog", () => {
  it("benzersiz kimlik ve isimlere sahip geçerli malzemeler içerir", () => {
    expect(materialCatalog.length).toBeGreaterThan(0);

    const ids = materialCatalog.map(material => material.id);
    const names = materialCatalog.map(material => material.name);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);

    for (const material of materialCatalog) {
      expect(material.thickness).toBeGreaterThan(0);
      expect(material.sheetWidth).toBeGreaterThan(0);
      expect(material.sheetLength).toBeGreaterThan(0);
      expect(material.pricePerSquareMeter).toBeGreaterThan(0);
      expect(material.edgeBandThickness).toBeGreaterThan(0);
    }
  });

  it("malzeme adları listesi kataloğa denk düşer", () => {
    expect(materialNames).toEqual(materialCatalog.map(m => m.name));
  });

  it("ada göre malzeme bulur", () => {
    expect(findMaterialByName("Suntalam")?.type).toBe("suntalam");
    expect(findMaterialByName("Yok")).toBeUndefined();
  });
});
