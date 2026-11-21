import {
  parseProjectSheetCutPlanJson,
  serializeProjectSheetCutPlanJson,
  type ProjectSheetCutPlanFileResult
} from "./projectSheetCutPlanFile.ts";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import type { ProjectSheetNestingBatchesReport } from "./projectSheetNestingBatches.ts";
import { validateProjectPartSnapshot } from "./projectPartSnapshot.ts";
import type { SheetNestingLayoutReport } from "./sheetNestingLayout.ts";

export interface ProjectSheetCutPlanLayoutInput {
  /** Stable key derived from material ID and normalized 0.1 mm thickness. */
  groupId: string;
  layoutReport: SheetNestingLayoutReport;
}

export interface ProjectSheetCutPlanRequest {
  schemaVersion: 1;
  /** Complete output of createProjectSheetNestingBatches. */
  batchReport: ProjectSheetNestingBatchesReport;
  /** One layout report per batch group; entries may be supplied in any order. */
  layoutReports: readonly ProjectSheetCutPlanLayoutInput[];
}

export type ProjectSheetCutPlanReport =
  | {
      schemaVersion: 1;
      status: "ready";
      result: ProjectSheetCutPlanFileResult;
      json: string;
      sourcePartIds: string[];
      excludedPartIds: string[];
      diagnostics: [];
    }
  | {
      schemaVersion: 1;
      status: "blocked";
      result: null;
      json: null;
      sourcePartIds: string[];
      excludedPartIds: string[];
      diagnostics: string[];
    };

type RecordValue = Record<string, unknown>;

type ValidatedBatchGroup = {
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: string[];
  batch: RecordValue;
};

function record(value: unknown, label: string): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value as RecordValue;
}

function closed(value: RecordValue, allowed: readonly string[], label: string): void {
  const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) {
    throw new Error(label + " için desteklenmeyen alan: " + unknownKey + ".");
  }
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function identifiers(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(label + " bir kimlik listesi olmalıdır.");
  }
  return value.map((item, index) => identifier(item, label + " " + (index + 1) + ". öğesi"));
}

function assertUnique(values: readonly string[], label: string): Set<string> {
  const result = new Set<string>();
  for (const value of values) {
    if (result.has(value)) {
      throw new Error(label + " içinde yinelenen kimlik var: " + value + ".");
    }
    result.add(value);
  }
  return result;
}

function normalizeThickness(value: unknown, label: string): { mm: number; ticks: number } {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }
  const scaled = value * 10;
  if (!Number.isFinite(scaled) || Math.abs(scaled) > Number.MAX_SAFE_INTEGER) {
    throw new Error(label + " güvenli 0.1 mm aralığını aşıyor.");
  }
  const ticks = Math.round(scaled + Number.EPSILON * 10);
  if (!Number.isSafeInteger(ticks) || ticks <= 0) {
    throw new Error(label + " güvenli 0.1 mm kalınlığına normalize edilemiyor.");
  }
  return { mm: ticks / 10, ticks };
}

function groupKey(materialId: string, thicknessTicks: number): string {
  return JSON.stringify([materialId, thicknessTicks]);
}

function diagnosticList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(label + " boş olmayan tanı listesi taşımalıdır.");
  }
  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      throw new Error(label + " " + (index + 1) + ". öğesi boş olmayan bir metin olmalıdır.");
    }
    return item;
  });
}

function blocked(
  diagnostics: string[],
  sourcePartIds: string[],
  excludedPartIds: string[]
): ProjectSheetCutPlanReport {
  const safeDiagnostics = diagnostics.filter((item) => item.trim() !== "");
  return {
    schemaVersion: 1,
    status: "blocked",
    result: null,
    json: null,
    sourcePartIds,
    excludedPartIds,
    diagnostics: safeDiagnostics.length > 0
      ? safeDiagnostics
      : ["Proje kesim planı doğrulanamadı."]
  };
}

