import {
  PROJECT_COST_CATEGORIES,
  type ProjectCostCategory,
  type ProjectCostSummary
} from "./projectCostSummary.ts";
import {
  parseProjectQuoteSummaryFile,
  serializeProjectQuoteSummaryFile
} from "./projectQuoteSummaryFile.ts";
import type { ProjectQuoteLineSource, ProjectQuoteSummary } from "./projectQuoteSummary.ts";

export const PROJECT_QUOTE_SUMMARY_CSV_FORMAT = "MobilyaCADProjectQuoteSummaryCsv" as const;
export const PROJECT_QUOTE_SUMMARY_CSV_VERSION = 1 as const;

export const PROJECT_QUOTE_SUMMARY_CSV_COLUMNS = [
  "format", "formatVersion", "rowType", "status", "currencyCode",
  "requiredLineCount", "pricedLineCount", "grandTotalMinor", "categoryTotalsMinor",
  "costLineId", "category", "description", "quantity", "unit", "unitPriceMinor",
  "lineTotalMinor", "sourceReference", "costEdgeDirection", "sourceEdgeDirection",
  "sourceType", "sourceId", "tariffId", "sourcePartIds", "resourceType",
  "resourceId", "rollCount", "rollLengthMm", "purchasedLengthMm", "furnitureIds",
  "planSourceReference", "priceSourceReference"
] as const;

export interface ProjectQuoteSummaryCsvSerializationResult {
  status: "ready" | "empty" | "blocked";
  csv: string | null;
  diagnostics: readonly string[];
}

export interface ProjectQuoteSummaryCsvParseResult {
  status: "ready" | "empty" | "blocked";
  summary: ProjectQuoteSummary | null;
  diagnostics: readonly string[];
}

const columns = PROJECT_QUOTE_SUMMARY_CSV_COLUMNS;
const columnIndex = new Map<string, number>(columns.map((column, index) => [column, index]));
const lineColumns = columns.slice(9);
const maxCsvLength = 5_000_000;
const maxLines = 10_000;
const currencyPattern = /^[A-Z]{3}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

function blankLineValues(): string[] {
  return lineColumns.map(() => "");
}

function blankMetaFields(row: readonly string[], names: readonly string[], label: string): void {
  for (const name of names) {
    const index = columnIndex.get(name);
    if (index === undefined || row[index] !== "") throw new Error(label + " desteklenmeyen satır verisi içeriyor.");
  }
}

function parseCsvRecords(csv: string): string[][] {
  if (csv.length > maxCsvLength) throw new Error("Teklif CSV dosyası 5 MB sınırını aşıyor.");
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
      if (records.length > maxLines + 2) throw new Error("CSV satır sınırı aşılıyor.");
      continue;
    }
    field += char;
  }
  if (inQuotes) throw new Error("CSV tırnaklı alan kapanmamış.");
  if (field.length > 0 || row.length > 0 || afterQuote) {
    row.push(field);
    records.push(row);
  }
  return records;
}

function cell(row: readonly string[], name: string): string {
  const index = columnIndex.get(name);
  if (index === undefined) throw new Error("CSV sözleşme sütunu bulunamadı: " + name + ".");
  return row[index] ?? "";
}

function parseIntegerCell(value: string, label: string, minimum = 0): number {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) throw new Error(label + " tam sayı olmalıdır.");
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

function parseOptionalQuantityCell(value: string, label: string): number | undefined {
  return value === "" ? undefined : parseQuantityCell(value, label);
}

function parseOptionalIntegerCell(value: string, label: string, minimum = 0): number | undefined {
  return value === "" ? undefined : parseIntegerCell(value, label, minimum);
}

function parseStringArrayCell(value: string, label: string): string[] | undefined {
  if (value === "") return undefined;
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(label + " JSON string listesi olmalıdır.");
  }
  return parsed as string[];
}

function parseCategoryTotalsCell(value: string): ProjectCostSummary["categoryTotalsMinor"] {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) throw new Error("CSV kategori toplamları nesne olmalıdır.");
  const keys = Object.keys(parsed);
  if (keys.length !== PROJECT_COST_CATEGORIES.length || keys.some((key) => !(PROJECT_COST_CATEGORIES as readonly string[]).includes(key)) {
    throw new Error("CSV kategori toplamları altı desteklenen kategoriyi eksiksiz içermelidir.");
  }
  const totals = {} as ProjectCostSummary["categoryTotalsMinor"];
  for (const category of PROJECT_COST_CATEGORIES) {
    const value = parsed[category];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      throw new Error(category + " CSV kategori toplamı güvenli ve negatif olmayan tam sayı olmalıdır.");
    }
    totals[category] = value;
  }
  return totals;
}

