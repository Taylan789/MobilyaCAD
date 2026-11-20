import type { ProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import {
  PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_UNITS,
  parseProjectMaterialConsumptionSummaryFile,
  serializeProjectMaterialConsumptionSummaryFile
} from "./projectMaterialSummaryFile.ts";

export const PROJECT_MATERIAL_CONSUMPTION_CSV_FORMAT = "MobilyaCADMaterialConsumptionCsv" as const;
export const PROJECT_MATERIAL_CONSUMPTION_CSV_VERSION = 1 as const;
export const PROJECT_MATERIAL_CONSUMPTION_CSV_METADATA_COLUMNS = [
  "fileType", "schemaVersion", "thicknessMmUnit", "panelAreaM2Unit", "volumeM3Unit", "edgeBandingLengthMmUnit"
] as const;
export const PROJECT_MATERIAL_CONSUMPTION_CSV_COLUMNS = [
  "material", "materialId", "thicknessMm", "partLineCount", "totalQuantity", "partIds",
  "panelAreaM2", "volumeM3", "widthEdgesLengthMm", "lengthEdgesLengthMm", "totalLengthMm",
  "edgeCount", "furnitureIds"
] as const;

export interface ProjectMaterialConsumptionCsvFile {
  format: typeof PROJECT_MATERIAL_CONSUMPTION_CSV_FORMAT;
  formatVersion: 1;
  units: typeof PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_UNITS;
  materials: readonly ProjectMaterialConsumptionSummary[];
}

export interface ProjectMaterialConsumptionCsvSerializationResult {
  status: "ready" | "blocked";
  csv: string | null;
  diagnostics: readonly string[];
}

export interface ProjectMaterialConsumptionCsvParseResult {
  status: "ready" | "blocked";
  file: ProjectMaterialConsumptionCsvFile | null;
  materials: readonly ProjectMaterialConsumptionSummary[] | null;
  diagnostics: readonly string[];
}

const metadataColumns = PROJECT_MATERIAL_CONSUMPTION_CSV_METADATA_COLUMNS;
const groupColumns = PROJECT_MATERIAL_CONSUMPTION_CSV_COLUMNS;
const maxCsvLength = 5_000_000;
const maxGroups = 1_000;

function blockedSerialization(message: string): ProjectMaterialConsumptionCsvSerializationResult {
  return Object.freeze({ status: "blocked" as const, csv: null, diagnostics: Object.freeze([message]) });
}

function blockedParse(message: string): ProjectMaterialConsumptionCsvParseResult {
  return Object.freeze({ status: "blocked" as const, file: null, materials: null, diagnostics: Object.freeze([message]) });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

function exactRow(row: readonly string[], expected: readonly string[], label: string): void {
  if (row.length !== expected.length || row.some((cell, index) => cell !== expected[index])) {
    throw new Error(label + " desteklenmiyor veya sütunları farklı.");
  }
}

function parseCsvRecords(csv: string): string[][] {
  if (csv.length > maxCsvLength) throw new Error("CSV dosyası 5 MB sınırını aşıyor.");
  const source = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else if (char === "\r") {
        if (source[index + 1] !== "\n") throw new Error("CSV tırnaklı alan içindeki satır sonu CRLF olmalıdır.");
        field += "\r\n";
        index += 1;
      } else if (char === "\n") {
        throw new Error("CSV tırnaklı alan içindeki satır sonu CRLF olmalıdır.");
      } else {
        field += char;
      }
      continue;
    }

    if (afterQuote && char !== "," && char !== "\r" && char !== "\n") {
      throw new Error("CSV tırnaklı alan sonrasında beklenmeyen karakter içeriyor.");
    }
    if (char === '"' && field === "" && !afterQuote) {
      inQuotes = true;
      continue;
    }
    if (char === '"') throw new Error("CSV tırnak kullanımı geçersiz.");
    if (char === ",") {
      row.push(field);
      field = "";
      afterQuote = false;
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char !== "\r" || source[index + 1] !== "\n") throw new Error("CSV satır sonu CRLF olmalıdır.");
      row.push(field);
      records.push(row);
      if (records.length > maxGroups + 3) throw new Error("CSV 1.000 malzeme grubu sınırını aşıyor.");
      row = [];
      field = "";
      afterQuote = false;
      index += 1;
      continue;
    }
    field += char;
  }

  if (inQuotes) throw new Error("CSV tırnaklı alan tamamlanmamış.");
  if (field !== "" || row.length > 0 || afterQuote) {
    row.push(field);
    records.push(row);
  }
  if (records.length > maxGroups + 3) throw new Error("CSV 1.000 malzeme grubu sınırını aşıyor.");
  return records;
}

