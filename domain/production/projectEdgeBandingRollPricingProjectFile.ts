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
const maxProjectEnvelopeBytes = 16 * 1024 * 1024;
const maxProjectEnvelopeDepth = 64;

interface JsonResourceBudget { bytes: number; }

function addJsonBytes(budget: JsonResourceBudget, bytes: number): void {
  if (bytes > maxProjectEnvelopeBytes - budget.bytes) {
    throw new Error("Proje JSON v2 zarfı 16 MiB UTF-8 boyut sınırını aşamaz.");
  }
  budget.bytes += bytes;
}

function jsonStringByteLength(value: string): number {
  if (value.length > maxProjectEnvelopeBytes) return maxProjectEnvelopeBytes + 1;
  let bytes = 2;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x22 || code === 0x5c) {
      bytes += 2;
    } else if (code <= 0x1f) {
      bytes += code === 0x08 || code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d ? 2 : 6;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 6;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      bytes += 6;
    } else if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else {
      bytes += 3;
    }
    if (bytes > maxProjectEnvelopeBytes) return maxProjectEnvelopeBytes + 1;
  }
  return bytes;
}

/**
 * Clones only JSON data descriptors. Accessors are never read; Proxy reflection
 * traps may run as part of JavaScript reflection, but thrown traps are contained
 * by the public read/write boundary.
 */
function cloneAndFreezeJsonValue(
  value: unknown,
  ancestors: WeakSet<object>,
  budget: JsonResourceBudget,
  depth = 1
): unknown {
  if (value === null) {
    addJsonBytes(budget, 4);
    return value;
  }
  if (typeof value === "string") {
    addJsonBytes(budget, jsonStringByteLength(value));
    return value;
  }
  if (typeof value === "boolean") {
    addJsonBytes(budget, value ? 4 : 5);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Proje zarfı JSON uyumlu olmayan sayısal değer içeriyor.");
    const serialized = JSON.stringify(value);
    if (typeof serialized !== "string") throw new Error("Proje zarfı JSON uyumlu olmayan sayısal değer içeriyor.");
    addJsonBytes(budget, serialized.length);
    return value;
  }
  if (typeof value !== "object") throw new Error("Proje zarfı JSON uyumlu olmayan değer içeriyor.");
  if (depth > maxProjectEnvelopeDepth) {
    throw new Error("Proje JSON v2 zarfı en fazla 64 iç içe nesne/dizi seviyesi içerebilir.");
  }
  if (ancestors.has(value)) throw new Error("Proje zarfı döngüsel veri içeriyor.");
  ancestors.add(value);

  let cloned: unknown;
  if (Array.isArray(value)) {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const length = lengthDescriptor && "value" in lengthDescriptor ? lengthDescriptor.value : undefined;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
      throw new Error("Proje zarfı JSON dışı dizi alanı içeriyor.");
    }
    const keys = Object.keys(value);
    const ownNames = Object.getOwnPropertyNames(value);
    if (
      Object.getOwnPropertySymbols(value).length !== 0 ||
      keys.length !== length ||
      ownNames.length !== length + 1
    ) {
      throw new Error("Proje zarfı JSON dışı dizi alanı içeriyor.");
    }
    addJsonBytes(budget, 1);
    const copy: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      if (index > 0) addJsonBytes(budget, 1);
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new Error("Proje zarfı JSON dışı dizi alanı içeriyor.");
      }
      copy.push(cloneAndFreezeJsonValue(descriptor.value, ancestors, budget, depth + 1));
    }
    addJsonBytes(budget, 1);
    cloned = copy;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Proje zarfı düz JSON nesnesi içermelidir.");
    }
    const keys = Object.keys(value);
    const ownNames = Object.getOwnPropertyNames(value);
    if (ownNames.length !== keys.length || Object.getOwnPropertySymbols(value).length !== 0) {
      throw new Error("Proje zarfı JSON dışı nesne alanı içeriyor.");
    }
    addJsonBytes(budget, 1);
    const copy: Record<string, unknown> = {};
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (index > 0) addJsonBytes(budget, 1);
      addJsonBytes(budget, jsonStringByteLength(key));
      addJsonBytes(budget, 1);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new Error("Proje zarfı JSON dışı nesne alanı içeriyor.");
      }
      const child = cloneAndFreezeJsonValue(descriptor.value, ancestors, budget, depth + 1);
      Object.defineProperty(copy, key, {
        value: child,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    addJsonBytes(budget, 1);
    cloned = copy;
  }

  ancestors.delete(value);
  return Object.freeze(cloned);
}

