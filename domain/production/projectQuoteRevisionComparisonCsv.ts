import {
  parseProjectQuoteRevisionComparisonFile,
  serializeProjectQuoteRevisionComparisonFile,
  PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES,
  PROJECT_QUOTE_REVISION_COMPARISON_MAX_LINE_CHANGES
} from "./projectQuoteRevisionComparisonFile.ts";
import type {
  ProjectQuoteCostCategory,
  ProjectQuoteRevisionComparison,
  ProjectQuoteRevisionCostLineSnapshot,
  ProjectQuoteRevisionLineChange
} from "./projectQuoteRevision.ts";

export const PROJECT_QUOTE_REVISION_COMPARISON_CSV_FORMAT = "MobilyaCADQuoteRevisionComparisonCsv" as const;
export const PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION = 3 as const;

const legacyColumnsV1 = [
  "format", "formatVersion", "rowType", "projectId",
  "fromRevisionId", "fromRevisionNumber", "toRevisionId", "toRevisionNumber",
  "currencyCode", "fromGrandTotalMinor", "toGrandTotalMinor", "grandTotalDeltaMinor",
  "category", "categoryDeltaMinor", "changeType",
  "fromDescription", "toDescription", "fromQuantity", "toQuantity",
  "fromUnit", "toUnit", "fromUnitPriceMinor", "toUnitPriceMinor",
  "fromLineTotalMinor", "toLineTotalMinor", "fromLineCurrencyCode", "toLineCurrencyCode",
  "fromSourceReference", "toSourceReference", "fromSourceType", "toSourceType",
  "fromSourceId", "toSourceId", "fromTariffId", "toTariffId",
  "fromSourcePartIds", "toSourcePartIds", "fromEdgeDirection", "toEdgeDirection"
] as const;

const legacyColumnsV2 = [
  ...legacyColumnsV1,
  "fromRollCount", "toRollCount", "fromRollLengthMm", "toRollLengthMm",
  "fromPurchasedLengthMm", "toPurchasedLengthMm", "fromFurnitureIds", "toFurnitureIds",
  "fromPlanSourceReference", "toPlanSourceReference", "fromPriceSourceReference", "toPriceSourceReference"
] as const;

export const PROJECT_QUOTE_REVISION_COMPARISON_CSV_COLUMNS = [
  ...legacyColumnsV2,
  "fromResourceType", "toResourceType", "fromResourceId", "toResourceId", "fromResourceUnit", "toResourceUnit"
] as const;

export interface ProjectQuoteRevisionComparisonCsvSerializationResult {
  status: "ready" | "blocked";
  csv: string | null;
  diagnostics: readonly string[];
}

export interface ProjectQuoteRevisionComparisonCsvParseResult {
  status: "ready" | "blocked";
  /** CSV header version, available only when parsing succeeds. */
  formatVersion?: 1 | 2 | 3;
  comparison: ProjectQuoteRevisionComparison | null;
  diagnostics: readonly string[];
}

const categories: readonly ProjectQuoteCostCategory[] = [
  "material", "hardware", "labor", "operation", "waste", "profit"
];
const columns = PROJECT_QUOTE_REVISION_COMPARISON_CSV_COLUMNS;
const columnIndex = new Map<string, number>(columns.map((column, index) => [column, index] as const));
const legacyColumnIndexV1 = new Map<string, number>(legacyColumnsV1.map((column, index) => [column, index] as const));
const legacyColumnIndexV2 = new Map<string, number>(legacyColumnsV2.map((column, index) => [column, index] as const));
const lineColumns = columns.slice(15);
const sideRequiredFields = [
  "Description", "Quantity", "Unit", "UnitPriceMinor", "LineTotalMinor",
  "LineCurrencyCode", "SourceType", "SourceId"
] as const;
const maximumCsvRecords = 8 + PROJECT_QUOTE_REVISION_COMPARISON_MAX_LINE_CHANGES;
const csvLineChangeLimitMessage = "CSV teklif satırı farkı " +
  PROJECT_QUOTE_REVISION_COMPARISON_MAX_LINE_CHANGES.toLocaleString("tr-TR") + " sınırını aşıyor.";

