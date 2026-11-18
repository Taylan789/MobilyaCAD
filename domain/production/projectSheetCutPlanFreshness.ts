import type { CabinetProjectProductionReport } from "./projectProduction.ts";
import { createProjectSheetNestingInput } from "./projectSheetNestingInput.ts";
import {
  parseProjectSheetCutPlanJson,
  type ProjectSheetCutPlanFileResult
} from "./projectSheetCutPlanFile.ts";
import type { SheetGrainDirection } from "./sheetNestingInput.ts";
import { compareProjectPartSnapshots, createProjectPartSnapshot } from "./projectPartSnapshot.ts";

export interface ProjectSheetCutPlanFreshnessRequest {
  schemaVersion: 1;
  /** Strict v1 JSON produced by serializeProjectSheetCutPlanJson. */
  savedPlanJson: string;
  /** Newly calculated domain production report for the current project state. */
  productionReport: CabinetProjectProductionReport;
  /**
   * Repeat the explicit grain overrides used when the saved plan was created.
   * Required for legacy Parts that do not store grainDirection and for any
   * Part whose saved effective direction differs from its current stored value.
   */
  grainDirectionsByPartId?: Readonly<Record<string, SheetGrainDirection>>;
  /** Required for v2 plans: the current user selection in project Part order. */
  currentSelectedPartIds?: readonly string[];
}

