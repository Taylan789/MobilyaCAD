import {
  calculateProjectQuoteSummary,
  type ProjectQuoteEdgeBandingRollOptions,
  type ProjectQuoteSummary
} from "./projectQuoteSummary.ts";
import {
  calculateProjectQuoteWithMaterialCostBasis,
  type ProjectMaterialCostBasis,
  type ProjectQuoteMaterialCostBasisSummary
} from "./projectMaterialCostBasis.ts";
import type { ProjectCostCategoryTotals } from "./projectCostSummary.ts";
import { readProjectEdgeBandingRollPricingFromProjectFile } from "./projectEdgeBandingRollPricingProjectFile.ts";

export interface ProjectQuoteCatalogVersionInput {
  catalogId: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

type DeepReadonly<T> =
  T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export interface ProjectQuoteStockSheetGroupSnapshot {
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: readonly string[];
  sheetCount: number;
  pricePerSheetMinor: number;
  stockSheetCostMinor: number;
  currencyCode: string;
  sourceReference?: string;
}

export interface ProjectQuoteMaterialCostBasisSnapshot {
  schemaVersion: 1;
  basis: ProjectMaterialCostBasis;
  currencyCode: string;
  panelMaterialCostMinor: number;
  edgeBandingCostMinor: number;
  materialCategoryTotalMinor: number;
  categoryTotalsMinor: DeepReadonly<ProjectCostCategoryTotals>;
  grandTotalMinor: number;
  materialSourceCount: number;
  stockSheetGroups: readonly DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>[];
}

export interface ProjectQuotePricingSnapshot {
  /** v1 is the legacy line-only shape; v2 adds a validated material-cost basis. */
  schemaVersion: 1 | 2;
  quotedOn: string;
  consumptionPriceList: DeepReadonly<ProjectQuoteCatalogVersionInput> | null;
  laborOperationTariffList: DeepReadonly<ProjectQuoteCatalogVersionInput> | null;
  quoteSummary: DeepReadonly<ProjectQuoteSummary>;
  materialCostBasis?: DeepReadonly<ProjectQuoteMaterialCostBasisSnapshot>;
}

export interface ProjectQuoteMaterialCostBasisInput {
  basis: ProjectMaterialCostBasis;
  stockSheetPurchaseReport?: unknown;
}

export interface ProjectQuotePricingSnapshotInput {
  quotedOn: string;
  productionReport: unknown;
  consumptionPriceTable: unknown;
  workItems: unknown;
  tariffTable: unknown;
  consumptionPriceList?: ProjectQuoteCatalogVersionInput | null;
  laborOperationTariffList?: ProjectQuoteCatalogVersionInput | null;
  quoteAdjustments?: unknown;
  edgeBandingPricingMode?: "length" | "roll";
  edgeBandingRollSpecs?: unknown;
  edgeBandingRollPriceTable?: unknown;
  /** Uses the v2 envelope's saved roll inputs only when roll mode is explicitly selected. */
  projectFile?: unknown;
  materialCostBasis?: ProjectQuoteMaterialCostBasisInput;
}

export interface ProjectQuotePricingSnapshotResult {
  status: ProjectQuoteSummary["status"];
  quoteSummary: DeepReadonly<ProjectQuoteSummary> | null;
  snapshot: DeepReadonly<ProjectQuotePricingSnapshot> | null;
  diagnostics: readonly string[];
}

const inputKeys = new Set([
  "quotedOn",
  "productionReport",
  "consumptionPriceTable",
  "workItems",
  "tariffTable",
  "consumptionPriceList",
  "laborOperationTariffList",
  "quoteAdjustments",
  "edgeBandingPricingMode",
  "edgeBandingRollSpecs",
  "edgeBandingRollPriceTable",
  "projectFile",
  "materialCostBasis"
]);
const materialCostBasisInputKeys = new Set(["basis", "stockSheetPurchaseReport"]);
const catalogVersionKeys = new Set([
  "catalogId",
  "version",
  "effectiveFrom",
  "effectiveTo"
]);
const catalogIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function copyOwnEnumerableDataRecord(
  value: unknown,
  label: string,
  allowedKeys: ReadonlySet<string>,
  invalidMessage = label + " geçerli bir nesne olmalıdır."
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(invalidMessage);

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(label + " düz JSON nesnesi olmalıdır.");
    }

