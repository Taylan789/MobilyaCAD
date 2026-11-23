import {
  calculateProjectCostSummary,
  PROJECT_COST_CATEGORIES,
  type ProjectCostLineInput,
  type ProjectCostSummary
} from "./projectCostSummary.ts";
import type { ProjectQuoteLineSource, ProjectQuoteSummary } from "./projectQuoteSummary.ts";

export const PROJECT_QUOTE_SUMMARY_FILE_TYPE = "mobilyacad-project-quote-summary" as const;
export const PROJECT_QUOTE_SUMMARY_FILE_UNITS = Object.freeze({
  currencyAmount: "minor",
  rollLengthMm: "mm",
  purchasedLengthMm: "mm"
} as const);

type ExportableProjectQuoteSummary = ProjectQuoteSummary & { status: "ready" | "empty" };

export interface ProjectQuoteSummaryFile {
  fileType: typeof PROJECT_QUOTE_SUMMARY_FILE_TYPE;
  schemaVersion: 1;
  units: typeof PROJECT_QUOTE_SUMMARY_FILE_UNITS;
  summary: ExportableProjectQuoteSummary;
}

export interface ProjectQuoteSummaryFileSerializationResult {
  status: "ready" | "empty" | "blocked";
  json: string | null;
  diagnostics: readonly string[];
}

export interface ProjectQuoteSummaryFileParseResult {
  status: "ready" | "empty" | "blocked";
  file: ProjectQuoteSummaryFile | null;
  summary: ExportableProjectQuoteSummary | null;
  diagnostics: readonly string[];
}

const envelopeKeys = new Set(["fileType", "schemaVersion", "units", "summary"]);
const unitKeys = new Set(["currencyAmount", "rollLengthMm", "purchasedLengthMm"]);
const summaryKeys = new Set([
  "status", "currencyCode", "requiredLineCount", "pricedLineCount",
  "missingPrices", "missingTariffs", "diagnostics", "lineSources", "costSummary"
]);
const costSummaryKeys = new Set([
  "status", "currencyCode", "lineCount", "lines", "categoryTotalsMinor", "grandTotalMinor"
]);
const costLineKeys = new Set([
  "id", "category", "description", "quantity", "unit", "unitPriceMinor",
  "currencyCode", "sourceReference", "edgeDirection", "lineTotalMinor"
]);
const lineSourceKeys = new Set([
  "costLineId", "sourceType", "sourceId", "tariffId", "sourcePartIds",
  "resourceType", "resourceId", "unit", "edgeDirection", "rollCount",
  "rollLengthMm", "purchasedLengthMm", "furnitureIds", "planSourceReference",
  "priceSourceReference", "hardwareId", "hardwareUnit", "hardwareFurnitureIds",
  "hardwareSourceReferences"
]);
const edgeDirections = ["top", "bottom", "left", "right"] as const;
const identifierPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const currencyPattern = /^[A-Z]{3}$/;
const maxJsonLength = 5_000_000;
const maxLines = 10_000;
const maxPartIds = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
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
  const text = requireText(value, label, 64);
  if (!identifierPattern.test(text)) throw new Error(label + " kimliği geçersiz.");
  return text;
}

function requireCurrency(value: unknown, label: string): string {
  const currency = requireText(value, label, 3);
  if (!currencyPattern.test(currency)) throw new Error(label + " üç büyük harfli ISO benzeri kod olmalıdır.");
  return currency;
}

function requireSafeInteger(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(label + " en az " + minimum + " olan güvenli bir tam sayı olmalıdır.");
  }
  return value;
}

function requireFinite(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(label + " sonlu ve en az " + minimum + " olmalıdır.");
  }
  return value;
}

