import {
  calculateProjectCostSummary,
  PROJECT_COST_CATEGORIES,
  type ProjectCostLineInput,
  type ProjectCostSummary
} from "./projectCostSummary.ts";
import type {
  ProjectEdgeBandingRollCostSummary,
  ProjectEdgeBandingRollCostLineSource
} from "./projectEdgeBandingRollCostSummary.ts";

export const PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT = "MobilyaCADEdgeBandingRollCostCsv" as const;
export const PROJECT_EDGE_BANDING_ROLL_COST_CSV_VERSION = 1 as const;

export const PROJECT_EDGE_BANDING_ROLL_COST_CSV_COLUMNS = [
  "format", "formatVersion", "rowType", "status", "currencyCode",
  "requiredLineCount", "pricedLineCount", "grandTotalMinor",
  "costLineId", "edgeBandingId", "description", "rollCount", "unit",
  "rollLengthMm", "purchasedLengthMm", "unitPriceMinor", "lineTotalMinor",
  "planSourceReference", "priceSourceReference", "partIds", "furnitureIds"
] as const;

export interface ProjectEdgeBandingRollCostCsvSerializationResult {
  status: "ready" | "empty" | "blocked";
  csv: string | null;
  diagnostics: readonly string[];
}

export interface ProjectEdgeBandingRollCostCsvParseResult {
  status: "ready" | "empty" | "blocked";
  summary: ProjectEdgeBandingRollCostSummary | null;
  diagnostics: readonly string[];
}

const columns = PROJECT_EDGE_BANDING_ROLL_COST_CSV_COLUMNS;
const columnIndex = new Map<string, number>(columns.map((column, index) => [column, index] as const));
const summaryKeys = new Set([
  "status", "currencyCode", "requiredLineCount", "pricedLineCount",
  "missingRollSpecs", "missingPrices", "diagnostics", "lineSources", "costSummary"
]);
const lineSourceKeys = new Set([
  "costLineId", "edgeBandingId", "rollCount", "rollLengthMm", "purchasedLengthMm",
  "partIds", "furnitureIds", "planSourceReference", "priceSourceReference"
]);
const costSummaryKeys = new Set(["status", "currencyCode", "lineCount", "lines", "categoryTotalsMinor", "grandTotalMinor"]);
const costLineKeys = new Set([
  "id", "category", "description", "quantity", "unit", "unitPriceMinor",
  "currencyCode", "sourceReference", "lineTotalMinor"
]);
const identifierPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const currencyPattern = /^[A-Z]{3}$/;
const maxRows = 1_000;
const maxSourceIds = 10_000;
const maxRollLengthMm = 10_000_000;
const maxCsvLength = 5_000_000;

type CsvRowType = "summary" | "line";

interface NormalizedLineSource {
  costLineId: string;
  edgeBandingId: string;
  rollCount: number;
  rollLengthMm: number;
  purchasedLengthMm: number;
  partIds: string[];
  furnitureIds: string[];
  planSourceReference?: string;
  priceSourceReference?: string;
}

interface NormalizedReadySummary {
  currencyCode: string;
  lines: ProjectCostLineInput[];
  lineSources: NormalizedLineSource[];
  costSummary: ProjectCostSummary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireExactKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
  }
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value || value.length > maxLength) {
    throw new Error(label + " boş olmayan, kenar boşluğu içermeyen ve en fazla " + maxLength + " karakterlik metin olmalıdır.");
  }
  return value;
}

function requireIdentifier(value: unknown, label: string): string {
  const id = requireText(value, label, 64);
  if (!identifierPattern.test(id)) throw new Error(label + " kimliği geçersiz.");
  return id;
}

function requireCurrency(value: unknown, label: string): string {
  const currency = requireText(value, label, 3);
  if (!currencyPattern.test(currency)) throw new Error(label + " üç büyük harfli kod olmalıdır.");
  return currency;
}

function requireSafeInteger(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(label + " en az " + minimum + " olan güvenli bir tam sayı olmalıdır.");
  }
  return value;
}

