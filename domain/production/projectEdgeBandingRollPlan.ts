import type { ProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";
import { serializeProjectEdgeBandingConsumptionFile } from "./projectEdgeBandingConsumptionFile.ts";

export interface ProjectEdgeBandingRollPlanSpec {
  edgeBandingId: string;
  rollLengthMm: number;
  /** Explicit extra length for this material; omitted means zero, not an inferred waste rate. */
  wasteAllowanceMm?: number;
  sourceReference?: string;
}

export interface ProjectEdgeBandingRollPlan {
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

export interface ProjectEdgeBandingRollPlanResult {
  status: "empty" | "ready" | "incomplete" | "blocked";
  plans: readonly ProjectEdgeBandingRollPlan[] | null;
  missingRollSpecs: readonly string[];
  diagnostics: readonly string[];
}

const allowedSpecKeys = new Set(["edgeBandingId", "rollLengthMm", "wasteAllowanceMm", "sourceReference"]);
const identifierPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const maxMm = 10_000_000;
const maxSpecs = 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() !== value || !identifierPattern.test(value)) {
    throw new Error(label + " geçerli bir katalog kimliği olmalıdır.");
  }
  return value;
}

function mmToTenths(value: unknown, label: string, allowZero: boolean): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < (allowZero ? 0 : Number.MIN_VALUE) || value > maxMm) {
    throw new Error(label + " " + (allowZero ? "negatif olmayan" : "sıfırdan büyük") + " ve en fazla " + maxMm + " mm olmalıdır.");
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

function blocked(message: string): ProjectEdgeBandingRollPlanResult {
  return { status: "blocked", plans: null, missingRollSpecs: [], diagnostics: [message] };
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Calculates roll purchase quantities using only measured consumption and explicit
 * user roll lengths/allowances. No waste percentage, price, or roll standard is inferred.
 * Any missing or invalid input blocks the complete plan instead of returning partial rolls.
 */
export function calculateProjectEdgeBandingRollPlan(
  consumption: unknown,
  rollSpecs: unknown
): ProjectEdgeBandingRollPlanResult {
  try {
    const validatedSummary = serializeProjectEdgeBandingConsumptionFile(consumption);
    if (validatedSummary.status !== "ready") {
      return blocked(validatedSummary.diagnostics.join("; ") || "Kenar bantlama tüketim özeti doğrulanamadı.");
    }
    if (!Array.isArray(rollSpecs) || rollSpecs.length > maxSpecs) {
      return blocked("Kenar bandı rulo tanımları liste olmalı ve 1.000 satırı aşmamalıdır.");
    }
    const groups = consumption as ProjectEdgeBandingConsumptionSummary[];
    if (groups.length === 0) {
      if (rollSpecs.length !== 0) return blocked("Boş tüketim için kullanılmayan rulo tanımı verildi.");
      return { status: "empty", plans: [], missingRollSpecs: [], diagnostics: [] };
    }

    interface Aggregate {
      lengthTenths: number;
      partIds: Set<string>;
      furnitureIds: Set<string>;
    }
    const aggregates = new Map<string, Aggregate>();
    for (const group of groups) {
      if (group.edgeBandingId === null) return blocked("Katalog kimliği olmayan eski kenar bandı grupları rulo planına bağlanamaz.");
      const lengthTenths = mmToTenths(group.totalLengthMm, "Tüketim uzunluğu", true);
      const aggregate = aggregates.get(group.edgeBandingId) ?? {
        lengthTenths: 0, partIds: new Set<string>(), furnitureIds: new Set<string>()
      };
      aggregate.lengthTenths += lengthTenths;
      if (!Number.isSafeInteger(aggregate.lengthTenths)) return blocked("Kenar bandı tüketim toplamı güvenli aralığı aşıyor.");
      for (const partId of group.partIds) aggregate.partIds.add(partId);
      for (const furnitureId of group.furnitureIds) aggregate.furnitureIds.add(furnitureId);
      aggregates.set(group.edgeBandingId, aggregate);
    }

    const specs = new Map<string, ProjectEdgeBandingRollPlanSpec & { rollLengthTenths: number; wasteAllowanceTenths: number }>();
    for (const [index, rawSpec] of rollSpecs.entries()) {
      const label = "Rulo tanımının " + (index + 1) + ". satırı";
      if (!isRecord(rawSpec)) return blocked(label + " nesne olmalıdır.");
      for (const key of Object.keys(rawSpec)) if (!allowedSpecKeys.has(key)) return blocked(label + " desteklenmeyen alan içeriyor: " + key + ".");
      const edgeBandingId = requireIdentifier(rawSpec.edgeBandingId, label + " katalog kimliği");
      if (specs.has(edgeBandingId)) return blocked("Yinelenen rulo tanımı: " + edgeBandingId + ".");
      const rollLengthTenths = mmToTenths(rawSpec.rollLengthMm, label + " rulo uzunluğu", false);
      const wasteAllowanceTenths = rawSpec.wasteAllowanceMm === undefined ? 0 : mmToTenths(rawSpec.wasteAllowanceMm, label + " ek payı", true);
      const sourceReference = rawSpec.sourceReference === undefined ? undefined : rawSpec.sourceReference;
      if (sourceReference !== undefined && (typeof sourceReference !== "string" || sourceReference.trim() === "" || sourceReference.trim() !== sourceReference || sourceReference.length > 256)) {
        return blocked(label + " kaynak referansı boş, kenar boşluklu veya 256 karakterden uzun olamaz.");
      }
      specs.set(edgeBandingId, {
        edgeBandingId, rollLengthMm: mmFromTenths(rollLengthTenths), wasteAllowanceMm: mmFromTenths(wasteAllowanceTenths),
        rollLengthTenths, wasteAllowanceTenths, ...(sourceReference === undefined ? {} : { sourceReference })
      });
    }

    const unusedSpecs = [...specs.keys()].filter(id => !aggregates.has(id)).sort(compareText);
    if (unusedSpecs.length) return blocked("Tüketimde bulunmayan rulo tanımları: " + unusedSpecs.join(", ") + ".");
    const missingRollSpecs = [...aggregates.keys()].filter(id => !specs.has(id)).sort(compareText);
    if (missingRollSpecs.length) {
      return { status: "incomplete", plans: null, missingRollSpecs, diagnostics: ["Her kenar bandı katalog kimliği için rulo uzunluğu tanımlanmalıdır."] };
    }

    const plans: ProjectEdgeBandingRollPlan[] = [];
    for (const edgeBandingId of [...aggregates.keys()].sort(compareText)) {
      const aggregate = aggregates.get(edgeBandingId)!;
      const spec = specs.get(edgeBandingId)!;
      const requiredTenths = aggregate.lengthTenths + spec.wasteAllowanceTenths;
      if (!Number.isSafeInteger(requiredTenths)) return blocked("Gerekli kenar bandı uzunluğu güvenli aralığı aşıyor.");
      const rollCount = Math.ceil(requiredTenths / spec.rollLengthTenths);
      const purchasedTenths = rollCount * spec.rollLengthTenths;
      if (!Number.isSafeInteger(purchasedTenths) || purchasedTenths < requiredTenths) return blocked("Satın alınacak kenar bandı uzunluğu güvenli aralığı aşıyor.");
      const leftoverTenths = purchasedTenths - requiredTenths;
      plans.push({
        edgeBandingId, consumedLengthMm: mmFromTenths(aggregate.lengthTenths), wasteAllowanceMm: spec.wasteAllowanceMm,
        requiredLengthMm: mmFromTenths(requiredTenths), rollLengthMm: spec.rollLengthMm, rollCount,
        purchasedLengthMm: mmFromTenths(purchasedTenths), leftoverLengthMm: mmFromTenths(leftoverTenths),
        partIds: [...aggregate.partIds].sort(compareText), furnitureIds: [...aggregate.furnitureIds].sort(compareText),
        ...(spec.sourceReference === undefined ? {} : { sourceReference: spec.sourceReference })
      });
    }
    return { status: "ready", plans, missingRollSpecs: [], diagnostics: [] };
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }
}
