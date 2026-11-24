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
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  if (!isRecord(value)) {
    throw new Error(label + " katalog sürümü nesnesi olmalıdır.");
  }
  for (const key of Object.keys(value)) {
    if (!catalogVersionKeys.has(key)) {
      throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    }
  }

  const catalogId = requireText(value.catalogId, label + " katalog kimliği", 128);
  if (!catalogIdPattern.test(catalogId)) {
    throw new Error(label + " katalog kimliği geçersiz.");
  }
  const version = requireText(value.version, label + " sürümü", 64);
  const effectiveFrom = requireDateOnly(value.effectiveFrom, label + " başlangıç tarihi");
  const effectiveTo = value.effectiveTo === undefined
    ? undefined
    : requireDateOnly(value.effectiveTo, label + " bitiş tarihi");

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
  if (!isRecord(value)) {
    return blocked("Teklif fiyat snapshot girdisi geçerli bir nesne olmalıdır.");
  }
  for (const key of Object.keys(value)) {
    if (!inputKeys.has(key)) {
      return blocked("Teklif fiyat snapshot girdisi desteklenmeyen alan içeriyor: " + key + ".");
    }
  }

  let quotedOn: string;
  try {
    quotedOn = requireDateOnly(value.quotedOn, "Teklif tarihi");
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }

  let quoteSummary: ProjectQuoteSummary;
  let materialCostBasisSnapshot: ProjectQuoteMaterialCostBasisSnapshot | undefined;
  try {
    if (value.materialCostBasis === undefined) {
      const quoteOptions: ProjectQuoteEdgeBandingRollOptions = {};
      if (value.edgeBandingPricingMode !== undefined) {
        if (value.edgeBandingPricingMode !== "length" && value.edgeBandingPricingMode !== "roll") {
          throw new Error("Teklif kenar bandı fiyatlama modu length veya roll olmalıdır.");
        }
        quoteOptions.edgeBandingPricingMode = value.edgeBandingPricingMode;
      }
      if (value.edgeBandingRollSpecs !== undefined) quoteOptions.edgeBandingRollSpecs = value.edgeBandingRollSpecs;
      if (value.edgeBandingRollPriceTable !== undefined) quoteOptions.edgeBandingRollPriceTable = value.edgeBandingRollPriceTable;
      quoteSummary = calculateProjectQuoteSummary(
        value.productionReport,
        value.consumptionPriceTable,
        value.workItems,
        value.tariffTable,
        value.quoteAdjustments,
        quoteOptions
      );
    } else {
      if (!isRecord(value.materialCostBasis)) {
        throw new Error("Teklif malzeme maliyet temeli geçerli bir nesne olmalıdır.");
      }
      for (const key of Object.keys(value.materialCostBasis)) {
        if (!materialCostBasisInputKeys.has(key)) {
          throw new Error("Teklif malzeme maliyet temeli desteklenmeyen alan içeriyor: " + key + ".");
        }
      }
      const basisRequest: Record<string, unknown> = {
        schemaVersion: 1,
        basis: value.materialCostBasis.basis,
        productionReport: value.productionReport,
        consumptionPriceTable: value.consumptionPriceTable,
        workItems: value.workItems,
        tariffTable: value.tariffTable
      };
      if (value.quoteAdjustments !== undefined) basisRequest.quoteAdjustments = value.quoteAdjustments;
      if (value.edgeBandingPricingMode !== undefined) basisRequest.edgeBandingPricingMode = value.edgeBandingPricingMode;
      if (value.edgeBandingRollSpecs !== undefined) basisRequest.edgeBandingRollSpecs = value.edgeBandingRollSpecs;
      if (value.edgeBandingRollPriceTable !== undefined) basisRequest.edgeBandingRollPriceTable = value.edgeBandingRollPriceTable;
      if (Object.prototype.hasOwnProperty.call(value.materialCostBasis, "stockSheetPurchaseReport")) {
        basisRequest.stockSheetPurchaseReport = value.materialCostBasis.stockSheetPurchaseReport;
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
      materialCostBasisSnapshot = createMaterialCostBasisSnapshot(basisResult, value.materialCostBasis);
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
      (value.consumptionPriceList === undefined || value.consumptionPriceList === null)
    ) {
      throw new Error("Üretim tüketimi fiyatlı bir teklif için fiyat listesi kimliği, sürümü ve geçerlilik tarihi zorunludur.");
    }
    if (
      hasLaborOperationLines &&
      (value.laborOperationTariffList === undefined || value.laborOperationTariffList === null)
    ) {
      throw new Error("İşçilik/operasyon içeren teklif için tarife listesi kimliği, sürümü ve geçerlilik tarihi zorunludur.");
    }

    const consumptionPriceList = value.consumptionPriceList === undefined || value.consumptionPriceList === null
      ? null
      : validateCatalogVersion(value.consumptionPriceList, "Fiyat listesi", quotedOn);
    const laborOperationTariffList = value.laborOperationTariffList === undefined || value.laborOperationTariffList === null
      ? null
      : validateCatalogVersion(value.laborOperationTariffList, "Tarife listesi", quotedOn);

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
