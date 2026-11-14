// Kesim listesi (cut list) servisi: parça gruplama, CSV/JSON dışa aktarım.
// Bütün ölçüler milimetredir; CSV Türkçe karakterler ve Excel uyumlu BOM içerir.

import type { Part } from "../types/part";

export interface CutListRow {
  furnitureName: string;
  partName: string;
  quantity: number;
  width: number;
  length: number;
  thickness: number;
  material: string;
  edgeBanding: string;
  grainDirection: string;
  note: string;
}

export interface CutListInput {
  furnitureId: string;
  furnitureName: string;
  parts: Part[];
}

// Birden fazla mobilyanın parçalarını tek kesim listesi birleştirir.
export function buildCutList(inputs: CutListInput[]): CutListRow[] {
  const rows: CutListRow[] = [];

  inputs.forEach((input) => {
    input.parts.forEach((part) => {
      rows.push({
        furnitureName: input.furnitureName,
        partName: part.name,
        quantity: part.quantity,
        width: part.width,
        length: part.length,
        thickness: part.thickness,
        material: part.material,
        edgeBanding: [
          part.edgeBanding.top ? "Üst" : "",
          part.edgeBanding.bottom ? "Alt" : "",
          part.edgeBanding.left ? "Sol" : "",
          part.edgeBanding.right ? "Sağ" : ""
        ]
          .filter(Boolean)
          .join("+"),
        grainDirection: part.grainDirection,
        note: part.productionNote ?? ""
      });
    });
  });

  return rows;
}

export type CutListGroupKey = "furniture" | "material" | "thickness" | "partType";

// Kesim listesini belirtilen anahtara göre gruplar.
export function groupCutList(
  rows: CutListRow[],
  key: CutListGroupKey
): Map<string, CutListRow[]> {
  const groups = new Map<string, CutListRow[]>();

  rows.forEach((row) => {
    const groupKey =
      key === "furniture"
        ? row.furnitureName
        : key === "material"
          ? row.material
          : key === "thickness"
            ? `${row.thickness} mm`
            : row.partName;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(groupKey, [row]);
    }
  });

  return groups;
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Kesim listesini Türkçe Excel uyumlu CSV metnine dönüştürür.
export function cutListToCsv(rows: CutListRow[]): string {
  const header = [
    "Mobilya",
    "Parça",
    "Genişlik (mm)",
    "Uzunluk (mm)",
    "Kalınlık (mm)",
    "Adet",
    "Malzeme",
    "Kenar Bantlama",
    "Tarla Yönü",
    "Not"
  ];

  const lines = rows.map((row) =>
    [
      row.furnitureName,
      row.partName,
      row.width,
      row.length,
      row.thickness,
      row.quantity,
      row.material,
      row.edgeBanding,
      row.grainDirection,
      row.note
    ]
      .map(escapeCsv)
      .join(";")
  );

  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}

// Kesim listesini JSON metnine dönüştürür.
export function cutListToJson(rows: CutListRow[]): string {
  return JSON.stringify(
    {
      format: "MobilyaCAD",
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      unit: "mm",
      rows
    },
    null,
    2
  );
}
