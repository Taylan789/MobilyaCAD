import type { Part } from "../types/part";

type CsvCell = string | number;

const csvHeaders = [
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
  "Bant Sağ"
];

const edgeKeys = ["top", "bottom", "left", "right"] as const;

function escapeCsvCell(value: CsvCell): string {
  const text = String(value);
  return /[;"\n\r]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function validateCutListPart(part: Part): void {
  if (
    typeof part.name !== "string" ||
    part.name.trim() === "" ||
    typeof part.material !== "string" ||
    part.material.trim() === ""
  ) {
    throw new Error("Kesim listesinde parça adı ve malzemesi belirtilmelidir.");
  }

  if (
    ![part.width, part.length, part.thickness].every(
      (value) => Number.isFinite(value) && value > 0
    )
  ) {
    throw new Error(`${part.name} ölçüleri pozitif ve sonlu olmalıdır.`);
  }

  if (!Number.isSafeInteger(part.quantity) || part.quantity < 1) {
    throw new Error(`${part.name} adet değeri pozitif tam sayı olmalıdır.`);
  }

  if (
    !part.edgeBanding ||
    edgeKeys.some((edge) => typeof part.edgeBanding[edge] !== "boolean")
  ) {
    throw new Error(`${part.name} kenar bantlama bilgisi geçersiz.`);
  }
}

/**
 * Serializes the already-calculated production parts using the existing
 * Turkish Excel-friendly CSV contract. Dimensions remain in millimetres.
 */
export function createCutListCsv(
  furnitureName: string,
  parts: readonly Part[]
): string {
  if (typeof furnitureName !== "string" || furnitureName.trim() === "") {
    throw new Error("Kesim listesi için mobilya adı belirtilmelidir.");
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Kesim listesi için en az bir parça gereklidir.");
  }

  for (const part of parts) {
    validateCutListPart(part);
  }

  const rows: CsvCell[][] = [
    csvHeaders,
    ...parts.map((part) => [
      furnitureName,
      part.name,
      part.width,
      part.length,
      part.thickness,
      part.quantity,
      part.material,
      part.edgeBanding.top ? "Evet" : "Hayır",
      part.edgeBanding.bottom ? "Evet" : "Hayır",
      part.edgeBanding.left ? "Evet" : "Hayır",
      part.edgeBanding.right ? "Evet" : "Hayır"
    ])
  ];

  return "\uFEFF" + rows
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\r\n");
}
