import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";
import {
  calculateProjectQuoteSummary,
  type ProjectQuoteEdgeBandingRollOptions,
  type ProjectQuoteSummary
} from "./projectQuoteSummary.ts";
import {
  PROJECT_COST_CATEGORIES,
  type ProjectCostCategoryTotals
} from "./projectCostSummary.ts";

export type ProjectMaterialCostBasis = "net-consumption" | "stock-sheet-purchase";

export interface ProjectMaterialCostBasisSummary {
  schemaVersion: 1;
  basis: ProjectMaterialCostBasis | null;
  status: "empty" | "ready" | "incomplete" | "blocked";
  currencyCode: string | null;
  materialCostMinor: number | null;
  /** Material cost lines for net consumption; nesting groups for stock-sheet purchase. */
  sourceCount: number;
  diagnostics: readonly string[];
}

const materialCostCategories = ["material", "hardware", "labor", "operation", "waste", "profit"] as const;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + " negatif olmayan güvenli bir tam sayı olmalıdır.");
  }
  return value;
}

function safeMinor(value: unknown, label: string): number {
  return safeCount(value, label);
}

function currency(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value)) {
    throw new Error(label + " üç büyük harfli para birimi kodu olmalıdır.");
  }
  return value;
}

function diagnostics(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(label + " metin tanı listesi olmalıdır.");
  }
  return value.slice();
}

function createSummary(
  basis: ProjectMaterialCostBasis | null,
  status: ProjectMaterialCostBasisSummary["status"],
  currencyCode: string | null,
  materialCostMinor: number | null,
  sourceCount: number,
  messages: string[]
): ProjectMaterialCostBasisSummary {
  return Object.freeze({
    schemaVersion: 1,
    basis,
    status,
    currencyCode,
    materialCostMinor,
    sourceCount,
    diagnostics: Object.freeze(messages.slice())
  });
}

function blocked(basis: ProjectMaterialCostBasis | null, message: string): ProjectMaterialCostBasisSummary {
  return createSummary(basis, "blocked", null, null, 0, [message]);
}

function empty(basis: ProjectMaterialCostBasis): ProjectMaterialCostBasisSummary {
  return createSummary(basis, "empty", null, 0, 0, []);
}

function incomplete(basis: ProjectMaterialCostBasis, messages: string[], sourceCount = 0): ProjectMaterialCostBasisSummary {
  return createSummary(basis, "incomplete", null, null, sourceCount, messages);
}

