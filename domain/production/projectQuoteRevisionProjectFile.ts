import {
  appendProjectQuoteRevision,
  validateProjectQuoteRevisionHistory,
  type ProjectQuoteRevisionHistory
} from "./projectQuoteRevision.ts";

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

const projectIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  const current = readProjectQuoteRevisionHistoryFromProjectFile(envelope.project);
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
    ...envelope.project,
    [PROJECT_QUOTE_REVISION_HISTORY_FIELD]: appended.history
  });

  return Object.freeze({
    status: "ready" as const,
    project: nextProject,
    history: appended.history,
    diagnostics: Object.freeze([])
  });
}
