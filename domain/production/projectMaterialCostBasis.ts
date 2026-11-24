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
    return incomplete("net-consumption", messages.length ? messages : ["Net tüketim için tüm malzeme fiyatları tamamlanmalıdır."], required);
  }
  if (!isRecord(report.costSummary)) {
    throw new Error("Hazır net tüketim raporunda maliyet özeti bulunmalıdır.");
  }
  const summary = report.costSummary;
  if (summary.status !== "ready" || !Array.isArray(summary.lines) || summary.lines.length !== priced) {
    throw new Error("Net tüketim maliyet özeti hazır ve satır sayısıyla tutarlı olmalıdır.");
  }
  const reportCurrency = currency(report.currencyCode, "Net tüketim raporu");
  const summaryCurrency = currency(summary.currencyCode, "Net tüketim maliyet özeti");
  if (reportCurrency !== summaryCurrency) {
    throw new Error("Net tüketim raporu ile maliyet özeti para birimleri eşleşmiyor.");
  }

  const categoryTotals = isRecord(summary.categoryTotalsMinor) ? summary.categoryTotalsMinor : null;
  if (categoryTotals === null) {
    throw new Error("Net tüketim kategori toplamları bulunmalıdır.");
  }
  const calculated: Record<string, bigint> = Object.fromEntries(materialCostCategories.map(category => [category, 0n]));
  let lineGrandTotal = 0n;
  let materialLineCount = 0;
  let materialCost = 0;
  for (const [index, line] of summary.lines.entries()) {
    if (!isRecord(line) || typeof line.category !== "string" || !materialCostCategories.includes(line.category as typeof materialCostCategories[number])) {
      throw new Error("Net tüketim maliyetinin " + (index + 1) + ". satır kategorisi geçersiz.");
    }
    const amount = safeMinor(line.lineTotalMinor, "Net tüketim satır tutarı");
    calculated[line.category] += BigInt(amount);
    lineGrandTotal += BigInt(amount);
    if (line.category === "material") {
      materialLineCount += 1;
      materialCost += amount;
    }
  }
  let categoryGrandTotal = 0n;
  for (const category of materialCostCategories) {
    const amount = safeMinor(categoryTotals[category], category + " kategori toplamı");
    if (calculated[category] !== BigInt(amount)) {
      throw new Error(category + " kategori toplamı satırlarla eşleşmiyor.");
    }
    categoryGrandTotal += BigInt(amount);
  }
  const grandTotal = safeMinor(summary.grandTotalMinor, "Net tüketim genel toplamı");
  if (lineGrandTotal !== BigInt(grandTotal) || categoryGrandTotal !== BigInt(grandTotal)) {
    throw new Error("Net tüketim genel toplamı satır ve kategori toplamlarıyla eşleşmiyor.");
  }
  safeMinor(materialCost, "Net tüketim malzeme maliyeti");
  return createSummary("net-consumption", "ready", reportCurrency, materialCost, materialLineCount, messages);
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
        const missing = diagnostics(report.missingPrices, "Eksik net tüketim fiyat listesi");
        const messages = diagnostics(report.diagnostics, "Eksik net tüketim tanı listesi");
        return incomplete(basis, messages.length ? messages : missing, required);
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
