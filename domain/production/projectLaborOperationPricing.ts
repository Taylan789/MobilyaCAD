import {
  calculateProjectCostSummary,
  type ProjectCostLineInput,
  type ProjectCostLine,
  type ProjectCostSummary
} from "./projectCostSummary.ts";

export type ProjectLaborOperationCategory = "labor" | "operation";
export type ProjectDurationUnit = "min" | "h";

export interface ProjectLaborOperationUsageInput {
  id: string;
  category: ProjectLaborOperationCategory;
  description: string;
  duration: number;
  unit: ProjectDurationUnit;
  tariffId: string;
}

export interface ProjectLaborOperationTariffInput {
  tariffId: string;
  category: ProjectLaborOperationCategory;
  unit: ProjectDurationUnit;
  unitPriceMinor: number;
  currencyCode: string;
  sourceReference: string;
}

export interface ProjectLaborOperationCostLine extends ProjectCostLine {
  tariffId: string;
}

export interface ProjectLaborOperationTariffIssue {
  code: "missing-tariff" | "unit-mismatch";
  usageId: string;
  tariffId: string;
  description: string;
  requiredUnit: ProjectDurationUnit;
  availableUnits?: ProjectDurationUnit[];
}

export interface ProjectLaborOperationPricingSummary {
  status: "empty" | "incomplete" | "ready" | "blocked";
  currencyCode: string | null;
  requiredLineCount: number;
  pricedLineCount: number;
  lines: ProjectLaborOperationCostLine[];
  missingTariffs: ProjectLaborOperationTariffIssue[];
  diagnostics: string[];
  costSummary: ProjectCostSummary | null;
}

type ValidatedUsage = ProjectLaborOperationUsageInput;
type ValidatedTariff = ProjectLaborOperationTariffInput;

const identifierPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const currencyPattern = /^[A-Z]{3}$/;
const timeUnits = new Set<ProjectDurationUnit>(["min", "h"]);
const usageKeys = new Set(["id", "category", "description", "duration", "unit", "tariffId"]);
const tariffKeys = new Set(["tariffId", "category", "unit", "unitPriceMinor", "currencyCode", "sourceReference"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value || value.length > maxLength) {
    throw new Error(label + " boş olmayan, kenar boşluğu içermeyen ve en fazla " + maxLength + " karakterlik metin olmalıdır.");
  }
  return value;
}

function requireIdentifier(value: unknown, label: string): string {
  const identifier = requireText(value, label, 64);
  if (!identifierPattern.test(identifier)) throw new Error(label + " geçersiz.");
  return identifier;
}

function requireCategory(value: unknown, label: string): ProjectLaborOperationCategory {
  if (value !== "labor" && value !== "operation") throw new Error(label + " labor veya operation olmalıdır.");
  return value;
}

function requireTimeUnit(value: unknown, label: string): ProjectDurationUnit {
  if (typeof value !== "string" || !timeUnits.has(value as ProjectDurationUnit)) {
    throw new Error(label + " min veya h olmalıdır; otomatik birim dönüşümü yapılmaz.");
  }
  return value as ProjectDurationUnit;
}

function requireDuration(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(value * 1_000_000)
  ) {
    throw new Error(label + " pozitif, sonlu ve en fazla altı ondalık basamaklı bir süre olmalıdır.");
  }
  return value;
}