function parseNonNegativeNumber(value: string, label: string, minimum: number): number {
  if (value === "" || value.trim() !== value || !/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    throw new Error(label + " sayısal değer olmalıdır.");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) throw new Error(label + " geçersiz.");
  return number;
}

function parseSafeInteger(value: string, label: string, minimum: number): number {
  if (value === "" || value.trim() !== value || !/^(?:0|[1-9]\d*)$/.test(value)) throw new Error(label + " tam sayı olmalıdır.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(label + " geçersiz.");
  return number;
}

function parseArrayCell(value: string, label: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(label + " JSON dizisi geçerli değil.");
  }
  if (!Array.isArray(parsed)) throw new Error(label + " JSON dizisi olmalıdır.");
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateFurnitureIds(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > maxPartIds) {
    throw new Error(label + " mobilya kimlikleri boş olmayan ve sınır içinde bir liste olmalıdır.");
  }
  const ids: string[] = [];
  for (const [index, rawId] of value.entries()) {
    if (typeof rawId !== "string" || rawId.trim() === "" || rawId.trim() !== rawId || rawId.length > 128) {
      throw new Error(label + " mobilya kimliği " + (index + 1) + " geçersiz.");
    }
    if (ids.includes(rawId)) throw new Error(label + " yinelenen mobilya kimliği içeriyor: " + rawId + ".");
    if (ids.length > 0 && ids[ids.length - 1] >= rawId) {
      throw new Error(label + " mobilya kimlikleri sıralı ve benzersiz olmalıdır.");
    }
    ids.push(rawId);
  }
  return ids;
}

