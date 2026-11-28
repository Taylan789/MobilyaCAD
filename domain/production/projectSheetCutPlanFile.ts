import { calculateProjectSheetCutPlanAreaSummary } from "./projectSheetCutPlanAreaSummary.ts";
import { createSafeValidationError, safeThrownMessage } from "./safeThrownMessage.ts";
import { validateProjectPartSnapshot, type ProjectPartSnapshot } from "./projectPartSnapshot.ts";
import {
  parseSheetCutPlanJson,
  type SheetCutPlanResult,
  type SheetCutPlanReport
} from "./sheetCutPlan.ts";

export interface ProjectSheetCutPlanStockSheetSource {
  /** User/atölye tarafından sağlanan levha kaynağı kimliği. */
  sourceId: string;
  /** Kaynak kaydının kullanıcı/atölye tarafından sağlanan revizyonu. */
  revision: string;
}

export interface ProjectSheetCutPlanFileGroup {
  /** Stable key: JSON.stringify([materialId, normalizedThicknessTenthsMm]). */
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: string[];
  /** A fully validated machine-independent plan; sheet indexes are local to this group. */
  cutPlan: SheetCutPlanResult;
  /** Optional user-supplied provenance; it does not imply a catalog or supplier lookup. */
  stockSheetSource?: ProjectSheetCutPlanStockSheetSource;
}

export interface ProjectSheetCutPlanFileResult {
  schemaVersion: 1;
  /** Selected project Part IDs in their original project order. */
  sourcePartIds: string[];
  groups: ProjectSheetCutPlanFileGroup[];
  /** Present in JSON formatVersion 2 and 3; absent in legacy v1 files. */
  projectPartSnapshot?: ProjectPartSnapshot;
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
    throw createSafeValidationError(label + " geçerli bir nesne olmalıdır.");
  }
  return value as RecordValue;
}