type CsvRowType = "total" | "category" | "line";

function blockedSerialization(message: string): ProjectQuoteRevisionComparisonCsvSerializationResult {
  return Object.freeze({ status: "blocked" as const, csv: null, diagnostics: Object.freeze([message]) });
}

function blockedParse(message: string): ProjectQuoteRevisionComparisonCsvParseResult {
  return Object.freeze({ status: "blocked" as const, comparison: null, diagnostics: Object.freeze([message]) });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

function metaValues(comparison: ProjectQuoteRevisionComparison, rowType: CsvRowType): unknown[] {
  return [
    PROJECT_QUOTE_REVISION_COMPARISON_CSV_FORMAT,
    PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION,
    rowType,
    comparison.projectId,
    comparison.fromRevisionId,
    comparison.fromRevisionNumber,
    comparison.toRevisionId,
    comparison.toRevisionNumber,
    comparison.currencyCode,
    comparison.fromGrandTotalMinor,
    comparison.toGrandTotalMinor,
    comparison.grandTotalDeltaMinor
  ];
}

function blankLineValues(): unknown[] {
  return lineColumns.map(() => "");
}

function lineChangeValues(
  from: ProjectQuoteRevisionCostLineSnapshot | null,
  to: ProjectQuoteRevisionCostLineSnapshot | null
): unknown[] {
  const fromValues = from === null ? Array(21).fill("") : [
    from.description, from.quantity, from.unit, from.unitPriceMinor, from.lineTotalMinor,
    from.currencyCode, from.sourceReference ?? "", from.sourceType, from.sourceId,
    from.tariffId ?? "", from.sourcePartIds === undefined ? "" : JSON.stringify(from.sourcePartIds),
    from.edgeDirection ?? "", from.rollCount ?? "", from.rollLengthMm ?? "",
    from.purchasedLengthMm ?? "", from.furnitureIds === undefined ? "" : JSON.stringify(from.furnitureIds),
    from.planSourceReference ?? "", from.priceSourceReference ?? "",
    from.resourceType ?? "", from.resourceId ?? "", from.resourceUnit ?? ""
  ];
  const toValues = to === null ? Array(21).fill("") : [
    to.description, to.quantity, to.unit, to.unitPriceMinor, to.lineTotalMinor,
    to.currencyCode, to.sourceReference ?? "", to.sourceType, to.sourceId,
    to.tariffId ?? "", to.sourcePartIds === undefined ? "" : JSON.stringify(to.sourcePartIds),
    to.edgeDirection ?? "", to.rollCount ?? "", to.rollLengthMm ?? "",
    to.purchasedLengthMm ?? "", to.furnitureIds === undefined ? "" : JSON.stringify(to.furnitureIds),
    to.planSourceReference ?? "", to.priceSourceReference ?? "",
    to.resourceType ?? "", to.resourceId ?? "", to.resourceUnit ?? ""
  ];
  return [
    fromValues[0], toValues[0],
    fromValues[1], toValues[1],
    fromValues[2], toValues[2],
    fromValues[3], toValues[3],
    fromValues[4], toValues[4],
    fromValues[5], toValues[5],
    fromValues[6], toValues[6],
    fromValues[7], toValues[7],
    fromValues[8], toValues[8],
    fromValues[9], toValues[9],
    fromValues[10], toValues[10],
    fromValues[11], toValues[11],
    fromValues[12], toValues[12],
    fromValues[13], toValues[13],
    fromValues[14], toValues[14],
    fromValues[15], toValues[15],
    fromValues[16], toValues[16],
    fromValues[17], toValues[17],
    fromValues[18], toValues[18],
    fromValues[19], toValues[19],
    fromValues[20], toValues[20]
  ];
}

function requireBlank(row: readonly string[], names: readonly string[], label: string, indexMap = columnIndex): void {
  for (const name of names) {
    const index = indexMap.get(name);
    if (index === undefined || row[index] !== "") throw new Error(label + " desteklenmeyen satır verisi içeriyor.");
  }
}

function parseCsvRecords(csv: string): string[][] {
  if (csv.length > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES ||
      new TextEncoder().encode(csv).byteLength > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES) {
    throw new Error("CSV dosyası 1 MiB sınırını aşıyor.");
  }
  const text = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (afterQuote && char !== "," && char !== "\n" && char !== "\r") {
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
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      afterQuote = false;
      if (records.length > maximumCsvRecords) throw new Error(csvLineChangeLimitMessage);
      continue;
    }
    field += char;
  }
  if (inQuotes) throw new Error("CSV tırnaklı alan kapanmamış.");
  if (field.length > 0 || row.length > 0 || afterQuote) {
    row.push(field);
    records.push(row);
    if (records.length > maximumCsvRecords) throw new Error(csvLineChangeLimitMessage);
  }
  return records;
}