function compareText(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function validateMm(value: unknown, label: string, allowZero: boolean, maximum = Number.MAX_SAFE_INTEGER / 10): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < (allowZero ? 0 : Number.MIN_VALUE) || value > maximum) {
    throw new Error(label + " geçerli mm değeri olmalıdır.");
  }
  const tenths = Math.round(value * 10);
  if (!Number.isSafeInteger(tenths) || Math.abs(tenths / 10 - value) > 1e-8) {
    throw new Error(label + " en fazla 0.1 mm hassasiyetinde olmalıdır.");
  }
  return tenths / 10;
}

function validateSortedIds(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > maxSourceIds) {
    throw new Error(label + " en fazla " + maxSourceIds + " kimlik içeren liste olmalıdır.");
  }
  const items: string[] = [];
  for (const [index, raw] of value.entries()) {
    const item = requireText(raw, label + " " + (index + 1), 128);
    if (index > 0 && compareText(items[index - 1], item) >= 0) {
      throw new Error(label + " sıralı ve benzersiz olmalıdır.");
    }
    items.push(item);
  }
  return items;
}

function optionalText(value: unknown, label: string, maxLength: number): string | undefined {
  return value === undefined ? undefined : requireText(value, label, maxLength);
}

function requireEmptyArray(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.length !== 0) throw new Error(label + " boş liste olmalıdır.");
}

function validateLineSource(value: unknown, index: number): NormalizedLineSource {
  const label = "Rulo maliyetinin " + (index + 1) + ". kaynak satırı";
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  requireExactKeys(value, lineSourceKeys, label);
  const edgeBandingId = requireIdentifier(value.edgeBandingId, label + " katalog kimliği");
  const rollCount = requireSafeInteger(value.rollCount, label + " rulo adedi", 1);
  const rollLengthMm = validateMm(value.rollLengthMm, label + " rulo uzunluğu", false, maxRollLengthMm);
  const purchasedLengthMm = validateMm(value.purchasedLengthMm, label + " satın alınan uzunluk", false);
  if (rollLengthMm <= 0) throw new Error(label + " rulo uzunluğu sıfırdan büyük olmalıdır.");
  const expectedPurchased = BigInt(Math.round(rollLengthMm * 10)) * BigInt(rollCount);
  if (expectedPurchased > BigInt(Number.MAX_SAFE_INTEGER) || Number(expectedPurchased) / 10 !== purchasedLengthMm) {
    throw new Error(label + " rulo adedi ve satın alınan uzunluk tutarlı olmalıdır.");
  }
  const costLineId = requireIdentifier(value.costLineId, label + " maliyet satırı kimliği");
  const expectedLineId = "edge-roll-" + String(index + 1).padStart(4, "0");
  if (costLineId !== expectedLineId) throw new Error(label + " maliyet satırı kimliği sıralama ile uyuşmuyor.");
  return {
    costLineId,
    edgeBandingId,
    rollCount,
    rollLengthMm,
    purchasedLengthMm,
    partIds: validateSortedIds(value.partIds, label + " Part ID'leri"),
    furnitureIds: validateSortedIds(value.furnitureIds, label + " mobilya ID'leri"),
    ...(optionalText(value.planSourceReference, label + " plan kaynak referansı", 256) === undefined
      ? {}
      : { planSourceReference: value.planSourceReference as string }),
    ...(optionalText(value.priceSourceReference, label + " fiyat kaynak referansı", 256) === undefined
      ? {}
      : { priceSourceReference: value.priceSourceReference as string })
  };
}

