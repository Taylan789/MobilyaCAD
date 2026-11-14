import { describe, expect, it } from "vitest";
import { calculateEdgeBanding } from "../edgeBanding";
import type { Part } from "../../types/part";

function part(overrides: Partial<Part>): Part {
  return {
    id: "p1",
    furnitureId: "f1",
    name: "Test",
    width: 100,
    length: 200,
    thickness: 18,
    quantity: 1,
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    material: "Suntalam",
    cncOperations: [],
    grainDirection: "none",
    ...overrides
  };
}

describe("edgeBanding", () => {
  it("tüm kenarlar açık olan parça için çevreyi hesaplamalıdır", () => {
    const result = calculateEdgeBanding(
      [part({ edgeBanding: { top: true, bottom: true, left: true, right: true } })],
      0.8
    );
    expect(result.perPart).toHaveLength(1);
    expect(result.perPart[0].totalLength).toBe(2 * (100 + 200));
    expect(result.totalLength).toBe(600);
    expect(result.edgeBandThickness).toBe(0.8);
  });

  it("adeti çoklu parça için toplam uzunluğu çarpmalıdır", () => {
    const result = calculateEdgeBanding(
      [
        part({
          quantity: 3,
          edgeBanding: { top: true, bottom: true, left: false, right: false }
        })
      ],
      0.8
    );
    expect(result.perPart[0].totalLength).toBe(3 * 2 * 100);
  });

  it("bantlama kapalı parçayı listelememelidir", () => {
    const result = calculateEdgeBanding([part({})], 0.8);
    expect(result.perPart).toHaveLength(0);
    expect(result.totalLength).toBe(0);
  });

  it("birden fazla parçanın toplamını hesaplamalıdır", () => {
    const result = calculateEdgeBanding(
      [
        part({
          id: "a",
          edgeBanding: { top: true, bottom: true, left: true, right: true }
        }),
        part({
          id: "b",
          width: 50,
          length: 50,
          edgeBanding: { top: true, bottom: false, left: false, right: false }
        })
      ],
      0.8
    );
    expect(result.totalLength).toBe(600 + 50);
  });
});
