import { calculateProjectSheetCutPlanAreaSummary } from "./projectSheetCutPlanAreaSummary.ts";
import {
  parseSheetCutPlanJson,
  serializeSheetCutPlanJson,
  type SheetCutPlanResult,
  type SheetCutPlanReport
} from "./sheetCutPlan.ts";

export interface ProjectSheetCutPlanFileGroup {
  /** Stable key: JSON.stringify([materialId, normalizedThicknessTenthsMm]). */
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: string[];
  /** A fully validated machine-independent plan; sheet indexes are local to this group. */
  cutPlan: SheetCutPlanResult;
}

export interface ProjectSheetCutPlanFileResult {
  schemaVersion: 1;
  /** Selected project Part IDs in their original project order. */
  sourcePartIds: string[];
  groups: ProjectSheetCutPlanFileGroup[];
}

export type ProjectSheetCutPlanFileReport =
  | { schemaVersion: 1; status: "ready" | "empty"; result: ProjectSheetCutPlanFileResult; diagnostics: [] }
  | { schemaVersion: 1; status: "blocked"; result: null; diagnostics: string[] };

export type ProjectSheetCutPlanJsonReport =
  | { schemaVersion: 1; status: "ready" | "empty"; json: string; diagnostics: [] }
  | { schemaVersion: 1; status: "blocked"; json: null; diagnostics: string[] };

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

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function blocked(message: string): ProjectSheetCutPlanFileReport {
  return { schemaVersion: 1, status: "blocked", result: null, diagnostics: [message] };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Validates every nested single-group plan with the existing v1 serializer/parser,
 * then validates complete project Part coverage and group identity with the
 * project area-summary domain contract. No partial group list is returned.
 */
function validateProjectSheetCutPlanFileResult(value: unknown): ProjectSheetCutPlanFileReport {
  try {
    const result = record(value, "Proje kesim planı JSON sonucu");
    closed(result, ["schemaVersion", "sourcePartIds", "groups"], "Proje kesim planı JSON sonucu");
    if (result.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje kesim planı sonuç şema sürümü.");
    }
    if (!Array.isArray(result.sourcePartIds)) {
      throw new Error("Proje kesim planı kaynak Part ID listesi bir liste olmalıdır.");
    }
    if (!Array.isArray(result.groups)) {
      throw new Error("Proje kesim planı grupları bir liste olmalıdır.");
    }

    const sourcePartIds = result.sourcePartIds.map((rawId, index) =>
      identifier(rawId, "Seçili " + (index + 1) + ". proje Part ID")
    );
    const groups: ProjectSheetCutPlanFileGroup[] = [];
    const summaryGroups: Array<Record<string, unknown>> = [];

    for (let index = 0; index < result.groups.length; index += 1) {
      const rawGroup = record(result.groups[index], "Kesim planı grubunun " + (index + 1) + ". kaydı");
      closed(
        rawGroup,
        ["groupId", "materialId", "thicknessMm", "sourcePartIds", "cutPlan"],
        "Kesim planı JSON grubu"
      );

      const groupId = identifier(rawGroup.groupId, "Kesim planı grup kimliği");
      const materialId = identifier(rawGroup.materialId, "Kesim planı grup malzeme kimliği");
      if (!Array.isArray(rawGroup.sourcePartIds) || rawGroup.sourcePartIds.length === 0) {
        throw new Error(groupId + " grubu boş olmayan kaynak Part ID listesi taşımalıdır.");
      }
      const groupPartIds = rawGroup.sourcePartIds.map((rawId, partIndex) =>
        identifier(rawId, groupId + " grubunun " + (partIndex + 1) + ". kaynak Part ID'si")
      );
      const rawPlan = record(rawGroup.cutPlan, groupId + " kesim planı");

      const serializedPlan = serializeSheetCutPlanJson({
        schemaVersion: 1,
        status: "ready",
        result: rawPlan,
        diagnostics: []
      });
      if (serializedPlan.status !== "ready" || serializedPlan.json === null) {
        throw new Error(groupId + " grubu kesim planı doğrulanamadı: " + serializedPlan.diagnostics.join(" "));
      }

      const parsedPlan: SheetCutPlanReport = parseSheetCutPlanJson(serializedPlan.json);
      if (parsedPlan.status !== "ready" || parsedPlan.result === null) {
        throw new Error(groupId + " grubu ready bir kesim planı taşımıyor: " + parsedPlan.diagnostics.join(" "));
      }

      groups.push({
        groupId,
        materialId,
        thicknessMm: rawGroup.thicknessMm as number,
        sourcePartIds: groupPartIds,
        cutPlan: parsedPlan.result
      });
      summaryGroups.push({
        materialId,
        thicknessMm: rawGroup.thicknessMm,
        sourcePartIds: groupPartIds,
        cutPlanReport: parsedPlan
      });
    }

    const summary = calculateProjectSheetCutPlanAreaSummary({
      schemaVersion: 1,
      sourcePartIds,
      groups: summaryGroups
    });
    if (summary.status === "blocked" || summary.result === null) {
      throw new Error(summary.diagnostics.join(" "));
    }

    if (summary.status === "empty") {
      return {
        schemaVersion: 1,
        status: "empty",
        result: { schemaVersion: 1, sourcePartIds: [], groups: [] },
        diagnostics: []
      };
    }

    if (summary.result.groups.length !== groups.length) {
      throw new Error("Proje kesim planı grup sayısı doğrulanmış özetle eşleşmiyor.");
    }

    const normalizedGroups = groups.map((group, index) => {
      const verified = summary.result.groups[index];
      if (!verified || group.groupId !== verified.groupId) {
        throw new Error(group.groupId + " grup kimliği malzeme/kalınlık anahtarıyla eşleşmiyor.");
      }
      return {
        groupId: verified.groupId,
        materialId: verified.materialId,
        thicknessMm: verified.thicknessMm,
        sourcePartIds: verified.sourcePartIds,
        cutPlan: group.cutPlan
      };
    });

    return {
      schemaVersion: 1,
      status: "ready",
      result: {
        schemaVersion: 1,
        sourcePartIds: summary.result.sourcePartIds,
        groups: normalizedGroups
      },
      diagnostics: []
    };
  } catch (error) {
    return blocked(errorMessage(error));
  }
}

/** Parses the strict, versioned, machine-independent multi-group cut-plan envelope. */
export function parseProjectSheetCutPlanJson(value: unknown): ProjectSheetCutPlanFileReport {
  try {
    if (typeof value !== "string") {
      throw new Error("Proje kesim planı JSON içeriği metin olmalıdır.");
    }
    const envelope = record(JSON.parse(value) as unknown, "Proje kesim planı JSON zarfı");
    closed(envelope, ["format", "formatVersion", "result"], "Proje kesim planı JSON zarfı");
    if (envelope.format !== "MobilyaCADProjectSheetCutPlan" || envelope.formatVersion !== 1) {
      throw new Error("Desteklenmeyen proje kesim planı JSON formatı veya sürümü.");
    }
    return validateProjectSheetCutPlanFileResult(envelope.result);
  } catch (error) {
    return blocked(errorMessage(error));
  }
}

/** Serializes only a complete ready/empty project after nested geometry and round-trip validation. */
export function serializeProjectSheetCutPlanJson(value: unknown): ProjectSheetCutPlanJsonReport {
  try {
    const report = record(value, "Proje kesim planı raporu");
    closed(report, ["schemaVersion", "status", "result", "diagnostics"], "Proje kesim planı raporu");
    if (report.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje kesim planı rapor şema sürümü.");
    }
    if (report.status === "blocked") {
      if (report.result !== null || !Array.isArray(report.diagnostics)) {
        throw new Error("Blocked proje kesim planı raporu null sonuç ve tanı listesi taşımalıdır.");
      }
      const diagnostics = report.diagnostics.filter(
        (item): item is string => typeof item === "string" && item.trim() !== ""
      );
      if (diagnostics.length !== report.diagnostics.length || diagnostics.length === 0) {
        throw new Error("Blocked proje kesim planı raporu boş olmayan metin tanıları taşımalıdır.");
      }
      return { schemaVersion: 1, status: "blocked", json: null, diagnostics };
    }
    if (report.status !== "ready" && report.status !== "empty") {
      throw new Error("Proje kesim planı raporu ready, empty veya blocked durumunda olmalıdır.");
    }
    if (!Array.isArray(report.diagnostics) || report.diagnostics.length !== 0) {
      throw new Error("Ready/empty proje kesim planı raporu tanı içermemelidir.");
    }

    const validated = validateProjectSheetCutPlanFileResult(report.result);
    if (validated.status !== report.status || validated.result === null) {
      throw new Error("Proje kesim planı rapor durumu içerikle eşleşmiyor.");
    }

    const json = JSON.stringify({
      format: "MobilyaCADProjectSheetCutPlan",
      formatVersion: 1,
      result: validated.result
    });
    const roundTrip = parseProjectSheetCutPlanJson(json);
    if (
      roundTrip.status === "blocked" ||
      roundTrip.result === null ||
      JSON.stringify(roundTrip.result) !== JSON.stringify(validated.result)
    ) {
      throw new Error("Proje kesim planı JSON round-trip doğrulaması başarısız.");
    }

    return { schemaVersion: 1, status: validated.status, json, diagnostics: [] };
  } catch (error) {
    return {
      schemaVersion: 1,
      status: "blocked",
      json: null,
      diagnostics: [errorMessage(error)]
    };
  }
}