function readOwnEnumerableDataProperty(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (!descriptor.enumerable || !("value" in descriptor)) {
    throw new Error("Proje JSON alanları own enumerable data property olmalıdır.");
  }
  return descriptor.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
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
function blockedEnvelope(message: string): Envelope { return { status: "blocked", project: null, projectId: null, diagnostics: [message] }; }

function inspect(value: unknown, cloneEnvelope = false): Envelope {
  try {
    if (!isRecord(value)) return blockedEnvelope("MobilyaCAD proje dosyası geçerli bir nesne olmalıdır.");
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return blockedEnvelope("MobilyaCAD proje dosyası düz JSON nesnesi olmalıdır.");
    }
    const format = readOwnEnumerableDataProperty(value, "format");
    const formatVersion = readOwnEnumerableDataProperty(value, "formatVersion");
    if (format !== "MobilyaCAD") return blockedEnvelope("Dosya MobilyaCAD proje formatıyla uyumlu değil.");
    if (formatVersion === 1) {
      if (Object.getOwnPropertyDescriptor(value, PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD) !== undefined) {
        return blockedEnvelope("Proje JSON v1 edgeBandingRollPricing alanını desteklemez; rulo girdileri v2 geçişine kadar ayrı tutulmalıdır.");
      }
      return { status: "legacy", project: value, projectId: null, diagnostics: [] };
    }
    if (formatVersion !== 2) {
      return blockedEnvelope("Kenar bandı rulo girdileri yalnızca MobilyaCAD proje JSON v1 veya v2 zarfını destekler.");
    }

    const projectId = readOwnEnumerableDataProperty(value, "projectId");
    if (typeof projectId !== "string" || projectId.trim() === "" || projectId.trim() !== projectId || !projectIdPattern.test(projectId)) {
      return blockedEnvelope("Proje JSON v2, rulo girdileri için kararlı ve geçerli projectId içermelidir.");
    }
    if (!cloneEnvelope) return { status: "ready", project: value, projectId, diagnostics: [] };

    const clonedProject = cloneAndFreezeJsonValue(value, new WeakSet<object>(), { bytes: 0 });
    if (!isRecord(clonedProject)) return blockedEnvelope("MobilyaCAD proje dosyası geçerli bir nesne olmalıdır.");
    if (
      readOwnEnumerableDataProperty(clonedProject, "format") !== "MobilyaCAD" ||
      readOwnEnumerableDataProperty(clonedProject, "formatVersion") !== 2 ||
      readOwnEnumerableDataProperty(clonedProject, "projectId") !== projectId
    ) {
      return blockedEnvelope("Proje JSON v2 zarfı güvenli kopyalama sırasında değişti.");
    }
    return { status: "ready", project: clonedProject, projectId, diagnostics: [] };
  } catch (error) {
    return blockedEnvelope(error instanceof Error ? error.message : String(error));
  }
}