export type ProjectSheetCutPlanFreshnessReport =
  | {
      schemaVersion: 1;
      status: "fresh";
      result: ProjectSheetCutPlanFileResult;
      json: string;
      sourcePartIds: string[];
      diagnostics: [];
    }
  | {
      schemaVersion: 1;
      status: "stale" | "blocked";
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

function isGrainDirection(value: unknown): value is SheetGrainDirection {
  return value === "length" || value === "width" || value === "none";
}

function notFresh(
  status: "stale" | "blocked",
  diagnostics: string[],
  sourcePartIds: string[]
): ProjectSheetCutPlanFreshnessReport {
  const safeDiagnostics = diagnostics.filter((item) => item.trim() !== "");
  return {
    schemaVersion: 1,
    status,
    result: null,
    json: null,
    sourcePartIds,
    diagnostics: safeDiagnostics.length > 0
      ? safeDiagnostics
      : ["Proje kesim planı güncel üretim verisiyle doğrulanamadı."]
  };
}

function changedFields(
  expected: ProjectSheetCutPlanFileResult["groups"][number]["cutPlan"]["sourceParts"][number],
  actual: {
    id: string;
    materialId: string;
    widthMm: number;
    lengthMm: number;
    thicknessMm: number;
    quantity: number;
    grainDirection: SheetGrainDirection;
    geometry: "rectangular";
  }
): string[] {
  const changes: string[] = [];
  if (expected.id !== actual.id) changes.push("kaynak kimliği/sırası");
  if (expected.widthMm !== actual.widthMm) changes.push("genişlik");
  if (expected.lengthMm !== actual.lengthMm) changes.push("uzunluk");
  if (expected.quantity !== actual.quantity) changes.push("adet");
  if (expected.materialId !== actual.materialId) changes.push("malzeme");
  if (expected.thicknessMm !== actual.thicknessMm) changes.push("kalınlık");
  if (expected.grainDirection !== actual.grainDirection) changes.push("damar yönü");
  if (expected.geometry !== actual.geometry) changes.push("geometri");
  return changes;
}

/**
 * Checks a saved machine-independent plan against the current production Part
 * snapshot. Only the selected source Part IDs persisted in the v1 plan are in
 * scope; no placement is regenerated and no partial JSON is returned.
 */
export function validateProjectSheetCutPlanFreshness(
  value: unknown
): ProjectSheetCutPlanFreshnessReport {
  let sourcePartIds: string[] = [];

  try {
    const request = record(value, "Proje kesim planı güncellik isteği");
    closed(
      request,
      ["schemaVersion", "savedPlanJson", "productionReport", "grainDirectionsByPartId", "currentSelectedPartIds"],
      "Proje kesim planı güncellik isteği"
    );
    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje kesim planı güncellik şema sürümü.");
    }

    const parsedPlan = parseProjectSheetCutPlanJson(request.savedPlanJson);
    if (parsedPlan.status === "blocked" || parsedPlan.result === null) {
      return notFresh("blocked", parsedPlan.diagnostics, []);
    }
    sourcePartIds = [...parsedPlan.result.sourcePartIds];

    const selectedIds = new Set(sourcePartIds);
    const grainOverrides: RecordValue = request.grainDirectionsByPartId === undefined
      ? {}
      : record(request.grainDirectionsByPartId, "Parça damar yönü eşlemesi");
    for (const [partId, direction] of Object.entries(grainOverrides)) {
      if (!selectedIds.has(partId)) {
        throw new Error("Damar yönü eşlemesi kayıtlı kesim planında bulunmayan Part ID içeriyor: " + partId + ".");
      }
      if (!isGrainDirection(direction)) {
        throw new Error(partId + " için damar yönü length, width veya none olmalıdır.");
      }
    }

    const productionReport = record(request.productionReport, "Güncel proje üretim raporu");
    if (productionReport.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen güncel proje üretim raporu şema sürümü.");
    }
    if (productionReport.status === "blocked") {
      const detail = typeof productionReport.firstError === "string" &&
        productionReport.firstError.trim() !== ""
        ? productionReport.firstError
        : "Güncel proje üretim raporu blocked durumunda.";
      return notFresh("blocked", [detail], sourcePartIds);
    }
    if (productionReport.status !== "ready" && productionReport.status !== "empty") {
      throw new Error("Güncel proje üretim raporu ready, empty veya blocked durumunda olmalıdır.");
    }

    const productionResult = record(productionReport.result, "Güncel proje üretim sonucu");
    if (productionResult.schemaVersion !== 1 || !Array.isArray(productionResult.parts)) {
      throw new Error("Güncel proje üretim sonucu geçerli bir v1 Part listesi taşımalıdır.");
    }

    if (parsedPlan.result.projectPartSnapshot !== undefined) {
      if (!Array.isArray(request.currentSelectedPartIds)) {
        return notFresh(
          "blocked",
          ["Proje kesim planı JSON v2 freshness doğrulaması için güncel currentSelectedPartIds listesi gereklidir."],
          sourcePartIds
        );
      }
      const currentSelectedPartIds = request.currentSelectedPartIds.map((rawId, index) =>
        identifier(rawId, "Güncel seçili Part ID " + (index + 1))
      );
      if (new Set(currentSelectedPartIds).size !== currentSelectedPartIds.length) {
        throw new Error("Güncel seçili Part ID listesinde yinelenen kimlik var.");
      }
      if (
        currentSelectedPartIds.length !== sourcePartIds.length ||
        currentSelectedPartIds.some((id, index) => id !== sourcePartIds[index])
      ) {
        return notFresh(
          "stale",
          ["Güncel kullanıcı Part seçim kapsamı kaydedilmiş kesim planıyla eşleşmiyor."],
          sourcePartIds
        );
      }
      const currentProjectSnapshot = createProjectPartSnapshot(productionResult.parts);
      const comparison = compareProjectPartSnapshots(parsedPlan.result.projectPartSnapshot, currentProjectSnapshot);
      if (comparison.changed) return notFresh("stale", comparison.diagnostics, sourcePartIds);
    }

    if (productionReport.status === "empty") {
      if (productionResult.parts.length !== 0) {
        throw new Error("Empty proje üretim raporu boş olmayan Part listesi taşıyamaz.");
      }
      if (parsedPlan.status === "empty") {
        return {
          schemaVersion: 1,
          status: "fresh",
          result: parsedPlan.result,
          json: request.savedPlanJson as string,
          sourcePartIds,
          diagnostics: []
        };
      }
      return notFresh(
        "stale",
        ["Kaydedilmiş kesim planının kaynak Part'ları artık güncel üretim snapshot'ında bulunmuyor."],
        sourcePartIds
      );
    }

    if (productionResult.parts.length === 0) {
      throw new Error("Ready proje üretim raporu boş Part listesi taşıyamaz.");
    }
    if (parsedPlan.status === "empty") {
      return notFresh(
        "stale",
        ["Kaydedilmiş boş kesim planından sonra projeye üretim Part'ları eklenmiş."],
        sourcePartIds
      );
    }

    const currentPartsById = new Map<string, RecordValue>();
    const currentPartOrder: string[] = [];
    for (let index = 0; index < productionResult.parts.length; index += 1) {
      const part = record(productionResult.parts[index], "Güncel üretim Part kaydının " + (index + 1) + ". öğesi");
      const id = identifier(part.id, "Güncel üretim Part kimliği");
      if (currentPartsById.has(id)) {
        throw new Error("Güncel üretim snapshot'ında yinelenen Part ID var: " + id + ".");
      }
      currentPartsById.set(id, part);
      currentPartOrder.push(id);
    }

    const missingPartIds = sourcePartIds.filter((id) => !currentPartsById.has(id));
    if (missingPartIds.length > 0) {
      return notFresh(
        "stale",
        ["Güncel üretim snapshot'ında bulunmayan kayıtlı Part ID'leri: " + missingPartIds.join(", ") + "."],
        sourcePartIds
      );
    }

    for (const id of sourcePartIds) {
      const part = currentPartsById.get(id);
      if (!part) continue;
      const overrideExists = Object.prototype.hasOwnProperty.call(grainOverrides, id);
      if (part.grainDirection === undefined && !overrideExists) {
        return notFresh(
          "blocked",
          [id + " için güncel Part snapshot'ında damar yönü yok; kaydedilmiş planı karşılaştırmak için aynı açık grain override girdisi gereklidir."],
          sourcePartIds
        );
      }
      if (!overrideExists && part.grainDirection !== undefined && !isGrainDirection(part.grainDirection)) {
        return notFresh(
          "blocked",
          [id + " için güncel Part snapshot'ındaki damar yönü geçersiz."],
          sourcePartIds
        );
      }
    }

    const staleDiagnostics: string[] = [];
    for (const group of parsedPlan.result.groups) {
      const groupOverrides: Record<string, SheetGrainDirection> = {};
      for (const id of group.sourcePartIds) {
        if (Object.prototype.hasOwnProperty.call(grainOverrides, id)) {
          groupOverrides[id] = grainOverrides[id] as SheetGrainDirection;
        }
      }

      const currentBatch = createProjectSheetNestingInput({
        schemaVersion: 1,
        productionReport: request.productionReport as CabinetProjectProductionReport,
        sheet: group.cutPlan.stockSheet,
        kerfMm: group.cutPlan.kerfMm,
        partIds: group.sourcePartIds,
        ...(Object.keys(groupOverrides).length === 0
          ? {}
          : { grainDirectionsByPartId: groupOverrides })
      });

      if (currentBatch.status !== "ready" || currentBatch.result === null) {
        staleDiagnostics.push(
          group.groupId + " grubu güncel üretim snapshot'ından yeniden doğrulanamadı: " +
          currentBatch.diagnostics.join(" ")
        );
        continue;
      }

      const expectedParts = group.cutPlan.sourceParts;
      const actualParts = currentBatch.result.parts;
      if (expectedParts.length !== actualParts.length) {
        staleDiagnostics.push(group.groupId + " grubunun kaynak Part adedi değişmiş.");
        continue;
      }

      for (let index = 0; index < expectedParts.length; index += 1) {
        const expected = expectedParts[index];
        const actual = actualParts[index];
        if (!expected || !actual) {
          staleDiagnostics.push(group.groupId + " grubunun kaynak Part listesi eksik.");
          continue;
        }
        const changes = changedFields(expected, actual);
        if (changes.length > 0) {
          staleDiagnostics.push(
            actual.id + " güncel üretim snapshot'ıyla eşleşmiyor: " +
            changes.join(", ") + " değişmiş; kesim planı stale."
          );
        }
      }
    }

    const selectedSet = new Set(sourcePartIds);
    const currentSelectedOrder = currentPartOrder.filter((id) => selectedSet.has(id));
    if (
      currentSelectedOrder.length !== sourcePartIds.length ||
      currentSelectedOrder.some((id, index) => id !== sourcePartIds[index])
    ) {
      staleDiagnostics.push("Seçili kaynak Part sırası güncel üretim snapshot'ında değişmiş.");
    }

    if (staleDiagnostics.length > 0) {
      return notFresh("stale", staleDiagnostics, sourcePartIds);
    }

    return {
      schemaVersion: 1,
      status: "fresh",
      result: parsedPlan.result,
      json: request.savedPlanJson as string,
      sourcePartIds,
      diagnostics: []
    };
  } catch (error) {
    return notFresh(
      "blocked",
      [error instanceof Error ? error.message : String(error)],
      sourcePartIds
    );
  }
}
