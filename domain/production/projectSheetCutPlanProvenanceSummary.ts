import {
  parseProjectSheetCutPlanJson,
  type ProjectSheetCutPlanStockSheetSource
} from "./projectSheetCutPlanFile.ts";

export interface ProjectSheetCutPlanProvenanceGroupSummary {
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: string[];
  provenanceStatus: "provided" | "missing";
  stockSheetSource: ProjectSheetCutPlanStockSheetSource | null;
}

export type ProjectSheetCutPlanProvenanceSummary =
  | {
      schemaVersion: 1;
      status: "ready" | "empty";
      totalGroupCount: number;
      groupsWithProvenance: number;
      groupsMissingProvenance: number;
      groups: ProjectSheetCutPlanProvenanceGroupSummary[];
      diagnostics: [];
    }
  | {
      schemaVersion: 1;
      status: "blocked";
      totalGroupCount: 0;
      groupsWithProvenance: 0;
      groupsMissingProvenance: 0;
      groups: [];
      diagnostics: string[];
    };

/**
 * Summarizes only whether each validated material/thickness group carries
 * user-supplied stock-sheet source/revision metadata. It does not verify a
 * supplier, catalog, physical sheet, certificate, or manufacturing standard.
 * Invalid input returns an atomic blocked summary with no partial groups.
 */
export function summarizeProjectSheetCutPlanProvenance(
  value: unknown
): ProjectSheetCutPlanProvenanceSummary {
  const parsed = parseProjectSheetCutPlanJson(value);
  if (parsed.status === "blocked" || parsed.result === null) {
    const diagnostics = parsed.diagnostics.filter(
      (item) => typeof item === "string" && item.trim() !== ""
    );
    return {
      schemaVersion: 1,
      status: "blocked",
      totalGroupCount: 0,
      groupsWithProvenance: 0,
      groupsMissingProvenance: 0,
      groups: [],
      diagnostics: diagnostics.length > 0
        ? diagnostics
        : ["Proje kesim planı provenance özeti doğrulanamadı."]
    };
  }

  const groups = parsed.result.groups.map((group) => {
    const stockSheetSource = group.stockSheetSource;
    return {
      groupId: group.groupId,
      materialId: group.materialId,
      thicknessMm: group.thicknessMm,
      sourcePartIds: [...group.sourcePartIds],
      provenanceStatus: stockSheetSource === undefined ? "missing" as const : "provided" as const,
      stockSheetSource: stockSheetSource === undefined ? null : { ...stockSheetSource }
    };
  });
  const groupsWithProvenance = groups.filter(
    (group) => group.provenanceStatus === "provided"
  ).length;

  return {
    schemaVersion: 1,
    status: parsed.status,
    totalGroupCount: groups.length,
    groupsWithProvenance,
    groupsMissingProvenance: groups.length - groupsWithProvenance,
    groups,
    diagnostics: []
  };
}
