import {
  calculateSheetCutPlanAreaSummary,
  type SheetCutPlanAreaSummary,
  type SheetCutPlanReport
} from "./sheetCutPlan.ts";

export interface ProjectSheetCutPlanAreaGroupSummary {
  /** Stable opaque key derived from catalog material ID and normalized 0.1 mm thickness. */
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: string[];
  areaSummary: SheetCutPlanAreaSummary;
}

export interface ProjectSheetCutPlanAreaTotals {
  sheetCount: number;
  grossSheetAreaMm2: number;
  trimExcludedAreaMm2: number;
  usableSheetAreaMm2: number;
  placedPartAreaMm2: number;
  unoccupiedUsableAreaMm2: number;
  /** Weighted geometric occupancy across groups; not material yield or waste. */
  geometricOccupancyPercent: number | null;
}

export interface ProjectSheetCutPlanAreaSummary {
  schemaVersion: 1;
  groupCount: number;
  /** Selected project Part IDs in original project order. */
  sourcePartIds: string[];
  totals: ProjectSheetCutPlanAreaTotals;
  /** Group order follows the supplied batch order; sheet indexes remain local to each group. */
  groups: ProjectSheetCutPlanAreaGroupSummary[];
}

export type ProjectSheetCutPlanAreaSummaryReport =
  | { schemaVersion: 1; status: "ready" | "empty"; result: ProjectSheetCutPlanAreaSummary; diagnostics: [] }
  | { schemaVersion: 1; status: "blocked"; result: null; diagnostics: string[] };

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

function areaHundredths(value: number, label: string): bigint {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(label + " sonlu ve sıfır veya pozitif mm² değeri olmalıdır.");
  }
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (!Number.isFinite(scaled) || !Number.isSafeInteger(rounded)) {
    throw new Error(label + " güvenli 0.01 mm² aralığını aşıyor.");
  }
  return BigInt(rounded);
}

function areaFromHundredths(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(label + " güvenli toplam mm² aralığını aşıyor.");
  }
  return Number(value) / 100;
}

function geometricOccupancyPercent(placedArea: bigint, usableArea: bigint): number | null {
  if (usableArea === 0n) return null;
  const roundedHundredths = (placedArea * 10_000n + usableArea / 2n) / usableArea;
  if (roundedHundredths > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Proje geometrik doluluk yüzdesi güvenli sayı aralığını aşıyor.");
  }
  return Number(roundedHundredths) / 100;
}

function emptyTotals(): ProjectSheetCutPlanAreaTotals {
  return {
    sheetCount: 0,
    grossSheetAreaMm2: 0,
    trimExcludedAreaMm2: 0,
    usableSheetAreaMm2: 0,
    placedPartAreaMm2: 0,
    unoccupiedUsableAreaMm2: 0,
    geometricOccupancyPercent: null
  };
}

function blocked(diagnostics: string[]): ProjectSheetCutPlanAreaSummaryReport {
  return { schemaVersion: 1, status: "blocked", result: null, diagnostics };
}

/**
 * Combines independently verified cut-plan area summaries by material and
 * normalized thickness. Every selected Part must occur in exactly one group.
 * One blocked or inconsistent group blocks the entire project summary.
 */
