import {
  validateProjectSheetCutPlanFreshness,
  type ProjectSheetCutPlanFreshnessRequest
} from "./projectSheetCutPlanFreshness.ts";
import type { ProjectSheetCutPlanFileResult } from "./projectSheetCutPlanFile.ts";
import { normalizeMaterialCatalogLabel } from "./materialIdentity.ts";

export interface ProjectSheetCutPlanExportRequest {
  schemaVersion: 1;
  freshness: ProjectSheetCutPlanFreshnessRequest;
}

/** Structured catalogue conflict provenance preserved for downstream diagnostic consumers. */
export interface ProjectSheetCutPlanExportMaterialIdentityConflict {
  materialId: string;
  sources: Array<{
    furnitureId: string;
    partId: string;
    materialLabel: string;
  }>;
}

/** Structured source diagnostics retained from the current production report. */
export interface ProjectSheetCutPlanExportDiagnostic {
  source: "unsupportedFurniture" | "blockedFurniture" | "projectErrors" | "exportBlockers" | "firstError";
  furnitureId: string | null;
  family: string | null;
  code: string | null;
  message: string;
  materialIdentityConflict?: ProjectSheetCutPlanExportMaterialIdentityConflict;
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
      productionDiagnostics?: [];
    }
  | {
      schemaVersion: 1;
      status: "blocked";
      freshnessStatus: "stale" | "blocked";
      result: null;
      json: null;
      sourcePartIds: string[];
      diagnostics: string[];
      productionDiagnostics?: ProjectSheetCutPlanExportDiagnostic[];
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
  sourcePartIds: readonly string[] = [],
  productionDiagnostics: readonly ProjectSheetCutPlanExportDiagnostic[] = []
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
      : ["Proje kesim planı dışa aktarıma hazır değil."],
    productionDiagnostics: [...productionDiagnostics]
  };
}

function nullableDiagnosticText(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(label + " boş olmayan metin veya null olmalıdır.");
  }
  return value;
}

function requiredDiagnosticText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(label + " boş olmayan metin olmalıdır.");
  }
  return value;
}

function compareDiagnosticText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function readMaterialIdentityConflict(
  value: unknown,
  field: "unsupportedFurniture" | "blockedFurniture",
  code: string,
  furnitureId: string | null
): ProjectSheetCutPlanExportMaterialIdentityConflict | undefined {
  if (value === undefined) return undefined;
  const label = field + " material identity conflict provenance";
  if (field !== "blockedFurniture" || code !== "invalid-material" || furnitureId === null) {
    throw new Error(label + " yalnızca furniture kimliği olan invalid-material blok tanısında bulunabilir.");
  }
  const conflict = record(value, label);
  closed(conflict, ["materialId", "sources"], label);
  const materialId = requiredDiagnosticText(conflict.materialId, label + " materialId");
  if (!Array.isArray(conflict.sources) || conflict.sources.length < 2) {
    throw new Error(label + " en az iki kaynak Part taşımalıdır.");
  }
  const sources = conflict.sources.map((source, index) => {
    const item = record(source, label + " sources[" + index + "]");
    closed(item, ["furnitureId", "partId", "materialLabel"], label + " sources[" + index + "]");
    return {
      furnitureId: requiredDiagnosticText(item.furnitureId, label + " furnitureId"),
      partId: requiredDiagnosticText(item.partId, label + " partId"),
      materialLabel: requiredDiagnosticText(item.materialLabel, label + " materialLabel")
    };
  });
  for (let index = 1; index < sources.length; index += 1) {
    const previous = sources[index - 1];
    const current = sources[index];
    const order = compareDiagnosticText(previous.furnitureId, current.furnitureId) ||
      compareDiagnosticText(previous.partId, current.partId);
    if (order >= 0) {
      throw new Error(label + " kaynakları sıralı ve benzersiz olmalıdır.");
    }
  }
  const distinctLabels = new Set(sources.map((source) => normalizeMaterialCatalogLabel(source.materialLabel)));
  if (distinctLabels.size < 2) {
    throw new Error(label + " en az iki farklı normalize katalog adı içermelidir.");
  }
  if (!sources.some((source) => source.furnitureId === furnitureId)) {
    throw new Error(label + " bloklanan furniture kimliği kaynak listesinde bulunmalıdır.");
  }
  return { materialId, sources };
}

/**
 * Retains each domain blocker with its source and furniture context. The
 * human-readable diagnostics remain available for existing consumers.
 */