function zeroCategoryTotals(): ProjectCostSummary["categoryTotalsMinor"] {
  return { material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 };
}

function blockedSerialization(message: string): ProjectQuoteSummaryCsvSerializationResult {
  return Object.freeze({ status: "blocked" as const, csv: null, diagnostics: Object.freeze([message]) });
}

function blockedParse(message: string): ProjectQuoteSummaryCsvParseResult {
  return Object.freeze({ status: "blocked" as const, summary: null, diagnostics: Object.freeze([message]) });
}

function normalizeSummary(value: unknown): ProjectQuoteSummary {
  const serialized = serializeProjectQuoteSummaryFile(value);
  if ((serialized.status !== "ready" && serialized.status !== "empty") || serialized.json === null) {
    throw new Error(serialized.diagnostics[0] ?? "Teklif özeti CSV için doğrulanamadı.");
  }
  const parsed = parseProjectQuoteSummaryFile(serialized.json);
  if ((parsed.status !== "ready" && parsed.status !== "empty") || parsed.summary === null) {
    throw new Error(parsed.diagnostics[0] ?? "Teklif özeti CSV için doğrulanmış JSON'a dönüştürülemedi.");
  }
  return parsed.summary;
}

function metadataRow(summary: ProjectQuoteSummary): string[] {
  const row = Array(columns.length).fill("") as string[];
  row[0] = PROJECT_QUOTE_SUMMARY_CSV_FORMAT;
  row[1] = String(PROJECT_QUOTE_SUMMARY_CSV_VERSION);
  row[2] = "meta";
  row[3] = summary.status;
  row[4] = summary.currencyCode ?? "";
  row[5] = String(summary.requiredLineCount);
  row[6] = String(summary.pricedLineCount);
  row[7] = String(summary.costSummary?.grandTotalMinor ?? 0);
  row[8] = JSON.stringify(summary.costSummary?.categoryTotalsMinor ?? zeroCategoryTotals());
  return row;
}

function costLineRow(
  line: ProjectCostSummary["lines"][number],
  source: ProjectQuoteLineSource
): string[] {
  const row = Array(columns.length).fill("") as string[];
  row[0] = PROJECT_QUOTE_SUMMARY_CSV_FORMAT;
  row[1] = String(PROJECT_QUOTE_SUMMARY_CSV_VERSION);
  row[2] = "line";
  row[4] = line.currencyCode;
  row[9] = line.id;
  row[10] = line.category;
  row[11] = line.description;
  row[12] = String(line.quantity);
  row[13] = line.unit;
  row[14] = String(line.unitPriceMinor);
  row[15] = String(line.lineTotalMinor);
  row[16] = line.sourceReference ?? "";
  row[17] = line.edgeDirection ?? "";
  row[18] = source.edgeDirection ?? "";
  row[19] = source.sourceType;
  row[20] = source.sourceId;
  row[21] = source.tariffId ?? "";
  row[22] = source.sourcePartIds === undefined ? "" : JSON.stringify(source.sourcePartIds);
  row[23] = source.resourceType ?? "";
  row[24] = source.resourceId ?? "";
  row[25] = source.rollCount === undefined ? "" : String(source.rollCount);
  row[26] = source.rollLengthMm === undefined ? "" : String(source.rollLengthMm);
  row[27] = source.purchasedLengthMm === undefined ? "" : String(source.purchasedLengthMm);
  row[28] = source.furnitureIds === undefined ? "" : JSON.stringify(source.furnitureIds);
  row[29] = source.planSourceReference ?? "";
  row[30] = source.priceSourceReference ?? "";
  return row;
}

