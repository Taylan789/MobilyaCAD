import {
  appendProjectQuoteRevision,
  validateProjectQuoteRevisionHistory,
  type ProjectQuoteRevisionHistory
} from "./projectQuoteRevision.ts";
import { parseProjectQuoteRevisionHistoryFile } from "./projectQuoteRevisionFile.ts";

type DeepReadonly<T> =
  T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export const PROJECT_QUOTE_REVISION_HISTORY_FIELD = "quoteRevisionHistory" as const;

export interface ProjectQuoteRevisionProjectFileReadResult {
  status: "legacy" | "empty" | "ready" | "blocked";
  projectId: string | null;
  history: DeepReadonly<ProjectQuoteRevisionHistory> | null;
  diagnostics: readonly string[];
}

export interface ProjectQuoteRevisionProjectFileAppendResult {
  status: "ready" | "blocked";
  project: Readonly<Record<string, unknown>> | null;
  history: DeepReadonly<ProjectQuoteRevisionHistory> | null;
  diagnostics: readonly string[];
}


export interface ProjectQuoteRevisionProjectFileImportResult {
  status: "ready" | "blocked";
  project: Readonly<Record<string, unknown>> | null;
  history: DeepReadonly<ProjectQuoteRevisionHistory> | null;
  diagnostics: readonly string[];
}

type ProjectEnvelopeInspection =
  | {
      status: "legacy";
      project: Record<string, unknown>;
      projectId: null;
      diagnostics: readonly string[];
    }
  | {
      status: "ready";
      project: Record<string, unknown>;
      projectId: string;
      diagnostics: readonly string[];
    }
  | {
      status: "blocked";
      project: null;
      projectId: null;
      diagnostics: readonly string[];
    };

export const PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES = 16 * 1024 * 1024;
export const PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH = 64;
const projectIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

const projectEnvelopeSizeLimitMessage = "Proje JSON v2 zarfı 16 MiB UTF-8 boyut sınırını aşamaz.";
const projectEnvelopeDepthLimitMessage = "Proje JSON v2 zarfı en fazla 64 iç içe nesne/dizi seviyesi içerebilir.";

interface JsonResourceBudget {
  bytes: number;
}

function addJsonBytes(budget: JsonResourceBudget, bytes: number): void {
  if (bytes > PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES - budget.bytes) {
    throw new Error(projectEnvelopeSizeLimitMessage);
  }
  budget.bytes += bytes;
}

function jsonStringByteLength(value: string): number {
  if (value.length > PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES) {
    return PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES + 1;
  }

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

    if (bytes > PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES) {
      return PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES + 1;
    }
  }
  return bytes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneAndFreezeJsonValue(
  value: unknown,
  ancestors: WeakSet<object>,
  budget: JsonResourceBudget,
  depth = 1,
  clone = true
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
    const jsonNumber = JSON.stringify(value);
    if (typeof jsonNumber !== "string") throw new Error("Proje zarfı JSON uyumlu olmayan sayısal değer içeriyor.");
    addJsonBytes(budget, jsonNumber.length);
    return value;
  }
  if (typeof value !== "object") throw new Error("Proje zarfı JSON uyumlu olmayan değer içeriyor.");
  if (depth > PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH) {
    throw new Error(projectEnvelopeDepthLimitMessage);
  }
  if (ancestors.has(value)) throw new Error("Proje zarfı döngüsel veri içeriyor.");
  ancestors.add(value);

  let cloned: unknown;
  if (Array.isArray(value)) {
    const ownNames = Object.getOwnPropertyNames(value);
    if (
      Object.getOwnPropertySymbols(value).length !== 0 ||
      Object.keys(value).length !== value.length ||
      ownNames.length !== value.length + 1
    ) {
      throw new Error("Proje zarfı JSON dışı dizi alanı içeriyor.");
    }
    addJsonBytes(budget, 2);
    const copy: unknown[] | null = clone ? [] : null;
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) addJsonBytes(budget, 1);
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new Error("Proje zarfı JSON dışı dizi alanı içeriyor.");
      }
      const child = cloneAndFreezeJsonValue(descriptor.value, ancestors, budget, depth + 1, clone);
      if (copy !== null) copy.push(child);
    }
    cloned = copy;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (!isRecord(value) || (prototype !== Object.prototype && prototype !== null)) {
      throw new Error("Proje zarfı düz JSON nesnesi içermelidir.");
    }
    const keys = Object.keys(value);
    if (
      Object.getOwnPropertyNames(value).length !== keys.length ||
      Object.getOwnPropertySymbols(value).length !== 0
    ) {
      throw new Error("Proje zarfı JSON dışı nesne alanı içeriyor.");
    }
    addJsonBytes(budget, 2);
    const copy: Record<string, unknown> | null = clone ? {} : null;
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (index > 0) addJsonBytes(budget, 1);
      addJsonBytes(budget, jsonStringByteLength(key));
      addJsonBytes(budget, 1);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new Error("Proje zarfı JSON dışı nesne alanı içeriyor.");
      }
      const child = cloneAndFreezeJsonValue(descriptor.value, ancestors, budget, depth + 1, clone);
      if (copy !== null) {
        Object.defineProperty(copy, key, {
          value: child,
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
    }
    cloned = copy;
  }

  ancestors.delete(value);
  return clone ? Object.freeze(cloned) : undefined;
}