    const copy = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new Error(label + " sembol anahtarı içeremez.");
      }
      if (!allowedKeys.has(key)) {
        throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new Error(label + " own enumerable data property içermelidir.");
      }
      Object.defineProperty(copy, key, {
        value: descriptor.value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return copy;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(label + " güvenli biçimde incelenemedi.");
  }
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim() !== value ||
    value.length > maxLength
  ) {
    throw new Error(label + " boş olmayan, kenar boşluğu içermeyen ve en fazla " + maxLength + " karakterlik metin olmalıdır.");
  }
  return value;
}

function requireDateOnly(value: unknown, label: string): string {
  if (typeof value !== "string" || !datePattern.test(value) || value.startsWith("0000-")) {
    throw new Error(label + " YYYY-MM-DD biçiminde geçerli bir takvim tarihi olmalıdır.");
  }
  const parsed = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(label + " geçerli bir takvim tarihi olmalıdır.");
  }
  return value;
}

function validateCatalogVersion(
  value: unknown,
  label: string,
  quotedOn: string
): ProjectQuoteCatalogVersionInput {
  const catalog = copyOwnEnumerableDataRecord(
    value,
    label,
    catalogVersionKeys,
    label + " katalog sürümü nesnesi olmalıdır."
  );

  const catalogId = requireText(catalog.catalogId, label + " katalog kimliği", 128);
  if (!catalogIdPattern.test(catalogId)) {
    throw new Error(label + " katalog kimliği geçersiz.");
  }
  const version = requireText(catalog.version, label + " sürümü", 64);
  const effectiveFrom = requireDateOnly(catalog.effectiveFrom, label + " başlangıç tarihi");
  const effectiveTo = catalog.effectiveTo === undefined
    ? undefined
    : requireDateOnly(catalog.effectiveTo, label + " bitiş tarihi");

  if (effectiveTo !== undefined && effectiveTo < effectiveFrom) {
    throw new Error(label + " bitiş tarihi başlangıç tarihinden önce olamaz.");
  }
  if (quotedOn < effectiveFrom || (effectiveTo !== undefined && quotedOn > effectiveTo)) {
    throw new Error(label + " sürümü teklif tarihinde geçerli değildir.");
  }

  return {
    catalogId,
    version,
    effectiveFrom,
    ...(effectiveTo === undefined ? {} : { effectiveTo })
  };
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as unknown as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}


