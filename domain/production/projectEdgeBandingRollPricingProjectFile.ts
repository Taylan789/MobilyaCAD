import type { ProjectEdgeBandingRollPlanSpec } from "./projectEdgeBandingRollPlan.ts";
import type { ProjectEdgeBandingRollPriceInput } from "./projectEdgeBandingRollCostSummary.ts";

type DeepReadonly<T> = T extends readonly (infer U)[] ? readonly DeepReadonly<U>[] : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export const PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD = "edgeBandingRollPricing" as const;

export interface ProjectEdgeBandingRollPricingInput {
  schemaVersion: 1;
  rollSpecs: readonly ProjectEdgeBandingRollPlanSpec[];
  rollPriceTable: readonly ProjectEdgeBandingRollPriceInput[];
}
export interface ProjectEdgeBandingRollPricingProjectFileReadResult {
  status: "legacy" | "empty" | "ready" | "blocked";
  projectId: string | null;
  pricing: DeepReadonly<ProjectEdgeBandingRollPricingInput> | null;
  diagnostics: readonly string[];
}
export interface ProjectEdgeBandingRollPricingProjectFileWriteResult {
  status: "ready" | "blocked";
  project: Readonly<Record<string, unknown>> | null;
  pricing: DeepReadonly<ProjectEdgeBandingRollPricingInput> | null;
  diagnostics: readonly string[];
}
type Envelope = { status: "legacy"; project: Record<string, unknown>; projectId: null; diagnostics: readonly string[] } | { status: "ready"; project: Record<string, unknown>; projectId: string; diagnostics: readonly string[] } | { status: "blocked"; project: null; projectId: null; diagnostics: readonly string[] };

const envelopeKeys = new Set(["schemaVersion", "rollSpecs", "rollPriceTable"]);
const specKeys = new Set(["edgeBandingId", "rollLengthMm", "wasteAllowanceMm", "sourceReference"]);
const priceKeys = new Set(["edgeBandingId", "unit", "unitPriceMinor", "currencyCode", "sourceReference"]);
const idPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const projectIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const currencyPattern = /^[A-Z]{3}$/;
const maxEntries = 1000;
const maxMm = 10_000_000;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function requireText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value || value.length > max) throw new Error(label + " boş olmayan, kenar boşluğu içermeyen ve en fazla " + max + " karakterlik metin olmalıdır.");
  return value;
}
function requireId(value: unknown, label: string): string {
  const id = requireText(value, label, 64);
  if (!idPattern.test(id)) throw new Error(label + " geçersiz.");
  return id;
}
function mmTenths(value: unknown, label: string, allowZero: boolean): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < (allowZero ? 0 : 0.1) || value > maxMm) throw new Error(label + " geçerli, " + (allowZero ? "negatif olmayan" : "en az 0.1") + " ve en fazla " + maxMm + " mm olmalıdır.");
  const tenths = Math.round(value * 10);
  if (!Number.isSafeInteger(tenths) || Math.abs(tenths / 10 - value) > 1e-8) throw new Error(label + " en fazla 0.1 mm hassasiyetinde olmalıdır.");
  return tenths;
}
function mm(tenths: number): number { return tenths / 10; }
function compareId(a: { edgeBandingId: string }, b: { edgeBandingId: string }): number { return a.edgeBandingId < b.edgeBandingId ? -1 : a.edgeBandingId > b.edgeBandingId ? 1 : 0; }
function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as unknown as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
function blockedRead(message: string): ProjectEdgeBandingRollPricingProjectFileReadResult { return Object.freeze({ status: "blocked", projectId: null, pricing: null, diagnostics: Object.freeze([message]) }); }
function blockedWrite(message: string): ProjectEdgeBandingRollPricingProjectFileWriteResult { return Object.freeze({ status: "blocked", project: null, pricing: null, diagnostics: Object.freeze([message]) }); }

