// Kenar bantlama hesaplama motoru.
// Her parça için bantlanan kenar uzunluklarını ve toplam bantlama ihtiyacını hesaplar.

import type { Part } from "../types/part";
import { roundMeasurement } from "./measurement";

export interface EdgeBandingSummary {
  partId: string;
  partName: string;
  thickness: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  totalLength: number;
}

export interface EdgeBandingResult {
  perPart: EdgeBandingSummary[];
  totalLength: number;
  edgeBandThickness: number;
}

// Parça yüzeyinin kenar uzunlukları: top/bottom = genişlik, left/right = uzunluq.
export function calculateEdgeBanding(
  parts: Part[],
  edgeBandThickness: number
): EdgeBandingResult {
  const perPart: EdgeBandingSummary[] = [];
  let totalLength = 0;

  parts.forEach((part) => {
    const top = part.edgeBanding.top ? part.width : 0;
    const bottom = part.edgeBanding.bottom ? part.width : 0;
    const left = part.edgeBanding.left ? part.length : 0;
    const right = part.edgeBanding.right ? part.length : 0;

    const partTotal = roundMeasurement(
      (top + bottom + left + right) * part.quantity
    );

    if (partTotal > 0) {
      perPart.push({
        partId: part.id,
        partName: part.name,
        thickness: part.thickness,
        top: roundMeasurement(top * part.quantity),
        bottom: roundMeasurement(bottom * part.quantity),
        left: roundMeasurement(left * part.quantity),
        right: roundMeasurement(right * part.quantity),
        totalLength: partTotal
      });
      totalLength += partTotal;
    }
  });

  return {
    perPart,
    totalLength: roundMeasurement(totalLength),
    edgeBandThickness
  };
}