function createStockSheetGroupSnapshots(value: unknown): ProjectQuoteStockSheetGroupSnapshot[] {
  if (!isRecord(value) || !isRecord(value.result) || !Array.isArray(value.result.groups)) {
    throw new Error("Levha satın alma snapshot'ı doğrulanmış grup listesi içermelidir.");
  }
  const rawGroups = value.result.groups;
  if (rawGroups.length > 10000) throw new Error("Levha satın alma snapshot grup sayısı sınırı aşıyor.");
  const seenGroupIds = new Set<string>();
  const seenPartIds = new Set<string>();
  const groups = rawGroups.map((rawGroup, index) => {
    if (!isRecord(rawGroup)) throw new Error("Levha satın alma snapshot " + (index + 1) + ". grubu geçersiz.");
    const groupId = requireText(rawGroup.groupId, "Levha satın alma grup kimliği", 512);
    const materialId = requireText(rawGroup.materialId, groupId + " malzeme kimliği", 240);
    const thicknessMm = rawGroup.thicknessMm;
    if (typeof thicknessMm !== "number" || !Number.isFinite(thicknessMm) || thicknessMm <= 0) {
      throw new Error(groupId + " kalınlığı pozitif ve sonlu mm olmalıdır.");
    }
    const thicknessTicks = Math.round(thicknessMm * 10);
    if (!Number.isSafeInteger(thicknessTicks) || Math.abs(thicknessTicks / 10 - thicknessMm) > 1e-8) {
      throw new Error(groupId + " kalınlığı en fazla 0.1 mm hassasiyetinde olmalıdır.");
    }
    if (groupId !== JSON.stringify([materialId, thicknessTicks])) {
      throw new Error(groupId + " kimliği malzeme ve normalize mm kalınlığıyla eşleşmiyor.");
    }
    if (seenGroupIds.has(groupId)) throw new Error("Levha satın alma grup kimliği yineleniyor: " + groupId + ".");
    seenGroupIds.add(groupId);
    if (!Array.isArray(rawGroup.sourcePartIds) || rawGroup.sourcePartIds.length === 0 || rawGroup.sourcePartIds.length > 10000) {
      throw new Error(groupId + " kaynak Part kimlikleri 1-10.000 arası olmalıdır.");
    }
    const sourcePartIds = rawGroup.sourcePartIds
      .map((partId, partIndex) => requireText(partId, groupId + " " + (partIndex + 1) + ". Part kimliği", 128))
      .sort();
    if (new Set(sourcePartIds).size !== sourcePartIds.length) {
      throw new Error(groupId + " kaynak Part kimlikleri yineleniyor.");
    }
    for (const partId of sourcePartIds) {
      if (seenPartIds.has(partId)) throw new Error("Levha satın alma Part kimliği gruplar arasında yineleniyor: " + partId + ".");
      seenPartIds.add(partId);
    }
    const sheetCount = rawGroup.sheetCount;
    const pricePerSheetMinor = rawGroup.pricePerSheetMinor;
    const stockSheetCostMinor = rawGroup.stockSheetCostMinor;
    if (typeof sheetCount !== "number" || !Number.isSafeInteger(sheetCount) || sheetCount <= 0) {
      throw new Error(groupId + " levha adedi pozitif güvenli tam sayı olmalıdır.");
    }
    if (typeof pricePerSheetMinor !== "number" || !Number.isSafeInteger(pricePerSheetMinor) || pricePerSheetMinor < 0) {
      throw new Error(groupId + " levha birim fiyatı geçersiz.");
    }
    if (typeof stockSheetCostMinor !== "number" || !Number.isSafeInteger(stockSheetCostMinor) || stockSheetCostMinor < 0 ||
        BigInt(sheetCount) * BigInt(pricePerSheetMinor) !== BigInt(stockSheetCostMinor)) {
      throw new Error(groupId + " satın alma maliyeti levha adedi × birim fiyatla eşleşmiyor.");
    }
    const currencyCode = requireText(rawGroup.currencyCode, groupId + " para birimi", 3);
    if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error(groupId + " para birimi kodu geçersiz.");
    const sourceReference = rawGroup.sourceReference === undefined
      ? undefined
      : requireText(rawGroup.sourceReference, groupId + " fiyat kaynak referansı", 240);
    return {
      groupId,
      materialId,
      thicknessMm: thicknessTicks / 10,
      sourcePartIds,
      sheetCount,
      pricePerSheetMinor,
      stockSheetCostMinor,
      currencyCode,
      ...(sourceReference === undefined ? {} : { sourceReference })
    };
  });
  return groups.sort((left, right) => left.groupId < right.groupId ? -1 : left.groupId > right.groupId ? 1 : 0);
}

function createMaterialCostBasisSnapshot(
  result: ProjectQuoteMaterialCostBasisSummary,
  input: Record<string, unknown>
): ProjectQuoteMaterialCostBasisSnapshot {
  if (
    result.status !== "ready" ||
    result.basis === null ||
    result.currencyCode === null ||
    result.panelMaterialCostMinor === null ||
    result.edgeBandingCostMinor === null ||
    result.materialCategoryTotalMinor === null ||
    result.categoryTotalsMinor === null ||
    result.grandTotalMinor === null
  ) {
    throw new Error("Hazır teklif için doğrulanmış panel maliyet temeli snapshot'ı üretilemedi.");
  }
  const stockSheetGroups = result.basis === "stock-sheet-purchase"
    ? createStockSheetGroupSnapshots(input.stockSheetPurchaseReport)
    : [];
  if (result.basis === "stock-sheet-purchase" && stockSheetGroups.length !== result.materialSourceCount) {
    throw new Error("Levha satın alma grup sayısı seçilen maliyet kaynağı sayısıyla eşleşmiyor.");
  }
  let stockSheetCost = 0n;
  for (const group of stockSheetGroups) {
    if (group.currencyCode !== result.currencyCode) throw new Error(group.groupId + " para birimi panel maliyet temeliyle eşleşmiyor.");
    stockSheetCost += BigInt(group.stockSheetCostMinor);
  }
  if (result.basis === "stock-sheet-purchase" && stockSheetCost !== BigInt(result.panelMaterialCostMinor)) {
    throw new Error("Levha satın alma grup maliyetleri panel malzeme toplamıyla eşleşmiyor.");
  }
  if (
    result.materialCategoryTotalMinor !== result.panelMaterialCostMinor + result.edgeBandingCostMinor ||
    !Number.isSafeInteger(result.materialCategoryTotalMinor) ||
    !Number.isSafeInteger(result.grandTotalMinor) ||
    !Number.isSafeInteger(result.materialSourceCount) ||
    result.materialSourceCount < 0
  ) {
    throw new Error("Teklif panel ve kenar bandı maliyet toplamları güvenli ve tutarlı olmalıdır.");
  }
  return {
    schemaVersion: 1,
    basis: result.basis,
    currencyCode: result.currencyCode,
    panelMaterialCostMinor: result.panelMaterialCostMinor,
    edgeBandingCostMinor: result.edgeBandingCostMinor,
    materialCategoryTotalMinor: result.materialCategoryTotalMinor,
    categoryTotalsMinor: result.categoryTotalsMinor,
    grandTotalMinor: result.grandTotalMinor,
    materialSourceCount: result.materialSourceCount,
    stockSheetGroups
  };
}