/** Serializes strict net material consumption; no prices, waste or board yield are inferred. */
export function serializeProjectMaterialConsumptionCsv(
  value: readonly ProjectMaterialConsumptionSummary[]
): ProjectMaterialConsumptionCsvSerializationResult {
  try {
    if (!Array.isArray(value)) throw new Error("Malzeme tüketim özeti liste olmalıdır.");
    const furnitureIdsByGroup = value.map((group, index) =>
      isRecord(group) ? validateFurnitureIds(group.furnitureIds, "Malzeme grubu " + (index + 1)) : undefined
    );
    const totalFurnitureIds = furnitureIdsByGroup.reduce((total, ids) => total + (ids?.length ?? 0), 0);
    if (totalFurnitureIds > maxPartIds) throw new Error("CSV mobilya kimliği toplamı " + maxPartIds + " sınırını aşıyor.");

    const validatedJson = serializeProjectMaterialConsumptionSummaryFile(value);
    if (validatedJson.status !== "ready" || validatedJson.json === null) {
      return blockedSerialization(validatedJson.diagnostics.join("; ") || "Malzeme tüketim özeti doğrulanamadı.");
    }
    const validated = parseProjectMaterialConsumptionSummaryFile(validatedJson.json);
    if (validated.status !== "ready" || validated.materials === null) {
      return blockedSerialization(validated.diagnostics.join("; ") || "Malzeme tüketim JSON doğrulaması başarısız.");
    }

    const records = [
      csvRow(metadataColumns),
      csvRow([
        PROJECT_MATERIAL_CONSUMPTION_CSV_FORMAT,
        PROJECT_MATERIAL_CONSUMPTION_CSV_VERSION,
        "mm",
        "m2",
        "m3",
        "mm"
      ]),
      csvRow(groupColumns),
      ...validated.materials.map((group, index) => csvRow([
        group.material,
        group.materialId ?? "",
        group.thicknessMm,
        group.partLineCount,
        group.totalQuantity,
        JSON.stringify(group.partIds),
        group.panelAreaM2,
        group.volumeM3,
        group.edgeBanding.widthEdgesLengthMm,
        group.edgeBanding.lengthEdgesLengthMm,
        group.edgeBanding.totalLengthMm,
        group.edgeBanding.edgeCount,
        furnitureIdsByGroup[index] === undefined ? "" : JSON.stringify(furnitureIdsByGroup[index])
      ]))
    ];
    const csv = "\uFEFF" + records.join("\r\n") + "\r\n";
    if (csv.length > maxCsvLength) return blockedSerialization("CSV dosyası 5 MB sınırını aşıyor.");
    return Object.freeze({ status: "ready" as const, csv, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization(error instanceof Error ? error.message : "Malzeme tüketim CSV doğrulanamadı.");
  }
}

/** Strict CSV v1 parser; all rows validate together and partial material groups are never returned. */
export function parseProjectMaterialConsumptionCsv(input: unknown): ProjectMaterialConsumptionCsvParseResult {
  if (typeof input !== "string") return blockedParse("CSV girdi metin olmalıdır.");
  if (input.length > maxCsvLength) return blockedParse("CSV girdisi 5 MB sınırını aşıyor.");
  try {
    const records = parseCsvRecords(input);
    if (records.length < 3) throw new Error("CSV metadata ve malzeme sütunları eksik.");
    exactRow(records[0], metadataColumns, "CSV metadata başlıkları");
    exactRow(records[2], groupColumns, "CSV malzeme başlıkları");
    if (records.length - 3 > maxGroups) throw new Error("CSV 1.000 malzeme grubu sınırını aşıyor.");

    const metadata = records[1];
    if (metadata.length !== metadataColumns.length ||
      metadata[0] !== PROJECT_MATERIAL_CONSUMPTION_CSV_FORMAT ||
      metadata[1] !== String(PROJECT_MATERIAL_CONSUMPTION_CSV_VERSION) ||
      metadata[2] !== "mm" || metadata[3] !== "m2" || metadata[4] !== "m3" || metadata[5] !== "mm") {
      throw new Error("CSV format, sürüm veya birim metadata'sı desteklenmiyor.");
    }

    const baseMaterials: ProjectMaterialConsumptionSummary[] = [];
    const furnitureIdsByGroup: (string[] | undefined)[] = [];
    for (const [index, row] of records.slice(3).entries()) {
      if (row.length !== groupColumns.length) throw new Error("Malzeme CSV satırı " + (index + 1) + " sütun sayısı geçersiz.");
      const label = "Malzeme CSV satırı " + (index + 1);
      const partLineCount = parseSafeInteger(row[3], label + " Part satır sayısı", 1);
      baseMaterials.push({
        material: row[0],
        ...(row[1] === "" ? {} : { materialId: row[1] }),
        thicknessMm: parseNonNegativeNumber(row[2], label + " kalınlığı (mm)", 0),
        partLineCount,
        totalQuantity: parseSafeInteger(row[4], label + " toplam adet", partLineCount),
        partIds: parseArrayCell(row[5], label + " Part kimlikleri") as string[],
        panelAreaM2: parseNonNegativeNumber(row[6], label + " net alan (m2)", 0),
        volumeM3: parseNonNegativeNumber(row[7], label + " net hacim (m3)", 0),
        edgeBanding: {
          widthEdgesLengthMm: parseNonNegativeNumber(row[8], label + " genişlik yönü bant uzunluğu (mm)", 0),
          lengthEdgesLengthMm: parseNonNegativeNumber(row[9], label + " uzunluk yönü bant uzunluğu (mm)", 0),
          totalLengthMm: parseNonNegativeNumber(row[10], label + " toplam bant uzunluğu (mm)", 0),
          edgeCount: parseSafeInteger(row[11], label + " bantlı kenar adedi", 0)
        }
      });
      furnitureIdsByGroup.push(row[12] === "" ? undefined : validateFurnitureIds(parseArrayCell(row[12], label + " mobilya kimlikleri"), label));
    }

    const totalFurnitureIds = furnitureIdsByGroup.reduce((total, ids) => total + (ids?.length ?? 0), 0);
    if (totalFurnitureIds > maxPartIds) throw new Error("CSV mobilya kimliği toplamı " + maxPartIds + " sınırını aşıyor.");
    const validatedJson = serializeProjectMaterialConsumptionSummaryFile(baseMaterials);
    if (validatedJson.status !== "ready" || validatedJson.json === null) {
      throw new Error(validatedJson.diagnostics.join("; ") || "Malzeme grupları doğrulanamadı.");
    }
    const validated = parseProjectMaterialConsumptionSummaryFile(validatedJson.json);
    if (validated.status !== "ready" || validated.materials === null) {
      throw new Error(validated.diagnostics.join("; ") || "Malzeme grupları doğrulanamadı.");
    }
    const materials = validated.materials.map((group, index) => ({
      ...group,
      ...(furnitureIdsByGroup[index] === undefined ? {} : { furnitureIds: furnitureIdsByGroup[index] })
    }));
    const file: ProjectMaterialConsumptionCsvFile = Object.freeze({
      format: PROJECT_MATERIAL_CONSUMPTION_CSV_FORMAT,
      formatVersion: PROJECT_MATERIAL_CONSUMPTION_CSV_VERSION,
      units: PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_UNITS,
      materials
    });
    return Object.freeze({ status: "ready" as const, file, materials, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : "CSV doğrulanamadı.");
  }
}