function readyNetConsumption(report: RecordValue): ProjectMaterialCostBasisSummary {
  const required = safeCount(report.requiredLineCount, "Teklif gerekli satır sayısı");
  const priced = safeCount(report.pricedLineCount, "Teklif fiyatlı satır sayısı");
  const missing = diagnostics(report.missingPrices, "Teklif eksik fiyat listesi");
  const messages = diagnostics(report.diagnostics, "Teklif tanı listesi");
  if (required !== priced || missing.length !== 0) {
    return incomplete("net-consumption", messages.length ? messages : ["Net tüketim için tüm gerekli fiyatlar tamamlanmalıdır."], required);
  }
  if (!isRecord(report.costSummary)) throw new Error("Hazır net tüketim raporunda maliyet özeti bulunmalıdır.");
  const summary = report.costSummary;
  if (summary.status !== "ready" || !Array.isArray(summary.lines) || summary.lines.length !== priced) {
    throw new Error("Net tüketim maliyet özeti hazır ve satır sayısıyla tutarlı olmalıdır.");
  }
  const reportCurrency = currency(report.currencyCode, "Net tüketim raporu");
  const summaryCurrency = currency(summary.currencyCode, "Net tüketim maliyet özeti");
  if (reportCurrency !== summaryCurrency) throw new Error("Net tüketim raporu ile maliyet özeti para birimleri eşleşmiyor.");
  const categoryTotals = isRecord(summary.categoryTotalsMinor) ? summary.categoryTotalsMinor : null;
  if (categoryTotals === null) throw new Error("Net tüketim kategori toplamları bulunmalıdır.");

  const calculated: Record<string, bigint> = Object.fromEntries(materialCostCategories.map(category => [category, 0n]));
  let lineGrandTotal = 0n;
  const materialLineIds = new Set<string>();
  for (const [index, line] of summary.lines.entries()) {
    if (!isRecord(line) || typeof line.id !== "string" || line.id.trim() === "" ||
        typeof line.category !== "string" || !materialCostCategories.includes(line.category as typeof materialCostCategories[number])) {
      throw new Error("Net tüketim maliyetinin " + (index + 1) + ". satır kimliği veya kategorisi geçersiz.");
    }
    const amount = safeMinor(line.lineTotalMinor, "Net tüketim satır tutarı");
    calculated[line.category] += BigInt(amount);
    lineGrandTotal += BigInt(amount);
    if (line.category === "material") materialLineIds.add(line.id);
  }

  if (!Array.isArray(report.linePartSources)) {
    throw new Error("Net tüketim Part kaynak eşlemesi bulunmalıdır; panel malzemesi kenar bandından ayrı doğrulanmalıdır.");
  }
  const sourceByCostLineId = new Map<string, RecordValue>();
  for (const [index, rawSource] of report.linePartSources.entries()) {
    if (!isRecord(rawSource) || typeof rawSource.costLineId !== "string" || rawSource.costLineId.trim() === "" ||
        (rawSource.resourceType !== "material" && rawSource.resourceType !== "edge-banding") ||
        typeof rawSource.resourceId !== "string" || rawSource.resourceId.trim() === "" ||
        typeof rawSource.unit !== "string" || rawSource.unit.trim() === "" ||
        !Array.isArray(rawSource.sourcePartIds) || rawSource.sourcePartIds.length === 0 ||
        rawSource.sourcePartIds.some(id => typeof id !== "string" || id.trim() === "") ||
        new Set(rawSource.sourcePartIds).size !== rawSource.sourcePartIds.length) {
      throw new Error("Net tüketim Part kaynak eşlemesinin " + (index + 1) + ". satırı geçersiz.");
    }
    if (!materialLineIds.has(rawSource.costLineId) || sourceByCostLineId.has(rawSource.costLineId)) {
      throw new Error("Net tüketim Part kaynak eşlemesi maliyet satırlarıyla bire bir eşleşmelidir.");
    }
    sourceByCostLineId.set(rawSource.costLineId, rawSource);
  }
  if (sourceByCostLineId.size !== materialLineIds.size) {
    throw new Error("Net tüketimde her material satırı için tek bir Part kaynak eşlemesi zorunludur.");
  }

  let materialCost = 0n;
  let materialLineCount = 0;
  for (const line of summary.lines) {
    if (line.category !== "material") continue;
    const source = sourceByCostLineId.get(line.id as string);
    if (source?.resourceType === "material") {
      materialLineCount += 1;
      materialCost += BigInt(line.lineTotalMinor as number);
    }
  }

  let categoryGrandTotal = 0n;
  for (const category of materialCostCategories) {
    const amount = safeMinor(categoryTotals[category], category + " kategori toplamı");
    if (calculated[category] !== BigInt(amount)) throw new Error(category + " kategori toplamı satırlarla eşleşmiyor.");
    categoryGrandTotal += BigInt(amount);
  }
  const grandTotal = safeMinor(summary.grandTotalMinor, "Net tüketim genel toplamı");
  if (lineGrandTotal !== BigInt(grandTotal) || categoryGrandTotal !== BigInt(grandTotal)) {
    throw new Error("Net tüketim genel toplamı satır ve kategori toplamlarıyla eşleşmiyor.");
  }
  if (materialCost > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Net tüketim panel malzeme maliyeti güvenli tam sayı aralığını aşıyor.");
  return createSummary("net-consumption", "ready", reportCurrency, Number(materialCost), materialLineCount, messages);
}

function readyStockSheetPurchase(report: RecordValue): ProjectMaterialCostBasisSummary {
  if (report.schemaVersion !== 1 || !isRecord(report.result)) {
    throw new Error("Levha satın alma raporu şema v1 sonuç nesnesi içermelidir.");
  }
  const result = report.result;
  if (result.schemaVersion !== 1 || !Array.isArray(result.groups)) {
    throw new Error("Levha satın alma özeti şema v1 grupları içermelidir.");
  }
  const groupCount = safeCount(result.groupCount, "Levha satın alma grup sayısı");
  if (groupCount === 0 || groupCount !== result.groups.length) {
    throw new Error("Hazır levha satın alma grup sayısı boş veya tutarsız.");
  }
  const resultCurrency = currency(result.currencyCode, "Levha satın alma özeti");
  const totals = isRecord(result.totals) ? result.totals : null;
  if (totals === null) {
    throw new Error("Levha satın alma toplamları bulunmalıdır.");
  }
  const expectedSheets = safeCount(totals.sheetCount, "Levha satın alma adedi");
  const expectedCost = safeMinor(totals.stockSheetPurchaseCostMinor, "Levha satın alma maliyeti");
  let sheetCount = 0;
  let purchaseCost = 0n;
  const seenGroupIds = new Set<string>();
  for (const [index, rawGroup] of result.groups.entries()) {
    if (!isRecord(rawGroup)) {
      throw new Error("Levha satın alma " + (index + 1) + ". grubu geçersiz.");
    }
    const groupId = rawGroup.groupId;
    if (typeof groupId !== "string" || groupId.trim() === "" || seenGroupIds.has(groupId)) {
      throw new Error("Levha satın alma grup kimliği eksik veya yineleniyor.");
    }
    seenGroupIds.add(groupId);
    if (currency(rawGroup.currencyCode, groupId + " grubu") !== resultCurrency) {
      throw new Error(groupId + " grubu para birimi proje özetiyle eşleşmiyor.");
    }
    if (typeof rawGroup.thicknessMm !== "number" || !Number.isFinite(rawGroup.thicknessMm) || rawGroup.thicknessMm <= 0) {
      throw new Error(groupId + " kalınlığı pozitif ve sonlu mm olmalıdır.");
    }
    const count = safeCount(rawGroup.sheetCount, groupId + " levha adedi");
    if (count === 0) throw new Error(groupId + " levha adedi sıfır olamaz.");
    const unitPrice = safeMinor(rawGroup.pricePerSheetMinor, groupId + " levha birim fiyatı");
    const groupCost = safeMinor(rawGroup.stockSheetCostMinor, groupId + " satın alma maliyeti");
    if (BigInt(count) * BigInt(unitPrice) !== BigInt(groupCost)) {
      throw new Error(groupId + " satın alma maliyeti levha adedi × birim fiyatla eşleşmiyor.");
    }
    if (!Array.isArray(rawGroup.sourcePartIds) || rawGroup.sourcePartIds.length === 0 ||
        rawGroup.sourcePartIds.some(id => typeof id !== "string" || id.trim() === "") ||
        new Set(rawGroup.sourcePartIds).size !== rawGroup.sourcePartIds.length) {
      throw new Error(groupId + " kaynak Part kimlikleri eksik veya yineleniyor.");
    }
    sheetCount += count;
    purchaseCost += BigInt(groupCost);
    if (!Number.isSafeInteger(sheetCount)) throw new Error("Toplam levha adedi güvenli tam sayı aralığını aşıyor.");
  }
  if (sheetCount !== expectedSheets || purchaseCost !== BigInt(expectedCost)) {
    throw new Error("Levha satın alma toplamları grup kayıtlarıyla eşleşmiyor.");
  }
  const messages = diagnostics(report.diagnostics, "Levha satın alma tanı listesi");
  return createSummary("stock-sheet-purchase", "ready", resultCurrency, expectedCost, groupCount, messages);
}

/**
 * Selects exactly one material-cost source. Net-area consumption and whole-sheet
 * purchase cost are alternatives; the helper never combines them.
 */
export function calculateProjectMaterialCostBasisSummary(value: unknown): ProjectMaterialCostBasisSummary {
  let basis: ProjectMaterialCostBasis | null = null;
  try {
    if (!isRecord(value)) throw new Error("Malzeme maliyet temeli isteği geçerli bir nesne olmalıdır.");
    const extra = Object.keys(value).find(key => !["schemaVersion", "basis", "sourceReport"].includes(key));
    if (extra !== undefined) throw new Error("Malzeme maliyet temeli isteği desteklenmeyen alan içeriyor: " + extra + ".");
    if (value.schemaVersion !== 1) throw new Error("Desteklenmeyen malzeme maliyet temeli şema sürümü.");
    if (value.basis !== "net-consumption" && value.basis !== "stock-sheet-purchase") {
      throw new Error("Malzeme maliyet temeli net-consumption veya stock-sheet-purchase olmalıdır.");
    }
    basis = value.basis;
    if (!isRecord(value.sourceReport)) throw new Error("Seçilen malzeme maliyet raporu geçerli bir nesne olmalıdır.");
    const report = value.sourceReport;
    if (basis === "net-consumption") {
      if (report.status === "empty") {
        if (report.currencyCode !== null) throw new Error("Boş net tüketim raporunda para birimi bulunmamalıdır.");
        const required = safeCount(report.requiredLineCount, "Boş net tüketim gerekli satır sayısı");
        const priced = safeCount(report.pricedLineCount, "Boş net tüketim fiyatlı satır sayısı");
        if (required !== 0 || priced !== 0) throw new Error("Boş net tüketim raporunda satır bulunmamalıdır.");
        diagnostics(report.missingPrices, "Boş net tüketim eksik fiyat listesi");
        diagnostics(report.diagnostics, "Boş net tüketim tanı listesi");
        return empty(basis);
      }
      if (report.status === "blocked") {
        return blocked(basis, diagnostics(report.diagnostics, "Net tüketim tanı listesi").join(" ") || "Net tüketim raporu engellendi.");
      }
      if (report.status === "incomplete") {
        const required = safeCount(report.requiredLineCount, "Eksik net tüketim gerekli satır sayısı");
        safeCount(report.pricedLineCount, "Eksik net tüketim fiyatlı satır sayısı");
        if (!Array.isArray(report.missingPrices)) throw new Error("Eksik net tüketim fiyat listesi geçerli bir liste olmalıdır.");
        const messages = diagnostics(report.diagnostics, "Eksik net tüketim tanı listesi");
        return incomplete(basis, messages.length ? messages : report.missingPrices.length ? ["Net tüketim fiyatları tamamlanmamıştır."] : [], required);
      }
      if (report.status !== "ready") throw new Error("Net tüketim raporu durumu desteklenmiyor.");
      return readyNetConsumption(report);
    }

    if (report.status === "blocked") {
      return blocked(basis, diagnostics(report.diagnostics, "Levha satın alma tanı listesi").join(" ") || "Levha satın alma raporu engellendi.");
    }
    if (report.status === "empty") {
      if (report.schemaVersion !== 1 || !isRecord(report.result) || report.result.schemaVersion !== 1 ||
          report.result.groupCount !== 0 || !Array.isArray(report.result.groups) || report.result.groups.length !== 0 ||
          !isRecord(report.result.totals) || report.result.totals.sheetCount !== 0 ||
          report.result.totals.stockSheetPurchaseCostMinor !== 0 || report.result.currencyCode !== null) {
        throw new Error("Boş levha satın alma raporu sıfır grup ve sıfır toplamla tutarlı olmalıdır.");
      }
      diagnostics(report.diagnostics, "Boş levha satın alma tanı listesi");
      return empty(basis);
    }
    if (report.status === "incomplete") {
      return incomplete(basis, diagnostics(report.diagnostics, "Eksik levha satın alma tanı listesi"));
    }
    if (report.status !== "ready") throw new Error("Levha satın alma raporu durumu desteklenmiyor.");
    return readyStockSheetPurchase(report);
  } catch (error) {
    return blocked(basis, error instanceof Error ? error.message : String(error));
  }
}


export interface ProjectQuoteMaterialCostBasisSummary {
  schemaVersion: 1;
  status: "empty" | "incomplete" | "ready" | "blocked";
  basis: ProjectMaterialCostBasis | null;
  currencyCode: string | null;
  /** Selected panel-material cost: net area or explicit whole-sheet purchase. */
  panelMaterialCostMinor: number | null;
  /** Edge-band cost remains independent from the selected panel-material basis. */
  edgeBandingCostMinor: number | null;
  materialCategoryTotalMinor: number | null;
  categoryTotalsMinor: ProjectCostCategoryTotals | null;
  grandTotalMinor: number | null;
  /** Net mode: panel material lines. Stock mode: nesting material/thickness groups. */
  materialSourceCount: number;
  /** Base line-level quote; stock-sheet panel cost is added only by this wrapper. */
  quoteSummary: ProjectQuoteSummary | null;
  diagnostics: readonly string[];
}

type QuoteRecord = Record<string, unknown>;
const quoteBasisInputKeys = new Set([
  "schemaVersion", "basis", "productionReport", "consumptionPriceTable",
  "workItems", "tariffTable", "stockSheetPurchaseReport", "quoteAdjustments",
  "edgeBandingPricingMode", "edgeBandingRollSpecs", "edgeBandingRollPriceTable"
]);

function isQuoteRecord(value: unknown): value is QuoteRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function quoteDiagnostic(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function quoteSafeMinor(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + " negatif olmayan güvenli bir tam sayı olmalıdır.");
  }
  return value;
}
function quoteSafeAdd(left: number, right: number, label: string): number {
  const total = BigInt(left) + BigInt(right);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(label + " güvenli tam sayı aralığını aşıyor.");
  return Number(total);
}
function zeroQuoteCategoryTotals(): ProjectCostCategoryTotals {
  return Object.fromEntries(PROJECT_COST_CATEGORIES.map(category => [category, 0])) as ProjectCostCategoryTotals;
}
function freezeQuoteResult<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as unknown as Record<string, unknown>)) freezeQuoteResult(child);
    Object.freeze(value);
  }
  return value;
}
function createQuoteBasisResult(
  status: ProjectQuoteMaterialCostBasisSummary["status"],
  basis: ProjectMaterialCostBasis | null,
  currencyCode: string | null,
  panelMaterialCostMinor: number | null,
  edgeBandingCostMinor: number | null,
  materialCategoryTotalMinor: number | null,
  categoryTotalsMinor: ProjectCostCategoryTotals | null,
  grandTotalMinor: number | null,
  materialSourceCount: number,
  quoteSummary: ProjectQuoteSummary | null,
  messages: string[]
): ProjectQuoteMaterialCostBasisSummary {
  return freezeQuoteResult({
    schemaVersion: 1 as const, status, basis, currencyCode,
    panelMaterialCostMinor, edgeBandingCostMinor, materialCategoryTotalMinor,
    categoryTotalsMinor, grandTotalMinor, materialSourceCount,
    quoteSummary, diagnostics: messages.slice()
  });
}
function blockedQuoteBasis(
  basis: ProjectMaterialCostBasis | null,
  message: string,
  quoteSummary: ProjectQuoteSummary | null = null,
  sourceCount = 0
): ProjectQuoteMaterialCostBasisSummary {
  return createQuoteBasisResult("blocked", basis, null, null, null, null, null, null, sourceCount, quoteSummary, [message]);
}