function inspect(value: unknown): Envelope {
  if (!isRecord(value)) return { status: "blocked", project: null, projectId: null, diagnostics: ["MobilyaCAD proje dosyası geçerli bir nesne olmalıdır."] };
  if (value.format !== "MobilyaCAD") return { status: "blocked", project: null, projectId: null, diagnostics: ["Dosya MobilyaCAD proje formatıyla uyumlu değil."] };
  if (value.formatVersion === 1) {
    if (Object.prototype.hasOwnProperty.call(value, PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD)) return { status: "blocked", project: null, projectId: null, diagnostics: ["Proje JSON v1 edgeBandingRollPricing alanını desteklemez; rulo girdileri v2 geçişine kadar ayrı tutulmalıdır."] };
    return { status: "legacy", project: value, projectId: null, diagnostics: [] };
  }
  if (value.formatVersion !== 2) return { status: "blocked", project: null, projectId: null, diagnostics: ["Kenar bandı rulo girdileri yalnızca MobilyaCAD proje JSON v1 veya v2 zarfını destekler."] };
  const projectId = value.projectId;
  if (typeof projectId !== "string" || projectId.trim() === "" || projectId.trim() !== projectId || !projectIdPattern.test(projectId)) return { status: "blocked", project: null, projectId: null, diagnostics: ["Proje JSON v2, rulo girdileri için kararlı ve geçerli projectId içermelidir."] };
  return { status: "ready", project: value, projectId, diagnostics: [] };
}

