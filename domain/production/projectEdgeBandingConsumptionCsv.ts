import type { ProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";
import {
  parseProjectEdgeBandingConsumptionFile,
  serializeProjectEdgeBandingConsumptionFile
} from "./projectEdgeBandingConsumptionFile.ts";

export const PROJECT_EDGE_BANDING_CONSUMPTION_CSV_FORMAT = "MobilyaCADEdgeBandingConsumptionCsv" as const;
export const PROJECT_EDGE_BANDING_CONSUMPTION_CSV_VERSION = 1 as const;
export const PROJECT_EDGE_BANDING_CONSUMPTION_CSV_METADATA_COLUMNS = [
  "fileType", "schemaVersion", "totalLengthMmUnit", "totalQuantityUnit"
] as const;
export const PROJECT_EDGE_BANDING_CONSUMPTION_CSV_COLUMNS = [
  "edgeBandingId", "unit", "edge", "partLineCount", "totalQuantity",
  "totalLengthMm", "edgeCount", "partIds", "furnitureIds"
] as const;

export interface ProjectEdgeBandingConsumptionCsvFile {
  format: typeof PROJECT_EDGE_BANDING_CONSUMPTION_CSV_FORMAT;
  formatVersion: 1;
  units: { totalLengthMm: "mm"; totalQuantity: "group.unit" };
  groups: readonly ProjectEdgeBandingConsumptionSummary[];
}
export interface ProjectEdgeBandingConsumptionCsvSerializationResult {
  status: "ready" | "blocked";
  csv: string | null;
  diagnostics: readonly string[];
}
export interface ProjectEdgeBandingConsumptionCsvParseResult {
  status: "ready" | "blocked";
  file: ProjectEdgeBandingConsumptionCsvFile | null;
  groups: readonly ProjectEdgeBandingConsumptionSummary[] | null;
  diagnostics: readonly string[];
}

const metadataColumns = PROJECT_EDGE_BANDING_CONSUMPTION_CSV_METADATA_COLUMNS;
const groupColumns = PROJECT_EDGE_BANDING_CONSUMPTION_CSV_COLUMNS;
const maxCsvLength = 5_000_000;
const maxGroups = 1_000;

function blockedSerialization(message: string): ProjectEdgeBandingConsumptionCsvSerializationResult {
  return Object.freeze({ status: "blocked" as const, csv: null, diagnostics: Object.freeze([message]) });
}
function blockedParse(message: string): ProjectEdgeBandingConsumptionCsvParseResult {
  return Object.freeze({ status: "blocked" as const, file: null, groups: null, diagnostics: Object.freeze([message]) });
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
      if (records.length > maxGroups + 3) throw new Error("CSV 1.000 grup sınırını aşıyor.");
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
  if (records.length > maxGroups + 3) throw new Error("CSV 1.000 grup sınırını aşıyor.");
  return records;
}
function parseNonNegativeNumber(value: string, label: string, minimum: number): number {
  if (value === "" || value.trim() !== value || !/^(?:\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    throw new Error(label + " sayısal değer olmalıdır.");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) throw new Error(label + " geçersiz.");
  return number;
}
function parseSafeInteger(value: string, label: string, minimum: number): number {
  if (value === "" || value.trim() !== value || !/^\d+$/.test(value)) throw new Error(label + " tam sayı olmalıdır.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(label + " geçersiz.");
  return number;
}
function parseIdArray(value: string, label: string): unknown {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error(label + " JSON dizisi geçerli değil."); }
  if (!Array.isArray(parsed)) throw new Error(label + " JSON dizisi olmalıdır.");
  return parsed;
}

/** Stable directional edge-band CSV v1; output is UTF-8 BOM + RFC 4180 quoted CRLF records. */
export function serializeProjectEdgeBandingConsumptionCsv(
  groups: readonly ProjectEdgeBandingConsumptionSummary[]
): ProjectEdgeBandingConsumptionCsvSerializationResult {
  try {
    const validatedJson = serializeProjectEdgeBandingConsumptionFile(groups);
    if (validatedJson.status !== "ready" || validatedJson.json === null) {
      return blockedSerialization(validatedJson.diagnostics.join("; ") || "Kenar bandı özeti doğrulanamadı.");
    }
    const validated = parseProjectEdgeBandingConsumptionFile(validatedJson.json);
    if (validated.status !== "ready" || validated.groups === null) {
      return blockedSerialization(validated.diagnostics.join("; ") || "Kenar bandı JSON doğrulaması başarısız.");
    }
    const records = [
      csvRow(metadataColumns),
      csvRow([
        PROJECT_EDGE_BANDING_CONSUMPTION_CSV_FORMAT,
        PROJECT_EDGE_BANDING_CONSUMPTION_CSV_VERSION,
        "mm",
        "group.unit"
      ]),
      csvRow(groupColumns),
      ...validated.groups.map(group => csvRow([
        group.edgeBandingId ?? "",
        group.unit,
        group.edge ?? "",
        group.partLineCount,
        group.totalQuantity,
        group.totalLengthMm,
        group.edgeCount,
        JSON.stringify(group.partIds),
        JSON.stringify(group.furnitureIds)
      ]))
    ];
    const csv = "\uFEFF" + records.join("\r\n") + "\r\n";
    if (csv.length > maxCsvLength) return blockedSerialization("CSV dosyası 5 MB sınırını aşıyor.");
    return Object.freeze({ status: "ready" as const, csv, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization(error instanceof Error ? error.message : "Kenar bandı CSV doğrulanamadı.");
  }
}

/** Strict CSV v1 parser; malformed rows block the entire file and never return partial groups. */
export function parseProjectEdgeBandingConsumptionCsv(input: unknown): ProjectEdgeBandingConsumptionCsvParseResult {
  if (typeof input !== "string") return blockedParse("CSV girdi metin olmalıdır.");
  if (input.length > maxCsvLength) return blockedParse("CSV girdisi 5 MB sınırını aşıyor.");
  try {
    const records = parseCsvRecords(input);
    if (records.length < 3) throw new Error("CSV metadata ve grup sütunları eksik.");
    exactRow(records[0], metadataColumns, "CSV metadata başlıkları");
    exactRow(records[2], groupColumns, "CSV grup başlıkları");
    if (records.length - 3 > maxGroups) throw new Error("CSV 1.000 grup sınırını aşıyor.");

    const metadataValues = records[1];
    if (metadataValues.length !== metadataColumns.length ||
      metadataValues[0] !== PROJECT_EDGE_BANDING_CONSUMPTION_CSV_FORMAT ||
      metadataValues[1] !== String(PROJECT_EDGE_BANDING_CONSUMPTION_CSV_VERSION) ||
      metadataValues[2] !== "mm" || metadataValues[3] !== "group.unit") {
      throw new Error("CSV format, sürüm veya birim metadata'sı desteklenmiyor.");
    }

    const groups: ProjectEdgeBandingConsumptionSummary[] = [];
    for (const [index, row] of records.slice(3).entries()) {
      if (row.length !== groupColumns.length) throw new Error("Kenar bandı CSV satırı " + (index + 1) + " sütun sayısı geçersiz.");
      const label = "Kenar bandı CSV satırı " + (index + 1);
      groups.push({
        edgeBandingId: row[0] === "" ? null : row[0],
        unit: row[1] as "mm" | "m",
        ...(row[2] === "" ? {} : { edge: row[2] as "top" | "bottom" | "left" | "right" }),
        partLineCount: parseSafeInteger(row[3], label + " Part satır sayısı", 1),
        totalQuantity: parseNonNegativeNumber(row[4], label + " miktar", 0),
        totalLengthMm: parseNonNegativeNumber(row[5], label + " mm uzunluğu", 0.1),
        edgeCount: parseSafeInteger(row[6], label + " kenar adedi", 1),
        partIds: parseIdArray(row[7], label + " Part kimlikleri") as string[],
        furnitureIds: parseIdArray(row[8], label + " mobilya kimlikleri") as string[]
      });
    }

    const validatedJson = serializeProjectEdgeBandingConsumptionFile(groups);
    if (validatedJson.status !== "ready" || validatedJson.json === null) {
      throw new Error(validatedJson.diagnostics.join("; ") || "Kenar bandı grupları doğrulanamadı.");
    }
    const validated = parseProjectEdgeBandingConsumptionFile(validatedJson.json);
    if (validated.status !== "ready" || validated.groups === null) {
      throw new Error(validated.diagnostics.join("; ") || "Kenar bandı grupları doğrulanamadı.");
    }
    const file: ProjectEdgeBandingConsumptionCsvFile = {
      format: PROJECT_EDGE_BANDING_CONSUMPTION_CSV_FORMAT,
      formatVersion: PROJECT_EDGE_BANDING_CONSUMPTION_CSV_VERSION,
      units: { totalLengthMm: "mm", totalQuantity: "group.unit" },
      groups: validated.groups
    };
    return Object.freeze({ status: "ready" as const, file, groups: validated.groups, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : "CSV doğrulanamadı.");
  }
}