function cell(row: readonly string[], name: string, indexMap = columnIndex): string {
  const index = indexMap.get(name);
  if (index === undefined) throw new Error("CSV sözleşme sütunu bulunamadı: " + name + ".");
  return row[index] ?? "";
}

function parseIntegerCell(value: string, label: string, minimum = Number.MIN_SAFE_INTEGER): number {
  if (!/^-?(?:0|[1-9]\d*)$/.test(value)) throw new Error(label + " tam sayı olmalıdır.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(label + " güvenli tam sayı aralığında olmalıdır.");
  return number;
}

function parseQuantityCell(value: string, label: string): number {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value)) {
    throw new Error(label + " geçerli sayı olmalıdır.");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(label + " pozitif ve sonlu olmalıdır.");
  return number;
}

function parseRollLengthCell(value: string, label: string): number {
  const length = parseQuantityCell(value, label);
  const tenths = Math.round(length * 10);
  if (!Number.isSafeInteger(tenths) || Math.abs(tenths / 10 - length) > 1e-8) {
    throw new Error(label + " en fazla 0.1 mm hassasiyetinde olmalıdır.");
  }
  return tenths / 10;
}

function parseLineSide(
  row: readonly string[],
  side: "from" | "to",
  category: ProjectQuoteCostCategory,
  indexMap: Map<string, number>,
  version: 1 | 2 | 3
): ProjectQuoteRevisionCostLineSnapshot | null {
  const names = [
    side + "Description", side + "Quantity", side + "Unit", side + "UnitPriceMinor",
    side + "LineTotalMinor", side + "LineCurrencyCode", side + "SourceReference",
    side + "SourceType", side + "SourceId", side + "TariffId",
    side + "SourcePartIds", side + "EdgeDirection",
    ...(version >= 2 ? [
      side + "RollCount", side + "RollLengthMm", side + "PurchasedLengthMm",
      side + "FurnitureIds", side + "PlanSourceReference", side + "PriceSourceReference"
    ] : []),
    ...(version === 3 ? [
      side + "ResourceType", side + "ResourceId", side + "ResourceUnit"
    ] : [])
  ] as const;
  const values = names.map((name) => cell(row, name, indexMap));
  if (values.every((value) => value === "")) return null;
  const required = sideRequiredFields.map((suffix) => side + suffix);
  for (const name of required) {
    if (cell(row, name, indexMap) === "") throw new Error("Teklif CSV satırında " + name + " zorunludur.");
  }
  const sourcePartIdsCell = cell(row, side + "SourcePartIds", indexMap);
  let sourcePartIds: string[] | undefined;
  if (sourcePartIdsCell !== "") {
    const parsed: unknown = JSON.parse(sourcePartIdsCell);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
      throw new Error("CSV kaynak Part ID alanı JSON string listesi olmalıdır.");
    }
    sourcePartIds = parsed as string[];
  }
  const sourceReference = cell(row, side + "SourceReference", indexMap);
  const tariffId = cell(row, side + "TariffId", indexMap);
  const edgeDirection = cell(row, side + "EdgeDirection", indexMap);
  const rollCountCell = version >= 2 ? cell(row, side + "RollCount", indexMap) : "";
  const rollLengthCell = version >= 2 ? cell(row, side + "RollLengthMm", indexMap) : "";
  const purchasedLengthCell = version >= 2 ? cell(row, side + "PurchasedLengthMm", indexMap) : "";
  const furnitureIdsCell = version >= 2 ? cell(row, side + "FurnitureIds", indexMap) : "";
  const planSourceReference = version >= 2 ? cell(row, side + "PlanSourceReference", indexMap) : "";
  const priceSourceReference = version >= 2 ? cell(row, side + "PriceSourceReference", indexMap) : "";
  const resourceTypeCell = version === 3 ? cell(row, side + "ResourceType", indexMap) : "";
  const resourceIdCell = version === 3 ? cell(row, side + "ResourceId", indexMap) : "";
  const resourceUnitCell = version === 3 ? cell(row, side + "ResourceUnit", indexMap) : "";
  let furnitureIds: string[] | undefined;
  if (furnitureIdsCell !== "") {
    const parsed: unknown = JSON.parse(furnitureIdsCell);
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
      throw new Error("CSV rulo mobilya ID alanı JSON string listesi olmalıdır.");
    }
    furnitureIds = parsed as string[];
  }
  return {
    category,
    description: cell(row, side + "Description", indexMap),
    quantity: parseQuantityCell(cell(row, side + "Quantity", indexMap), "CSV miktarı"),
    unit: cell(row, side + "Unit", indexMap),
    unitPriceMinor: parseIntegerCell(cell(row, side + "UnitPriceMinor", indexMap), "CSV birim fiyatı", 0),
    lineTotalMinor: parseIntegerCell(cell(row, side + "LineTotalMinor", indexMap), "CSV satır toplamı", 0),
    currencyCode: cell(row, side + "LineCurrencyCode", indexMap),
    ...(sourceReference === "" ? {} : { sourceReference }),
    sourceType: cell(row, side + "SourceType", indexMap) as ProjectQuoteRevisionCostLineSnapshot["sourceType"],
    sourceId: cell(row, side + "SourceId", indexMap),
    ...(tariffId === "" ? {} : { tariffId }),
    ...(sourcePartIds === undefined ? {} : { sourcePartIds }),
    ...(edgeDirection === "" ? {} : { edgeDirection: edgeDirection as ProjectQuoteRevisionCostLineSnapshot["edgeDirection"] }),
    ...(rollCountCell === "" ? {} : { rollCount: parseIntegerCell(rollCountCell, "CSV rulo adedi", 1) }),
    ...(rollLengthCell === "" ? {} : { rollLengthMm: parseRollLengthCell(rollLengthCell, "CSV rulo uzunluğu") }),
    ...(purchasedLengthCell === "" ? {} : { purchasedLengthMm: parseRollLengthCell(purchasedLengthCell, "CSV satın alınan rulo uzunluğu") }),
    ...(furnitureIds === undefined ? {} : { furnitureIds }),
    ...(planSourceReference === "" ? {} : { planSourceReference }),
    ...(priceSourceReference === "" ? {} : { priceSourceReference }),
    ...(resourceTypeCell === "" ? {} : { resourceType: resourceTypeCell as ProjectQuoteRevisionCostLineSnapshot["resourceType"] }),
    ...(resourceIdCell === "" ? {} : { resourceId: resourceIdCell }),
    ...(resourceUnitCell === "" ? {} : { resourceUnit: resourceUnitCell })
  };
}

