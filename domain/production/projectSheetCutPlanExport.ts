import {
  validateProjectSheetCutPlanFreshness,
  type ProjectSheetCutPlanFreshnessRequest
} from "./projectSheetCutPlanFreshness.ts";
import type { ProjectSheetCutPlanFileResult } from "./projectSheetCutPlanFile.ts";

export interface ProjectSheetCutPlanExportRequest {
  schemaVersion: 1;
  freshness: ProjectSheetCutPlanFreshnessRequest;
}

export type ProjectSheetCutPlanExportReport =
  | {
      schemaVersion: 1;
      status: "ready";
      freshnessStatus: "fresh";
      result: ProjectSheetCutPlanFileResult;
      json: string;
      sourcePartIds: string[];
      diagnostics: [];
    }
  | {
      schemaVersion: 1;
      status: "blocked";
      freshnessStatus: "stale" | "blocked";
      result: null;
      json: null;
      sourcePartIds: string[];
      diagnostics: string[];
    };

type RecordValue = Record<string, unknown>;

function record(value: unknown, label: string): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value as RecordValue;
}

function closed(value: RecordValue, allowed: readonly string[], label: string): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== undefined) {
    throw new Error(label + " için desteklenmeyen alan: " + extra + ".");
  }
}

function blocked(
  freshnessStatus: "stale" | "blocked",
  diagnostics: readonly string[],
  sourcePartIds: readonly string[] = []
): ProjectSheetCutPlanExportReport {
  const safeDiagnostics = diagnostics.filter((item) => item.trim() !== "");
  return {
    schemaVersion: 1,
    status: "blocked",
    freshnessStatus,
    result: null,
    json: null,
    sourcePartIds: [...sourcePartIds],
    diagnostics: safeDiagnostics.length > 0
      ? safeDiagnostics
      : ["Proje kesim planı dışa aktarıma hazır değil."]
  };
}

/**
 * The only ready-export gate for project cut-plan JSON v2/v3.
 * It requires an explicitly exportable current production report, a fresh
 * full-project Part snapshot, the current selected Part IDs, and a v2 or v3 envelope.
 * Legacy v1 files remain readable through the parser but cannot pass this gate.
 */
export function createFreshProjectSheetCutPlanExport(value: unknown): ProjectSheetCutPlanExportReport {
  let sourcePartIds: string[] = [];

  try {
    const request = record(value, "Proje kesim planı dışa aktarma isteği");
    closed(request, ["schemaVersion", "freshness"], "Proje kesim planı dışa aktarma isteği");
    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje kesim planı dışa aktarma şema sürümü.");
    }
    if (!Object.prototype.hasOwnProperty.call(request, "freshness")) {
      throw new Error("Dışa aktarma için güncellik doğrulaması girdisi zorunludur.");
    }

    const freshnessRequest = record(request.freshness, "Kesim planı güncellik girdisi");
    const productionReport = record(freshnessRequest.productionReport, "Güncel proje üretim raporu");
    if (productionReport.status !== "ready") {
      throw new Error("Kesim planı dışa aktarımı için güncel proje üretim raporu ready olmalıdır.");
    }
    if (!Array.isArray(productionReport.exportBlockers)) {
      throw new Error("Güncel proje üretim raporu exportBlockers listesi taşımalıdır.");
    }
    if (productionReport.exportBlockers.some((item) => typeof item !== "string" || item.trim() === "")) {
      throw new Error("Güncel proje üretim raporu geçerli metin export blocker kayıtları taşımalıdır.");
    }
    if (productionReport.exportBlockers.length > 0) {
      return blocked("blocked", productionReport.exportBlockers as string[]);
    }
    if (productionReport.canExport !== true) {
      throw new Error("Güncel proje üretim raporu canExport=true olmalıdır.");
    }
    if (productionReport.result === null || productionReport.result === undefined) {
      throw new Error("Dışa aktarılabilir proje üretim raporu tam bir Part sonucu taşımalıdır.");
    }

    const freshness = validateProjectSheetCutPlanFreshness(freshnessRequest);
    sourcePartIds = [...freshness.sourcePartIds];
    if (freshness.status !== "fresh" || freshness.result === null || freshness.json === null) {
      return blocked(freshness.status, freshness.diagnostics, sourcePartIds);
    }

    const envelope = record(JSON.parse(freshness.json) as unknown, "Doğrulanmış proje kesim planı JSON zarfı");
    if (
      envelope.format !== "MobilyaCADProjectSheetCutPlan" ||
      (envelope.formatVersion !== 2 && envelope.formatVersion !== 3)
    ) {
      throw new Error("Dışa aktarım yalnızca tam proje Part snapshot'ı içeren JSON formatVersion 2 veya 3 planlarını kabul eder.");
    }
    if (freshness.result.projectPartSnapshot === undefined) {
      throw new Error("Güncel kesim planı tam proje Part snapshot'ı taşımıyor.");
    }

    return {
      schemaVersion: 1,
      status: "ready",
      freshnessStatus: "fresh",
      result: freshness.result,
      json: freshness.json,
      sourcePartIds,
      diagnostics: []
    };
  } catch (error) {
    return blocked(
      "blocked",
      [error instanceof Error ? error.message : String(error)],
      sourcePartIds
    );
  }
}