/** Export only a complete ready quote or a genuinely empty summary. */
export function serializeProjectQuoteSummaryCsv(value: unknown): ProjectQuoteSummaryCsvSerializationResult {
  try {
    const summary = normalizeSummary(value);
    const records: string[][] = [[...columns], metadataRow(summary)];
    if (summary.status === "ready") {
      if (summary.costSummary === null || summary.lineSources.length !== summary.costSummary.lines.length) {
        throw new Error("Hazır teklif CSV satırları ve kaynak eşlemesi eksiksiz olmalıdır.");
      }
      for (let index = 0; index < summary.costSummary.lines.length; index += 1) {
        records.push(costLineRow(summary.costSummary.lines[index], summary.lineSources[index]));
      }
    }
    const csv = "\uFEFF" + records.map(csvRow).join("\r\n") + "\r\n";
    if (csv.length > maxCsvLength) throw new Error("Teklif CSV dosyası 5 MB sınırını aşıyor.");
    return Object.freeze({ status: summary.status, csv, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization(error instanceof Error ? error.message : String(error));
  }
}

/** Parse strict CSV v1; reconstructed quote data must pass the existing JSON domain validator. */
export function parseProjectQuoteSummaryCsv(csvValue: unknown): ProjectQuoteSummaryCsvParseResult {
  if (typeof csvValue !== "string") return blockedParse("Teklif CSV dosyası metin olmalıdır.");
  try {
    const records = parseCsvRecords(csvValue);
    if (records.length < 2) throw new Error("Teklif CSV başlık ve metadata satırı içermelidir.");
    const header = records[0];
    if (header.length !== columns.length || header.some((value, index) => value !== columns[index])) {
      throw new Error("Teklif CSV sütun başlığı desteklenen v1 sözleşmesiyle uyuşmuyor.");
    }
    for (const row of records.slice(1)) {
      if (row.length !== columns.length) throw new Error("CSV satır sütun sayısı sözleşmayla uyuşmuyor.");
      if (cell(row, "format") !== PROJECT_QUOTE_SUMMARY_CSV_FORMAT ||
          cell(row, "formatVersion") !== String(PROJECT_QUOTE_SUMMARY_CSV_VERSION)) {
        throw new Error("Teklif CSV biçimi veya sürümü desteklenmiyor.");
      }
    }
    const meta = records[1];
    if (cell(meta, "rowType") !== "meta") throw new Error("CSV ilk veri satırı teklif metadata'sı olmalıdır.");
    blankMetaFields(meta, lineColumns, "CSV metadata satırı");
    const status = cell(meta, "status");
    if (status !== "ready" && status !== "empty") throw new Error("CSV teklif durumu ready veya empty olmalıdır.");
    const currencyCode = cell(meta, "currencyCode");
    const requiredLineCount = parseIntegerCell(cell(meta, "requiredLineCount"), "Gerekli teklif satır sayısı");
    const pricedLineCount = parseIntegerCell(cell(meta, "pricedLineCount"), "Fiyatlı teklif satır sayısı");
    const grandTotalMinor = parseIntegerCell(cell(meta, "grandTotalMinor"), "Teklif genel toplamı");
    const categoryTotalsMinor = parseCategoryTotalsCell(cell(meta, "categoryTotalsMinor"));
    const lineRows = records.slice(2);
    if (lineRows.length > maxLines) throw new Error("CSV teklif satırı sınırını aşıyor.");
    for (const row of lineRows) {
      if (cell(row, "rowType") !== "line") throw new Error("Metadata satırından sonra yalnızca teklif line satırları bulunabilir.");
      blankMetaFields(row, ["status", "requiredLineCount", "pricedLineCount", "grandTotalMinor", "categoryTotalsMinor"], "CSV teklif satırı");
    }

    if (status === "empty") {
      if (currencyCode !== "" || requiredLineCount !== 0 || pricedLineCount !== 0 || grandTotalMinor !== 0 || lineRows.length !== 0 ||
          PROJECT_COST_CATEGORIES.some((category) => categoryTotalsMinor[category] !== 0)) {
        throw new Error("Boş teklif CSV sıfır satır, para birimi olmayan ve sıfır toplamlı olmalıdır.");
      }
      const summary: ProjectQuoteSummary = {
        status: "empty", currencyCode: null, requiredLineCount: 0, pricedLineCount: 0,
        missingPrices: [], missingTariffs: [], diagnostics: [], lineSources: [], costSummary: null
      };
      const normalized = normalizeSummary(summary);
      return Object.freeze({ status: "empty" as const, summary: normalized, diagnostics: Object.freeze([]) });
    }

    if (!currencyPattern.test(currencyCode)) throw new Error("CSV teklif para birimi üç büyük harfli kod olmalıdır.");
    if (requiredLineCount === 0 || requiredLineCount !== pricedLineCount || requiredLineCount !== lineRows.length) {
      throw new Error("Hazır teklif CSV satır sayısı metadata ve line satırlarıyla uyuşmalıdır.");
    }

    const lines: ProjectCostSummary["lines"] = [];
    const lineSources: ProjectQuoteLineSource[] = [];
    for (const row of lineRows) {
      const lineId = cell(row, "costLineId");
      const category = cell(row, "category") as ProjectCostCategory;
      const description = cell(row, "description");
      const quantity = parseQuantityCell(cell(row, "quantity"), "CSV miktarı");
      const unit = cell(row, "unit");
      const unitPriceMinor = parseIntegerCell(cell(row, "unitPriceMinor"), "CSV birim fiyatı");
      const lineTotalMinor = parseIntegerCell(cell(row, "lineTotalMinor"), "CSV satır toplamı");
      const lineCurrency = cell(row, "currencyCode");
      if (lineCurrency !== currencyCode) throw new Error("CSV teklif satır para birimleri metadata ile uyuşmalıdır.");
      const sourceReference = cell(row, "sourceReference");
      const costEdgeDirection = cell(row, "costEdgeDirection");
      const sourceEdgeDirection = cell(row, "sourceEdgeDirection");
      const sourceType = cell(row, "sourceType") as ProjectQuoteLineSource["sourceType"];
      const sourceId = cell(row, "sourceId");
      const tariffId = cell(row, "tariffId");
      const sourcePartIds = parseStringArrayCell(cell(row, "sourcePartIds"), "CSV kaynak Part ID");
      const resourceType = cell(row, "resourceType");
      const resourceId = cell(row, "resourceId");
      const rollCount = parseOptionalIntegerCell(cell(row, "rollCount"), "CSV rulo adedi", 1);
      const rollLengthMm = parseOptionalQuantityCell(cell(row, "rollLengthMm"), "CSV rulo uzunluğu (mm)");
      const purchasedLengthMm = parseOptionalQuantityCell(cell(row, "purchasedLengthMm"), "CSV satın alınan rulo uzunluğu (mm)");
      const furnitureIds = parseStringArrayCell(cell(row, "furnitureIds"), "CSV mobilya ID");
      const planSourceReference = cell(row, "planSourceReference");
      const priceSourceReference = cell(row, "priceSourceReference");

      lines.push({
        id: lineId,
        category,
        description,
        quantity,
        unit,
        unitPriceMinor,
        currencyCode: lineCurrency,
        ...(sourceReference === "" ? {} : { sourceReference }),
        ...(costEdgeDirection === "" ? {} : { edgeDirection: costEdgeDirection as ProjectCostSummary["lines"][number]["edgeDirection"] })
      });
      lineSources.push({
        costLineId: lineId,
        sourceType,
        sourceId,
        ...(tariffId === "" ? {} : { tariffId }),
        ...(sourcePartIds === undefined ? {} : { sourcePartIds }),
        ...(resourceType === "" ? {} : {
          resourceType: resourceType as ProjectQuoteLineSource["resourceType",
          resourceId,
          unit,
          ...(sourceEdgeDirection === "" ? {} : { edgeDirection: sourceEdgeDirection as ProjectQuoteLineSource["edgeDirection"] })
        }),
        ...(rollCount === undefined ? {} : { rollCount }),
        ...(rollLengthMm === undefined ? {} : { rollLengthMm }),
        ...(purchasedLengthMm === undefined ? {} : { purchasedLengthMm }),
        ...(furnitureIds === undefined ? {} : { furnitureIds }),
        ...(planSourceReference === "" ? {} : { planSourceReference }),
        ...(priceSourceReference === "" ? {} : { priceSourceReference })
      });
    }

    const summary: ProjectQuoteSummary = {
      status: "ready",
      currencyCode,
      requiredLineCount,
      pricedLineCount,
      missingPrices: [],
      missingTariffs: [],
      diagnostics: [],
      lineSources,
      costSummary: {
        status: "ready",
        currencyCode,
        lineCount: lines.length,
        lines,
        categoryTotalsMinor,
        grandTotalMinor
      }
    };
    const normalized = normalizeSummary(summary);
    if (normalized.status !== "ready") throw new Error("Hazır CSV teklif domain doğrulamasından geçmedi.");
    return Object.freeze({ status: "ready" as const, summary: normalized, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : String(error));
  }
}
