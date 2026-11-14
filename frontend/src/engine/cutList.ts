import type { Furniture } from "../types/furniture";
import type { Part } from "../types/part";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { calculateFurnitureParts } from "./furnitureCalculator";
import { roundMeasurement } from "./measurement";

export interface CutListRow {
  furnitureName: string;
  part: Part;
}

// Projedeki tüm mobilyalar için kesim listesi oluşturur.
export function buildCutList(
  furnitureList: Furniture[],
  rules: CabinetConstructionRules
): CutListRow[] {
  const rows: CutListRow[] = [];

  for (const furniture of furnitureList) {
    const parts = calculateFurnitureParts(furniture, rules);

    for (const part of parts) {
      rows.push({
        furnitureName: furniture.name,
        part
      });
    }
  }

  return rows;
}

// Kesim listesini istenen anahtar üzerinden gruplar.
export function groupCutList(
  rows: CutListRow[],
  key: "furniture" | "material" | "thickness" | "partType"
): Map<string, CutListRow[]> {
  const groups = new Map<string, CutListRow[]>();

  for (const row of rows) {
    const groupKey =
      key === "furniture"
        ? row.furnitureName
        : key === "material"
          ? row.part.material
          : key === "thickness"
            ? `${row.part.thickness} mm`
            : row.part.name;

    const group = groups.get(groupKey) ?? [];
    group.push(row);
    groups.set(groupKey, group);
  }

  return groups;
}

// Bir parçanın bantlanan kenar uzunluğunu döndürür (mm).
export function cutListRowEdgeBandingLength(row: CutListRow): number {
  const part = row.part;
  let length = 0;

  if (part.edgeBanding.top) length += part.width;
  if (part.edgeBanding.bottom) length += part.width;
  if (part.edgeBanding.left) length += part.length;
  if (part.edgeBanding.right) length += part.length;

  return roundMeasurement(length * part.quantity);
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Kesim listesini Türkçe karakter ve birim korunarak CSV olarak döndürür.
export function cutListToCsv(rows: CutListRow[]): string {
  const header = [
    "Mobilya",
    "Parça",
    "Genişlik (mm)",
    "Uzunluk (mm)",
    "Kalınlık (mm)",
    "Adet",
    "Malzeme",
    "Bant Üst",
    "Bant Alt",
    "Bant Sol",
    "Bant Sağ",
    "Tahrik Yönü",
    "Üretim Notu"
  ];

  const lines = rows.map(row => {
    const part = row.part;

    return [
      row.furnitureName,
      part.name,
      part.width,
      part.length,
      part.thickness,
      part.quantity,
      part.material,
      part.edgeBanding.top ? "Evet" : "Hayır",
      part.edgeBanding.bottom ? "Evet" : "Hayır",
      part.edgeBanding.left ? "Evet" : "Hayır",
      part.edgeBanding.right ? "Evet" : "Hayır",
      part.grainDirection,
      part.productionNote ?? ""
    ]
      .map(escapeCsv)
      .join(";");
  });

  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}

// Kesim listesini yapılandırılmış JSON olarak döndürür.
export function cutListToJson(rows: CutListRow[]): string {
  return JSON.stringify(
    rows.map(row => ({
      furniture: row.furnitureName,
      part: row.part.name,
      width: row.part.width,
      length: row.part.length,
      thickness: row.part.thickness,
      quantity: row.part.quantity,
      material: row.part.material,
      edgeBanding: row.part.edgeBanding,
      grainDirection: row.part.grainDirection,
      productionNote: row.part.productionNote ?? ""
    })),
    null,
    2
  );
}

export interface CutListSummary {
  totalPartCount: number;
  totalAreaSquareMeters: number;
  totalEdgeBandingLengthMm: number;
  distinctMaterials: number;
}

// Kesim listesi özet istatistiklerini hesaplar.
export function summarizeCutList(rows: CutListRow[]): CutListSummary {
  let totalPartCount = 0;
  let totalArea = 0;
  let totalBanding = 0;
  const materials = new Set<string>();

  for (const row of rows) {
    totalPartCount += row.part.quantity;
    totalArea += (row.part.width * row.part.length * row.part.quantity) / 1_000_000;
    totalBanding += cutListRowEdgeBandingLength(row);
    materials.add(row.part.material);
  }

  return {
    totalPartCount,
    totalAreaSquareMeters: roundMeasurement(totalArea * 100) / 100,
    totalEdgeBandingLengthMm: roundMeasurement(totalBanding),
    distinctMaterials: materials.size
  };
}
