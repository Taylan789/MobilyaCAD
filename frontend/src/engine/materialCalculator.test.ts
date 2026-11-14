import { describe, it, expect } from "vitest";
import type { Part } from "../types/part";
import {
  calculatePartEdgeBandingLength,
  calculateMaterialConsumption,
  estimateSheetRequirements
} from "./materialCalculator";
import type { Material } from "../types/material";

function part(overrides: Partial<Part> = {}): Part {
  return {
    id: "p1",
    furnitureId: "f1",
    name: "Test",
    width: 100,
    length: 200,
    thickness: 18,
    quantity: 1,
    edgeBanding: { top: true, bottom: true, left: true, right: true },
    material: "Suntalam",
    cncOperations: [],
    grainDirection: "length",
    ...overrides
  };
}

describe("materialCalculator", () => {
  it("tüm kenarlar bantlı parça için kenar uzunluğunu hesaplar", () => {
    const p = part();
    // üst + alt = 2*100, sol + sağ = 2*200
    expect(calculatePartEdgeBandingLength(p)).toBe(600);
  });

  it("bantlanmamış kenarları hesaba katmaz", () => {
    const p = part({
      edgeBanding: { top: true, bottom: false, left: false, right: false }
    });
    expect(calculatePartEdgeBandingLength(p)).toBe(100);
  });

  it("adedi kenar uzunluğuna çarpar", () => {
    const p = part({ quantity: 4 });
    expect(calculatePartEdgeBandingLength(p)).toBe(2400);
  });

  it("malzeme bazında alan, bant uzunluğu ve parça sayısını özetler", () => {
    const summary = calculateMaterialConsumption([
      part({ material: "MDF", quantity: 2 }),
      part({ material: "Suntalam", quantity: 3 })
    ]);

    expect(summary.totalPartCount).toBe(5);
    expect(summary.byMaterial).toHaveLength(2);
    expect(summary.byMaterial.find(m => m.material === "MDF")!.partCount).toBe(2);
    expect(summary.byMaterial.find(m => m.material === "Suntalam")!.partCount).toBe(3);
    expect(summary.totalAreaSquareMeters).toBe(0.1);
  });

  it("stok levha tahminini hesaplar", () => {
    const materials: Material[] = [
      {
        id: "m1",
        name: "Suntalam",
        type: "suntalam",
        thickness: 18,
        sheetWidth: 2070,
        sheetLength: 2800,
        pricePerSquareMeter: 0,
        color: "#fff",
        edgeBandThickness: 0.8
      }
    ];

    // 1 m² lik parça
    const big = part({ width: 1000, length: 1000, quantity: 1 });
    const result = estimateSheetRequirements([big], materials);

    expect(result).toHaveLength(1);
    expect(result[0].sheets).toBe(1);
    expect(result[0].material).toBe("Suntalam");
    expect(result[0].wasteRatio).toBeGreaterThan(0);
    expect(result[0].wasteRatio).toBeLessThanOrEqual(100);
  });
});