function readProductionDiagnostics(
  report: RecordValue
): ProjectSheetCutPlanExportDiagnostic[] {
  const diagnostics: ProjectSheetCutPlanExportDiagnostic[] = [];
  const representedMessages = new Set<string>();
  const conflictCoverage = new Map<string, { canonical: string; sourceFurnitureIds: Set<string>; diagnosticFurnitureIds: Set<string> }>();

  const readEntries = (
    field: "unsupportedFurniture" | "blockedFurniture",
    source: "unsupportedFurniture" | "blockedFurniture"
  ): void => {
    const entries = report[field];
    if (!Array.isArray(entries)) {
      throw new Error("Güncel proje üretim raporu " + field + " listesi taşımalıdır.");
    }
    for (let index = 0; index < entries.length; index += 1) {
      const entry = record(entries[index], field + " tanısının " + (index + 1) + ". kaydı");
      if (typeof entry.message !== "string" || entry.message.trim() === "") {
        throw new Error(field + " tanısı geçerli bir mesaj taşımalıdır.");
      }
      if (typeof entry.code !== "string" || entry.code.trim() === "") {
        throw new Error(field + " tanısı geçerli bir kod taşımalıdır.");
      }
      const furnitureId = nullableDiagnosticText(entry.furnitureId, field + " furnitureId");
      const family = nullableDiagnosticText(entry.family, field + " family");
      const message = entry.message;
      const materialIdentityConflict = readMaterialIdentityConflict(
        entry.materialIdentityConflict,
        field,
        entry.code,
        furnitureId
      );
      diagnostics.push({
        source,
        furnitureId,
        family,
        code: entry.code,
        message,
        ...(materialIdentityConflict === undefined ? {} : { materialIdentityConflict })
      });
      if (materialIdentityConflict !== undefined) {
        const canonical = JSON.stringify(materialIdentityConflict);
        const sourceFurnitureIds = new Set(materialIdentityConflict.sources.map((item) => item.furnitureId));
        const existing = conflictCoverage.get(materialIdentityConflict.materialId);
        if (existing !== undefined && existing.canonical !== canonical) {
          throw new Error("material identity conflict provenance aynı katalog kimliği için tutarlı olmalıdır.");
        }
        const coverage = existing ?? {
          canonical,
          sourceFurnitureIds,
          diagnosticFurnitureIds: new Set<string>()
        };
        coverage.diagnosticFurnitureIds.add(furnitureId);
        conflictCoverage.set(materialIdentityConflict.materialId, coverage);
      }
      representedMessages.add(message);
    }
  };

  const readMessages = (
    field: "projectErrors" | "exportBlockers",
    source: "projectErrors" | "exportBlockers"
  ): void => {
    const entries = report[field];
    if (!Array.isArray(entries)) {
      throw new Error("Güncel proje üretim raporu " + field + " listesi taşımalıdır.");
    }
    for (const message of entries) {
      if (typeof message !== "string" || message.trim() === "") {
        throw new Error(field + " yalnızca boş olmayan metin kayıtları taşımalıdır.");
      }
      diagnostics.push({
        source,
        furnitureId: null,
        family: null,
        code: null,
        message
      });
      representedMessages.add(message);
    }
  };

  readEntries("unsupportedFurniture", "unsupportedFurniture");
  readEntries("blockedFurniture", "blockedFurniture");
  readMessages("projectErrors", "projectErrors");
  readMessages("exportBlockers", "exportBlockers");

  if (report.firstError !== null) {
    if (typeof report.firstError !== "string" || report.firstError.trim() === "") {
      throw new Error("Güncel proje üretim raporu firstError alanı metin veya null olmalıdır.");
    }
    if (!representedMessages.has(report.firstError)) {
      diagnostics.push({
        source: "firstError",
        furnitureId: null,
        family: null,
        code: null,
        message: report.firstError
      });
    }
  }

  for (const [materialId, coverage] of conflictCoverage) {
    if (
      coverage.sourceFurnitureIds.size !== coverage.diagnosticFurnitureIds.size ||
      [...coverage.sourceFurnitureIds].some((id) => !coverage.diagnosticFurnitureIds.has(id))
    ) {
      throw new Error("material identity conflict provenance tüm kaynak furniture tanılarını kapsamalıdır (" + materialId + ").");
    }
  }

  return diagnostics;
}

function formatProductionDiagnostics(
  diagnostics: readonly ProjectSheetCutPlanExportDiagnostic[]
): string[] {
  const messages: string[] = [];
  for (const diagnostic of diagnostics) {
    const context = [
      diagnostic.furnitureId,
      diagnostic.family,
      diagnostic.code
    ].filter((value) => value !== null).join(" / ");
    const message = context === ""
      ? diagnostic.message
      : context + ": " + diagnostic.message;
    if (!messages.includes(message)) messages.push(message);
  }
  return messages;
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
    const productionDiagnostics = readProductionDiagnostics(productionReport);
    const productionMessages = formatProductionDiagnostics(productionDiagnostics);
    if (productionReport.status !== "ready" || productionDiagnostics.length > 0) {
      if (productionReport.status === "blocked" && productionReport.result !== null) {
        throw new Error("Blocked proje üretim raporu kısmi Part sonucu taşıyamaz.");
      }
      const fallback = productionReport.status === "empty"
        ? "Boş proje üretim raporu kesim planı dışa aktarımı sağlayamaz."
        : "Kesim planı dışa aktarımı için güncel proje üretim raporu ready olmalıdır.";
      return blocked(
        "blocked",
        productionMessages.length > 0 ? productionMessages : [fallback],
        [],
        productionDiagnostics
      );
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
      diagnostics: [],
      productionDiagnostics: []
    };
  } catch (error) {
    return blocked(
      "blocked",
      [error instanceof Error ? error.message : String(error)],
      sourcePartIds
    );
  }
}
