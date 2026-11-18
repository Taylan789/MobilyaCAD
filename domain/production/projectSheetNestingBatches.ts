import type { CabinetProjectProductionReport } from "./projectProduction.ts";
import { createProjectSheetNestingInput } from "./projectSheetNestingInput.ts";
import type {
  SheetGrainDirection,
  SheetNestingBatchResult,
  SheetNestingSheet
} from "./sheetNestingInput.ts";

export interface ProjectSheetNestingStockDefinition {
  sheet: SheetNestingSheet;
  kerfMm: number;
  /** Explicit grain overrides for legacy Part rows that do not store a direction. */
  grainDirectionsByPartId?: Readonly<Record<string, SheetGrainDirection>>;
}

export interface ProjectSheetNestingBatchesRequest {
  schemaVersion: 1;
  productionReport: CabinetProjectProductionReport;
  /** Omitted means every project Part; otherwise only these unique IDs are selected. */
  partIds?: readonly string[];
  /** Exactly one user-defined stock-sheet/kerf definition is required per selected group. */
  stockSheets: readonly ProjectSheetNestingStockDefinition[];
}

export interface ProjectSheetNestingBatchGroup {
  materialId: string;
  thicknessMm: number;
  /** Selected source Part IDs in project order. */
  sourcePartIds: string[];
  batch: SheetNestingBatchResult;
}

export interface ProjectSheetNestingBatchesResult {
  schemaVersion: 1;
  batches: ProjectSheetNestingBatchGroup[];
}

export interface ProjectSheetNestingBatchesReport {
  schemaVersion: 1;
  status: "ready" | "blocked";
  /** All groups are returned together, or null when any group is invalid. */
  result: ProjectSheetNestingBatchesResult | null;
  sourcePartIds: string[];
  /** Project Part IDs not selected by the caller. */
  excludedPartIds: string[];
  diagnostics: string[];
}

type RecordValue = Record<string, unknown>;
type SourcePart = { id: string; part: RecordValue };
type PartGroup = {
  materialId: string;
  thicknessMm: number;
  parts: SourcePart[];
};
type StockDefinition = {
  sheet: unknown;
  kerfMm: unknown;
  grainDirectionsByPartId: unknown;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): RecordValue {
  if (!isRecord(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value;
}

function requireIdentifier(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim() !== value
  ) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function rejectUnknownKeys(
  value: RecordValue,
  allowed: readonly string[],
  label: string
): void {
  const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknownKey !== undefined) {
    throw new Error(label + " için desteklenmeyen alan: " + unknownKey + ".");
  }
}

/** Uses the same 0.1 mm half-up normalization as the single-sheet validator. */
function normalizeThicknessMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }

  const scaled = value * 10;
  if (!Number.isFinite(scaled)) {
    throw new Error(label + " 0.1 mm normalizasyon aralığını aşıyor.");
  }

  const normalized = Math.round(scaled + Number.EPSILON * 10) / 10;
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error(label + " 0.1 mm normalizasyonundan sonra geçerli kalmalıdır.");
  }
  return normalized;
}

function groupKey(materialId: string, thicknessMm: number): string {
  return JSON.stringify([materialId, thicknessMm.toFixed(1)]);
}

function blocked(
  diagnostics: string[],
  sourcePartIds: string[] = [],
  excludedPartIds: string[] = []
): ProjectSheetNestingBatchesReport {
  return {
    schemaVersion: 1,
    status: "blocked",
    result: null,
    sourcePartIds,
    excludedPartIds,
    diagnostics
  };
}

/**
 * Partitions an explicit project Part selection by catalog material ID and
 * normalized thickness. Every group needs its own user-defined sheet and kerf.
 *
 * Each group is passed through the existing single-sheet validator. The function
 * returns no partial batch set: one missing or invalid group blocks the aggregate.
 * Kerf is validated and retained, but this input stage does not place parts or
 * consume kerf in a layout algorithm.
 */