function validatePricing(value: unknown): ProjectEdgeBandingRollPricingInput {
  if (!isRecord(value)) throw new Error("Kenar bandı rulo fiyatlama uzantısı geçerli bir nesne olmalıdır.");
  for (const key of Object.keys(value)) if (!envelopeKeys.has(key)) throw new Error("Rulo fiyatlama uzantısı desteklenmeyen alan içeriyor: " + key + ".");
  if (value.schemaVersion !== 1) throw new Error("Kenar bandı rulo fiyatlama uzantısı yalnızca schemaVersion 1 destekler.");
  if (!Array.isArray(value.rollSpecs) || value.rollSpecs.length > maxEntries) throw new Error("Rulo ölçü tanımları liste olmalı ve 1.000 satırı aşmamalıdır.");
  if (!Array.isArray(value.rollPriceTable) || value.rollPriceTable.length > maxEntries) throw new Error("Rulo fiyat tablosu liste olmalı ve 1.000 satırı aşmamalıdır.");
  const specs: ProjectEdgeBandingRollPlanSpec[] = [];
  const specIds = new Set<string>();
  for (const [i, raw] of value.rollSpecs.entries()) {
    const label = "Rulo ölçü tanımının " + (i + 1) + ". satırı";
    if (!isRecord(raw)) throw new Error(label + " nesne olmalıdır.");
    for (const key of Object.keys(raw)) if (!specKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    const edgeBandingId = requireId(raw.edgeBandingId, label + " katalog kimliği");
    if (specIds.has(edgeBandingId)) throw new Error("Yinelenen rulo ölçü tanımı: " + edgeBandingId + ".");
    specIds.add(edgeBandingId);
    const rollLengthMm = mm(mmTenths(raw.rollLengthMm, label + " rulo uzunluğu", false));
    const wasteAllowanceMm = raw.wasteAllowanceMm === undefined ? 0 : mm(mmTenths(raw.wasteAllowanceMm, label + " sabit ek payı", true));
    const sourceReference = raw.sourceReference === undefined ? undefined : requireText(raw.sourceReference, label + " kaynak referansı", 256);
    specs.push({ edgeBandingId, rollLengthMm, wasteAllowanceMm, ...(sourceReference === undefined ? {} : { sourceReference }) });
  }
  const prices: ProjectEdgeBandingRollPriceInput[] = [];
  const priceIds = new Set<string>();
  for (const [i, raw] of value.rollPriceTable.entries()) {
    const label = "Rulo fiyatının " + (i + 1) + ". satırı";
    if (!isRecord(raw)) throw new Error(label + " nesne olmalıdır.");
    for (const key of Object.keys(raw)) if (!priceKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    const edgeBandingId = requireId(raw.edgeBandingId, label + " katalog kimliği");
    if (priceIds.has(edgeBandingId)) throw new Error("Yinelenen rulo fiyatı: " + edgeBandingId + ".");
    priceIds.add(edgeBandingId);
    if (raw.unit !== "rulo") throw new Error(label + " birimi rulo olmalıdır.");
    if (typeof raw.unitPriceMinor !== "number" || !Number.isSafeInteger(raw.unitPriceMinor) || raw.unitPriceMinor < 0) throw new Error(label + " fiyatı negatif olmayan güvenli bir tam sayı olmalıdır.");
    if (typeof raw.currencyCode !== "string" || !currencyPattern.test(raw.currencyCode)) throw new Error(label + " para birimi üç büyük harfli ISO kodu olmalıdır.");
    const sourceReference = raw.sourceReference === undefined ? undefined : requireText(raw.sourceReference, label + " kaynak referansı", 256);
    prices.push({ edgeBandingId, unit: "rulo", unitPriceMinor: raw.unitPriceMinor, currencyCode: raw.currencyCode, ...(sourceReference === undefined ? {} : { sourceReference }) });
  }
  specs.sort(compareId);
  prices.sort(compareId);
  return { schemaVersion: 1, rollSpecs: specs, rollPriceTable: prices };
}

/** Reads only the editable roll inputs; quote history and project core validation remain separate. */
export function readProjectEdgeBandingRollPricingFromProjectFile(projectValue: unknown): ProjectEdgeBandingRollPricingProjectFileReadResult {
  const envelope = inspect(projectValue);
  if (envelope.status === "blocked") return blockedRead(envelope.diagnostics[0]);
  if (envelope.status === "legacy") return Object.freeze({ status: "legacy", projectId: null, pricing: null, diagnostics: Object.freeze([]) });
  if (!Object.prototype.hasOwnProperty.call(envelope.project, PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD)) {
    const pricing = deepFreeze({ schemaVersion: 1 as const, rollSpecs: [] as ProjectEdgeBandingRollPlanSpec[], rollPriceTable: [] as ProjectEdgeBandingRollPriceInput[] });
    return Object.freeze({ status: "empty", projectId: envelope.projectId, pricing, diagnostics: Object.freeze([]) });
  }
  try {
    const pricing = deepFreeze(validatePricing(envelope.project[PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD]));
    const status = pricing.rollSpecs.length === 0 && pricing.rollPriceTable.length === 0 ? "empty" as const : "ready" as const;
    return Object.freeze({ status, projectId: envelope.projectId, pricing, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedRead(error instanceof Error ? error.message : String(error));
  }
}

/** Immutably saves validated roll inputs to a v2 project; empty inputs remove the extension. */
export function setProjectEdgeBandingRollPricingInProjectFile(projectValue: unknown, pricingValue: unknown): ProjectEdgeBandingRollPricingProjectFileWriteResult {
  const envelope = inspect(projectValue);
  if (envelope.status === "blocked") return blockedWrite(envelope.diagnostics[0]);
  if (envelope.status === "legacy") return blockedWrite("Kenar bandı rulo girdileri proje JSON v1 dosyasına yazılamaz; önce kararlı projectId içeren v2 proje migrasyonu gerekir.");
  const current = readProjectEdgeBandingRollPricingFromProjectFile(envelope.project);
  if (current.status === "blocked") return blockedWrite(current.diagnostics[0] ?? "Mevcut rulo girdileri doğrulanamadı.");
  let pricing: DeepReadonly<ProjectEdgeBandingRollPricingInput>;
  try { pricing = deepFreeze(validatePricing(pricingValue)); }
  catch (error) { return blockedWrite(error instanceof Error ? error.message : String(error)); }
  const nextProject: Record<string, unknown> = { ...envelope.project };
  if (pricing.rollSpecs.length === 0 && pricing.rollPriceTable.length === 0) delete nextProject[PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD];
  else nextProject[PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD] = pricing;
  return Object.freeze({ status: "ready", project: Object.freeze(nextProject), pricing, diagnostics: Object.freeze([]) });
}
