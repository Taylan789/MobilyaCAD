import { describe, expect, it } from "vitest";
import { nestParts, totalWastePercent } from "../nesting";

describe("nesting", () => {
  it("sığan parçaları tek levhaya yerleştirmelidir", () => {
    const result = nestParts([
      { id: "a", name: "Yan Panel", width: 560, length: 850, quantity: 2, allowRotation: true },
      { id: "b", name: "Üst Tabla", width: 564, length: 560, quantity: 1, allowRotation: true }
    ]);
    expect(result.layouts).toHaveLength(1);
    expect(result.layouts[0].parts).toHaveLength(3);
    expect(result.skippedPartIds).toHaveLength(0);
  });

  it("yerleştirilmiş parçalar çakışmamalıdır", () => {
    const inputs = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      name: `Parça ${i}`,
      width: 400 + (i % 3) * 100,
      length: 300 + (i % 4) * 80,
      quantity: 1,
      allowRotation: true
    }));
    const result = nestParts(inputs);
    for (const sheet of result.layouts) {
      for (let i = 0; i < sheet.parts.length; i++) {
        for (let j = i + 1; j < sheet.parts.length; j++) {
          const a = sheet.parts[i];
          const b = sheet.parts[j];
          const overlap =
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.length &&
            a.y + a.length > b.y;
          expect(overlap).toBe(false);
        }
      }
    }
  });

  it("parçalar levha sınırlarını aşmamalıdır", () => {
    const sheet = { width: 2800, length: 2070 };
    const result = nestParts(
      [
        { id: "a", name: "Büyük", width: 2000, length: 1500, quantity: 3, allowRotation: true }
      ],
      { sheet, kerf: 3, margin: 10 }
    );
    for (const layout of result.layouts) {
      for (const placed of layout.parts) {
        expect(placed.x).toBeGreaterThanOrEqual(10 - 3);
        expect(placed.y).toBeGreaterThanOrEqual(10 - 3);
        expect(placed.x + placed.width).toBeLessThanOrEqual(sheet.width - 10 + 3);
        expect(placed.y + placed.length).toBeLessThanOrEqual(sheet.length - 10 + 3);
      }
    }
  });

  it("döndürmeye izin verilirse parça döndürülebilir", () => {
    const result = nestParts(
      [
        { id: "a", name: "Uzun", width: 2000, length: 900, quantity: 1, allowRotation: true }
      ],
      { sheet: { width: 1200, length: 2500 }, kerf: 3, margin: 10 }
    );
    expect(result.layouts[0].parts[0].rotated).toBe(true);
    expect(result.layouts[0].parts[0].width).toBe(900);
    expect(result.layouts[0].parts[0].length).toBe(2000);
  });

  it("döndürme yasaklanmışsa parça döndürülmemelidir", () => {
    const result = nestParts(
      [
        { id: "a", name: "Uzun", width: 2000, length: 900, quantity: 1, allowRotation: false }
      ],
      { sheet: { width: 1200, length: 2500 }, kerf: 3, margin: 10 }
    );
    // 2000 mm genişlik 1200 mm levhaya sığmaz; parça atlanmalıdır.
    expect(result.skippedPartIds).toContain("a");
  });

  it("levhaya sığmayan parça atlanıp raporlanmalıdır", () => {
    const result = nestParts(
      [
        { id: "huge", name: "Dev", width: 5000, length: 5000, quantity: 1, allowRotation: true }
      ],
      { sheet: { width: 2800, length: 2070 }, kerf: 3, margin: 10 }
    );
    expect(result.skippedPartIds).toContain("huge");
  });

  it("çok sayıda parça birden fazla levha kullanmalıdır", () => {
    const inputs = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      name: `Parça ${i}`,
      width: 700,
      length: 900,
      quantity: 1,
      allowRotation: false
    }));
    const result = nestParts(inputs);
    const totalPlaced = result.layouts.reduce((sum, s) => sum + s.parts.length, 0);
    expect(totalPlaced).toBe(30);
    expect(result.layouts.length).toBeGreaterThan(1);
  });

  it("atık oranı hesaplamalıdır", () => {
    const result = nestParts([
      { id: "a", name: "X", width: 1000, length: 500, quantity: 1, allowRotation: false }
    ]);
    const waste = totalWastePercent(result.layouts);
    const sheetArea = 2800 * 2070;
    const expected = Math.round(((sheetArea - 500000) / sheetArea) * 1000) / 10;
    expect(waste).toBe(expected);
  });

  it("her levha için atık alanı ve kullanılan alanı tutarlı raporlamalıdır", () => {
    const result = nestParts([
      { id: "a", name: "X", width: 500, length: 400, quantity: 4, allowRotation: true }
    ]);
    for (const sheet of result.layouts) {
      const sheetArea = sheet.sheet.width * sheet.sheet.length;
      expect(sheet.usedAreaMm2 + sheet.wasteAreaMm2).toBe(sheetArea);
      expect(sheet.wastePercent).toBe(
        Math.round(((sheetArea - sheet.usedAreaMm2) / sheetArea) * 1000) / 10
      );
    }
  });
});
