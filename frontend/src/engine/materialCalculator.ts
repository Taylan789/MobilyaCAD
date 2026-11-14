import type { Part } from "../types/part";
import type { Material } from "../types/material";
import { roundMeasurement } from "./measurement";

// Bir parçanın bantlama uzunluğunu milimetre cinsinden hesaplar.
// Parça düzlemde width x length olarak kesildiği için:
// üst/alt kenarlar width, sol/sağ kenarlar length uzunluğundadır.
export function calculatePartEdgeBandingLength(part: Part): number {
  let length = 0;

  if (part.edgeBanding.top) length += part.width;
  if (part.edgeBanding.bottom) length += part.width;
  if (part.edgeBanding.left) length += part.length;
  if (part.edgeBanding.right) length += part.length;

  return roundMeasurement(length * part.quantity);
}

export interface MaterialConsumption {
  material: string;
  partCount: number;
  totalAreaSquareMeters: number;
  totalEdgeBandingLengthMm: number;
}

export interface ConsumptionSummary {
  byMaterial: MaterialConsumption[];
  totalPartCount: number;
  totalAreaSquareMeters: number;
  totalEdgeBandingLengthMm: number;
}

// Parça listesinden malzeme tüketimini hesaplar.
// Alan teorik kesim alanıdır; stok levha ihtiyacı ayrı hesaplanır.
export function calculateMaterialConsumption(
  parts: Part[]
): ConsumptionSummary {
  const byMaterial = new Map<string, MaterialConsumption>();

  let totalPartCount = 0;
  let totalArea = 0;
  let totalBanding = 0;

  for (const part of parts) {
    const areaMm2 = part.width * part.length * part.quantity;
    const banding = calculatePartEdgeBandingLength(part);

    const entry = byMaterial.get(part.material) ?? {
      material: part.material,
      partCount: 0,
      totalAreaSquareMeters: 0,
      totalEdgeBandingLengthMm: 0
    };

    entry.partCount += part.quantity;
    entry.totalAreaSquareMeters += areaMm2 / 1_000_000;
    entry.totalEdgeBandingLengthMm += banding;

    byMaterial.set(part.material, entry);

    totalPartCount += part.quantity;
    totalArea += areaMm2 / 1_000_000;
    totalBanding += banding;
  }

  const sorted = Array.from(byMaterial.values()).sort((a, b) =>
    a.material.localeCompare(b.material, "tr")
  );

  for (const entry of sorted) {
    entry.totalAreaSquareMeters = roundMeasurement(
      entry.totalAreaSquareMeters * 100
    ) / 100;
    entry.totalEdgeBandingLengthMm = roundMeasurement(
      entry.totalEdgeBandingLengthMm
    );
  }

  return {
    byMaterial: sorted,
    totalPartCount,
    totalAreaSquareMeters: roundMeasurement(totalArea * 100) / 100,
    totalEdgeBandingLengthMm: roundMeasurement(totalBanding)
  };
}

// Stok levha ihtiyacını hesaplar.
// Bu hesaplama bir yerleştirme (nesting) algoritması değil,
// teorik alan oranından türetilmiş bir tahmindir.
export function estimateSheetRequirements(
  parts: Part[],
  materials: Material[]
): { material: string; sheets: number; wasteRatio: number }[] {
  const consumption = calculateMaterialConsumption(parts);
  const result: { material: string; sheets: number; wasteRatio: number }[] = [];

  for (const entry of consumption.byMaterial) {
    const material = materials.find(m => m.name === entry.material);

    if (!material || material.sheetWidth <= 0 || material.sheetLength <= 0) {
      continue;
    }

    const sheetArea = (material.sheetWidth * material.sheetLength) / 1_000_000;
    const sheets = Math.ceil(entry.totalAreaSquareMeters / sheetArea);
    const wasteRatio =
      entry.totalAreaSquareMeters > 0
        ? roundMeasurement(
            ((sheets * sheetArea - entry.totalAreaSquareMeters) /
              (sheets * sheetArea)) *
              100
          )
        : 0;

    result.push({
      material: entry.material,
      sheets,
      wasteRatio
    });
  }

  return result;
}
