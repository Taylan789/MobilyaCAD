import { describe, it, expect } from "vitest";
import type { NestingPart } from "./nesting";
import {
  nestParts,
  generateNestingSvg,
  summarizeNesting
} from "./nesting";

const sheet = { widthMm: 2800, lengthMm: 2070 };

function part(overrides: Partial<NestingPart> = {}): NestingPart {
  return {
    id: "p1",
    name: "Yan Panel",
    widthMm: 700,
    lengthMm: 800,
    quantity: 1,
    ...overrides
  };
}

describe("nesting", () => {
  it("küçük parça setini tek levhaya yerleştirir", () => {
    const result = nestParts(
      [part({ id: "a" }), part({ id: "b" }), part({ id: "c" })],
      sheet
    );

    expect(result.sheets.length).toBe(1);
    expect(result.placedCount).toBe(3);
    expect(result.unplaced).toEqual([]);
    expect(result.heuristic).toBe(true);
  });

  it("çok sayıda parçada birden fazla levha kullanır", () => {
    const result = nestParts(
      [part({ id: "a", quantity: 20 })],
      sheet
    );

    expect(result.sheets.length).toBeGreaterThan(1);
    expect(result.placedCount).toBe(20);
    expect(result.unplaced).toEqual([]);
  });

  it("levhadan büyük parçayı yerleştiremez olarak işaretler", () => {
    const result = nestParts(
      [part({ id: "big", widthMm: 3000, lengthMm: 2500 })],
      sheet
    );

    expect(result.placedCount).toBe(0);
    expect(result.sheets.length).toBe(0);
    expect(result.unplaced).toHaveLength(1);
    expect(result.unplaced[0].id).toBe("big");
  });

  it("kesim payı arasında güvenlik aralığı korur", () => {
    const kerf = 5;
    const result = nestParts(
      [
        part({ id: "a", widthMm: 1000, lengthMm: 2000 }),
        part({ id: "b", widthMm: 1000, lengthMm: 2000 }),
        part({ id: "c", widthMm: 1000, lengthMm: 2000 })
      ],
      sheet,
      { kerfMm: kerf }
    );

    expect(result.placedCount).toBe(3);

    const placed = result.sheets[0];
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const horizontalGap = Math.max(
          b.xMm - (a.xMm + a.widthMm),
          a.xMm - (b.xMm + b.widthMm)
        );
        const verticalGap = Math.max(
          b.yMm - (a.yMm + a.lengthMm),
          a.yMm - (b.yMm + b.lengthMm)
        );
        // İki eksenin en az birinde kerf kadar boşluk olmalı.
        expect(horizontalGap >= kerf || verticalGap >= kerf).toBe(true);
      }
    }
  });

  it("dar uzun parçayı döndürerek yerleştirir", () => {
    const result = nestParts(
      [part({ id: "a", widthMm: 2500, lengthMm: 200 })],
      { widthMm: 1000, lengthMm: 2800 }
    );

    expect(result.placedCount).toBe(1);
    expect(result.sheets[0][0].rotated).toBe(true);
    expect(result.sheets[0][0].widthMm).toBe(200);
    expect(result.sheets[0][0].lengthMm).toBe(2500);
  });

  it("döndürme istemeyen parçayı döndürmez", () => {
    const result = nestParts(
      [part({ id: "a", widthMm: 2500, lengthMm: 200, canRotate: false })],
      { widthMm: 1000, lengthMm: 2800 }
    );

    expect(result.placedCount).toBe(0);
    expect(result.unplaced).toHaveLength(1);
  });

  it("boş parça listesinde levha oluşturmaz", () => {
    const result = nestParts([], sheet);

    expect(result.sheets).toEqual([]);
    expect(result.placedCount).toBe(0);
    expect(result.utilizationPercent).toBe(0);
  });

  it("yarıtlı kullanım oranını hesaplar", () => {
    const result = nestParts([part({ id: "a", quantity: 2 })], sheet);

    expect(result.utilizationPercent).toBeGreaterThan(0);
    expect(result.utilizationPercent).toBeLessThanOrEqual(100);
  });

  it("özet bilgileri döndürür", () => {
    const result = nestParts([part({ id: "a", quantity: 5 })], sheet);
    const summary = summarizeNesting(result);

    expect(summary.placedCount).toBe(5);
    expect(summary.unplacedCount).toBe(0);
    expect(summary.sheetCount).toBe(result.sheets.length);
  });

  it("levha için geçerli bir SVG çizimi üretir", () => {
    const result = nestParts([part({ id: "a", quantity: 2 })], sheet);
    const svg = generateNestingSvg(result, 0);

    expect(svg.trimStart().startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain("2800×2070");
    expect(svg).toContain("Yan Panel");
    expect(svg).toContain("Heuristik yerleştirme");
  });

  it("olasız levha indeksi için boş çizim üretir", () => {
    const result = nestParts([part({ id: "a" })], sheet);
    const svg = generateNestingSvg(result, 5);

    expect(svg).toContain("<svg");
    expect(svg).toContain("Levha 6");
  });
});