/** Export a validated comparison as stable UTF-8 CSV; units and currency remain exact. */
export function serializeProjectQuoteRevisionComparisonCsv(
  resultValue: unknown
): ProjectQuoteRevisionComparisonCsvSerializationResult {
  const validatedFile = serializeProjectQuoteRevisionComparisonFile(resultValue);
  if (validatedFile.status !== "ready" || validatedFile.json === null) {
    return blockedSerialization(validatedFile.diagnostics[0] ?? "Yalnızca doğrulanmış teklif karşılaştırmaları CSV'ye aktarılabilir.");
  }
  const parsedFile = parseProjectQuoteRevisionComparisonFile(validatedFile.json);
  if (parsedFile.status !== "ready" || parsedFile.comparison === null) {
    return blockedSerialization(parsedFile.diagnostics[0] ?? "Teklif karşılaştırması CSV için doğrulanamadı.");
  }
  const comparison = parsedFile.comparison;
  const records: unknown[][] = [
    [...columns],
    [...metaValues(comparison, "total"), "", "", "", ...blankLineValues()]
  ];
  for (const category of categories) {
    records.push([...metaValues(comparison, "category"), category, comparison.categoryDeltasMinor[category], "", ...blankLineValues()]);
  }
  for (const change of comparison.lineChanges) {
    const category = (change.from ?? change.to)?.category;
    if (category === undefined) return blockedSerialization("Teklif satır farkı kategorisi bulunmuyor.");
    records.push([...metaValues(comparison, "line"), category, "", change.type, ...lineChangeValues(change.from, change.to)]);
  }
  const csv = "\uFEFF" + records.map(csvRow).join("\r\n") + "\r\n";
  if (csv.length > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES ||
      new TextEncoder().encode(csv).byteLength > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES) {
    return blockedSerialization("CSV teklif karşılaştırma dosyası 1 MiB sınırını aşamaz.");
  }
  return Object.freeze({
    status: "ready" as const,
    csv,
    diagnostics: Object.freeze([])
  });
}