function resolveEdgeBandingRollOptions(value: Record<string, unknown>): ProjectQuoteEdgeBandingRollOptions {
  const mode = value.edgeBandingPricingMode;
  if (mode !== undefined && mode !== "length" && mode !== "roll") {
    throw new Error("Teklif kenar bandı fiyatlama modu length veya roll olmalıdır.");
  }

  const options: ProjectQuoteEdgeBandingRollOptions = {};
  if (mode !== undefined) options.edgeBandingPricingMode = mode;

  const projectFileDescriptor = Object.getOwnPropertyDescriptor(value, "projectFile");
  if (projectFileDescriptor && (!projectFileDescriptor.enumerable || !("value" in projectFileDescriptor))) {
    throw new Error("Teklif projectFile alanı own enumerable data property olmalıdır.");
  }
  const projectFile = projectFileDescriptor?.value;
  if (projectFile === undefined) {
    if (value.edgeBandingRollSpecs !== undefined) options.edgeBandingRollSpecs = value.edgeBandingRollSpecs;
    if (value.edgeBandingRollPriceTable !== undefined) options.edgeBandingRollPriceTable = value.edgeBandingRollPriceTable;
    return options;
  }

  if (mode !== "roll") {
    throw new Error("Proje dosyasındaki kayıtlı rulo fiyatlamasını kullanmak için edgeBandingPricingMode açıkça roll olmalıdır.");
  }
  if (value.edgeBandingRollSpecs !== undefined || value.edgeBandingRollPriceTable !== undefined) {
    throw new Error("projectFile ile ayrı rulo ölçü/fiyat listeleri birlikte verilemez; tek kaynak seçilmelidir.");
  }

  const saved = readProjectEdgeBandingRollPricingFromProjectFile(projectFile);
  if (saved.status === "blocked") {
    throw new Error("Proje dosyasındaki kenar bandı rulo girdileri doğrulanamadı: " + (saved.diagnostics[0] ?? "geçersiz uzantı."));
  }
  if (saved.status === "legacy" || saved.pricing === null) {
    throw new Error("Kayıtlı kenar bandı rulo fiyatlaması için JSON v2 projectId içeren proje dosyası gerekir.");
  }

  options.edgeBandingRollSpecs = saved.pricing.rollSpecs;
  options.edgeBandingRollPriceTable = saved.pricing.rollPriceTable;
  return options;
}

function blocked(message: string): ProjectQuotePricingSnapshotResult {
  return {
    status: "blocked",
    quoteSummary: null,
    snapshot: null,
    diagnostics: [message]
  };
}

/**
 * Creates an immutable, dated record of the exact price/tariff versions used
 * by a ready quote. Dates are user-supplied calendar dates; no current date,
 * catalog version, currency conversion or price is inferred.
 */
