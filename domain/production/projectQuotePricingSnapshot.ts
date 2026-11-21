import {
  calculateProjectQuoteSummary,
  type ProjectQuoteEdgeBandingRollOptions,
  type ProjectQuoteSummary
} from "./projectQuoteSummary.ts";

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

export interface ProjectQuotePricingSnapshot {
  schemaVersion: 1;
  quotedOn: string;
  consumptionPriceList: DeepReadonly<ProjectQuoteCatalogVersionInput> | null;
  laborOperationTariffList: DeepReadonly<ProjectQuoteCatalogVersionInput> | null;
  quoteSummary: DeepReadonly<ProjectQuoteSummary>;
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
  "edgeBandingRollPriceTable"
]);
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
  try {
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
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }

  const immutableQuoteSummary = deepFreeze(quoteSummary);
  if (quoteSummary.status !== "ready") {
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
      schemaVersion: 1 as const,
      quotedOn,
      consumptionPriceList,
      laborOperationTariffList,
      quoteSummary: immutableQuoteSummary
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