/** Parse strict v1/v2/v3 CSV; reconstructed comparisons must pass the domain JSON validator. */
export function parseProjectQuoteRevisionComparisonCsv(
  csvValue: unknown
): ProjectQuoteRevisionComparisonCsvParseResult {
  if (typeof csvValue !== "string") return blockedParse("Teklif karşılaştırma CSV dosyası metin olmalıdır.");
  try {
    const records = parseCsvRecords(csvValue);
    if (records.length < 8) throw new Error("CSV genel toplam ve altı kategori satırını içermelidir.");
    const header = records[0];
    const version: 1 | 2 | 3 = header.length === legacyColumnsV1.length && header.every((value, index) => value === legacyColumnsV1[index])
      ? 1
      : header.length === legacyColumnsV2.length && header.every((value, index) => value === legacyColumnsV2[index])
        ? 2
        : header.length === columns.length && header.every((value, index) => value === columns[index])
          ? 3
          : (() => { throw new Error("Teklif karşılaştırma CSV sütun başlığı desteklenen v1/v2/v3 sözleşmesiyle uyuşmuyor."); })();
    const indexMap = version === 1 ? legacyColumnIndexV1 : version === 2 ? legacyColumnIndexV2 : columnIndex;
    const lineColumnsForVersion = header.slice(15);
    for (const row of records.slice(1)) {
      if (row.length !== header.length) throw new Error("CSV satır sütun sayısı sözleşmeyle uyuşmuyor.");
      if (cell(row, "format", indexMap) !== PROJECT_QUOTE_REVISION_COMPARISON_CSV_FORMAT ||
          cell(row, "formatVersion", indexMap) !== String(version)) {
        throw new Error("Teklif karşılaştırma CSV biçimi veya sürümü desteklenmiyor.");
      }
    }
    const total = records[1];
    if (cell(total, "rowType", indexMap) !== "total") throw new Error("CSV ilk veri satırı genel toplam olmalıdır.");
    requireBlank(total, ["category", "categoryDeltaMinor", "changeType", ...lineColumnsForVersion], "CSV genel toplam satırı", indexMap);
    const metaNames = header.slice(0, 12).filter((name) => name !== "rowType");
    for (const row of records.slice(2)) {
      for (const name of metaNames) {
        if (cell(row, name, indexMap) !== cell(total, name, indexMap)) throw new Error("CSV satır metadata'sı genel toplam satırıyla uyuşmuyor.");
      }
    }
    const projectId = cell(total, "projectId", indexMap);
    const fromRevisionId = cell(total, "fromRevisionId", indexMap);
    const fromRevisionNumber = parseIntegerCell(cell(total, "fromRevisionNumber", indexMap), "Başlangıç revizyon numarası", 1);
    const toRevisionId = cell(total, "toRevisionId", indexMap);
    const toRevisionNumber = parseIntegerCell(cell(total, "toRevisionNumber", indexMap), "Hedef revizyon numarası", 1);
    const currencyCode = cell(total, "currencyCode", indexMap);
    const fromGrandTotalMinor = parseIntegerCell(cell(total, "fromGrandTotalMinor", indexMap), "Başlangıç toplamı", 0);
    const toGrandTotalMinor = parseIntegerCell(cell(total, "toGrandTotalMinor", indexMap), "Hedef toplamı", 0);
    const grandTotalDeltaMinor = parseIntegerCell(cell(total, "grandTotalDeltaMinor", indexMap), "Toplam farkı");

    const categoryRows = records.slice(2, 8);
    const categoryDeltasMinor = {} as Record<ProjectQuoteCostCategory, number>;
    for (let index = 0; index < categories.length; index += 1) {
      const row = categoryRows[index];
      if (row === undefined || cell(row, "rowType", indexMap) !== "category" || cell(row, "category", indexMap) !== categories[index]) {
        throw new Error("CSV kategori satırları sabit sıralı ve eksiksiz olmalıdır.");
      }
      requireBlank(row, ["changeType", ...lineColumnsForVersion], "CSV kategori satırı", indexMap);
      categoryDeltasMinor[categories[index]] = parseIntegerCell(cell(row, "categoryDeltaMinor", indexMap), categories[index] + " kategori farkı");
    }
    const lineRows = records.slice(8);
    if (lineRows.length > PROJECT_QUOTE_REVISION_COMPARISON_MAX_LINE_CHANGES) throw new Error(csvLineChangeLimitMessage);
    const lineChanges: ProjectQuoteRevisionLineChange[] = lineRows.map((row) => {
      if (cell(row, "rowType", indexMap) !== "line") throw new Error("CSV kategori satırlarından sonra yalnızca teklif fark satırları bulunabilir.");
      requireBlank(row, ["categoryDeltaMinor"], "CSV teklif fark satırı", indexMap);
      const category = cell(row, "category", indexMap) as ProjectQuoteCostCategory;
      const type = cell(row, "changeType", indexMap);
      if (type !== "added" && type !== "removed" && type !== "changed") throw new Error("CSV satır fark türü desteklenmiyor.");
      const from = parseLineSide(row, "from", category, indexMap, version);
      const to = parseLineSide(row, "to", category, indexMap, version);
      return { type: type as ProjectQuoteRevisionLineChange["type"], from, to };
    });

    const comparison: ProjectQuoteRevisionComparison = {
      schemaVersion: 1,
      projectId,
      fromRevisionId,
      fromRevisionNumber,
      toRevisionId,
      toRevisionNumber,
      currencyCode,
      fromGrandTotalMinor,
      toGrandTotalMinor,
      grandTotalDeltaMinor,
      categoryDeltasMinor,
      lineChanges
    };
    const jsonValidation = serializeProjectQuoteRevisionComparisonFile({
      status: "ready",
      comparison,
      diagnostics: []
    });
    if (jsonValidation.status !== "ready" || jsonValidation.json === null) {
      throw new Error(jsonValidation.diagnostics[0] ?? "CSV karşılaştırması domain doğrulamasından geçmedi.");
    }
    const normalized = parseProjectQuoteRevisionComparisonFile(jsonValidation.json);
    if (normalized.status !== "ready" || normalized.comparison === null) {
      throw new Error(normalized.diagnostics[0] ?? "CSV karşılaştırması doğrulanmış JSON'a dönüştürülemedi.");
    }
    return Object.freeze({ status: "ready" as const, formatVersion: version, comparison: normalized.comparison, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : String(error));
  }
}