function closed(value: RecordValue, allowed: readonly string[], label: string): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== undefined) {
    throw createSafeValidationError(label + " için desteklenmeyen alan: " + extra + ".");
  }
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
    throw createSafeValidationError(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function blocked(message: string): ProjectSheetCutPlanFileReport {
  return { schemaVersion: 1, status: "blocked", result: null, diagnostics: [message] };
}

const validationFallback = "Proje kesim planı JSON içeriği güvenli biçimde doğrulanamadı.";
const serializationFallback = "Proje kesim planı JSON serileştirmesi güvenli biçimde tamamlanamadı.";

/**
 * Validates every nested single-group plan with the existing v1 serializer/parser,
 * then validates complete project Part coverage and group identity with the
 * project area-summary domain contract. No partial group list is returned.
 */
function validateProjectSheetCutPlanFileResult(value: unknown): ProjectSheetCutPlanFileReport {
  try {
    const result = record(value, "Proje kesim planı JSON sonucu");
    closed(result, ["schemaVersion", "sourcePartIds", "groups", "projectPartSnapshot"], "Proje kesim planı JSON sonucu");
    if (result.schemaVersion !== 1) {
      throw createSafeValidationError("Desteklenmeyen proje kesim planı sonuç şema sürümü.");
    }
    if (!Array.isArray(result.sourcePartIds)) {
      throw createSafeValidationError("Proje kesim planı kaynak Part ID listesi bir liste olmalıdır.");
    }
    if (!Array.isArray(result.groups)) {
      throw createSafeValidationError("Proje kesim planı grupları bir liste olmalıdır.");
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
        ["groupId", "materialId", "thicknessMm", "sourcePartIds", "cutPlan", "stockSheetSource"],
        "Kesim planı JSON grubu"
      );

      const groupId = identifier(rawGroup.groupId, "Kesim planı grup kimliği");
      const materialId = identifier(rawGroup.materialId, "Kesim planı grup malzeme kimliği");
      if (!Array.isArray(rawGroup.sourcePartIds) || rawGroup.sourcePartIds.length === 0) {
        throw createSafeValidationError(groupId + " grubu boş olmayan kaynak Part ID listesi taşımalıdır.");
      }
      const groupPartIds = rawGroup.sourcePartIds.map((rawId, partIndex) =>
        identifier(rawId, groupId + " grubunun " + (partIndex + 1) + ". kaynak Part ID'si")
      );
      const stockSheetSource = rawGroup.stockSheetSource === undefined
        ? undefined
        : (() => {
            const source = record(rawGroup.stockSheetSource, groupId + " levha kaynağı bilgisi");
            closed(source, ["sourceId", "revision"], "Levha kaynağı bilgisi");
            return {
              sourceId: identifier(source.sourceId, groupId + " levha kaynağı kimliği"),
              revision: identifier(source.revision, groupId + " levha kaynağı revizyonu")
            };
          })();
      const rawPlan = record(rawGroup.cutPlan, groupId + " kesim planı");

      const parsedPlan: SheetCutPlanReport = parseSheetCutPlanJson(JSON.stringify({
        format: "MobilyaCADSheetCutPlan",
        formatVersion: 1,
        plan: rawPlan
      }));
      if (parsedPlan.status !== "ready" || parsedPlan.result === null) {
        throw createSafeValidationError(groupId + " grubu ready bir kesim planı taşımıyor: " + parsedPlan.diagnostics.join(" "));
      }

      groups.push({
        groupId,
        materialId,
        thicknessMm: rawGroup.thicknessMm as number,
        sourcePartIds: groupPartIds,
        cutPlan: parsedPlan.result,
        ...(stockSheetSource === undefined ? {} : { stockSheetSource })
      });
      summaryGroups.push({
        materialId,
        thicknessMm: rawGroup.thicknessMm,
        sourcePartIds: groupPartIds,
        cutPlanReport: parsedPlan
      });
    }

    const projectPartSnapshot = result.projectPartSnapshot === undefined
      ? undefined
      : validateProjectPartSnapshot(result.projectPartSnapshot);
    if (projectPartSnapshot) {
      const snapshotIds = new Set(projectPartSnapshot.parts.map((part) => part.id));
      const missingPartIds = sourcePartIds.filter((id) => !snapshotIds.has(id));
      if (missingPartIds.length > 0) {
        throw createSafeValidationError("Proje Part snapshot seçili kaynak Part ID'lerini içermiyor: " + missingPartIds.join(", ") + ".");
      }
    }

    const summary = calculateProjectSheetCutPlanAreaSummary({
      schemaVersion: 1,
      sourcePartIds,
      groups: summaryGroups
    });
    if (summary.status === "blocked" || summary.result === null) {
      throw createSafeValidationError(summary.diagnostics.join(" "));
    }

    if (summary.status === "empty") {
      if (projectPartSnapshot && projectPartSnapshot.parts.length > 0) {
        throw createSafeValidationError("Empty proje kesim planı boş olmayan proje Part snapshot'ı taşıyamaz.");
      }
      return {
        schemaVersion: 1,
        status: "empty",
        result: {
          schemaVersion: 1,
          sourcePartIds: [],
          groups: [],
          ...(projectPartSnapshot === undefined ? {} : { projectPartSnapshot })
        },
        diagnostics: []
      };
    }

    if (summary.result.groups.length !== groups.length) {
      throw createSafeValidationError("Proje kesim planı grup sayısı doğrulanmış özetle eşleşmiyor.");
    }

    const normalizedGroups = groups.map((group, index) => {
      const verified = summary.result.groups[index];
      if (!verified || group.groupId !== verified.groupId) {
        throw createSafeValidationError(group.groupId + " grup kimliği malzeme/kalınlık anahtarıyla eşleşmiyor.");
      }
      return {
        groupId: verified.groupId,
        materialId: verified.materialId,
        thicknessMm: verified.thicknessMm,
        sourcePartIds: verified.sourcePartIds,
        cutPlan: group.cutPlan,
        ...(group.stockSheetSource === undefined ? {} : { stockSheetSource: group.stockSheetSource })
      };
    });

    return {
      schemaVersion: 1,
      status: "ready",
      result: {
        schemaVersion: 1,
        sourcePartIds: summary.result.sourcePartIds,
        groups: normalizedGroups,
        ...(projectPartSnapshot === undefined ? {} : { projectPartSnapshot })
      },
      diagnostics: []
    };
  } catch (error) {
    return blocked(safeThrownMessage(error, validationFallback));
  }
}

