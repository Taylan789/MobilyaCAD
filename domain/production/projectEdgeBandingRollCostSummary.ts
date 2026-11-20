import { calculateProjectCostSummary, type ProjectCostSummary } from "./projectCostSummary.ts";

export interface ProjectEdgeBandingRollPriceInput {
  edgeBandingId: string;
  /** Explicit price per roll in the smallest currency unit. */
  unit: "rulo";
  unitPriceMinor: number;
  currencyCode: string;
  sourceReference?: string;
}

export interface ProjectEdgeBandingRollCostLineSource {
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

export interface ProjectEdgeBandingRollCostSummary {
  status: "empty" | "incomplete" | "ready" | "blocked";
  currencyCode: string | null;
  requiredLineCount: number;
  pricedLineCount: number;
  missingRollSpecs: string[];
  missingPrices: string[];
  diagnostics: string[];
  lineSources: ProjectEdgeBandingRollCostLineSource[];
  costSummary: ProjectCostSummary | null;
}

interface ValidatedRollPlan {
  edgeBandingId: string;
  consumedLengthMm: number;
  wasteAllowanceMm: number;
  requiredLengthMm: number;
  rollLengthMm: number;
  rollCount: number;
  purchasedLengthMm: number;
  leftoverLengthMm: number;
  partIds: string[];
  furnitureIds: string[];
  sourceReference?: string;
}

interface ValidatedRollPrice {
  edgeBandingId: string;
  unitPriceMinor: number;
  currencyCode: string;
  sourceReference?: string;
}

const allowedEnvelopeKeys = new Set(["status", "plans", "missingRollSpecs", "diagnostics"]);
const allowedPlanKeys = new Set([
  "edgeBandingId", "consumedLengthMm", "wasteAllowanceMm", "requiredLengthMm",
  "rollLengthMm", "rollCount", "purchasedLengthMm", "leftoverLengthMm",
  "partIds", "furnitureIds", "sourceReference"
]);
const allowedPriceKeys = new Set(["edgeBandingId", "unit", "unitPriceMinor", "currencyCode", "sourceReference"]);
const identifierPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const currencyPattern = /^[A-Z]{3}$/;
const maxRollLengthMm = 10_000_000;
const maxPlans = 1_000;
const maxSourceIds = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnosticMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function requireIdentifier(value: unknown, label: string): string {
  const id = requireText(value, label, 64);
  if (!identifierPattern.test(id)) throw new Error(label + " geçersiz.");
  return id;
}

function mmToTenths(value: unknown, label: string, allowZero: boolean, maximum = Number.MAX_SAFE_INTEGER / 10): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < (allowZero ? 0 : Number.MIN_VALUE) ||
    value > maximum
  ) {
    throw new Error(label + " geçerli, " + (allowZero ? "negatif olmayan" : "sıfırdan büyük") + " mm değeri olmalıdır.");
  }
  const tenths = Math.round(value * 10);
  if (!Number.isSafeInteger(tenths) || Math.abs(tenths / 10 - value) > 1e-8) {
    throw new Error(label + " en fazla 0.1 mm hassasiyetinde olmalıdır.");
  }
  return tenths;
}

function mmFromTenths(value: number): number {
  return value / 10;
}

function validateSourceIds(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > maxSourceIds) {
    throw new Error(label + " en fazla " + maxSourceIds + " kaynak kimliğinden oluşan bir liste olmalıdır.");
  }
  const ids = new Set<string>();
  for (const [index, rawId] of value.entries()) {
    const id = requireText(rawId, label + " " + (index + 1) + ". kimliği", 128);
    if (ids.has(id)) throw new Error(label + " içinde yinelenen kaynak kimliği: " + id + ".");
    ids.add(id);
  }
  return [...ids].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

function validateTextList(value: unknown, label: string, maximum = maxPlans): string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error(label + " geçerli bir liste olmalıdır.");
  }
  return value.map((item, index) => requireText(item, label + " " + (index + 1), 500));
}

function blockedResult(diagnostics: string[], requiredLineCount = 0): ProjectEdgeBandingRollCostSummary {
  return {
    status: "blocked",
    currencyCode: null,
    requiredLineCount,
    pricedLineCount: 0,
    missingRollSpecs: [],
    missingPrices: [],
    diagnostics,
    lineSources: [],
    costSummary: null
  };
}