function validateBatchGroups(
  batchReport: RecordValue,
  sourcePartIds: string[],
  excludedPartIds: string[]
): ValidatedBatchGroup[] {
  if (batchReport.status !== "ready") {
    throw new Error("Proje nesting batch raporu ready durumunda olmalıdır.");
  }
  if (!Array.isArray(batchReport.diagnostics) || batchReport.diagnostics.length !== 0) {
    throw new Error("Ready proje nesting batch raporu tanı içermemelidir.");
  }

  const result = record(batchReport.result, "Proje nesting batch sonucu");
  closed(result, ["schemaVersion", "batches"], "Proje nesting batch sonucu");
  if (result.schemaVersion !== 1 || !Array.isArray(result.batches) || result.batches.length === 0) {
    throw new Error("Ready proje nesting batch sonucu en az bir v1 grup içermelidir.");
  }
  if (sourcePartIds.length === 0) {
    throw new Error("Ready proje nesting batch raporu seçili kaynak Part ID içermelidir.");
  }

  const selectedIds = assertUnique(sourcePartIds, "Proje nesting kaynak Part ID listesi");
  const excludedIds = assertUnique(excludedPartIds, "Proje nesting hariç Part ID listesi");
  for (const id of excludedIds) {
    if (selectedIds.has(id)) {
      throw new Error("Seçili ve hariç Part ID listeleri çakışıyor: " + id + ".");
    }
  }

  const seenPartIds = new Set<string>();
  const seenGroupIds = new Set<string>();
  const groups: ValidatedBatchGroup[] = [];
  let previousFirstPartIndex = -1;

  for (let index = 0; index < result.batches.length; index += 1) {
    const rawGroup = record(result.batches[index], "Nesting batch grubunun " + (index + 1) + ". kaydı");
    closed(rawGroup, ["materialId", "thicknessMm", "sourcePartIds", "batch"], "Nesting batch grubu");

    const materialId = identifier(rawGroup.materialId, "Nesting batch malzeme kimliği");
    const thickness = normalizeThickness(rawGroup.thicknessMm, materialId + " batch kalınlığı");
    if (thickness.mm !== rawGroup.thicknessMm) {
      throw new Error(materialId + " batch kalınlığı normalize edilmiş 0.1 mm değerinde olmalıdır.");
    }
    const groupId = groupKey(materialId, thickness.ticks);
    if (seenGroupIds.has(groupId)) {
      throw new Error(groupId + " nesting batch grubu birden fazla kez verilmiş.");
    }
    seenGroupIds.add(groupId);

    const groupPartIds = identifiers(rawGroup.sourcePartIds, groupId + " kaynak Part ID");
    if (groupPartIds.length === 0) {
      throw new Error(groupId + " nesting batch grubu boş kaynak Part ID listesi taşıyamaz.");
    }
    const groupPartSet = assertUnique(groupPartIds, groupId + " kaynak Part ID listesi");
    const expectedGroupPartIds = sourcePartIds.filter((id) => groupPartSet.has(id));
    if (
      expectedGroupPartIds.length !== groupPartIds.length ||
      expectedGroupPartIds.some((id, partIndex) => id !== groupPartIds[partIndex])
    ) {
      throw new Error(groupId + " kaynak Part ID listesi seçili proje sırasıyla eşleşmiyor.");
    }

    const firstPartIndex = sourcePartIds.indexOf(groupPartIds[0] ?? "");
    if (firstPartIndex < 0) {
      throw new Error("Nesting batch grup kaynağı seçili proje Part listesinde bulunmuyor.");
    }

    for (const id of groupPartIds) {
      if (!selectedIds.has(id)) {
        throw new Error(groupId + " seçili proje listesinde bulunmayan Part ID içeriyor: " + id + ".");
      }
      if (seenPartIds.has(id)) {
        throw new Error("Proje Part ID'si birden fazla nesting batch grubunda bulunuyor: " + id + ".");
      }
      seenPartIds.add(id);
    }

    if (firstPartIndex <= previousFirstPartIndex) {
      throw new Error("Nesting batch grup sırası seçili proje Part sırasını korumuyor.");
    }
    previousFirstPartIndex = firstPartIndex;

    const batch = record(rawGroup.batch, groupId + " nesting batch");
    if (batch.schemaVersion !== 1 || !Array.isArray(batch.parts) || batch.parts.length === 0) {
      throw new Error(groupId + " nesting batch geçerli bir v1 parça listesi taşımalıdır.");
    }
    const batchPartIds: string[] = [];
    for (let partIndex = 0; partIndex < batch.parts.length; partIndex += 1) {
      const part = record(batch.parts[partIndex], groupId + " nesting parçasının " + (partIndex + 1) + ". kaydı");
      const partId = identifier(part.id, groupId + " nesting parça kimliği");
      batchPartIds.push(partId);
      if (part.materialId !== materialId) {
        throw new Error(groupId + " nesting batch farklı malzeme kimliği taşıyan parça içeriyor.");
      }
      if (normalizeThickness(part.thicknessMm, partId + " nesting parça kalınlığı").ticks !== thickness.ticks) {
        throw new Error(groupId + " nesting batch farklı kalınlık taşıyan parça içeriyor.");
      }
    }
    if (
      batchPartIds.length !== groupPartIds.length ||
      batchPartIds.some((id, partIndex) => id !== groupPartIds[partIndex])
    ) {
      throw new Error(groupId + " kaynak Part ID listesi nesting batch parça sırasıyla eşleşmiyor.");
    }

    const sheet = record(batch.sheet, groupId + " kullanıcı levhası");
    if (sheet.materialId !== materialId) {
      throw new Error(groupId + " kullanıcı levhası malzeme kimliğiyle eşleşmiyor.");
    }
    if (normalizeThickness(sheet.thicknessMm, groupId + " kullanıcı levhası kalınlığı").ticks !== thickness.ticks) {
      throw new Error(groupId + " kullanıcı levhası kalınlığıyla eşleşmiyor.");
    }

    groups.push({
      groupId,
      materialId,
      thicknessMm: thickness.mm,
      sourcePartIds: groupPartIds,
      batch
    });
  }

  const missingPartIds = sourcePartIds.filter((id) => !seenPartIds.has(id));
  if (missingPartIds.length > 0) {
    throw new Error("Nesting batch gruplarında karşılığı bulunmayan seçili Part ID'leri: " + missingPartIds.join(", ") + ".");
  }
  return groups;
}