function validateUsages(value: unknown): ValidatedUsage[] {
  if (!Array.isArray(value)) throw new Error("İşçilik/operasyon kullanım satırları bir liste olmalıdır.");
  const seen = new Set<string>();
  return value.map((raw, index) => {
    const label = "İşçilik/operasyon satırının " + (index + 1) + ". satırı";
    if (!isRecord(raw)) throw new Error(label + " geçerli bir nesne olmalıdır.");
    for (const key of Object.keys(raw)) {
      if (!usageKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    }
    const id = requireIdentifier(raw.id, label + " kimliği");
    if (seen.has(id)) throw new Error("Yinelenen işçilik/operasyon satırı kimliği: " + id + ".");
    seen.add(id);
    return {
      id,
      category: requireCategory(raw.category, id + " kategorisi"),
      description: requireText(raw.description, id + " açıklaması", 240),
      duration: requireDuration(raw.duration, id + " süresi"),
      unit: requireTimeUnit(raw.unit, id + " süre birimi"),
      tariffId: requireIdentifier(raw.tariffId, id + " tarife kimliği")
    };
  });
}

function validateTariffs(value: unknown): Map<string, ValidatedTariff> {
  if (!Array.isArray(value)) throw new Error("İşçilik/operasyon tarife tablosu bir liste olmalıdır.");
  const tariffs = new Map<string, ValidatedTariff>();
  for (const [index, raw] of value.entries()) {
    const label = "Tarife tablosunun " + (index + 1) + ". satırı";
    if (!isRecord(raw)) throw new Error(label + " geçerli bir nesne olmalıdır.");
    for (const key of Object.keys(raw)) {
      if (!tariffKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    }
    const tariffId = requireIdentifier(raw.tariffId, label + " kimliği");
    if (tariffs.has(tariffId)) throw new Error("Yinelenen işçilik/operasyon tarife kimliği: " + tariffId + ".");
    const category = requireCategory(raw.category, tariffId + " kategorisi");
    const unit = requireTimeUnit(raw.unit, tariffId + " tarife birimi");
    if (typeof raw.unitPriceMinor !== "number" || !Number.isSafeInteger(raw.unitPriceMinor) || raw.unitPriceMinor < 0) {
      throw new Error(tariffId + " birim fiyatı negatif olmayan güvenli bir tam sayı olmalıdır.");
    }
    const currencyCode = requireText(raw.currencyCode, tariffId + " para birimi kodu", 3);
    if (!currencyPattern.test(currencyCode)) throw new Error(tariffId + " para birimi kodu üç büyük harf olmalıdır.");
    const sourceReference = requireText(raw.sourceReference, tariffId + " kaynak referansı", 256);
    tariffs.set(tariffId, { tariffId, category, unit, unitPriceMinor: raw.unitPriceMinor, currencyCode, sourceReference });
  }
  return tariffs;
}

function blocked(
  diagnostics: string[],
  requiredLineCount = 0,
  pricedLineCount = 0
): ProjectLaborOperationPricingSummary {
  return {
    status: "blocked",
    currencyCode: null,
    requiredLineCount,
    pricedLineCount,
    lines: [],
    missingTariffs: [],
    diagnostics,
    costSummary: null
  };
}

function empty(): ProjectLaborOperationPricingSummary {
  return {
    status: "empty",
    currencyCode: null,
    requiredLineCount: 0,
    pricedLineCount: 0,
    lines: [],
    missingTariffs: [],
    diagnostics: [],
    costSummary: null
  };
}

/** Prices explicit work durations; tariff and usage units must match exactly. */
export function calculateProjectLaborOperationPricingSummary(
  workItems: unknown,
  tariffTable: unknown
): ProjectLaborOperationPricingSummary {
  let tariffs: Map<string, ValidatedTariff>;
  let usages: ValidatedUsage[];
  try {
    tariffs = validateTariffs(tariffTable);
    usages = validateUsages(workItems);
  } catch (error) {
    return blocked([error instanceof Error ? error.message : String(error)]);
  }

  if (usages.length === 0) return empty();

  const costLines: ProjectCostLineInput[] = [];
  const tariffIds: string[] = [];
  const missingTariffs: ProjectLaborOperationTariffIssue[] = [];

  for (const usage of usages) {
    const tariff = tariffs.get(usage.tariffId);
    if (tariff === undefined) {
      missingTariffs.push({
        code: "missing-tariff",
        usageId: usage.id,
        tariffId: usage.tariffId,
        description: usage.description,
        requiredUnit: usage.unit
      });
      continue;
    }
    if (tariff.category !== usage.category) {
      return blocked([usage.id + " satırının " + usage.category + " kategorisi, " +
        usage.tariffId + " tarifesinin " + tariff.category + " kategorisiyle eşleşmiyor."], usages.length, costLines.length);
    }
    if (tariff.unit !== usage.unit) {
      missingTariffs.push({
        code: "unit-mismatch",
        usageId: usage.id,
        tariffId: usage.tariffId,
        description: usage.description,
        requiredUnit: usage.unit,
        availableUnits: [tariff.unit]
      });
      continue;
    }
    costLines.push({
      id: usage.id,
      category: usage.category,
      description: usage.description,
      quantity: usage.duration,
      unit: usage.unit,
      unitPriceMinor: tariff.unitPriceMinor,
      currencyCode: tariff.currencyCode,
      sourceReference: tariff.sourceReference
    });
    tariffIds.push(tariff.tariffId);
  }

  const currencies = [...new Set(costLines.map((line) => line.currencyCode))];
  if (currencies.length > 1) {
    return blocked(
      ["İşçilik/operasyon tarifeleri farklı para birimleri içeriyor; tek maliyet toplamı hesaplanamaz."],
      usages.length,
      costLines.length
    );
  }
  if (missingTariffs.length > 0) {
    return {
      status: "incomplete",
      currencyCode: null,
      requiredLineCount: usages.length,
      pricedLineCount: costLines.length,
      lines: [],
      missingTariffs,
      diagnostics: [],
      costSummary: null
    };
  }

  try {
    const costSummary = calculateProjectCostSummary(costLines);
    const lines = costSummary.lines.map((line, index) => ({
      ...line,
      tariffId: tariffIds[index]
    }));
    return {
      status: "ready",
      currencyCode: costSummary.currencyCode,
      requiredLineCount: usages.length,
      pricedLineCount: costLines.length,
      lines,
      missingTariffs: [],
      diagnostics: [],
      costSummary
    };
  } catch (error) {
    return blocked([error instanceof Error ? error.message : String(error)], usages.length, costLines.length);
  }
}