/** Parses the strict, versioned, machine-independent multi-group cut-plan envelope. */
export function parseProjectSheetCutPlanJson(value: unknown): ProjectSheetCutPlanFileReport {
  try {
    if (typeof value !== "string") {
      throw createSafeValidationError("Proje kesim planı JSON içeriği metin olmalıdır.");
    }
    const envelope = record(JSON.parse(value) as unknown, "Proje kesim planı JSON zarfı");
    closed(envelope, ["format", "formatVersion", "result"], "Proje kesim planı JSON zarfı");
    if (
      envelope.format !== "MobilyaCADProjectSheetCutPlan" ||
      (envelope.formatVersion !== 1 && envelope.formatVersion !== 2 && envelope.formatVersion !== 3)
    ) {
      throw createSafeValidationError("Desteklenmeyen proje kesim planı JSON formatı veya sürümü.");
    }
    const validated = validateProjectSheetCutPlanFileResult(envelope.result);
    if (validated.status === "blocked" || validated.result === null) return validated;
    const hasStockSheetSource = validated.result.groups.some((group) => group.stockSheetSource !== undefined);
    if (
      (envelope.formatVersion === 2 || envelope.formatVersion === 3) &&
      validated.result.projectPartSnapshot === undefined
    ) {
      throw createSafeValidationError("Proje kesim planı JSON v2/v3 tam proje Part snapshot'ı taşımalıdır.");
    }
    if (
      envelope.formatVersion === 1 &&
      (validated.result.projectPartSnapshot !== undefined || hasStockSheetSource)
    ) {
      throw createSafeValidationError("Proje kesim planı JSON v1 snapshot veya levha kaynağı provenance alanı taşıyamaz.");
    }
    if (envelope.formatVersion === 2 && hasStockSheetSource) {
      throw createSafeValidationError("Proje kesim planı JSON v2 levha kaynağı provenance alanı taşıyamaz.");
    }
    if (envelope.formatVersion === 3 && !hasStockSheetSource) {
      throw createSafeValidationError("Proje kesim planı JSON v3 en az bir levha kaynağı provenance kaydı taşımalıdır.");
    }
    return validated;
  } catch (error) {
    return blocked(safeThrownMessage(error, validationFallback));
  }
}

/** Serializes only a complete ready/empty project after nested geometry and round-trip validation. */
export function serializeProjectSheetCutPlanJson(value: unknown): ProjectSheetCutPlanJsonReport {
  try {
    const report = record(value, "Proje kesim planı raporu");
    closed(report, ["schemaVersion", "status", "result", "diagnostics"], "Proje kesim planı raporu");
    if (report.schemaVersion !== 1) {
      throw createSafeValidationError("Desteklenmeyen proje kesim planı rapor şema sürümü.");
    }
    if (report.status === "blocked") {
      if (report.result !== null || !Array.isArray(report.diagnostics)) {
        throw createSafeValidationError("Blocked proje kesim planı raporu null sonuç ve tanı listesi taşımalıdır.");
      }
      const diagnostics = report.diagnostics.filter(
        (item): item is string => typeof item === "string" && item.trim() !== ""
      );
      if (diagnostics.length !== report.diagnostics.length || diagnostics.length === 0) {
        throw createSafeValidationError("Blocked proje kesim planı raporu boş olmayan metin tanıları taşımalıdır.");
      }
      return { schemaVersion: 1, status: "blocked", json: null, diagnostics };
    }
    if (report.status !== "ready" && report.status !== "empty") {
      throw createSafeValidationError("Proje kesim planı raporu ready, empty veya blocked durumunda olmalıdır.");
    }
    if (!Array.isArray(report.diagnostics) || report.diagnostics.length !== 0) {
      throw createSafeValidationError("Ready/empty proje kesim planı raporu tanı içermemelidir.");
    }

    const validated = validateProjectSheetCutPlanFileResult(report.result);
    if (validated.status === "blocked" || validated.result === null) {
      throw createSafeValidationError(validated.diagnostics.join(" "));
    }
    if (validated.status !== report.status) {
      throw createSafeValidationError("Proje kesim planı rapor durumu içerikle eşleşmiyor.");
    }

    const hasStockSheetSource = validated.result.groups.some((group) => group.stockSheetSource !== undefined);
    if (hasStockSheetSource && validated.result.projectPartSnapshot === undefined) {
      throw createSafeValidationError("Levha kaynağı provenance metadata'sı tam proje Part snapshot'ı gerektirir.");
    }
    const formatVersion = hasStockSheetSource
      ? 3
      : validated.result.projectPartSnapshot === undefined ? 1 : 2;
    const json = JSON.stringify({
      format: "MobilyaCADProjectSheetCutPlan",
      formatVersion,
      result: validated.result
    });
    const roundTrip = parseProjectSheetCutPlanJson(json);
    if (
      roundTrip.status === "blocked" ||
      roundTrip.result === null ||
      JSON.stringify(roundTrip.result) !== JSON.stringify(validated.result)
    ) {
      throw createSafeValidationError("Proje kesim planı JSON round-trip doğrulaması başarısız.");
    }

    return { schemaVersion: 1, status: validated.status, json, diagnostics: [] };
  } catch (error) {
    return {
      schemaVersion: 1,
      status: "blocked",
      json: null,
      diagnostics: [safeThrownMessage(error, serializationFallback)]
    };
  }
}