export function createProjectQuotePricingSnapshot(
  value: unknown
): ProjectQuotePricingSnapshotResult {
  let input: Record<string, unknown>;
  let materialCostBasisInput: Record<string, unknown> | undefined;
  try {
    input = copyOwnEnumerableDataRecord(
      value,
      "Teklif fiyat snapshot girdisi",
      inputKeys
    );
    materialCostBasisInput = input.materialCostBasis === undefined
      ? undefined
      : copyOwnEnumerableDataRecord(
          input.materialCostBasis,
          "Teklif malzeme maliyet temeli",
          materialCostBasisInputKeys
        );
  } catch (error) {
    return blocked(
      error instanceof Error
        ? error.message
        : "Teklif fiyat snapshot girdisi güvenli biçimde incelenemedi."
    );
  }

  let quotedOn: string;
  try {
    quotedOn = requireDateOnly(input.quotedOn, "Teklif tarihi");
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }

  let quoteSummary: ProjectQuoteSummary;
  let materialCostBasisSnapshot: ProjectQuoteMaterialCostBasisSnapshot | undefined;
  try {
    const quoteOptions = resolveEdgeBandingRollOptions(input);
    if (materialCostBasisInput === undefined) {
      quoteSummary = calculateProjectQuoteSummary(
        input.productionReport,
        input.consumptionPriceTable,
        input.workItems,
        input.tariffTable,
        input.quoteAdjustments,
        quoteOptions
      );
    } else {
      const basisRequest: Record<string, unknown> = {
        schemaVersion: 1,
        basis: materialCostBasisInput.basis,
        productionReport: input.productionReport,
        consumptionPriceTable: input.consumptionPriceTable,
        workItems: input.workItems,
        tariffTable: input.tariffTable
      };
      if (input.quoteAdjustments !== undefined) basisRequest.quoteAdjustments = input.quoteAdjustments;
      if (quoteOptions.edgeBandingPricingMode !== undefined) basisRequest.edgeBandingPricingMode = quoteOptions.edgeBandingPricingMode;
      if (quoteOptions.edgeBandingRollSpecs !== undefined) basisRequest.edgeBandingRollSpecs = quoteOptions.edgeBandingRollSpecs;
      if (quoteOptions.edgeBandingRollPriceTable !== undefined) basisRequest.edgeBandingRollPriceTable = quoteOptions.edgeBandingRollPriceTable;
      if (Object.prototype.hasOwnProperty.call(materialCostBasisInput, "stockSheetPurchaseReport")) {
        basisRequest.stockSheetPurchaseReport = materialCostBasisInput.stockSheetPurchaseReport;
      }
      const basisResult = calculateProjectQuoteWithMaterialCostBasis(basisRequest);
      if (basisResult.status !== "ready") {
        return {
          status: basisResult.status,
          quoteSummary: basisResult.quoteSummary === null ? null : deepFreeze(basisResult.quoteSummary),
          snapshot: null,
          diagnostics: deepFreeze([...basisResult.diagnostics])
        };
      }
      if (basisResult.quoteSummary === null) {
        throw new Error("Hazır malzeme temelli teklif doğrulanmış teklif özeti içermelidir.");
      }
      quoteSummary = basisResult.quoteSummary;
      materialCostBasisSnapshot = createMaterialCostBasisSnapshot(basisResult, materialCostBasisInput);
    }
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }

  const immutableQuoteSummary = deepFreeze(quoteSummary);
  if (quoteSummary.status !== "ready" && !(materialCostBasisSnapshot !== undefined && quoteSummary.status === "empty")) {
    return {
      status: quoteSummary.status,
      quoteSummary: immutableQuoteSummary,
      snapshot: null,
      diagnostics: deepFreeze([...quoteSummary.diagnostics])
    };
  }

  try {
    const hasConsumptionLines = quoteSummary.lineSources.some(
      (line) => line.sourceType === "production-consumption"
    );
    const hasLaborOperationLines = quoteSummary.lineSources.some(
      (line) => line.sourceType === "labor-operation"
    );

    if (
      hasConsumptionLines &&
      (input.consumptionPriceList === undefined || input.consumptionPriceList === null)
    ) {
      throw new Error("Üretim tüketimi fiyatlı bir teklif için fiyat listesi kimliği, sürümü ve geçerlilik tarihi zorunludur.");
    }
    if (
      hasLaborOperationLines &&
      (input.laborOperationTariffList === undefined || input.laborOperationTariffList === null)
    ) {
      throw new Error("İşçilik/operasyon içeren teklif için tarife listesi kimliği, sürümü ve geçerlilik tarihi zorunludur.");
    }

    const consumptionPriceList = input.consumptionPriceList === undefined || input.consumptionPriceList === null
      ? null
      : validateCatalogVersion(input.consumptionPriceList, "Fiyat listesi", quotedOn);
    const laborOperationTariffList = input.laborOperationTariffList === undefined || input.laborOperationTariffList === null
      ? null
      : validateCatalogVersion(input.laborOperationTariffList, "Tarife listesi", quotedOn);

    const snapshot = deepFreeze({
      schemaVersion: materialCostBasisSnapshot === undefined ? 1 as const : 2 as const,
      quotedOn,
      consumptionPriceList,
      laborOperationTariffList,
      quoteSummary: immutableQuoteSummary,
      ...(materialCostBasisSnapshot === undefined ? {} : { materialCostBasis: materialCostBasisSnapshot })
    });

    return {
      status: "ready",
      quoteSummary: immutableQuoteSummary,
      snapshot,
      diagnostics: []
    };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }
}