function summarizeQuoteMaterialLines(quote: ProjectQuoteSummary): {
  categoryTotalsMinor: ProjectCostCategoryTotals;
  panelMaterialCostMinor: number;
  edgeBandingCostMinor: number;
  panelLineCount: number;
} {
  if (quote.status === "empty") {
    if (quote.costSummary !== null || quote.lineSources.length !== 0) throw new Error("Boş teklif maliyet veya kaynak satırı içeremez.");
    return { categoryTotalsMinor: zeroQuoteCategoryTotals(), panelMaterialCostMinor: 0, edgeBandingCostMinor: 0, panelLineCount: 0 };
  }
  if (quote.status !== "ready" || quote.costSummary === null) throw new Error("Teklif malzeme maliyetleri yalnızca ready veya empty durumda birleştirilebilir.");
  const summary = quote.costSummary;
  if (summary.status !== "ready" || !Array.isArray(summary.lines) ||
      summary.lineCount !== summary.lines.length || quote.lineSources.length !== summary.lineCount ||
      quote.currencyCode !== summary.currencyCode) {
    throw new Error("Teklif maliyet satırları, kaynak eşlemesi ve para birimi tutarlı olmalıdır.");
  }

  const lineById = new Map<string, QuoteRecord>();
  const calculated = Object.fromEntries(PROJECT_COST_CATEGORIES.map(category => [category, 0n])) as Record<string, bigint>;
  for (const [index, rawLine] of summary.lines.entries()) {
    if (!isQuoteRecord(rawLine) || typeof rawLine.id !== "string" || rawLine.id.trim() === "" ||
        typeof rawLine.category !== "string" || !(PROJECT_COST_CATEGORIES as readonly string[]).includes(rawLine.category)) {
      throw new Error("Teklif maliyetinin " + (index + 1) + ". satır kimliği veya kategorisi geçersiz.");
    }
    if (lineById.has(rawLine.id)) throw new Error("Teklif maliyet satırı kimliği yineleniyor: " + rawLine.id + ".");
    lineById.set(rawLine.id, rawLine);
    calculated[rawLine.category] += BigInt(quoteSafeMinor(rawLine.lineTotalMinor, "Teklif satır tutarı"));
  }

  const sourceIds = new Set<string>();
  let panelCost = 0n;
  let edgeCost = 0n;
  let panelLineCount = 0;
  for (const [index, rawSource] of quote.lineSources.entries()) {
    if (!isQuoteRecord(rawSource) || typeof rawSource.costLineId !== "string" ||
        rawSource.costLineId.trim() === "" || sourceIds.has(rawSource.costLineId)) {
      throw new Error("Teklif kaynak eşlemesinin " + (index + 1) + ". satırı eksik veya yinelenen kimlik içeriyor.");
    }
    sourceIds.add(rawSource.costLineId);
    const line = lineById.get(rawSource.costLineId);
    if (!line) throw new Error("Teklif kaynak eşlemesi maliyet satırında bulunamadı: " + rawSource.costLineId + ".");
    if (rawSource.resourceType === "material") {
      if (line.category !== "material") throw new Error("Panel malzeme kaynağı material maliyet kategorisinde olmalıdır.");
      panelCost += BigInt(quoteSafeMinor(line.lineTotalMinor, "Panel malzeme satır tutarı"));
      panelLineCount += 1;
    } else if (rawSource.resourceType === "edge-banding") {
      if (line.category !== "material") throw new Error("Kenar bandı kaynağı material maliyet kategorisinde olmalıdır.");
      edgeCost += BigInt(quoteSafeMinor(line.lineTotalMinor, "Kenar bandı satır tutarı"));
    } else if (line.category === "material") {
      throw new Error("Her material teklif satırı panel malzemesi veya kenar bandı kaynağıyla eşleşmelidir.");
    } else if (rawSource.resourceType !== undefined) {
      throw new Error("Material dışı teklif satırı resourceType taşıyamaz.");
    }
  }
  if (sourceIds.size !== lineById.size) throw new Error("Teklif maliyet satırları kaynak eşlemesiyle bire bir eşleşmelidir.");

  const categoryTotalsMinor = zeroQuoteCategoryTotals();
  let categoryGrandTotal = 0n;
  for (const category of PROJECT_COST_CATEGORIES) {
    const amount = quoteSafeMinor(summary.categoryTotalsMinor[category], category + " teklif kategori toplamı");
    if (calculated[category] !== BigInt(amount)) throw new Error(category + " teklif kategori toplamı satırlarla eşleşmiyor.");
    categoryTotalsMinor[category] = amount;
    categoryGrandTotal += BigInt(amount);
  }
  const grandTotal = quoteSafeMinor(summary.grandTotalMinor, "Teklif genel toplamı");
  if (categoryGrandTotal !== BigInt(grandTotal)) throw new Error("Teklif genel toplamı kategori toplamlarıyla eşleşmiyor.");
  if (panelCost > BigInt(Number.MAX_SAFE_INTEGER) || edgeCost > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Teklif malzeme alt toplamı güvenli tam sayı aralığını aşıyor.");
  }
  return { categoryTotalsMinor, panelMaterialCostMinor: Number(panelCost), edgeBandingCostMinor: Number(edgeCost), panelLineCount };
}

