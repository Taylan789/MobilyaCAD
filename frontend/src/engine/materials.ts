// Malzeme kütüphanesi ve malzeme tüketim hesaplamaları.
// Fiyatlar kullanıcı tarafından girilir; varsayılan fiyatlar TANIMLANMEZ.

import type { Material } from "../types/material";
import type { Part } from "../types/part";

export const defaultMaterials: Material[] = [
  {
    id: "suntalam-18",
    name: "Suntalam 18 mm",
    type: "suntalam",
    thickness: 18,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 0,
    color: "#d9d2c5",
    edgeBandThickness: 0.8
  },
  {
    id: "mdf-18",
    name: "MDF 18 mm",
    type: "mdf",
    thickness: 18,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 0,
    color: "#c9b8a3",
    edgeBandThickness: 0.8
  },
  {
    id: "mdf-lam-18",
    name: "MDF Lam 18 mm",
    type: "mdf-lam",
    thickness: 18,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 0,
    color: "#e5e1d8",
    edgeBandThickness: 0.8
  },
  {
    id: "kontrplak-18",
    name: "Kontrplak 18 mm",
    type: "plywood",
    thickness: 18,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 0,
    color: "#b38b63",
    edgeBandThickness: 0.8
  },
  {
    id: "masif-20",
    name: "Masif Ahşap 20 mm",
    type: "solid-wood",
    thickness: 20,
    sheetWidth: 2500,
    sheetLength: 1220,
    pricePerSquareMeter: 0,
    color: "#987453",
    edgeBandThickness: 1
  },
  {
    id: "suntalam-8",
    name: "Suntalam 8 mm (Arkalık)",
    type: "suntalam",
    thickness: 8,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 0,
    color: "#a69d8f",
    edgeBandThickness: 0
  }
];

export interface MaterialConsumption {
  material: string;
  thickness: number;
  partCount: number;
  totalAreaMm2: number;
  totalAreaM2: number;
}

// Parça listesini malzemeye göre özetler.
export function summarizeMaterialConsumption(parts: Part[]): MaterialConsumption[] {
  const groups = new Map<string, MaterialConsumption>();

  parts.forEach((part) => {
    const key = `${part.material}|${part.thickness}`;
    const area = part.width * part.length * part.quantity;
    const existing = groups.get(key);
    if (existing) {
      existing.partCount += part.quantity;
      existing.totalAreaMm2 += area;
    } else {
      groups.set(key, {
        material: part.material,
        thickness: part.thickness,
        partCount: part.quantity,
        totalAreaMm2: area,
        totalAreaM2: 0
      });
    }
  });

  return Array.from(groups.values()).map((entry) => ({
    ...entry,
    totalAreaM2: Math.round((entry.totalAreaMm2 / 1_000_000) * 1000) / 1000
  }));
}

// Bir malzeme için teorik levha sayısı (kesim kayıpları hariç).
export function theoreticalSheets(
  consumption: MaterialConsumption,
  material: Material
): number {
  const sheetAreaMm2 = material.sheetWidth * material.sheetLength;
  if (sheetAreaMm2 <= 0) return 0;
  return Math.ceil(consumption.totalAreaMm2 / sheetAreaMm2);
}