function cloneAndFreezeProjectEnvelope(value: Record<string, unknown>): Readonly<Record<string, unknown>> {
  return cloneAndFreezeJsonValue(value, new WeakSet<object>(), { bytes: 0 }) as Readonly<Record<string, unknown>>;
}

function assertProjectEnvelopeResourceLimits(value: Record<string, unknown>): void {
  cloneAndFreezeJsonValue(value, new WeakSet<object>(), { bytes: 0 }, 1, false);
}

function blockedRead(message: string): ProjectQuoteRevisionProjectFileReadResult {
  return Object.freeze({
    status: "blocked" as const,
    projectId: null,
    history: null,
    diagnostics: Object.freeze([message])
  });
}

function blockedAppend(message: string): ProjectQuoteRevisionProjectFileAppendResult {
  return Object.freeze({
    status: "blocked" as const,
    project: null,
    history: null,
    diagnostics: Object.freeze([message])
  });
}

function blockedImport(message: string): ProjectQuoteRevisionProjectFileImportResult {
  return Object.freeze({
    status: "blocked" as const,
    project: null,
    history: null,
    diagnostics: Object.freeze([message])
  });
}

function inspectProjectEnvelope(value: unknown): ProjectEnvelopeInspection {
  if (!isRecord(value)) {
    return {
      status: "blocked",
      project: null,
      projectId: null,
      diagnostics: ["MobilyaCAD proje dosyası geçerli bir nesne olmalıdır."]
    };
  }
  if (value.format !== "MobilyaCAD") {
    return {
      status: "blocked",
      project: null,
      projectId: null,
      diagnostics: ["Dosya MobilyaCAD proje formatıyla uyumlu değil."]
    };
  }

  if (value.formatVersion === 1) {
    if (Object.prototype.hasOwnProperty.call(value, PROJECT_QUOTE_REVISION_HISTORY_FIELD)) {
      return {
        status: "blocked",
        project: null,
        projectId: null,
        diagnostics: [
          "Proje JSON v1 quoteRevisionHistory alanını desteklemez; teklif geçmişi v2 geçişine kadar ayrı dosyada tutulmalıdır."
        ]
      };
    }
    return { status: "legacy", project: value, projectId: null, diagnostics: Object.freeze([]) };
  }

  if (value.formatVersion !== 2) {
    return {
      status: "blocked",
      project: null,
      projectId: null,
      diagnostics: ["Teklif geçmişi uzantısı yalnızca MobilyaCAD proje JSON v1 veya v2 zarfını destekler."]
    };
  }

  const projectId = value.projectId;
  if (
    typeof projectId !== "string" ||
    projectId.trim() === "" ||
    projectId.trim() !== projectId ||
    !projectIdPattern.test(projectId)
  ) {
    return {
      status: "blocked",
      project: null,
      projectId: null,
      diagnostics: ["Proje JSON v2, teklif geçmişi eşlemesi için kararlı ve geçerli projectId içermelidir."]
    };
  }

  return { status: "ready", project: value, projectId, diagnostics: Object.freeze([]) };
}

/**
 * Reads only the quote-history extension from a project envelope.
 * Full room/furniture/material schema validation remains the project parser's responsibility.
 */
export function readProjectQuoteRevisionHistoryFromProjectFile(
  projectValue: unknown
): ProjectQuoteRevisionProjectFileReadResult {
  const envelope = inspectProjectEnvelope(projectValue);
  if (envelope.status === "blocked") return blockedRead(envelope.diagnostics[0]);
  if (envelope.status === "legacy") {
    return Object.freeze({
      status: "legacy" as const,
      projectId: null,
      history: null,
      diagnostics: Object.freeze([])
    });
  }

  const hasHistory = Object.prototype.hasOwnProperty.call(
    envelope.project,
    PROJECT_QUOTE_REVISION_HISTORY_FIELD
  );
  const historyValue = hasHistory
    ? envelope.project[PROJECT_QUOTE_REVISION_HISTORY_FIELD]
    : { projectId: envelope.projectId, revisions: [] };
  const validated = validateProjectQuoteRevisionHistory(historyValue);

  if (validated.status === "blocked" || validated.history === null) {
    return blockedRead(
      validated.diagnostics[0] ?? "Proje teklif revizyon geçmişi doğrulanamadı."
    );
  }
  if (validated.history.projectId !== envelope.projectId) {
    return blockedRead(
      "Proje JSON v2 projectId değeri teklif revizyon geçmişinin projectId değeriyle eşleşmelidir."
    );
  }

  return Object.freeze({
    status: validated.status,
    projectId: envelope.projectId,
    history: validated.history,
    diagnostics: Object.freeze([])
  });
}