export function calculateProjectSheetCutPlanAreaSummary(value: unknown): ProjectSheetCutPlanAreaSummaryReport {
  try {
    const request = record(value, "Proje kesim planı alan özeti isteği");
    closed(request, ["schemaVersion", "sourcePartIds", "groups"], "Proje kesim planı alan özeti isteği");
    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje kesim planı alan özeti şema sürümü.");
    }
    if (!Array.isArray(request.sourcePartIds)) {
      throw new Error("Proje seçili Part ID listesi bir liste olmalıdır.");
    }
    if (!Array.isArray(request.groups)) {
      throw new Error("Proje kesim planı grupları bir liste olmalıdır.");
    }

    const sourcePartIds = request.sourcePartIds.map((rawId, index) =>
      identifier(rawId, "Seçili " + (index + 1) + ". proje Part ID")
    );
    const selectedIds = new Set<string>();
    for (const id of sourcePartIds) {
      if (selectedIds.has(id)) {
        throw new Error("Proje seçili Part ID listesinde yinelenen kimlik var: " + id + ".");
      }
      selectedIds.add(id);
    }

    if (sourcePartIds.length === 0 && request.groups.length === 0) {
      return {
        schemaVersion: 1,
        status: "empty",
        result: {
          schemaVersion: 1,
          groupCount: 0,
          sourcePartIds: [],
          totals: emptyTotals(),
          groups: []
        },
        diagnostics: []
      };
    }
    if (sourcePartIds.length === 0 || request.groups.length === 0) {
      throw new Error("Seçili proje Part ID'leri ile kesim planı grupları birlikte ve eksiksiz sağlanmalıdır.");
    }

    const seenPartIds = new Set<string>();
    const seenGroupIds = new Set<string>();
    const diagnostics: string[] = [];
    const groups: ProjectSheetCutPlanAreaGroupSummary[] = [];

    for (let index = 0; index < request.groups.length; index += 1) {
      const rawGroup = record(request.groups[index], "Kesim planı grubunun " + (index + 1) + ". kaydı");
      closed(
        rawGroup,
        ["materialId", "thicknessMm", "sourcePartIds", "cutPlanReport"],
        "Kesim planı grubu"
      );

      const materialId = identifier(rawGroup.materialId, "Kesim planı grup malzeme kimliği");
      const thickness = normalizeThickness(rawGroup.thicknessMm, materialId + " grup kalınlığı");
      const groupId = JSON.stringify([materialId, thickness.ticks]);
      if (seenGroupIds.has(groupId)) {
        throw new Error(materialId + " / " + thickness.mm + " mm grubu birden fazla kez verilmiş.");
      }
      seenGroupIds.add(groupId);

      if (!Array.isArray(rawGroup.sourcePartIds) || rawGroup.sourcePartIds.length === 0) {
        throw new Error(groupId + " grubu boş olmayan kaynak Part ID listesi taşımalıdır.");
      }
      const groupPartIds = rawGroup.sourcePartIds.map((rawId, partIndex) =>
        identifier(rawId, groupId + " grubunun " + (partIndex + 1) + ". kaynak Part ID'si")
      );
      const groupPartSet = new Set<string>();
      for (const id of groupPartIds) {
        if (groupPartSet.has(id)) {
          throw new Error(groupId + " grubunda yinelenen kaynak Part ID var: " + id + ".");
        }
        groupPartSet.add(id);
        if (!selectedIds.has(id)) {
          throw new Error(groupId + " grubu seçili proje listesinde bulunmayan Part ID içeriyor: " + id + ".");
        }
        if (seenPartIds.has(id)) {
          throw new Error("Proje Part ID'si birden fazla malzeme/kalınlık grubunda bulunuyor: " + id + ".");
        }
        seenPartIds.add(id);
      }

      const cutPlanReport = rawGroup.cutPlanReport as SheetCutPlanReport;
      const areaReport = calculateSheetCutPlanAreaSummary(cutPlanReport);
      if (areaReport.status === "blocked") {
        diagnostics.push(groupId + " grubu: " + areaReport.diagnostics.join(" "));
        continue;
      }
      if (areaReport.status !== "ready" || cutPlanReport.status !== "ready" || cutPlanReport.result === null) {
        throw new Error(groupId + " grubu seçili kaynak parçalarına rağmen ready kesim planı taşımıyor.");
      }

      const plan = cutPlanReport.result;
      if (plan.stockSheet.materialId !== materialId) {
        throw new Error(groupId + " grubu levha malzeme kimliğiyle eşleşmiyor.");
      }
      if (normalizeThickness(plan.stockSheet.thicknessMm, groupId + " levha kalınlığı").ticks !== thickness.ticks) {
        throw new Error(groupId + " grubu levha kalınlığıyla eşleşmiyor.");
      }
      const planPartIds = plan.sourceParts.map((part) => part.id);
      if (
        planPartIds.length !== groupPartIds.length ||
        planPartIds.some((id, partIndex) => id !== groupPartIds[partIndex])
      ) {
        throw new Error(groupId + " grubu kaynak Part ID listesi kesim planıyla aynı sırada ve eksiksiz eşleşmelidir.");
      }
      for (const part of plan.sourceParts) {
        if (
          part.materialId !== materialId ||
          normalizeThickness(part.thicknessMm, part.id + " kaynak parça kalınlığı").ticks !== thickness.ticks
        ) {
          throw new Error(groupId + " grubu kesim planı farklı malzeme veya kalınlıkta kaynak parça içeriyor.");
        }
      }
      if (areaReport.result.sheetCount <= 0) {
        throw new Error(groupId + " grubu kaynak parçaları için en az bir doğrulanmış levha içermelidir.");
      }

      groups.push({
        groupId,
        materialId,
        thicknessMm: thickness.mm,
        sourcePartIds: groupPartIds,
        areaSummary: areaReport.result
      });
    }

    const missingPartIds = sourcePartIds.filter((id) => !seenPartIds.has(id));
    if (missingPartIds.length > 0) {
      diagnostics.push("Kesim planı gruplarında karşılığı bulunmayan seçili Part ID'leri: " + missingPartIds.join(", ") + ".");
    }
    if (diagnostics.length > 0) return blocked(diagnostics);

    let sheetCount = 0;
    let gross = 0n;
    let trim = 0n;
    let usable = 0n;
    let placed = 0n;
    let unoccupied = 0n;

    for (const group of groups) {
      const summary = group.areaSummary;
      sheetCount += summary.sheetCount;
      if (!Number.isSafeInteger(sheetCount)) {
        throw new Error("Proje toplam levha adedi güvenli sayı aralığını aşıyor.");
      }
      gross += areaHundredths(summary.grossSheetAreaMm2, "Brüt levha alanı");
      trim += areaHundredths(summary.trimExcludedAreaMm2, "Trim ile ayrılan alan");
      usable += areaHundredths(summary.usableSheetAreaMm2, "Net kullanılabilir levha alanı");
      placed += areaHundredths(summary.placedPartAreaMm2, "Yerleşen net parça alanı");
      unoccupied += areaHundredths(summary.unoccupiedUsableAreaMm2, "Kullanılmayan kullanılabilir alan");
    }

    const totals: ProjectSheetCutPlanAreaTotals = {
      sheetCount,
      grossSheetAreaMm2: areaFromHundredths(gross, "Toplam brüt levha alanı"),
      trimExcludedAreaMm2: areaFromHundredths(trim, "Toplam trim alanı"),
      usableSheetAreaMm2: areaFromHundredths(usable, "Toplam net kullanılabilir levha alanı"),
      placedPartAreaMm2: areaFromHundredths(placed, "Toplam yerleşen net parça alanı"),
      unoccupiedUsableAreaMm2: areaFromHundredths(unoccupied, "Toplam kullanılmayan kullanılabilir alan"),
      geometricOccupancyPercent: geometricOccupancyPercent(placed, usable)
    };

    return {
      schemaVersion: 1,
      status: "ready",
      result: {
        schemaVersion: 1,
        groupCount: groups.length,
        sourcePartIds,
        totals,
        groups
      },
      diagnostics: []
    };
  } catch (error) {
    return blocked([error instanceof Error ? error.message : String(error)]);
  }
}