export function createProjectSheetNestingBatches(
  value: unknown
): ProjectSheetNestingBatchesReport {
  let selectedPartIds: string[] = [];
  let excludedPartIds: string[] = [];

  try {
    const request = requireRecord(value, "Proje levha batch gruplama isteği");
    rejectUnknownKeys(
      request,
      ["schemaVersion", "productionReport", "partIds", "stockSheets"],
      "Proje levha batch gruplama isteği"
    );

    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje levha batch gruplama şema sürümü.");
    }

    const productionReport = requireRecord(
      request.productionReport,
      "Proje üretim raporu"
    );
    if (productionReport.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje üretim raporu şema sürümü.");
    }
    if (productionReport.status !== "ready") {
      const detail = typeof productionReport.firstError === "string"
        ? productionReport.firstError
        : "Proje üretim raporu ready durumunda değil.";
      throw new Error(detail);
    }

    const productionResult = requireRecord(
      productionReport.result,
      "Proje üretim sonucu"
    );
    if (
      productionResult.schemaVersion !== 1 ||
      !Array.isArray(productionResult.parts)
    ) {
      throw new Error("Proje üretim sonucu geçerli bir v1 Part listesi içermelidir.");
    }
    if (productionResult.parts.length === 0) {
      throw new Error("Levha batch gruplaması için projede üretim parçası bulunmuyor.");
    }

    const sourceParts: SourcePart[] = productionResult.parts.map((rawPart, index) => {
      const part = requireRecord(
        rawPart,
        "Proje üretim listesinin " + (index + 1) + ". parçası"
      );
      const id = requireIdentifier(part.id, "Proje üretim parçası kimliği");
      return { id, part };
    });

    const sourceIdSet = new Set<string>();
    for (const sourcePart of sourceParts) {
      if (sourceIdSet.has(sourcePart.id)) {
        throw new Error(
          "Proje üretim listesinde yinelenen parça kimliği: " +
          sourcePart.id +
          "."
        );
      }
      sourceIdSet.add(sourcePart.id);
    }

    if (request.partIds === undefined) {
      selectedPartIds = sourceParts.map((sourcePart) => sourcePart.id);
    } else {
      if (!Array.isArray(request.partIds) || request.partIds.length === 0) {
        throw new Error("Levha batch parça seçimi boş olmayan bir kimlik listesi olmalıdır.");
      }

      const requestedIds = new Set<string>();
      for (let index = 0; index < request.partIds.length; index += 1) {
        const id = requireIdentifier(
          request.partIds[index],
          "Seçilen " + (index + 1) + ". parça kimliği"
        );
        if (requestedIds.has(id)) {
          throw new Error("Levha batch seçiminde yinelenen parça kimliği: " + id + ".");
        }
        if (!sourceIdSet.has(id)) {
          throw new Error(
            "Levha batch seçimi projede bulunmayan parça kimliğini içeriyor: " +
            id +
            "."
          );
        }
        requestedIds.add(id);
      }
      selectedPartIds = sourceParts
        .filter((sourcePart) => requestedIds.has(sourcePart.id))
        .map((sourcePart) => sourcePart.id);
    }

    const selectedSet = new Set(selectedPartIds);
    const selectedParts = sourceParts.filter((sourcePart) => selectedSet.has(sourcePart.id));
    excludedPartIds = sourceParts
      .filter((sourcePart) => !selectedSet.has(sourcePart.id))
      .map((sourcePart) => sourcePart.id);

    if (selectedParts.length === 0) {
      throw new Error("Levha batch gruplaması için en az bir seçili Part gereklidir.");
    }

    if (!Array.isArray(request.stockSheets) || request.stockSheets.length === 0) {
      throw new Error("Her malzeme/kalınlık grubu için açık levha ve kerf tanımı gereklidir.");
    }

    const groups = new Map<string, PartGroup>();
    for (const sourcePart of selectedParts) {
      const materialId = requireIdentifier(
        sourcePart.part.materialId,
        sourcePart.id + " malzeme kimliği"
      );
      const thicknessMm = normalizeThicknessMm(
        sourcePart.part.thickness,
        sourcePart.id + " kalınlığı"
      );
      const key = groupKey(materialId, thicknessMm);
      const group = groups.get(key);
      if (group) {
        group.parts.push(sourcePart);
      } else {
        groups.set(key, { materialId, thicknessMm, parts: [sourcePart] });
      }
    }

    const definitions = new Map<string, StockDefinition>();
    for (let index = 0; index < request.stockSheets.length; index += 1) {
      const rawDefinition = requireRecord(
        request.stockSheets[index],
        "Levha tanımının " + (index + 1) + ". kaydı"
      );
      rejectUnknownKeys(
        rawDefinition,
        ["sheet", "kerfMm", "grainDirectionsByPartId"],
        "Levha tanımı"
      );

      const sheet = requireRecord(
        rawDefinition.sheet,
        "Levha tanımının " + (index + 1) + ". levhası"
      );
      rejectUnknownKeys(
        sheet,
        ["materialId", "widthMm", "lengthMm", "thicknessMm", "grainDirection"],
        "Levha"
      );
      const materialId = requireIdentifier(
        sheet.materialId,
        "Levha malzeme kimliği"
      );
      const thicknessMm = normalizeThicknessMm(
        sheet.thicknessMm,
        "Levha kalınlığı"
      );
      const key = groupKey(materialId, thicknessMm);
      if (definitions.has(key)) {
        throw new Error(
          materialId +
          " / " +
          thicknessMm +
          " mm grubu için yinelenen levha tanımı var."
        );
      }

      definitions.set(key, {
        sheet: rawDefinition.sheet,
        kerfMm: rawDefinition.kerfMm,
        grainDirectionsByPartId: rawDefinition.grainDirectionsByPartId
      });
    }

    const diagnostics: string[] = [];
    const batches: ProjectSheetNestingBatchGroup[] = [];

    for (const [key, group] of groups) {
      const definition = definitions.get(key);
      if (!definition) {
        diagnostics.push(
          group.materialId +
          " / " +
          group.thicknessMm +
          " mm grubu için kullanıcı tarafından tanımlanmış levha ve kerf bulunmuyor."
        );
        continue;
      }

      const batch = createProjectSheetNestingInput({
        schemaVersion: 1,
        productionReport: request.productionReport,
        sheet: definition.sheet,
        kerfMm: definition.kerfMm,
        partIds: group.parts.map((sourcePart) => sourcePart.id),
        ...(definition.grainDirectionsByPartId === undefined
          ? {}
          : { grainDirectionsByPartId: definition.grainDirectionsByPartId })
      });

      if (batch.status !== "ready" || batch.result === null) {
        diagnostics.push(
          group.materialId +
          " / " +
          group.thicknessMm +
          " mm grubu: " +
          batch.diagnostics.join(" ")
        );
        continue;
      }

      batches.push({
        materialId: group.materialId,
        thicknessMm: group.thicknessMm,
        sourcePartIds: batch.sourcePartIds,
        batch: batch.result
      });
    }

    for (const key of definitions.keys()) {
      if (!groups.has(key)) {
        const definition = definitions.get(key);
        if (!definition) continue;
        const sheet = requireRecord(definition.sheet, "Levha");
        diagnostics.push(
          String(sheet.materialId) +
          " / " +
          String(sheet.thicknessMm) +
          " mm levha tanımı seçili Part gruplarından hiçbirine karşılık gelmiyor."
        );
      }
    }

    if (diagnostics.length > 0) {
      return blocked(diagnostics, selectedPartIds, excludedPartIds);
    }

    return {
      schemaVersion: 1,
      status: "ready",
      result: {
        schemaVersion: 1,
        batches
      },
      sourcePartIds: selectedPartIds,
      excludedPartIds,
      diagnostics: []
    };
  } catch (error) {
    return blocked(
      [error instanceof Error ? error.message : String(error)],
      selectedPartIds,
      excludedPartIds
    );
  }
}