function validateStockSheetPartCoverage(productionReport: unknown, stockReport: unknown): void {
  if (!isQuoteRecord(productionReport) || !isQuoteRecord(productionReport.result) ||
      !Array.isArray(productionReport.result.parts) || !isQuoteRecord(stockReport) ||
      !isQuoteRecord(stockReport.result) || !Array.isArray(stockReport.result.groups)) {
    throw new Error("Levha satın alma raporu doğrulanmış proje Part snapshot'ıyla karşılaştırılamadı.");
  }
  const partsById = new Map<string, QuoteRecord>();
  for (const [index, rawPart] of productionReport.result.parts.entries()) {
    if (!isQuoteRecord(rawPart) || typeof rawPart.id !== "string" || rawPart.id.trim() === "" ||
        typeof rawPart.materialId !== "string" || rawPart.materialId.trim() === "" ||
        typeof rawPart.thickness !== "number" || !Number.isFinite(rawPart.thickness) || rawPart.thickness <= 0 ||
        partsById.has(rawPart.id)) {
      throw new Error("Proje Part snapshot'ının " + (index + 1) + ". satırı levha maliyeti için geçersiz.");
    }
    partsById.set(rawPart.id, rawPart);
  }
  const covered = new Set<string>();
  for (const [index, rawGroup] of stockReport.result.groups.entries()) {
    if (!isQuoteRecord(rawGroup) || typeof rawGroup.materialId !== "string" ||
        typeof rawGroup.thicknessMm !== "number" || !Number.isFinite(rawGroup.thicknessMm) ||
        rawGroup.thicknessMm <= 0 || !Array.isArray(rawGroup.sourcePartIds) || rawGroup.sourcePartIds.length === 0) {
      throw new Error("Levha satın alma " + (index + 1) + ". grubu Part kaynağı veya malzeme kimliği taşımıyor.");
    }
    for (const partId of rawGroup.sourcePartIds) {
      if (typeof partId !== "string" || covered.has(partId)) throw new Error("Levha satın alma Part kaynakları eksik veya gruplar arasında yineleniyor.");
      const part = partsById.get(partId);
      if (!part) throw new Error("Levha satın alma raporu proje dışı Part içeriyor: " + partId + ".");
      const thicknessMm = Math.round((part.thickness as number) * 10) / 10;
      if (part.materialId !== rawGroup.materialId || Math.abs(thicknessMm - rawGroup.thicknessMm) > 1e-9) {
        throw new Error(partId + " Part malzeme kimliği veya mm kalınlığı levha grubuyla eşleşmiyor.");
      }
      covered.add(partId);
    }
  }
  if (covered.size !== partsById.size) throw new Error("Levha satın alma grupları proje Part snapshot'ının tamamını bire bir kapsamıyor.");
}