/**
 * Appends a validated revision to a v2 project envelope without mutating the input.
 * Legacy v1 files are intentionally rejected because they have no stable projectId.
 */
export function appendProjectQuoteRevisionToProjectFile(
  projectValue: unknown,
  revisionValue: unknown
): ProjectQuoteRevisionProjectFileAppendResult {
  const envelope = inspectProjectEnvelope(projectValue);
  if (envelope.status === "blocked") return blockedAppend(envelope.diagnostics[0]);
  if (envelope.status === "legacy") {
    return blockedAppend(
      "Teklif revizyonu proje JSON v1 dosyasına eklenemez; önce kararlı projectId içeren v2 proje migrasyonu gerekir."
    );
  }

  let preservedProject: Readonly<Record<string, unknown>>;
  try {
    preservedProject = cloneAndFreezeProjectEnvelope(envelope.project);
  } catch (error) {
    return blockedAppend(
      error instanceof Error ? error.message : "Proje zarfı güvenli biçimde kopyalanamadı."
    );
  }

  const current = readProjectQuoteRevisionHistoryFromProjectFile(preservedProject);
  if (current.status === "blocked" || current.history === null) {
    return blockedAppend(
      current.diagnostics[0] ?? "Mevcut proje teklif revizyon geçmişi doğrulanamadı."
    );
  }

  const appended = appendProjectQuoteRevision(current.history, revisionValue);
  if (appended.status !== "ready" || appended.history === null) {
    return blockedAppend(
      appended.diagnostics[0] ?? "Yeni teklif revizyonu proje dosyasına eklenemedi."
    );
  }

  const nextProject = Object.freeze({
    ...preservedProject,
    [PROJECT_QUOTE_REVISION_HISTORY_FIELD]: appended.history
  });
  try {
    assertProjectEnvelopeResourceLimits(nextProject);
  } catch (error) {
    return blockedAppend(
      error instanceof Error ? error.message : "Yeni proje zarfı kaynak sınırlarını aşıyor."
    );
  }

  return Object.freeze({
    status: "ready" as const,
    project: nextProject,
    history: appended.history,
    diagnostics: Object.freeze([])
  });
}


/**
 * Imports a standalone validated revision-history JSON file into an empty project v2 history.
 * Existing non-empty histories are never overwritten; project identity must match exactly.
 */
export function importProjectQuoteRevisionHistoryFileIntoProject(
  projectValue: unknown,
  historyFileJson: unknown
): ProjectQuoteRevisionProjectFileImportResult {
  const envelope = inspectProjectEnvelope(projectValue);
  if (envelope.status === "blocked") return blockedImport(envelope.diagnostics[0]);
  if (envelope.status === "legacy") {
    return blockedImport(
      "Teklif revizyon geçmişi proje JSON v1 dosyasına aktarılamaz; önce kararlı projectId içeren v2 proje migrasyonu gerekir."
    );
  }

  const imported = parseProjectQuoteRevisionHistoryFile(historyFileJson);
  if (imported.status === "blocked" || imported.history === null) {
    return blockedImport(
      imported.diagnostics[0] ?? "Dışa aktarılmış teklif revizyon geçmişi doğrulanamadı."
    );
  }
  if (imported.history.revisions.length === 0) {
    return blockedImport("Boş teklif revizyon geçmişi proje dosyasına aktarılamaz.");
  }
  if (imported.history.projectId !== envelope.projectId) {
    return blockedImport(
      "İçe aktarılan teklif revizyon geçmişinin projectId değeri hedef proje ile eşleşmelidir."
    );
  }

  let preservedProject: Readonly<Record<string, unknown>>;
  try {
    preservedProject = cloneAndFreezeProjectEnvelope(envelope.project);
  } catch (error) {
    return blockedImport(
      error instanceof Error ? error.message : "Proje zarfı güvenli biçimde kopyalanamadı."
    );
  }

  const current = readProjectQuoteRevisionHistoryFromProjectFile(preservedProject);
  if (current.status === "blocked" || current.history === null) {
    return blockedImport(
      current.diagnostics[0] ?? "Mevcut proje teklif revizyon geçmişi doğrulanamadı."
    );
  }

  if (current.history.revisions.length > 0) {
    return blockedImport(
      "Proje zaten teklif revizyon geçmişi içeriyor; içe aktarma mevcut geçmişi sessizce değiştiremez."
    );
  }

  const nextProject = Object.freeze({
    ...preservedProject,
    [PROJECT_QUOTE_REVISION_HISTORY_FIELD]: imported.history
  });
  try {
    assertProjectEnvelopeResourceLimits(nextProject);
  } catch (error) {
    return blockedImport(
      error instanceof Error ? error.message : "İçe aktarılan proje zarfı kaynak sınırlarını aşıyor."
    );
  }
  return Object.freeze({
    status: "ready" as const,
    project: nextProject,
    history: imported.history,
    diagnostics: Object.freeze([])
  });
}