function validateRollPlan(value: unknown): {
  status: "empty" | "ready" | "incomplete" | "blocked";
  plans: ValidatedRollPlan[];
  missingRollSpecs: string[];
  diagnostics: string[];
} {
  if (!isRecord(value)) throw new Error("Rulo planı geçerli bir nesne olmalıdır.");
  for (const key of Object.keys(value)) if (!allowedEnvelopeKeys.has(key)) throw new Error("Rulo planı desteklenmeyen alan içeriyor: " + key + ".");
  if (value.status !== "empty" && value.status !== "ready" && value.status !== "incomplete" && value.status !== "blocked") {
    throw new Error("Rulo planı durumu desteklenmiyor.");
  }
  const missingRollSpecs = validateTextList(value.missingRollSpecs, "Eksik rulo tanımları", maxPlans).map((id) => requireIdentifier(id, "Eksik rulo kimliği"));
  if (new Set(missingRollSpecs).size !== missingRollSpecs.length) throw new Error("Eksik rulo tanımları yinelenemez.");
  const diagnostics = validateTextList(value.diagnostics, "Rulo planı tanıları");
  if (value.status === "blocked" || value.status === "incomplete") {
    if (value.plans !== null) throw new Error("Blocked/incomplete rulo planı kısmi plan içermemelidir.");
    if (value.status === "incomplete" && missingRollSpecs.length === 0) throw new Error("Incomplete rulo planı eksik tanımları belirtmelidir.");
    if (value.status === "blocked" && diagnostics.length === 0) diagnostics.push("Rulo planı engellendi.");
    return { status: value.status, plans: [], missingRollSpecs, diagnostics };
  }
  if (missingRollSpecs.length !== 0 || diagnostics.length !== 0) throw new Error("Hazır rulo planı eksik tanım veya tanı içermemelidir.");
  if (!Array.isArray(value.plans) || value.plans.length > maxPlans) throw new Error("Rulo planları geçerli ve 1.000 satırı aşmayan bir liste olmalıdır.");
  if (value.status === "empty") {
    if (value.plans.length !== 0) throw new Error("Boş rulo planı satın alım satırı içermemelidir.");
    return { status: "empty", plans: [], missingRollSpecs: [], diagnostics: [] };
  }
  if (value.plans.length === 0) throw new Error("Ready rulo planı en az bir satın alım satırı içermelidir.");

  const plans: ValidatedRollPlan[] = [];
  const seen = new Set<string>();
  for (const [index, rawPlan] of value.plans.entries()) {
    const label = "Rulo planının " + (index + 1) + ". satırı";
    if (!isRecord(rawPlan)) throw new Error(label + " geçerli bir nesne olmalıdır.");
    for (const key of Object.keys(rawPlan)) if (!allowedPlanKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    const edgeBandingId = requireIdentifier(rawPlan.edgeBandingId, label + " katalog kimliği");
    if (seen.has(edgeBandingId)) throw new Error("Yinelenen rulo planı: " + edgeBandingId + ".");
    seen.add(edgeBandingId);
    const consumedTenths = mmToTenths(rawPlan.consumedLengthMm, label + " tüketimi", true);
    const wasteTenths = mmToTenths(rawPlan.wasteAllowanceMm, label + " ek payı", true);
    const requiredTenths = mmToTenths(rawPlan.requiredLengthMm, label + " gereken uzunluk", true);
    const rollLengthTenths = mmToTenths(rawPlan.rollLengthMm, label + " rulo uzunluğu", false, maxRollLengthMm);
    if (rollLengthTenths === 0) throw new Error(label + " rulo uzunluğu en az 0.1 mm olmalıdır.");
    const purchasedTenths = mmToTenths(rawPlan.purchasedLengthMm, label + " satın alınan uzunluk", true);
    const leftoverTenths = mmToTenths(rawPlan.leftoverLengthMm, label + " kalan uzunluk", true);
    if (typeof rawPlan.rollCount !== "number" || !Number.isSafeInteger(rawPlan.rollCount) || rawPlan.rollCount < 1) {
      throw new Error(label + " rulo adedi pozitif güvenli bir tam sayı olmalıdır.");
    }
    const expectedRequired = consumedTenths + wasteTenths;
    const expectedPurchasedBig = BigInt(rawPlan.rollCount) * BigInt(rollLengthTenths);
    if (
      !Number.isSafeInteger(expectedRequired) ||
      expectedRequired !== requiredTenths ||
      expectedPurchasedBig > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      throw new Error(label + " gereken/satın alınan uzunluk aritmetiği tutarsız.");
    }
    const expectedPurchased = Number(expectedPurchasedBig);
    const expectedLeftover = expectedPurchased - requiredTenths;
    if (
      expectedPurchased !== purchasedTenths ||
      expectedLeftover < 0 ||
      expectedLeftover !== leftoverTenths
    ) {
      throw new Error(label + " rulo adedi, satın alınan ve kalan uzunluk tutarsız.");
    }
    const partIds = validateSourceIds(rawPlan.partIds, label + " Part ID'leri");
    const furnitureIds = validateSourceIds(rawPlan.furnitureIds, label + " mobilya ID'leri");
    const sourceReference = rawPlan.sourceReference === undefined
      ? undefined
      : requireText(rawPlan.sourceReference, label + " kaynak referansı", 256);
    plans.push({
      edgeBandingId,
      consumedLengthMm: mmFromTenths(consumedTenths),
      wasteAllowanceMm: mmFromTenths(wasteTenths),
      requiredLengthMm: mmFromTenths(requiredTenths),
      rollLengthMm: mmFromTenths(rollLengthTenths),
      rollCount: rawPlan.rollCount,
      purchasedLengthMm: mmFromTenths(purchasedTenths),
      leftoverLengthMm: mmFromTenths(leftoverTenths),
      partIds,
      furnitureIds,
      ...(sourceReference === undefined ? {} : { sourceReference })
    });
  }
  plans.sort((a, b) => a.edgeBandingId < b.edgeBandingId ? -1 : a.edgeBandingId > b.edgeBandingId ? 1 : 0);
  return { status: "ready", plans, missingRollSpecs: [], diagnostics: [] };
}

function validatePriceTable(value: unknown): Map<string, ValidatedRollPrice> {
  if (!Array.isArray(value) || value.length > maxPlans) throw new Error("Rulo fiyat tablosu geçerli bir liste olmalı ve 1.000 satırı aşmamalıdır.");
  const prices = new Map<string, ValidatedRollPrice>();
  let currencyCode: string | null = null;
  for (const [index, rawPrice] of value.entries()) {
    const label = "Rulo fiyatının " + (index + 1) + ". satırı";
    if (!isRecord(rawPrice)) throw new Error(label + " geçerli bir nesne olmalıdır.");
    for (const key of Object.keys(rawPrice)) if (!allowedPriceKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    const edgeBandingId = requireIdentifier(rawPrice.edgeBandingId, label + " katalog kimliği");
    if (rawPrice.unit !== "rulo") throw new Error(label + " fiyat birimi rulo olmalıdır.");
    if (prices.has(edgeBandingId)) throw new Error("Yinelenen rulo fiyatı: " + edgeBandingId + ".");
    if (typeof rawPrice.unitPriceMinor !== "number" || !Number.isSafeInteger(rawPrice.unitPriceMinor) || rawPrice.unitPriceMinor < 0) {
      throw new Error(label + " birim fiyatı negatif olmayan güvenli bir tam sayı olmalıdır.");
    }
    const priceCurrency = requireText(rawPrice.currencyCode, label + " para birimi", 3);
    if (!currencyPattern.test(priceCurrency)) throw new Error(label + " para birimi üç büyük harfli kod olmalıdır.");
    if (currencyCode !== null && currencyCode !== priceCurrency) throw new Error("Rulo fiyat tablosunda farklı para birimleri birlikte kullanılamaz.");
    currencyCode = priceCurrency;
    const sourceReference = rawPrice.sourceReference === undefined
      ? undefined
      : requireText(rawPrice.sourceReference, label + " kaynak referansı", 256);
    prices.set(edgeBandingId, {
      edgeBandingId,
      unitPriceMinor: rawPrice.unitPriceMinor,
      currencyCode: priceCurrency,
      ...(sourceReference === undefined ? {} : { sourceReference })
    });
  }
  return prices;
}

/**
 * Calculates explicit per-roll edge-band purchase costs for a verified roll plan.
 * Currency and prices are user-supplied; incomplete or invalid inputs never expose
 * partial monetary totals. This produces quote-ready material lines, not a quote
 * revision or persisted project pricing snapshot.
 */
export function calculateProjectEdgeBandingRollCostSummary(
  rollPlanInput: unknown,
  rollPriceTable: unknown
): ProjectEdgeBandingRollCostSummary {
  let requiredLineCount = 0;
  try {
    const rollPlan = validateRollPlan(rollPlanInput);
    if (rollPlan.status === "blocked") return blockedResult(rollPlan.diagnostics, 0);
    if (rollPlan.status === "incomplete") {
      return {
        status: "incomplete",
        currencyCode: null,
        requiredLineCount: 0,
        pricedLineCount: 0,
        missingRollSpecs: rollPlan.missingRollSpecs,
        missingPrices: [],
        diagnostics: rollPlan.diagnostics,
        lineSources: [],
        costSummary: null
      };
    }

    requiredLineCount = rollPlan.plans.length;
    const prices = validatePriceTable(rollPriceTable);
    const unusedPrices = [...prices.keys()].filter((id) => !rollPlan.plans.some((plan) => plan.edgeBandingId === id)).sort();
    if (unusedPrices.length !== 0) {
      return blockedResult(["Tüketim planında bulunmayan rulo fiyatları: " + unusedPrices.join(", ") + "."], requiredLineCount);
    }
    if (rollPlan.status === "empty") {
      return {
        status: "empty",
        currencyCode: null,
        requiredLineCount: 0,
        pricedLineCount: 0,
        missingRollSpecs: [],
        missingPrices: [],
        diagnostics: [],
        lineSources: [],
        costSummary: null
      };
    }

    const missingPrices = rollPlan.plans.filter((plan) => !prices.has(plan.edgeBandingId)).map((plan) => plan.edgeBandingId);
    const pricedLineCount = rollPlan.plans.length - missingPrices.length;
    if (missingPrices.length !== 0) {
      return {
        status: "incomplete",
        currencyCode: null,
        requiredLineCount,
        pricedLineCount,
        missingRollSpecs: [],
        missingPrices,
        diagnostics: ["Her kenar bandı rulo alımı için açık bir fiyat ve para birimi tanımlanmalıdır."],
        lineSources: [],
        costSummary: null
      };
    }

    const costLines = rollPlan.plans.map((plan, index) => {
      const price = prices.get(plan.edgeBandingId)!;
      const costLineId = "edge-roll-" + String(index + 1).padStart(4, "0");
      return {
        id: costLineId,
        category: "material" as const,
        description: "Kenar bandı rulo satın alımı — " + plan.edgeBandingId,
        quantity: plan.rollCount,
        unit: "rulo",
        unitPriceMinor: price.unitPriceMinor,
        currencyCode: price.currencyCode,
        ...(price.sourceReference === undefined ? {} : { sourceReference: price.sourceReference })
      };
    });
    const costSummary = calculateProjectCostSummary(costLines);
    if (costSummary.status !== "ready" || costSummary.lineCount !== requiredLineCount || costSummary.currencyCode === null) {
      return blockedResult(["Rulo satın alım maliyet özeti tüm satırları doğrulayamadı."], requiredLineCount);
    }
    const lineSources = rollPlan.plans.map((plan, index) => {
      const price = prices.get(plan.edgeBandingId)!;
      return {
        costLineId: costLines[index].id,
        edgeBandingId: plan.edgeBandingId,
        rollCount: plan.rollCount,
        rollLengthMm: plan.rollLengthMm,
        purchasedLengthMm: plan.purchasedLengthMm,
        partIds: [...plan.partIds],
        furnitureIds: [...plan.furnitureIds],
        ...(plan.sourceReference === undefined ? {} : { planSourceReference: plan.sourceReference }),
        ...(price.sourceReference === undefined ? {} : { priceSourceReference: price.sourceReference })
      };
    });
    return {
      status: "ready",
      currencyCode: costSummary.currencyCode,
      requiredLineCount,
      pricedLineCount: requiredLineCount,
      missingRollSpecs: [],
      missingPrices: [],
      diagnostics: [],
      lineSources,
      costSummary
    };
  } catch (error) {
    return blockedResult([diagnosticMessage(error)], requiredLineCount);
  }
}