function quoteBasisFailure(
  basis: ProjectMaterialCostBasis,
  basisSummary: ProjectMaterialCostBasisSummary,
  quoteSummary: ProjectQuoteSummary,
  status: "blocked" | "incomplete"
): ProjectQuoteMaterialCostBasisSummary {
  const messages = [...basisSummary.diagnostics, ...quoteSummary.diagnostics];
  if (messages.length === 0) messages.push("Malzeme temeli ve teklif özeti aynı anda hazır duruma getirilemedi.");
  return createQuoteBasisResult(status, basis, null, null, null, null, null, null, basisSummary.sourceCount, quoteSummary, messages);
}

/**
 * Combines one explicit panel-material basis with a quote. Net-area mode prices
 * panel Parts normally. Stock-sheet mode excludes only panel net-area pricing;
 * edge-band, hardware, labor and operation lines remain independently priced.
 * Stock-sheet groups must cover the exact production Part snapshot and match
 * each Part's material ID and normalized millimetre thickness.
 */
export function calculateProjectQuoteWithMaterialCostBasis(value: unknown): ProjectQuoteMaterialCostBasisSummary {
  if (!isQuoteRecord(value)) return blockedQuoteBasis(null, "Teklif malzeme maliyet temeli isteği geçerli bir nesne olmalıdır.");
  const extra = Object.keys(value).find(key => !quoteBasisInputKeys.has(key));
  if (extra !== undefined) return blockedQuoteBasis(null, "Teklif malzeme maliyet temeli isteği desteklenmeyen alan içeriyor: " + extra + ".");
  if (value.schemaVersion !== 1) return blockedQuoteBasis(null, "Desteklenmeyen teklif malzeme maliyet temeli şema sürümü.");
  if (value.basis !== "net-consumption" && value.basis !== "stock-sheet-purchase") {
    return blockedQuoteBasis(null, "Teklif malzeme maliyet temeli net-consumption veya stock-sheet-purchase olmalıdır.");
  }
  const basis = value.basis;
  if (basis === "stock-sheet-purchase" && !("stockSheetPurchaseReport" in value)) {
    return blockedQuoteBasis(basis, "Levha satın alma temeli için doğrulanmış stockSheetPurchaseReport zorunludur.");
  }
  if (basis === "net-consumption" && "stockSheetPurchaseReport" in value) {
    return blockedQuoteBasis(basis, "Net tüketim temeli stockSheetPurchaseReport kabul etmez.");
  }
  const edgeBandingPricingMode = value.edgeBandingPricingMode ?? "length";
  if (edgeBandingPricingMode !== "length" && edgeBandingPricingMode !== "roll") {
    return blockedQuoteBasis(basis, "Kenar bandı fiyatlama modu length veya roll olmalıdır.");
  }
  if (edgeBandingPricingMode === "length" && ("edgeBandingRollSpecs" in value || "edgeBandingRollPriceTable" in value)) {
    return blockedQuoteBasis(basis, "Rulo girdileri yalnızca roll fiyatlama modunda kullanılabilir.");
  }
  if (edgeBandingPricingMode === "roll" &&
      (!Array.isArray(value.edgeBandingRollSpecs) || !Array.isArray(value.edgeBandingRollPriceTable))) {
    return blockedQuoteBasis(basis, "Roll modu açık rulo ölçüleri ve rulo fiyat tablosu listelerini gerektirir.");
  }

  const basisSourceReport = basis === "net-consumption"
    ? calculateProjectPricedConsumptionSummary(value.productionReport, value.consumptionPriceTable, { edgeBandingPricingMode })
    : value.stockSheetPurchaseReport;
  const basisSummary = calculateProjectMaterialCostBasisSummary({ schemaVersion: 1, basis, sourceReport: basisSourceReport });
  const quoteOptions: ProjectQuoteEdgeBandingRollOptions = {
    edgeBandingPricingMode,
    panelMaterialPricingMode: basis === "stock-sheet-purchase" ? "excluded" : "included",
    ...(edgeBandingPricingMode === "roll" ? {
      edgeBandingRollSpecs: value.edgeBandingRollSpecs,
      edgeBandingRollPriceTable: value.edgeBandingRollPriceTable
    } : {})
  };
  const quoteSummary = calculateProjectQuoteSummary(
    value.productionReport, value.consumptionPriceTable, value.workItems,
    value.tariffTable, value.quoteAdjustments, quoteOptions
  );

  if (basisSummary.status === "blocked" || quoteSummary.status === "blocked") return quoteBasisFailure(basis, basisSummary, quoteSummary, "blocked");
  if (basisSummary.status === "incomplete" || quoteSummary.status === "incomplete") return quoteBasisFailure(basis, basisSummary, quoteSummary, "incomplete");
  if ((basisSummary.status !== "ready" && basisSummary.status !== "empty") ||
      (quoteSummary.status !== "ready" && quoteSummary.status !== "empty")) {
    return blockedQuoteBasis(basis, "Teklif malzeme maliyet temeli desteklenmeyen bir hesap durumunda.", quoteSummary, basisSummary.sourceCount);
  }
  if (basis === "stock-sheet-purchase") {
    try { validateStockSheetPartCoverage(value.productionReport, basisSourceReport); }
    catch (error) { return blockedQuoteBasis(basis, quoteDiagnostic(error), quoteSummary, basisSummary.sourceCount); }
  }

  let quoteAmounts: ReturnType<typeof summarizeQuoteMaterialLines>;
  try { quoteAmounts = summarizeQuoteMaterialLines(quoteSummary); }
  catch (error) { return blockedQuoteBasis(basis, quoteDiagnostic(error), quoteSummary, basisSummary.sourceCount); }
  const panelCost = basisSummary.status === "empty" ? 0 : quoteSafeMinor(basisSummary.materialCostMinor, "Seçilen panel malzeme maliyeti");
  const edgeCost = quoteAmounts.edgeBandingCostMinor;
  if (basis === "net-consumption") {
    if (quoteAmounts.panelMaterialCostMinor !== panelCost || quoteAmounts.panelLineCount !== basisSummary.sourceCount) {
      return blockedQuoteBasis(basis, "Net tüketim panel maliyeti, teklif satırları ve Part kaynak sayısıyla eşleşmiyor.", quoteSummary, basisSummary.sourceCount);
    }
  } else if (quoteAmounts.panelMaterialCostMinor !== 0 || quoteAmounts.panelLineCount !== 0) {
    return blockedQuoteBasis(basis, "Levha satın alma temelinde net panel tüketim maliyeti aynı teklife eklenemez.", quoteSummary, basisSummary.sourceCount);
  }
  const baseMaterial = quoteAmounts.categoryTotalsMinor.material;
  const expectedBaseMaterial = basis === "net-consumption"
    ? quoteSafeAdd(panelCost, edgeCost, "Net tüketim material toplamı")
    : edgeCost;
  if (baseMaterial !== expectedBaseMaterial) {
    return blockedQuoteBasis(basis, "Teklif material toplamı seçilen panel temeli ve kenar bandı maliyetiyle eşleşmiyor.", quoteSummary, basisSummary.sourceCount);
  }
  if (basisSummary.currencyCode !== null && quoteSummary.currencyCode !== null &&
      basisSummary.currencyCode !== quoteSummary.currencyCode) {
    return blockedQuoteBasis(basis, "Panel malzeme temeli ile diğer teklif kalemlerinin para birimleri eşleşmiyor.", quoteSummary, basisSummary.sourceCount);
  }
  if (panelCost > 0 && basisSummary.currencyCode === null) {
    return blockedQuoteBasis(basis, "Pozitif panel malzeme maliyeti para birimi olmadan kullanılamaz.", quoteSummary, basisSummary.sourceCount);
  }

  const materialTotal = quoteSafeAdd(panelCost, edgeCost, "Birleşik material kategori toplamı");
  const categoryTotalsMinor = { ...quoteAmounts.categoryTotalsMinor, material: materialTotal };
  let nonMaterialTotal = 0;
  for (const category of PROJECT_COST_CATEGORIES) {
    if (category !== "material") nonMaterialTotal = quoteSafeAdd(nonMaterialTotal, categoryTotalsMinor[category], "Material dışı teklif toplamı");
  }
  const grandTotal = quoteSafeAdd(nonMaterialTotal, materialTotal, "Birleşik teklif genel toplamı");
  if (basis === "net-consumption" && quoteSummary.status === "ready" &&
      quoteSummary.costSummary?.grandTotalMinor !== grandTotal) {
    return blockedQuoteBasis(basis, "Net tüketim entegrasyonu mevcut teklif genel toplamını değiştirmemelidir.", quoteSummary, basisSummary.sourceCount);
  }
  const status = quoteSummary.status === "empty" && basisSummary.status === "empty" ? "empty" : "ready";
  return createQuoteBasisResult(
    status, basis, basisSummary.currencyCode ?? quoteSummary.currencyCode,
    panelCost, edgeCost, materialTotal, categoryTotalsMinor, grandTotal,
    quoteSafeMinor(basisSummary.sourceCount, "Panel malzeme kaynak sayısı"),
    quoteSummary, [...basisSummary.diagnostics, ...quoteSummary.diagnostics]
  );
}
