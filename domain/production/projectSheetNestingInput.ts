import type {
  CabinetProjectProductionReport,
  ProjectProductionPart
} from "./projectProduction.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";
import type {
  SheetGrainDirection,
  SheetNestingBatchResult,
  SheetNestingSheet
} from "./sheetNestingInput.ts";

export interface ProjectSheetNestingInputRequest {
  schemaVersion: 1;
  productionReport: CabinetProjectProductionReport;
  sheet: SheetNestingSheet;
  kerfMm: number;
  /** Omitted means all project Part rows; an explicit list creates one stock batch. */
  partIds?: readonly string[];
  /** Explicit grain overrides, primarily for legacy Part rows without stored grain direction. */
  grainDirectionsByPartId?: Readonly<Record<string, SheetGrainDirection>>;
}

export interface ProjectSheetNestingInputReport {
  schemaVersion: 1;
  status: "ready" | "blocked";
  /** Validated stock-sheet input only; this is not a placed nesting layout. */
  result: SheetNestingBatchResult | null;
  /** Part IDs represented by result.parts, in project source order. */
  sourcePartIds: string[];
  /** Project Part IDs deliberately left outside this one-material/one-thickness batch. */
  excludedPartIds: string[];
  diagnostics: string[];
}

type RecordValue = Record<string, unknown>;

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

function blocked(
  message: string,
  sourcePartIds: string[] = [],
  excludedPartIds: string[] = []
): ProjectSheetNestingInputReport {
  return {
    schemaVersion: 1,
    status: "blocked",
    result: null,
    sourcePartIds,
    excludedPartIds,
    diagnostics: [message]
  };
}

/**
 * Maps one explicit project Part selection into a validated single-stock-sheet batch.
 *
 * Part identity, quantity and mm dimensions are carried without reinterpretation.
 * Legacy parts without stored grain direction require a caller-supplied override.
 * Through-cutout geometry is blocked; kerf is validated and retained but is not
 * consumed by a placement algorithm in this input-only stage.
 */
export function createProjectSheetNestingInput(
  value: unknown
): ProjectSheetNestingInputReport {
  let selectedPartIds: string[] = [];
  let excludedPartIds: string[] = [];

  try {
    const request = requireRecord(value, "Proje levha yerleşim isteği");
    rejectUnknownKeys(
      request,
      [
        "schemaVersion",
        "productionReport",
        "sheet",
        "kerfMm",
        "partIds",
        "grainDirectionsByPartId"
      ],
      "Proje levha yerleşim isteği"
    );

    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje levha yerleşim şema sürümü.");
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
    if (productionResult.schemaVersion !== 1 || !Array.isArray(productionResult.parts)) {
      throw new Error("Proje üretim sonucu geçerli bir v1 Part listesi içermelidir.");
    }
    if (productionResult.parts.length === 0) {
      throw new Error("Levha yerleşimi için projede üretim parçası bulunmuyor.");
    }

    const sourceParts = productionResult.parts.map((rawPart, index) => {
      const part = requireRecord(
        rawPart,
        "Proje üretim listesinin " + (index + 1) + ". parçası"
      );
      const id = requireIdentifier(part.id, "Proje üretim parçası kimliği");
      if (part.panelGeometry !== undefined) {
        throw new Error(
          id + " parçası panel kesit geometrisi içeriyor; bu aşamada yalnızca rectangular parça kabul edilir."
        );
      }
      if (part.geometry !== undefined && part.geometry !== "rectangular") {
        throw new Error(id + " parçasının geometrisi rectangular değil.");
      }
      return { id, part };
    });

    const sourceIdSet = new Set<string>();
    for (const sourcePart of sourceParts) {
      if (sourceIdSet.has(sourcePart.id)) {
        throw new Error("Proje üretim listesinde yinelenen parça kimliği: " + sourcePart.id + ".");
      }
      sourceIdSet.add(sourcePart.id);
    }

    if (request.partIds === undefined) {
      selectedPartIds = sourceParts.map((sourcePart) => sourcePart.id);
    } else {
      if (!Array.isArray(request.partIds) || request.partIds.length === 0) {
        throw new Error("Levha batch parça seçimi boş olmayan bir kimlik listesi olmalıdır.");
      }

      const selectedSet = new Set<string>();
      selectedPartIds = request.partIds.map((rawId, index) => {
        const id = requireIdentifier(rawId, "Seçilen " + (index + 1) + ". parça kimliği");
        if (selectedSet.has(id)) {
          throw new Error("Levha batch seçiminde yinelenen parça kimliği: " + id + ".");
        }
        if (!sourceIdSet.has(id)) {
          throw new Error("Levha batch seçimi projede bulunmayan parça kimliğini içeriyor: " + id + ".");
        }
        selectedSet.add(id);
        return id;
      });
    }

    const selectedSet = new Set(selectedPartIds);
    const selectedParts = sourceParts.filter((sourcePart) => selectedSet.has(sourcePart.id));
    excludedPartIds = sourceParts
      .filter((sourcePart) => !selectedSet.has(sourcePart.id))
      .map((sourcePart) => sourcePart.id);
    selectedPartIds = selectedParts.map((sourcePart) => sourcePart.id);

    let grainOverrides: RecordValue = {};
    if (request.grainDirectionsByPartId !== undefined) {
      grainOverrides = requireRecord(
        request.grainDirectionsByPartId,
        "Parça damar yönü eşlemesi"
      );
    }

    const unknownGrainPartId = Object.keys(grainOverrides).find(
      (id) => !selectedSet.has(id)
    );
    if (unknownGrainPartId !== undefined) {
      throw new Error(
        "Damar yönü eşlemesi seçili batch içinde olmayan parça kimliğini içeriyor: " +
        unknownGrainPartId + "."
      );
    }

    const nestingParts = selectedParts.map(({ id, part }) => {
      const grainDirection = Object.prototype.hasOwnProperty.call(grainOverrides, id)
        ? grainOverrides[id]
        : part.grainDirection;

      if (grainDirection === undefined) {
        throw new Error(
          id + " parçası için damar yönü açıkça belirtilmelidir; varsayılan yön üretilmez."
        );
      }

      return {
        id,
        materialId: part.materialId,
        widthMm: part.width,
        lengthMm: part.length,
        thicknessMm: part.thickness,
        quantity: part.quantity,
        grainDirection,
        geometry: "rectangular"
      };
    });

    const validation = validateSheetNestingInput({
      schemaVersion: 1,
      sheet: request.sheet,
      kerfMm: request.kerfMm,
      parts: nestingParts
    });

    if (validation.status === "blocked") {
      return blocked(
        validation.diagnostics.join(" "),
        selectedPartIds,
        excludedPartIds
      );
    }
    if (validation.status === "empty") {
      return blocked(
        "Levha batch için en az bir seçili üretim parçası gereklidir.",
        selectedPartIds,
        excludedPartIds
      );
    }

    return {
      schemaVersion: 1,
      status: "ready",
      result: validation.result,
      sourcePartIds: selectedPartIds,
      excludedPartIds,
      diagnostics: []
    };
  } catch (error) {
    return blocked(
      error instanceof Error ? error.message : String(error),
      selectedPartIds,
      excludedPartIds
    );
  }
}
