import type { Part } from "../types/part";
import {
  calculateEdgeBandingSummary,
  type EdgeBandingSummary
} from "./edgeBanding";
import { validateMeasurement } from "./measurement";

export interface MaterialConsumptionSummary {
  /** Trimmed material label; thickness is kept separate to avoid mixing boards. */
  material: string;
  /** Stable catalogue identity; absent for legacy/free-text material rows. */
  materialId?: string;
  /** Part thickness in millimetres. */
  thickness: number;
  /** Number of distinct cut-list rows in this material/thickness group. */
  partLineCount: number;
  /** Sum of each cut-list row's quantity. */
  totalQuantity: number;
  /** Net panel face area in square metres; excludes waste and yield. */
  panelAreaM2: number;
  /** Net panel volume in cubic metres; excludes waste and machining allowance. */
  volumeM3: number;
  /** Explicit edge-banding demand for this material/thickness group, in mm. */
  edgeBanding: EdgeBandingSummary;
}

interface MaterialAccumulator {
  material: string;
  materialId?: string;
  thickness: number;
  partLineCount: number;
  totalQuantity: number;
  panelAreaMm2: number;
  volumeMm3: number;
  parts: Part[];
}

const edgeKeys = ["top", "bottom", "left", "right"] as const;

function roundTo(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function validatePart(part: Part): { material: string; materialId?: string } {
  if (typeof part.material !== "string" || part.material.trim() === "") {
    throw new Error("Parça malzemesi belirtilmelidir.");
  }
  if (
    part.materialId !== undefined &&
    (typeof part.materialId !== "string" || part.materialId.trim() === "")
  ) {
    throw new Error("Parça malzeme kimliği boş olmayan bir metin olmalıdır.");
  }

  validateMeasurement(part.width, `${part.name} genişliği`);
  validateMeasurement(part.length, `${part.name} uzunluğu`);
  validateMeasurement(part.thickness, `${part.name} kalınlığı`);

  if (!Number.isSafeInteger(part.quantity) || part.quantity < 1) {
    throw new Error(`${part.name} adet değeri pozitif güvenli tam sayı olmalıdır.`);
  }

  if (
    !part.edgeBanding ||
    edgeKeys.some((edge) => typeof part.edgeBanding[edge] !== "boolean")
  ) {
    throw new Error(`${part.name} kenar bantlama bilgisi geçersiz.`);
  }

  return {
    material: part.material.trim(),
    ...(part.materialId === undefined ? {} : { materialId: part.materialId.trim() })
  };
}

/**
 * Groups calculated production parts by material and panel thickness.
 * All source dimensions are millimetres; quantities are applied before
 * converting net face area to m² and volume to m³. No waste, board yield,
 * kerf, band thickness, or roll allowance is inferred.
 */
export function calculateMaterialConsumptionSummary(
  parts: readonly Part[]
): MaterialConsumptionSummary[] {
  if (!Array.isArray(parts)) {
    throw new Error("Malzeme özeti için geçerli bir parça listesi gereklidir.");
  }

  const groups = new Map<string, MaterialAccumulator>();

  for (const part of parts) {
    const { material, materialId } = validatePart(part);
    const key = JSON.stringify([materialId ?? null, material, part.thickness]);
    let group = groups.get(key);

    if (!group) {
      group = {
        material,
        ...(materialId === undefined ? {} : { materialId }),
        thickness: part.thickness,
        partLineCount: 0,
        totalQuantity: 0,
        panelAreaMm2: 0,
        volumeMm3: 0,
        parts: []
      };
      groups.set(key, group);
    }

    group.partLineCount += 1;
    group.totalQuantity += part.quantity;
    group.panelAreaMm2 += part.width * part.length * part.quantity;
    group.volumeMm3 += part.width * part.length * part.thickness * part.quantity;
    group.parts.push(part);

    if (
      !Number.isSafeInteger(group.totalQuantity) ||
      !Number.isFinite(group.panelAreaMm2) ||
      !Number.isFinite(group.volumeMm3)
    ) {
      throw new Error("Malzeme tüketimi toplamı güvenli aralıkta hesaplanamadı.");
    }
  }

  return [...groups.values()]
    .sort((first, second) =>
      first.material.localeCompare(second.material, "tr") ||
      (first.materialId ?? "").localeCompare(second.materialId ?? "") ||
      first.thickness - second.thickness
    )
    .map((group) => ({
      material: group.material,
      ...(group.materialId === undefined ? {} : { materialId: group.materialId }),
      thickness: group.thickness,
      partLineCount: group.partLineCount,
      totalQuantity: group.totalQuantity,
      panelAreaM2: roundTo(group.panelAreaMm2 / 1_000_000, 6),
      volumeM3: roundTo(group.volumeMm3 / 1_000_000_000, 9),
      edgeBanding: calculateEdgeBandingSummary(group.parts)
    }));
}