function validateReadySummary(value: ProjectEdgeBandingRollCostSummary): NormalizedReadySummary {
  requireExactKeys(value as unknown as Record<string, unknown>, summaryKeys, "Rulo maliyet özeti");
  requireEmptyArray(value.missingRollSpecs, "Eksik rulo tanımları");
  requireEmptyArray(value.missingPrices, "Eksik rulo fiyatları");
  requireEmptyArray(value.diagnostics, "Rulo maliyet tanıları");
  if (value.status !== "ready") {
    throw new Error("Hazır rulo maliyet özeti eksik tanım, fiyat veya tanı içermemelidir.");
  }
  const currencyCode = requireCurrency(value.currencyCode, "Rulo maliyet para birimi");
  const requiredLineCount = requireSafeInteger(value.requiredLineCount, "Rulo maliyet satır sayısı", 1);
  const pricedLineCount = requireSafeInteger(value.pricedLineCount, "Fiyatlanan rulo satır sayısı", 1);
  if (requiredLineCount > maxRows || requiredLineCount !== pricedLineCount) {
    throw new Error("Rulo maliyet satır sayısı 1.000 sınırında ve tüm satırlar fiyatlanmış olmalıdır.");
  }
  if (!Array.isArray(value.lineSources) || value.lineSources.length !== requiredLineCount) {
    throw new Error("Rulo maliyet kaynakları satır sayısıyla uyuşmalıdır.");
  }
  const lineSources = value.lineSources.map(validateLineSource);
  for (let index = 0; index < lineSources.length; index += 1) {
    if (index > 0 && compareText(lineSources[index - 1].edgeBandingId, lineSources[index].edgeBandingId) >= 0) {
      throw new Error("Rulo maliyet kaynakları katalog kimliğine göre sıralı ve benzersiz olmalıdır.");
    }
  }
  if (!isRecord(value.costSummary)) throw new Error("Hazır rulo maliyet özeti maliyet satırları içermelidir.");
  const rawCost = value.costSummary as unknown as Record<string, unknown>;
  requireExactKeys(rawCost, costSummaryKeys, "Rulo maliyet özeti");
  if (rawCost.status !== "ready" || rawCost.currencyCode !== currencyCode || rawCost.lineCount !== requiredLineCount ||
      !Array.isArray(rawCost.lines) || rawCost.lines.length !== requiredLineCount) {
    throw new Error("Rulo maliyet satırları, adet veya para birimiyle uyuşmuyor.");
  }
  if (!isRecord(rawCost.categoryTotalsMinor)) throw new Error("Rulo maliyet kategori toplamları geçerli olmalıdır.");
  requireExactKeys(rawCost.categoryTotalsMinor, new Set<string>(PROJECT_COST_CATEGORIES), "Rulo maliyet kategori toplamları");
  const declaredTotals: Record<string, number> = {};
  for (const category of PROJECT_COST_CATEGORIES) {
    declaredTotals[category] = requireSafeInteger(rawCost.categoryTotalsMinor[category], category + " kategori toplamı");
  }
  const declaredGrandTotal = requireSafeInteger(rawCost.grandTotalMinor, "Rulo maliyet genel toplamı");
  const inputs: ProjectCostLineInput[] = [];
  const declaredLineTotals: number[] = [];
  for (let index = 0; index < requiredLineCount; index += 1) {
    const lineSource = lineSources[index];
    const rawLine = rawCost.lines[index];
    const label = "Rulo maliyetinin " + (index + 1) + ". satırı";
    if (!isRecord(rawLine)) throw new Error(label + " geçerli bir nesne olmalıdır.");
    requireExactKeys(rawLine, costLineKeys, label);
    const id = requireIdentifier(rawLine.id, label + " kimliği");
    const description = requireText(rawLine.description, label + " açıklaması", 240);
    const quantity = requireSafeInteger(rawLine.quantity, label + " miktarı", 1);
    const unitPriceMinor = requireSafeInteger(rawLine.unitPriceMinor, label + " birim fiyatı");
    const lineCurrency = requireCurrency(rawLine.currencyCode, label + " para birimi");
    const sourceReference = optionalText(rawLine.sourceReference, label + " fiyat kaynak referansı", 256);
    const lineTotalMinor = requireSafeInteger(rawLine.lineTotalMinor, label + " satır tutarı");
    if (
      id !== lineSource.costLineId ||
      rawLine.category !== "material" ||
      description !== "Kenar bandı rulo satın alımı — " + lineSource.edgeBandingId ||
      quantity !== lineSource.rollCount ||
      rawLine.unit !== "rulo" ||
      lineCurrency !== currencyCode ||
      (sourceReference ?? null) !== (lineSource.priceSourceReference ?? null)
    ) {
      throw new Error(label + " rulo kaynağı, birim, miktar veya fiyat metadata'sıyla uyuşmuyor.");
    }
    inputs.push({
      id,
      category: "material",
      description,
      quantity,
      unit: "rulo",
      unitPriceMinor,
      currencyCode: lineCurrency,
      ...(sourceReference === undefined ? {} : { sourceReference })
    });
    declaredLineTotals.push(lineTotalMinor);
  }
  const calculated = calculateProjectCostSummary(inputs);
  if (calculated.status !== "ready" || calculated.lineCount !== requiredLineCount || calculated.currencyCode !== currencyCode ||
      calculated.grandTotalMinor !== declaredGrandTotal) {
    throw new Error("Rulo maliyet toplamları satırlardan yeniden hesaplanan değerlerle uyuşmuyor.");
  }
  for (const category of PROJECT_COST_CATEGORIES) {
    if (calculated.categoryTotalsMinor[category] !== declaredTotals[category]) {
      throw new Error(category + " rulo maliyet kategori toplamı yeniden hesaplanan değerle uyuşmuyor.");
    }
  }
  for (let index = 0; index < calculated.lines.length; index += 1) {
    if (calculated.lines[index].lineTotalMinor !== declaredLineTotals[index]) {
      throw new Error("Rulo maliyetinin " + (index + 1) + ". satır tutarı yeniden hesaplanan değerle uyuşmuyor.");
    }
  }
  return { currencyCode, lines: inputs, lineSources, costSummary: calculated };
}

