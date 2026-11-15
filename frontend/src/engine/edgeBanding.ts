import type { Part } from "../types/part";
import { roundMeasurement, validateMeasurement } from "./measurement";

export interface EdgeBandingSummary {
  /** Total length of banded top/bottom edges, which run along part width. */
  widthEdgesLength: number;
  /** Total length of banded left/right edges, which run along part length. */
  lengthEdgesLength: number;
  totalLength: number;
  /** Number of individual banded edges, including each part's quantity. */
  edgeCount: number;
}

/**
 * Calculates linear edge-banding demand from the explicit edge flags on a cut list.
 * The model convention is top/bottom = part width and left/right = part length.
 * Quantities are multiplied; no band thickness, waste, or roll allowance is inferred.
 */
export function calculateEdgeBandingSummary(
  parts: readonly Part[]
): EdgeBandingSummary {
  let widthEdgesLength = 0;
  let lengthEdgesLength = 0;
  let edgeCount = 0;

  for (const part of parts) {
    validateMeasurement(part.width, `${part.name} genişliği`);
    validateMeasurement(part.length, `${part.name} uzunluğu`);

    if (!Number.isInteger(part.quantity) || part.quantity < 1) {
      throw new Error(`${part.name} adet değeri pozitif tam sayı olmalıdır.`);
    }

    const widthEdgeCount =
      Number(part.edgeBanding.top) + Number(part.edgeBanding.bottom);
    const lengthEdgeCount =
      Number(part.edgeBanding.left) + Number(part.edgeBanding.right);

    widthEdgesLength += part.width * widthEdgeCount * part.quantity;
    lengthEdgesLength += part.length * lengthEdgeCount * part.quantity;
    edgeCount += (widthEdgeCount + lengthEdgeCount) * part.quantity;
  }

  const totalLength = widthEdgesLength + lengthEdgesLength;
  if (
    !Number.isFinite(widthEdgesLength) ||
    !Number.isFinite(lengthEdgesLength) ||
    !Number.isFinite(totalLength)
  ) {
    throw new Error("Kenar bantlama toplamı hesaplanamadı.");
  }

  return {
    widthEdgesLength: roundMeasurement(widthEdgesLength),
    lengthEdgesLength: roundMeasurement(lengthEdgesLength),
    totalLength: roundMeasurement(totalLength),
    edgeCount
  };
}