function validatePricing(value: unknown): ProjectEdgeBandingRollPricingInput {
  const safeValue = cloneAndFreezeJsonValue(value, new WeakSet<object>(), { bytes: 0 });
  if (!isRecord(safeValue)) throw new Error("Kenar bandı rulo fiyatlama uzantısı geçerli bir nesne olmalıdır.");
  for (const key of Object.keys(safeValue)) if (!envelopeKeys.has(key)) throw new Error("Rulo fiyatlama uzantısı desteklenmeyen alan içeriyor: " + key + ".");
  if (readOwnEnumerableDataProperty(safeValue, "schemaVersion") !== 1) throw new Error("Kenar bandı rulo fiyatlama uzantısı yalnızca schemaVersion 1 destekler.");
  const rollSpecsValue = readOwnEnumerableDataProperty(safeValue, "rollSpecs");
  const rollPriceTableValue = readOwnEnumerableDataProperty(safeValue, "rollPriceTable");
  if (!Array.isArray(rollSpecsValue) || rollSpecsValue.length > maxEntries) throw new Error("Rulo ölçü tanımları liste olmalı ve 1.000 satırı aşmamalıdır.");
  if (!Array.isArray(rollPriceTableValue) || rollPriceTableValue.length > maxEntries) throw new Error("Rulo fiyat tablosu liste olmalı ve 1.000 satırı aşmamalıdır.");
  const specs: ProjectEdgeBandingRollPlanSpec[] = [];
  const specIds = new Set<string>();
  for (const [i, raw] of rollSpecsValue.entries()) {
    const label = "Rulo ölçü tanımının " + (i + 1) + ". satırı";
    if (!isRecord(raw)) throw new Error(label + " nesne olmalıdır.");
    for (const key of Object.keys(raw)) if (!specKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    const edgeBandingId = requireId(readOwnEnumerableDataProperty(raw, "edgeBandingId"), label + " katalog kimliği");
    if (specIds.has(edgeBandingId)) throw new Error("Yinelenen rulo ölçü tanımı: " + edgeBandingId + ".");
    specIds.add(edgeBandingId);
    const rollLengthMm = mm(mmTenths(readOwnEnumerableDataProperty(raw, "rollLengthMm"), label + " rulo uzunluğu", false));
    const wasteValue = readOwnEnumerableDataProperty(raw, "wasteAllowanceMm");
    const wasteAllowanceMm = wasteValue === undefined ? 0 : mm(mmTenths(wasteValue, label + " sabit ek payı", true));
    const sourceValue = readOwnEnumerableDataProperty(raw, "sourceReference");
    const sourceReference = sourceValue === undefined ? undefined : requireText(sourceValue, label + " kaynak referansı", 256);
    specs.push({ edgeBandingId, rollLengthMm, wasteAllowanceMm, ...(sourceReference === undefined ? {} : { sourceReference }) });
  }
  const prices: ProjectEdgeBandingRollPriceInput[] = [];
  const priceIds = new Set<string>();
  for (const [i, raw] of rollPriceTableValue.entries()) {
    const label = "Rulo fiyatının " + (i + 1) + ". satırı";
    if (!isRecord(raw)) throw new Error(label + " nesne olmalıdır.");
    for (const key of Object.keys(raw)) if (!priceKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    const edgeBandingId = requireId(readOwnEnumerableDataProperty(raw, "edgeBandingId"), label + " katalog kimliği");
    if (priceIds.has(edgeBandingId)) throw new Error("Yinelenen rulo fiyatı: " + edgeBandingId + ".");
    priceIds.add(edgeBandingId);
    if (readOwnEnumerableDataProperty(raw, "unit") !== "rulo") throw new Error(label + " birimi rulo olmalıdır.");
    const unitPriceMinor = readOwnEnumerableDataProperty(raw, "unitPriceMinor");
    if (typeof unitPriceMinor !== "number" || !Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) throw new Error(label + " fiyatı negatif olmayan güvenli bir tam sayı olmalıdır.");
    const currencyCode = readOwnEnumerableDataProperty(raw, "currencyCode");
    if (typeof currencyCode !== "string" || !currencyPattern.test(currencyCode)) throw new Error(label + " para birimi üç büyük harfli ISO kodu olmalıdır.");
    const sourceValue = readOwnEnumerableDataProperty(raw, "sourceReference");
    const sourceReference = sourceValue === undefined ? undefined : requireText(sourceValue, label + " kaynak referansı", 256);
    prices.push({ edgeBandingId, unit: "rulo", unitPriceMinor, currencyCode, ...(sourceReference === undefined ? {} : { sourceReference }) });
  }
  specs.sort(compareId);
  prices.sort(compareId);
  return { schemaVersion: 1, rollSpecs: specs, rollPriceTable: prices };
}

function readPricingFromEnvelope(envelope: Envelope): ProjectEdgeBandingRollPricingProjectFileReadResult {
  if (envelope.status === "blocked") return blockedRead(envelope.diagnostics[0]);
  if (envelope.status === "legacy") return Object.freeze({ status: "legacy", projectId: null, pricing: null, diagnostics: Object.freeze([]) });
  try {
    const descriptor = Object.getOwnPropertyDescriptor(envelope.project, PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD);
    if (!descriptor) {
      const pricing = deepFreeze({ schemaVersion: 1 as const, rollSpecs: [] as ProjectEdgeBandingRollPlanSpec[], rollPriceTable: [] as ProjectEdgeBandingRollPriceInput[] });
      return Object.freeze({ status: "empty", projectId: envelope.projectId, pricing, diagnostics: Object.freeze([]) });
    }
    if (!descriptor.enumerable || !("value" in descriptor)) throw new Error("Proje JSON v2 rulo uzantısı own enumerable data property olmalıdır.");
    const pricing = deepFreeze(validatePricing(descriptor.value));
    const status = pricing.rollSpecs.length === 0 && pricing.rollPriceTable.length === 0 ? "empty" as const : "ready" as const;
    return Object.freeze({ status, projectId: envelope.projectId, pricing, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedRead(error instanceof Error ? error.message : String(error));
  }
}

/** Reads only the editable roll inputs; quote history and project core validation remain separate. */
export function readProjectEdgeBandingRollPricingFromProjectFile(projectValue: unknown): ProjectEdgeBandingRollPricingProjectFileReadResult {
  return readPricingFromEnvelope(inspect(projectValue));
}

/** Immutably saves validated roll inputs to a v2 project; empty inputs remove the extension. */
export function setProjectEdgeBandingRollPricingInProjectFile(projectValue: unknown, pricingValue: unknown): ProjectEdgeBandingRollPricingProjectFileWriteResult {
  const envelope = inspect(projectValue, true);
  if (envelope.status === "blocked") return blockedWrite(envelope.diagnostics[0]);
  if (envelope.status === "legacy") return blockedWrite("Kenar bandı rulo girdileri proje JSON v1 dosyasına yazılamaz; önce kararlı projectId içeren v2 proje migrasyonu gerekir.");
  const current = readPricingFromEnvelope(envelope);
  if (current.status === "blocked") return blockedWrite(current.diagnostics[0] ?? "Mevcut rulo girdileri doğrulanamadı.");
  let pricing: DeepReadonly<ProjectEdgeBandingRollPricingInput>;
  try { pricing = deepFreeze(validatePricing(pricingValue)); }
  catch (error) { return blockedWrite(error instanceof Error ? error.message : String(error)); }
  const nextProject: Record<string, unknown> = { ...envelope.project };
  if (pricing.rollSpecs.length === 0 && pricing.rollPriceTable.length === 0) delete nextProject[PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD];
  else Object.defineProperty(nextProject, PROJECT_EDGE_BANDING_ROLL_PRICING_FIELD, { value: pricing, enumerable: true, configurable: true, writable: true });
  return Object.freeze({ status: "ready", project: Object.freeze(nextProject), pricing, diagnostics: Object.freeze([]) });
}