/**
 * Joins one validated layout to every material/thickness batch atomically.
 * Group identity and source order come from the batch report, never from layout
 * array position. Every nested plan is revalidated and the final v1 JSON is
 * serialized and parsed again before a ready report is returned.
 */
export function createProjectSheetCutPlan(value: unknown): ProjectSheetCutPlanReport {
  let sourcePartIds: string[] = [];
  let excludedPartIds: string[] = [];

  try {
    const request = record(value, "Proje kesim planı isteği");
    closed(request, ["schemaVersion", "batchReport", "layoutReports"], "Proje kesim planı isteği");
    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje kesim planı şema sürümü.");
    }
    if (!Array.isArray(request.layoutReports)) {
      throw new Error("Proje kesim planı layout raporları bir liste olmalıdır.");
    }

    const batchReport = record(request.batchReport, "Proje nesting batch raporu");
    closed(
      batchReport,
      ["schemaVersion", "status", "result", "sourcePartIds", "excludedPartIds", "projectPartSnapshot", "diagnostics"],
      "Proje nesting batch raporu"
    );
    if (batchReport.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje nesting batch raporu şema sürümü.");
    }
    sourcePartIds = identifiers(batchReport.sourcePartIds, "Proje nesting kaynak Part ID");
    excludedPartIds = identifiers(batchReport.excludedPartIds, "Proje nesting hariç Part ID");

    if (batchReport.status === "blocked") {
      if (batchReport.result !== null) {
        throw new Error("Blocked proje nesting batch raporu null sonuç taşımalıdır.");
      }
      return blocked(
        diagnosticList(batchReport.diagnostics, "Blocked proje nesting batch raporu"),
        sourcePartIds,
        excludedPartIds
      );
    }

    const groups = validateBatchGroups(batchReport, sourcePartIds, excludedPartIds);
    const projectPartSnapshot = validateProjectPartSnapshot(batchReport.projectPartSnapshot);
    const representedPartIds = new Set([...sourcePartIds, ...excludedPartIds]);
    if (
      projectPartSnapshot.parts.length !== representedPartIds.size ||
      projectPartSnapshot.parts.some((part) => !representedPartIds.has(part.id))
    ) {
      throw new Error("Proje Part snapshot seçili ve hariç tutulan kaynak Part kimliklerinin tam kümesiyle eşleşmiyor.");
    }
    if (request.layoutReports.length !== groups.length) {
      throw new Error("Her nesting batch grubu için tam bir layout raporu sağlanmalıdır.");
    }

    const expectedGroupIds = new Set(groups.map((group) => group.groupId));
    const layoutByGroupId = new Map<string, unknown>();
    for (let index = 0; index < request.layoutReports.length; index += 1) {
      const rawLayout = record(request.layoutReports[index], "Layout rapor eşlemesinin " + (index + 1) + ". kaydı");
      closed(rawLayout, ["groupId", "layoutReport"], "Layout rapor eşlemesi");
      const groupId = identifier(rawLayout.groupId, "Layout grup kimliği");
      if (!expectedGroupIds.has(groupId)) {
        throw new Error("Layout raporu karşılığı olmayan nesting batch grup kimliği içeriyor: " + groupId + ".");
      }
      if (layoutByGroupId.has(groupId)) {
        throw new Error("Nesting batch grubu için yinelenen layout raporu var: " + groupId + ".");
      }
      layoutByGroupId.set(groupId, rawLayout.layoutReport);
    }

    const fileGroups: ProjectSheetCutPlanFileResult["groups"] = [];
    const diagnostics: string[] = [];
    for (const group of groups) {
      if (!layoutByGroupId.has(group.groupId)) {
        diagnostics.push(group.groupId + " grubu için layout raporu eksik.");
        continue;
      }
      const cutPlan = createSheetCutPlan({
        schemaVersion: 1,
        batch: group.batch,
        layout: layoutByGroupId.get(group.groupId)
      });
      if (cutPlan.status !== "ready" || cutPlan.result === null) {
        diagnostics.push(group.groupId + " grubu: " + cutPlan.diagnostics.join(" "));
        continue;
      }
      fileGroups.push({
        groupId: group.groupId,
        materialId: group.materialId,
        thicknessMm: group.thicknessMm,
        sourcePartIds: group.sourcePartIds,
        cutPlan: cutPlan.result
      });
    }

    if (diagnostics.length > 0) {
      return blocked(diagnostics, sourcePartIds, excludedPartIds);
    }

    const fileResult: ProjectSheetCutPlanFileResult = {
      schemaVersion: 1,
      sourcePartIds,
      groups: fileGroups,
      projectPartSnapshot
    };
    const serialized = serializeProjectSheetCutPlanJson({
      schemaVersion: 1,
      status: "ready",
      result: fileResult,
      diagnostics: []
    });
    if (serialized.status !== "ready" || serialized.json === null) {
      return blocked(serialized.diagnostics, sourcePartIds, excludedPartIds);
    }

    const parsed = parseProjectSheetCutPlanJson(serialized.json);
    if (parsed.status !== "ready" || parsed.result === null) {
      return blocked(parsed.diagnostics, sourcePartIds, excludedPartIds);
    }

    return {
      schemaVersion: 1,
      status: "ready",
      result: parsed.result,
      json: serialized.json,
      sourcePartIds,
      excludedPartIds,
      diagnostics: []
    };
  } catch (error) {
    return blocked(
      [error instanceof Error ? error.message : String(error)],
      sourcePartIds,
      excludedPartIds
    );
  }
}