function validateEmptySummary(value: ProjectEdgeBandingRollCostSummary): void {
  requireExactKeys(value as unknown as Record<string, unknown>, summaryKeys, "Boş rulo maliyet özeti");
  requireEmptyArray(value.missingRollSpecs, "Eksik rulo tanımları");
  requireEmptyArray(value.missingPrices, "Eksik rulo fiyatları");
  requireEmptyArray(value.diagnostics, "Rulo maliyet tanıları");
  requireEmptyArray(value.lineSources, "Rulo maliyet kaynakları");
  if (
    value.status !== "empty" || value.currencyCode !== null ||
    value.requiredLineCount !== 0 || value.pricedLineCount !== 0 ||
    value.missingRollSpecs.length !== 0 || value.missingPrices.length !== 0 ||
    value.diagnostics.length !== 0 || value.lineSources.length !== 0 || value.costSummary !== null
  ) {
    throw new Error("Boş rulo maliyet özeti fiyat, kaynak, tanı veya satır içermemelidir.");
  }
}

function blockedSerialization(diagnostics: readonly string[]): ProjectEdgeBandingRollCostCsvSerializationResult {
  return Object.freeze({ status: "blocked" as const, csv: null, diagnostics: Object.freeze([...diagnostics]) });
}

function blockedParse(message: string): ProjectEdgeBandingRollCostCsvParseResult {
  return Object.freeze({ status: "blocked" as const, summary: null, diagnostics: Object.freeze([message]) });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

function summaryRow(status: "ready" | "empty", currencyCode: string | null, requiredLineCount: number, pricedLineCount: number, grandTotalMinor: number): unknown[] {
  return [
    PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT, PROJECT_EDGE_BANDING_ROLL_COST_CSV_VERSION, "summary",
    status, currencyCode ?? "", requiredLineCount, pricedLineCount, grandTotalMinor,
    ...Array(13).fill("")
  ];
}

function lineRow(source: NormalizedLineSource, line: ProjectCostLineInput, lineTotalMinor: number): unknown[] {
  return [
    PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT, PROJECT_EDGE_BANDING_ROLL_COST_CSV_VERSION, "line",
    "", "", "", "", "",
    source.costLineId, source.edgeBandingId, line.description, source.rollCount, "rulo",
    source.rollLengthMm, source.purchasedLengthMm, line.unitPriceMinor, lineTotalMinor,
    source.planSourceReference ?? "", source.priceSourceReference ?? "",
    JSON.stringify(source.partIds), JSON.stringify(source.furnitureIds)
  ];
}

function csvForRows(rows: readonly (readonly unknown[])[]): string {
  return "\uFEFF" + rows.map(csvRow).join("\r\n") + "\r\n";
}

export function serializeProjectEdgeBandingRollCostCsv(
  summaryInput: unknown
): ProjectEdgeBandingRollCostCsvSerializationResult {
  try {
    if (!isRecord(summaryInput)) throw new Error("Rulo maliyet özeti geçerli bir nesne olmalıdır.");
    const summary = summaryInput as unknown as ProjectEdgeBandingRollCostSummary;
    if (summary.status === "blocked" || summary.status === "incomplete") {
      return blockedSerialization(summary.diagnostics.length ? summary.diagnostics : ["Eksik veya engellenmiş rulo maliyeti CSV olarak dışa aktarılamaz."]);
    }
    if (summary.status === "empty") {
      validateEmptySummary(summary);
      const csv = csvForRows([columns, summaryRow("empty", null, 0, 0, 0)]);
      if (csv.length > maxCsvLength) throw new Error("CSV dosyası 5 MB sınırını aşıyor.");
      return Object.freeze({ status: "empty" as const, csv, diagnostics: Object.freeze([]) });
    }
    if (summary.status !== "ready") throw new Error("Rulo maliyet özeti durumu desteklenmiyor.");
    const normalized = validateReadySummary(summary);
    const rows: (readonly unknown[])[] = [columns, summaryRow(
      "ready", normalized.currencyCode, normalized.lineSources.length, normalized.lineSources.length, normalized.costSummary.grandTotalMinor
    )];
    for (let index = 0; index < normalized.lineSources.length; index += 1) {
      rows.push(lineRow(normalized.lineSources[index], normalized.lines[index], normalized.costSummary.lines[index].lineTotalMinor));
    }
    const csv = csvForRows(rows);
    if (csv.length > maxCsvLength) throw new Error("CSV dosyası 5 MB sınırını aşıyor.");
    return Object.freeze({ status: "ready" as const, csv, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization([error instanceof Error ? error.message : String(error)]);
  }
}

function parseCsvRecords(csv: string): string[][] {
  if (csv.length > maxCsvLength) throw new Error("CSV dosyası 5 MB sınırını aşıyor.");
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
      if (records.length > maxRows + 2) throw new Error("CSV satır sınırı aşılıyor.");
      continue;
    }
    field += char;
  }
  if (inQuotes) throw new Error("CSV tırnaklı alan kapanmamış.");
  if (field.length > 0 || row.length > 0 || afterQuote) {
    row.push(field);
    records.push(row);
  }
  if (records.length > maxRows + 2) throw new Error("CSV satır sınırı aşılıyor.");
  return records;
}

function cell(row: readonly string[], name: string): string {
  const index = columnIndex.get(name);
  if (index === undefined) throw new Error("CSV sözleşme sütunu bulunamadı: " + name + ".");
  return row[index] ?? "";
}

function requireBlank(row: readonly string[], names: readonly string[], label: string): void {
  for (const name of names) if (cell(row, name) !== "") throw new Error(label + " desteklenmeyen satır verisi içeriyor.");
}

function parseIntegerCell(value: string, label: string, minimum = 0): number {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) throw new Error(label + " tam sayı olmalıdır.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(label + " güvenli tam sayı aralığında olmalıdır.");
  return number;
}

function parseMmCell(value: string, label: string, allowZero: boolean, maximum = Number.MAX_SAFE_INTEGER / 10): number {
  if (!/^(?:0|[1-9]\d*)(?:\.\d)?$/.test(value)) throw new Error(label + " en fazla 0.1 mm hassasiyetinde sayı olmalıdır.");
  const number = Number(value);
  return validateMm(number, label, allowZero, maximum);
}

function parseJsonIds(value: string, label: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(label + " JSON listesi geçerli değil.");
  }
  return validateSortedIds(parsed, label);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function parseProjectEdgeBandingRollCostCsv(
  csvInput: unknown
): ProjectEdgeBandingRollCostCsvParseResult {
  try {
    if (typeof csvInput !== "string") throw new Error("CSV içeriği metin olmalıdır.");
    const records = parseCsvRecords(csvInput);
    if (records.length < 2) throw new Error("CSV başlık ve özet satırı içermelidir.");
    if (records[0].length !== columns.length || records[0].some((value, index) => value !== columns[index])) {
      throw new Error("CSV başlık veya sütun sıralaması desteklenen v1 sözleşmasıyla uyuşmuyor.");
    }
    for (const [index, record] of records.entries()) {
      if (record.length !== columns.length) throw new Error("CSV " + (index + 1) + ". satırı sütun sayısıyla uyuşmuyor.");
    }
    const first = records[1];
    if (cell(first, "format") !== PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT ||
        cell(first, "formatVersion") !== String(PROJECT_EDGE_BANDING_ROLL_COST_CSV_VERSION) ||
        cell(first, "rowType") !== "summary") {
      throw new Error("CSV formatı, sürümü veya özet satırı desteklenmiyor.");
    }
    requireBlank(first, [
      "costLineId", "edgeBandingId", "description", "rollCount", "unit", "rollLengthMm",
      "purchasedLengthMm", "unitPriceMinor", "lineTotalMinor", "planSourceReference",
      "priceSourceReference", "partIds", "furnitureIds"
    ], "CSV özet satırı");
    const status = cell(first, "status");
    const requiredLineCount = parseIntegerCell(cell(first, "requiredLineCount"), "Gerekli satır sayısı");
    const pricedLineCount = parseIntegerCell(cell(first, "pricedLineCount"), "Fiyatlanan satır sayısı");
    const grandTotalMinor = parseIntegerCell(cell(first, "grandTotalMinor"), "Genel toplam");
    const lineRecords = records.slice(2);
    if (lineRecords.length > maxRows) throw new Error("CSV rulo satırı 1.000 sınırını aşıyor.");
    if (status === "empty") {
      if (cell(first, "currencyCode") !== "" || requiredLineCount !== 0 || pricedLineCount !== 0 || grandTotalMinor !== 0 || lineRecords.length !== 0) {
        throw new Error("Boş CSV özeti para birimi, satır, fiyat veya toplam içermemelidir.");
      }
      const emptySummary: ProjectEdgeBandingRollCostSummary = {
        status: "empty", currencyCode: null, requiredLineCount: 0, pricedLineCount: 0,
        missingRollSpecs: [], missingPrices: [], diagnostics: [], lineSources: [], costSummary: null
      };
      return Object.freeze({ status: "empty" as const, summary: deepFreeze(emptySummary), diagnostics: Object.freeze([]) });
    }
    if (status !== "ready") throw new Error("CSV özet durumu yalnızca ready veya empty olabilir.");
    const currencyCode = requireCurrency(cell(first, "currencyCode"), "CSV para birimi");
    if (requiredLineCount < 1 || requiredLineCount > maxRows || pricedLineCount !== requiredLineCount || lineRecords.length !== requiredLineCount) {
      throw new Error("CSV rulo satırları, gerekli ve fiyatlanan satır adetleriyle uyuşmalıdır.");
    }
    const lineSources: NormalizedLineSource[] = [];
    const inputs: ProjectCostLineInput[] = [];
    const declaredLineTotals: number[] = [];
    for (let index = 0; index < lineRecords.length; index += 1) {
      const row = lineRecords[index];
      if (cell(row, "format") !== PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT ||
          cell(row, "formatVersion") !== String(PROJECT_EDGE_BANDING_ROLL_COST_CSV_VERSION) ||
          cell(row, "rowType") !== "line") {
        throw new Error("CSV rulo satırı formatı veya türü desteklenmiyor.");
      }
      requireBlank(row, ["status", "currencyCode", "requiredLineCount", "pricedLineCount", "grandTotalMinor"], "CSV rulo satırı");
      const label = "CSV rulo satırının " + (index + 1) + ". satırı";
      const edgeBandingId = requireIdentifier(cell(row, "edgeBandingId"), label + " katalog kimliği");
      if (index > 0 && compareText(lineSources[index - 1].edgeBandingId, edgeBandingId) >= 0) {
        throw new Error("CSV rulo satırları katalog kimliğine göre sıralı ve benzersiz olmalıdır.");
      }
      const costLineId = requireIdentifier(cell(row, "costLineId"), label + " maliyet satırı kimliği");
      const expectedLineId = "edge-roll-" + String(index + 1).padStart(4, "0");
      if (costLineId !== expectedLineId) throw new Error(label + " maliyet satırı kimliği sıralamayla uyuşmuyor.");
      const description = requireText(cell(row, "description"), label + " açıklaması", 240);
      if (description !== "Kenar bandı rulo satın alımı — " + edgeBandingId) throw new Error(label + " açıklaması katalog kimliğiyle uyuşmuyor.");
      const rollCount = parseIntegerCell(cell(row, "rollCount"), label + " rulo adedi", 1);
      if (cell(row, "unit") !== "rulo") throw new Error(label + " birimi rulo olmalıdır.");
      const rollLengthMm = parseMmCell(cell(row, "rollLengthMm"), label + " rulo uzunluğu", false, maxRollLengthMm);
      const purchasedLengthMm = parseMmCell(cell(row, "purchasedLengthMm"), label + " satın alınan uzunluk", false);
      const expectedPurchased = BigInt(Math.round(rollLengthMm * 10)) * BigInt(rollCount);
      if (expectedPurchased > BigInt(Number.MAX_SAFE_INTEGER) || Number(expectedPurchased) / 10 !== purchasedLengthMm) {
        throw new Error(label + " rulo adedi ve satın alınan uzunluk tutarlı olmalıdır.");
      }
      const unitPriceMinor = parseIntegerCell(cell(row, "unitPriceMinor"), label + " birim fiyatı");
      const lineTotalMinor = parseIntegerCell(cell(row, "lineTotalMinor"), label + " satır tutarı");
      const planSourceReference = cell(row, "planSourceReference") === ""
        ? undefined : requireText(cell(row, "planSourceReference"), label + " plan kaynak referansı", 256);
      const priceSourceReference = cell(row, "priceSourceReference") === ""
        ? undefined : requireText(cell(row, "priceSourceReference"), label + " fiyat kaynak referansı", 256);
      const source: NormalizedLineSource = {
        costLineId, edgeBandingId, rollCount, rollLengthMm, purchasedLengthMm,
        partIds: parseJsonIds(cell(row, "partIds"), label + " Part ID'leri"),
        furnitureIds: parseJsonIds(cell(row, "furnitureIds"), label + " mobilya ID'leri"),
        ...(planSourceReference === undefined ? {} : { planSourceReference }),
        ...(priceSourceReference === undefined ? {} : { priceSourceReference })
      };
      lineSources.push(source);
      inputs.push({
        id: costLineId, category: "material", description, quantity: rollCount, unit: "rulo",
        unitPriceMinor, currencyCode,
        ...(priceSourceReference === undefined ? {} : { sourceReference: priceSourceReference })
      });
      declaredLineTotals.push(lineTotalMinor);
    }
    const costSummary = calculateProjectCostSummary(inputs);
    if (costSummary.status !== "ready" || costSummary.currencyCode !== currencyCode ||
        costSummary.lineCount !== requiredLineCount || costSummary.grandTotalMinor !== grandTotalMinor) {
      throw new Error("CSV maliyet toplamı satırlardan yeniden hesaplanan değerle uyuşmuyor.");
    }
    for (let index = 0; index < costSummary.lines.length; index += 1) {
      if (costSummary.lines[index].lineTotalMinor !== declaredLineTotals[index]) {
        throw new Error("CSV " + (index + 1) + ". satır tutarı yeniden hesaplanan değerle uyuşmuyor.");
      }
    }
    const summary: ProjectEdgeBandingRollCostSummary = {
      status: "ready", currencyCode, requiredLineCount, pricedLineCount,
      missingRollSpecs: [], missingPrices: [], diagnostics: [],
      lineSources, costSummary
    };
    return Object.freeze({ status: "ready" as const, summary: deepFreeze(summary), diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : String(error));
  }
}