function compareText(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function validateSortedTextArray(value: unknown, label: string, required: boolean): string[] {
  if (!Array.isArray(value) || value.length > maxPartIds || (required && value.length === 0)) {
    throw new Error(label + " boş olmayan ve " + maxPartIds + " sınırını aşmayan sıralı bir liste olmalıdır.");
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

function roundToTenth(value: number): number {
  return Math.round((value + Number.EPSILON * 10) * 10) / 10;
}

function validateCostSummary(value: unknown, quoteCurrencyCode: string | null): ProjectCostSummary {
  if (!isRecord(value)) throw new Error("Teklif maliyet özeti geçerli bir nesne olmalıdır.");
  requireExactKeys(value, costSummaryKeys, "Teklif maliyet özeti");
  if (value.status !== "ready" && value.status !== "empty") throw new Error("Teklif maliyet özeti durumu desteklenmiyor.");
  const lineCount = requireSafeInteger(value.lineCount, "Teklif satır sayısı");
  if (lineCount > maxLines) throw new Error("Teklif satır sayısı " + maxLines + " sınırını aşıyor.");
  if (!Array.isArray(value.lines) || value.lines.length !== lineCount || value.lines.length > maxLines) {
    throw new Error("Teklif satır listesi satır sayısıyla uyuşmalıdır.");
  }
  const currencyCode = value.currencyCode === null ? null : requireCurrency(value.currencyCode, "Teklif para birimi");
  if (!isRecord(value.categoryTotalsMinor)) throw new Error("Teklif kategori toplamları geçerli bir nesne olmalıdır.");
  requireExactKeys(value.categoryTotalsMinor, new Set<string>(PROJECT_COST_CATEGORIES), "Teklif kategori toplamları");
  const categoryTotalsMinor: Record<string, number> = {};
  for (const category of PROJECT_COST_CATEGORIES) {
    categoryTotalsMinor[category] = requireSafeInteger(value.categoryTotalsMinor[category], category + " kategori toplamı");
  }
  const grandTotalMinor = requireSafeInteger(value.grandTotalMinor, "Teklif genel toplamı");
  const inputs: ProjectCostLineInput[] = [];
  const declaredLineTotals: number[] = [];
  for (const [index, rawLine] of value.lines.entries()) {
    const label = "Teklif satırının " + (index + 1) + ". satırı";
    if (!isRecord(rawLine)) throw new Error(label + " geçerli bir nesne olmalıdır.");
    requireExactKeys(rawLine, costLineKeys, label);
    const input: ProjectCostLineInput = {
      id: requireIdentifier(rawLine.id, label + " kimliği"),
      category: rawLine.category as ProjectCostLineInput["category"],
      description: requireText(rawLine.description, label + " açıklaması", 240),
      quantity: rawLine.quantity as number,
      unit: requireText(rawLine.unit, label + " birimi", 32),
      unitPriceMinor: rawLine.unitPriceMinor as number,
      currencyCode: requireCurrency(rawLine.currencyCode, label + " para birimi"),
      ...(hasOwn(rawLine, "sourceReference") ? { sourceReference: requireText(rawLine.sourceReference, label + " kaynak referansı", 256) } : {}),
      ...(hasOwn(rawLine, "edgeDirection") ? { edgeDirection: rawLine.edgeDirection as ProjectCostLineInput["edgeDirection"] } : {})
    };
    inputs.push(input);
    declaredLineTotals.push(requireSafeInteger(rawLine.lineTotalMinor, label + " tutarı"));
  }

  const calculated = calculateProjectCostSummary(inputs);
  if (calculated.status !== value.status || calculated.lineCount !== lineCount || calculated.currencyCode !== currencyCode) {
    throw new Error("Teklif maliyet özeti durumu, satır sayısı veya para birimi hesaplanan değerlerle uyuşmuyor.");
  }
  if (calculated.currencyCode !== quoteCurrencyCode) throw new Error("Teklif ve maliyet özeti para birimleri uyuşmuyor.");
  if (calculated.grandTotalMinor !== grandTotalMinor) throw new Error("Teklif genel toplamı satırlardan yeniden hesaplanan değerle uyuşmuyor.");
  for (const category of PROJECT_COST_CATEGORIES) {
    if (calculated.categoryTotalsMinor[category] !== categoryTotalsMinor[category]) {
      throw new Error(category + " kategori toplamı satırlardan yeniden hesaplanan değerle uyuşmuyor.");
    }
  }
  for (let index = 0; index < calculated.lines.length; index += 1) {
    if (calculated.lines[index].lineTotalMinor !== declaredLineTotals[index]) {
      throw new Error("Teklif " + (index + 1) + ". satır tutarı yeniden hesaplanan değerle uyuşmuyor.");
    }
  }
  if (value.status === "ready" && (lineCount === 0 || currencyCode === null)) {
    throw new Error("Hazır teklif en az bir fiyatlı satır ve para birimi içermelidir.");
  }
  if (value.status === "empty" && (lineCount !== 0 || currencyCode !== null || grandTotalMinor !== 0)) {
    throw new Error("Boş teklif sıfır satır, para birimi olmayan ve sıfır toplamlı olmalıdır.");
  }
  return calculated;
}

function validateLineSource(
  value: unknown,
  index: number,
  costLine: ProjectCostSummary["lines"][number]
): ProjectQuoteLineSource {
  const label = "Teklif kaynak eşlemesinin " + (index + 1) + ". satırı";
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  requireExactKeys(value, lineSourceKeys, label);
  const costLineId = requireIdentifier(value.costLineId, label + " maliyet satırı kimliği");
  if (costLineId !== costLine.id) throw new Error(label + " maliyet satırı sıralaması/kimliği eşleşmiyor.");
  const sourceType = value.sourceType;
  if (sourceType !== "production-consumption" && sourceType !== "labor-operation" && sourceType !== "quote-adjustment") {
    throw new Error(label + " kaynak türü desteklenmiyor.");
  }
  const sourceId = requireIdentifier(value.sourceId, label + " kaynak kimliği");
  const result: ProjectQuoteLineSource = { costLineId, sourceType, sourceId };
  const sourcePartIds = hasOwn(value, "sourcePartIds")
    ? validateSortedTextArray(value.sourcePartIds, label + " Part kimlikleri", false)
    : undefined;
  if (sourcePartIds !== undefined) result.sourcePartIds = sourcePartIds;

  if (sourceType === "labor-operation") {
    if (costLine.category !== "labor" && costLine.category !== "operation") throw new Error(label + " işçilik/operasyon kategorisiyle uyuşmuyor.");
    result.tariffId = requireIdentifier(value.tariffId, label + " tarife kimliği");
  } else if (hasOwn(value, "tariffId")) {
    throw new Error(label + " tarife kimliği yalnızca işçilik/operasyon kaynaklarında kullanılabilir.");
  }

  const hardwareFieldsPresent = ["hardwareId", "hardwareUnit", "hardwareFurnitureIds", "hardwareSourceReferences"]
    .some(key => hasOwn(value, key));
  if (hardwareFieldsPresent) {
    if (sourceType !== "production-consumption" || costLine.category !== "hardware") {
      throw new Error(label + " donanım BOM kaynak metadata'sı yalnızca üretim tüketimi donanım satırında kullanılabilir.");
    }
    if (!hasOwn(value, "hardwareId") || !hasOwn(value, "hardwareUnit") || !hasOwn(value, "hardwareFurnitureIds")) {
      throw new Error(label + " donanım BOM kaynak metadata'sı kimlik, birim ve mobilya kimliklerini birlikte gerektirir.");
    }
    result.hardwareId = requireIdentifier(value.hardwareId, label + " donanım kimliği");
    result.hardwareUnit = requireText(value.hardwareUnit, label + " donanım birimi", 32);
    result.hardwareFurnitureIds = validateSortedTextArray(value.hardwareFurnitureIds, label + " donanım mobilya kimlikleri", true);
    if (hasOwn(value, "hardwareSourceReferences")) {
      result.hardwareSourceReferences = validateSortedTextArray(value.hardwareSourceReferences, label + " donanım BOM kaynak referansları", false);
    }
  }

  const resourceFieldsPresent = ["resourceType", "resourceId", "unit", "edgeDirection"].some(key => hasOwn(value, key));
  const rollFieldsPresent = ["rollCount", "rollLengthMm", "purchasedLengthMm", "furnitureIds", "planSourceReference", "priceSourceReference"].some(key => hasOwn(value, key));
  if (hasOwn(value, "resourceType")) {
    if (sourceType !== "production-consumption" || costLine.category !== "material") {
      throw new Error(label + " kaynak malzeme türü desteklenmiyor.");
    }
    if (value.resourceType !== "material" && value.resourceType !== "edge-banding") {
      throw new Error(label + " kaynak malzeme türü desteklenmiyor.");
    }
    result.resourceType = value.resourceType;
    result.resourceId = requireIdentifier(value.resourceId, label + " malzeme kimliği");
    const unit = requireText(value.unit, label + " kaynak birimi", 32);
    result.unit = unit;
    if (value.resourceType === "material") {
      if (unit !== "m2" || costLine.unit !== "m2" || hasOwn(value, "edgeDirection") || rollFieldsPresent) {
        throw new Error(label + " panel malzeme kaynağı m2 birimiyle, yön ve rulo metadata olmadan eşleşmelidir.");
      }
      if (sourcePartIds === undefined || sourcePartIds.length === 0) {
        throw new Error(label + " panel malzeme kaynak Part kimlikleriyle eşleşmelidir.");
      }
    } else {
      if (hasOwn(value, "edgeDirection")) {
        if (!(edgeDirections as readonly unknown[]).includes(value.edgeDirection)) throw new Error(label + " kenar yönü geçersiz.");
        if (unit === "rulo") throw new Error(label + " rulo satın alımında kenar yönü kullanılmaz.");
        result.edgeDirection = value.edgeDirection as ProjectQuoteLineSource["edgeDirection"];
      }
      if (unit === "rulo") {
        const rollCount = requireSafeInteger(value.rollCount, label + " rulo adedi", 1);
        const rollLengthMm = requireFinite(value.rollLengthMm, label + " rulo uzunluğu (mm)", 0);
        const purchasedLengthMm = requireFinite(value.purchasedLengthMm, label + " satın alınan uzunluk (mm)", 0);
        if (rollLengthMm === 0 || purchasedLengthMm === 0) throw new Error(label + " rulo uzunlukları sıfırdan büyük olmalıdır.");
        if (Math.abs(rollLengthMm * 10 - Math.round(rollLengthMm * 10)) > 1e-8 || Math.abs(purchasedLengthMm * 10 - Math.round(purchasedLengthMm * 10)) > 1e-8) {
          throw new Error(label + " rulo uzunlukları 0,1 mm hassasiyetinde olmalıdır.");
        }
        if (!Number.isSafeInteger(costLine.quantity) || costLine.quantity !== rollCount) throw new Error(label + " rulo adedi teklif satır miktarıyla uyuşmalıdır.");
        const expectedPurchasedLengthMm = roundToTenth(rollCount * rollLengthMm);
        if (!Number.isFinite(expectedPurchasedLengthMm) || expectedPurchasedLengthMm > Number.MAX_SAFE_INTEGER || Math.abs(purchasedLengthMm - expectedPurchasedLengthMm) > 1e-8) {
          throw new Error(label + " satın alınan uzunluk rulo adedi ve uzunluğuyla uyuşmuyor.");
        }
        if (sourcePartIds === undefined || sourcePartIds.length === 0) throw new Error(label + " rulo kaynağı Part kimlikleri içermelidir.");
        result.rollCount = rollCount;
        result.rollLengthMm = rollLengthMm;
        result.purchasedLengthMm = purchasedLengthMm;
        result.furnitureIds = validateSortedTextArray(value.furnitureIds, label + " mobilya kimlikleri", true);
        if (hasOwn(value, "planSourceReference")) result.planSourceReference = requireText(value.planSourceReference, label + " plan kaynak referansı", 256);
        if (hasOwn(value, "priceSourceReference")) result.priceSourceReference = requireText(value.priceSourceReference, label + " fiyat kaynak referansı", 256);
      } else {
        if (unit !== "mm" && unit !== "m") throw new Error(label + " kenar bandı tüketim birimi mm veya m olmalıdır.");
        if (rollFieldsPresent) throw new Error(label + " rulo metadata'sı yalnızca rulo biriminde kullanılmalıdır.");
      }
    }
  } else if (resourceFieldsPresent || rollFieldsPresent) {
    throw new Error(label + " kaynak birim/metadata alanları kaynak türüyle birlikte kullanılmalıdır.");
  }

  if (sourceType === "production-consumption") {
    if (costLine.category !== "material" && costLine.category !== "hardware") throw new Error(label + " üretim tüketim kategorisiyle uyuşmuyor.");
  } else if (sourceType === "quote-adjustment") {
    if (costLine.category !== "waste" && costLine.category !== "profit") throw new Error(label + " fire/kâr kategorisiyle uyuşmuyor.");
    if (costLine.sourceReference === undefined) throw new Error(label + " fire/kâr satırının kaynak referansı eksik.");
    if (sourcePartIds !== undefined || resourceFieldsPresent || rollFieldsPresent) throw new Error(label + " fire/kâr kaynağı üretim metadata'sı içeremez.");
  }
  return result;
}

function validateQuoteSummary(value: unknown): ExportableProjectQuoteSummary {
  if (!isRecord(value)) throw new Error("Teklif özeti geçerli bir nesne olmalıdır.");
  requireExactKeys(value, summaryKeys, "Teklif özeti");
  if (value.status !== "ready" && value.status !== "empty") throw new Error("Yalnızca tamamlanmış veya boş teklif özeti dışa aktarılabilir.");
  const requiredLineCount = requireSafeInteger(value.requiredLineCount, "Gerekli teklif satır sayısı");
  const pricedLineCount = requireSafeInteger(value.pricedLineCount, "Fiyatlı teklif satır sayısı");
  if (requiredLineCount > maxLines || pricedLineCount > maxLines) throw new Error("Teklif satır sayısı " + maxLines + " sınırını aşıyor.");
  if (!Array.isArray(value.missingPrices) || value.missingPrices.length !== 0) throw new Error("Tam teklif dışa aktarımı eksik malzeme fiyatı içeremez.");
  if (!Array.isArray(value.missingTariffs) || value.missingTariffs.length !== 0) throw new Error("Tam teklif dışa aktarımı eksik tarife içeremez.");
  if (!Array.isArray(value.diagnostics) || value.diagnostics.length !== 0) throw new Error("Tam teklif dışa aktarımı tanı/uyarı içermemelidir.");
  if (!Array.isArray(value.lineSources) || value.lineSources.length > maxLines) throw new Error("Teklif kaynak eşlemesi geçerli ve sınır içinde bir liste olmalıdır.");
  const currencyCode = value.currencyCode === null ? null : requireCurrency(value.currencyCode, "Teklif para birimi");
  if (value.status === "empty") {
    if (requiredLineCount !== 0 || pricedLineCount !== 0 || currencyCode !== null || value.costSummary !== null || value.lineSources.length !== 0) {
      throw new Error("Boş teklif özeti sıfır satır, para birimi olmayan ve kaynak eşlemesi olmayan bir kayıt olmalıdır.");
    }
    return {
      status: "empty",
      currencyCode: null,
      requiredLineCount: 0,
      pricedLineCount: 0,
      missingPrices: [],
      missingTariffs: [],
      diagnostics: [],
      lineSources: [],
      costSummary: null
    };
  }
  if (currencyCode === null || requiredLineCount !== pricedLineCount || requiredLineCount === 0) {
    throw new Error("Hazır teklif tüm satırları fiyatlandırılmış, sıfırdan büyük ve tek para birimli olmalıdır.");
  }
  const costSummary = validateCostSummary(value.costSummary, currencyCode);
  if (costSummary.status !== "ready" || costSummary.lineCount !== requiredLineCount || value.lineSources.length !== costSummary.lines.length) {
    throw new Error("Hazır teklif kaynak eşlemesi ve maliyet satırları tam olmalıdır.");
  }
  const lineSources = value.lineSources.map((source, index) => validateLineSource(source, index, costSummary.lines[index]));
  return {
    status: "ready",
    currencyCode,
    requiredLineCount,
    pricedLineCount,
    missingPrices: [],
    missingTariffs: [],
    diagnostics: [],
    lineSources,
    costSummary
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function blockedSerialization(message: string): ProjectQuoteSummaryFileSerializationResult {
  return Object.freeze({ status: "blocked" as const, json: null, diagnostics: Object.freeze([message]) });
}

function blockedParse(message: string): ProjectQuoteSummaryFileParseResult {
  return Object.freeze({ status: "blocked" as const, file: null, summary: null, diagnostics: Object.freeze([message]) });
}

/** Exports only a complete, recomputable quote; incomplete/blocked totals never produce JSON. */
export function serializeProjectQuoteSummaryFile(value: unknown): ProjectQuoteSummaryFileSerializationResult {
  try {
    const summary = validateQuoteSummary(value);
    const file: ProjectQuoteSummaryFile = {
      fileType: PROJECT_QUOTE_SUMMARY_FILE_TYPE,
      schemaVersion: 1,
      units: PROJECT_QUOTE_SUMMARY_FILE_UNITS,
      summary
    };
    const json = JSON.stringify(file);
    if (json.length > maxJsonLength) throw new Error("Teklif JSON dosyası 5 MB sınırını aşıyor.");
    return Object.freeze({ status: summary.status, json, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization(error instanceof Error ? error.message : String(error));
  }
}

/** Parses strict quote-summary JSON v1 and recomputes every monetary total before returning data. */
export function parseProjectQuoteSummaryFile(jsonValue: unknown): ProjectQuoteSummaryFileParseResult {
  if (typeof jsonValue !== "string") return blockedParse("Teklif dosyası JSON metni olmalıdır.");
  if (jsonValue.length > maxJsonLength) return blockedParse("Teklif JSON dosyası 5 MB sınırını aşıyor.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue) as unknown;
  } catch {
    return blockedParse("Teklif dosyası geçerli JSON içermiyor.");
  }
  if (!isRecord(parsed)) return blockedParse("Teklif dosya zarfı geçerli bir nesne olmalıdır.");
  try {
    requireExactKeys(parsed, envelopeKeys, "Teklif dosyası");
    if (parsed.fileType !== PROJECT_QUOTE_SUMMARY_FILE_TYPE) throw new Error("Dosya türü MobilyaCAD proje teklif özeti değildir.");
    if (parsed.schemaVersion !== 1) throw new Error("Desteklenmeyen proje teklif JSON sürümü.");
    if (!isRecord(parsed.units)) throw new Error("Teklif JSON birim zarfı geçerli değildir.");
    requireExactKeys(parsed.units, unitKeys, "Teklif JSON birimleri");
    if (
      parsed.units.currencyAmount !== PROJECT_QUOTE_SUMMARY_FILE_UNITS.currencyAmount ||
      parsed.units.rollLengthMm !== PROJECT_QUOTE_SUMMARY_FILE_UNITS.rollLengthMm ||
      parsed.units.purchasedLengthMm !== PROJECT_QUOTE_SUMMARY_FILE_UNITS.purchasedLengthMm
    ) throw new Error("Teklif JSON birimleri desteklenen v1 sözleşmesiyle uyuşmuyor.");
    const summary = validateQuoteSummary(parsed.summary);
    const file = deepFreeze({
      fileType: PROJECT_QUOTE_SUMMARY_FILE_TYPE,
      schemaVersion: 1 as const,
      units: PROJECT_QUOTE_SUMMARY_FILE_UNITS,
      summary
    });
    return Object.freeze({ status: summary.status, file, summary, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : String(error));
  }
}
