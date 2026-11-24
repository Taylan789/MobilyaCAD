import {
  validateProjectQuoteRevisionHistory,
  type ProjectQuoteRevisionHistoryResult
} from "./projectQuoteRevision.ts";

export const PROJECT_QUOTE_REVISION_FILE_TYPE = "mobilyacad-quote-revision-history" as const;
export const PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES = 1_048_576;

const fileSizeLimitMessage = "Teklif revizyon geçmişi JSON dosyası 1 MiB UTF-8 boyut sınırını aşamaz.";

export interface ProjectQuoteRevisionFileSerializationResult {
  status: "ready" | "empty" | "blocked";
  json: string | null;
  diagnostics: readonly string[];
}

const envelopeKeys = new Set(["fileType", "schemaVersion", "history"]);

function exceedsFileByteLimit(value: string): boolean {
  if (value.length > PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES) return true;
  return new TextEncoder().encode(value).byteLength > PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function blockedSerialization(message: string): ProjectQuoteRevisionFileSerializationResult {
  return Object.freeze({ status: "blocked" as const, json: null, diagnostics: Object.freeze([message]) });
}

function blockedParse(message: string): ProjectQuoteRevisionHistoryResult {
  return Object.freeze({ status: "blocked" as const, history: null, diagnostics: Object.freeze([message]) });
}

/** Serializes only a fully validated quote history into a standalone v1 JSON envelope. */
export function serializeProjectQuoteRevisionHistoryFile(historyValue: unknown): ProjectQuoteRevisionFileSerializationResult {
  const validated = validateProjectQuoteRevisionHistory(historyValue);
  if (validated.status === "blocked" || validated.history === null) {
    return blockedSerialization(validated.diagnostics[0] ?? "Teklif revizyon geçmişi JSON dosyasına dönüştürülemedi.");
  }
  try {
    const json = JSON.stringify({
      fileType: PROJECT_QUOTE_REVISION_FILE_TYPE,
      schemaVersion: 1,
      history: validated.history
    });
    if (typeof json !== "string") throw new Error("Teklif revizyon geçmişi JSON metnine dönüştürülemedi.");
    if (exceedsFileByteLimit(json)) return blockedSerialization(fileSizeLimitMessage);
    return Object.freeze({ status: validated.status, json, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization(error instanceof Error ? error.message : String(error));
  }
}

/** Parses the standalone v1 envelope and revalidates every revision; unknown fields/versions are rejected. */
export function parseProjectQuoteRevisionHistoryFile(jsonValue: unknown): ProjectQuoteRevisionHistoryResult {
  if (typeof jsonValue !== "string") return blockedParse("Teklif revizyon geçmişi dosyası JSON metni olmalıdır.");
  if (exceedsFileByteLimit(jsonValue)) return blockedParse(fileSizeLimitMessage);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue) as unknown;
  } catch {
    return blockedParse("Teklif revizyon geçmişi dosyası geçerli JSON içermiyor.");
  }
  if (!isRecord(parsed)) return blockedParse("Teklif revizyon geçmişi dosya zarfı geçerli bir nesne olmalıdır.");
  const unknownKey = Object.keys(parsed).find((key) => !envelopeKeys.has(key));
  if (unknownKey !== undefined) return blockedParse("Teklif revizyon geçmişi dosyasında desteklenmeyen alan: " + unknownKey + ".");
  if (parsed.fileType !== PROJECT_QUOTE_REVISION_FILE_TYPE) return blockedParse("Dosya türü MobilyaCAD teklif revizyon geçmişi değildir.");
  if (parsed.schemaVersion !== 1) return blockedParse("Desteklenmeyen teklif revizyon geçmişi dosya sürümü.");
  return validateProjectQuoteRevisionHistory(parsed.history);
}
