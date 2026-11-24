import {
  calculateProjectSheetCutPlanAreaSummary
} from "./projectSheetCutPlanAreaSummary.ts";
import { calculateProjectCostLineTotalMinor } from "./projectCostSummary.ts";

export interface ProjectSheetNestingStockCostPrice {
  groupId: string;
  materialId: string;
  thicknessMm: number;
  pricePerSheetMinor: number;
  currencyCode: string;
  sourceReference?: string;
}

export interface ProjectSheetNestingStockCostGroup {
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: string[];
  sheetCount: number;
  pricePerSheetMinor: number;
  stockSheetCostMinor: number;
  currencyCode: string;
  sourceReference?: string;
}

export interface ProjectSheetNestingStockCostSummary {
  schemaVersion: 1;
  groupCount: number;
  currencyCode: string | null;
  totals: {
    sheetCount: number;
    stockSheetPurchaseCostMinor: number;
  };
  groups: ProjectSheetNestingStockCostGroup[];
}

export type ProjectSheetNestingStockCostSummaryReport =
  | {
      schemaVersion: 1;
      status: "ready" | "empty";
      result: ProjectSheetNestingStockCostSummary;
      diagnostics: [];
    }
  | {
      schemaVersion: 1;
      status: "blocked";
      result: null;
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

function text(value: unknown, label: string, maxLength = 240): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim() !== value ||
    value.length > maxLength
  ) {
    throw new Error(label + " boş olmayan, kenar boşluğu içermeyen ve en fazla " + maxLength + " karakterlik metin olmalıdır.");
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

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function blocked(diagnostics: string[]): ProjectSheetNestingStockCostSummaryReport {
  return deepFreeze({ schemaVersion: 1 as const, status: "blocked" as const, result: null, diagnostics });
}

function empty(): ProjectSheetNestingStockCostSummaryReport {
  return deepFreeze({
    schemaVersion: 1 as const,
    status: "empty" as const,
    result: {
      schemaVersion: 1 as const,
      groupCount: 0,
      currencyCode: null,
      totals: { sheetCount: 0, stockSheetPurchaseCostMinor: 0 },
      groups: []
    },
    diagnostics: [] as []
  });
}

/**
 * Calculates stock-sheet purchase cost from a freshly validated project cut-plan
 * area summary. Every material/thickness group must have one explicit sheet
 * price. Prices are supplied in integer minor currency units; no waste, yield,
 * supplier price or net-consumption quote cost is inferred.
 */
export function calculateProjectSheetNestingStockCostSummary(
  value: unknown
): ProjectSheetNestingStockCostSummaryReport {
  try {
    const request = record(value, "Proje levha satın alma maliyeti isteği");
    closed(request, ["schemaVersion", "areaSummaryRequest", "sheetPrices"], "Proje levha satın alma maliyeti isteği");
    if (request.schemaVersion !== 1) {
      throw new Error("Desteklenmeyen proje levha satın alma maliyeti şema sürümü.");
    }
    if (!Array.isArray(request.sheetPrices)) {
      throw new Error("Levha fiyat tanımları bir liste olmalıdır.");
    }

    const areaReport = calculateProjectSheetCutPlanAreaSummary(request.areaSummaryRequest);
    if (areaReport.status === "blocked" || areaReport.result === null) {
      return blocked(areaReport.diagnostics.length > 0
        ? areaReport.diagnostics
        : ["Proje kesim planı alan özeti doğrulanamadı."]);
    }
    if (areaReport.status === "empty") {
      if (request.sheetPrices.length !== 0) {
        throw new Error("Boş kesim planı için kullanılmayan levha fiyat tanımı sağlanamaz.");
      }
      return empty();
    }

    const areaSummary = areaReport.result;
    if (areaSummary.groupCount !== areaSummary.groups.length || areaSummary.groups.length === 0) {
      throw new Error("Ready kesim planı alan özeti geçerli malzeme/kalınlık grupları içermelidir.");
    }

    const groups = areaSummary.groups.map((group, index) => {
      const materialId = text(group.materialId, (index + 1) + ". alan grubu malzeme kimliği");
      const thickness = normalizeThickness(group.thicknessMm, materialId + " alan grubu kalınlığı");
      const expectedGroupId = JSON.stringify([materialId, thickness.ticks]);
      if (group.groupId !== expectedGroupId) {
        throw new Error(materialId + " alan grubu kimliği malzeme/kalınlıkla tutarlı değil.");
      }
      const sheetCount = group.areaSummary.sheetCount;
      if (!Number.isSafeInteger(sheetCount) || sheetCount <= 0) {
        throw new Error(expectedGroupId + " doğrulanmış levha adedi pozitif güvenli bir tam sayı olmalıdır.");
      }
      if (!Array.isArray(group.sourcePartIds) || group.sourcePartIds.length === 0) {
        throw new Error(expectedGroupId + " kaynak Part kimlikleri boş olamaz.");
      }
      const sourcePartIds = group.sourcePartIds.map((id, partIndex) =>
        text(id, expectedGroupId + " " + (partIndex + 1) + ". kaynak Part ID")
      );
      return { groupId: expectedGroupId, materialId, thicknessMm: thickness.mm, sourcePartIds, sheetCount };
    });

    const groupsById = new Map(groups.map((group) => [group.groupId, group]));
    const pricesById = new Map<string, ProjectSheetNestingStockCostPrice>();
    let currencyCode: string | null = null;

    for (let index = 0; index < request.sheetPrices.length; index += 1) {
      const price = record(request.sheetPrices[index], "Levha fiyat tanımının " + (index + 1) + ". kaydı");
      closed(
        price,
        ["groupId", "materialId", "thicknessMm", "pricePerSheetMinor", "currencyCode", "sourceReference"],
        "Levha fiyat tanımı"
      );
      const groupId = text(price.groupId, "Levha fiyat grup kimliği");
      const group = groupsById.get(groupId);
      if (group === undefined) {
        throw new Error("Kesim planında bulunmayan veya kullanılmayan levha fiyat grup kimliği: " + groupId + ".");
      }
      if (pricesById.has(groupId)) {
        throw new Error("Yinelenen levha fiyat grup kimliği: " + groupId + ".");
      }

      const materialId = text(price.materialId, groupId + " fiyat malzeme kimliği");
      if (materialId !== group.materialId) {
        throw new Error(groupId + " fiyat malzeme kimliği kesim planı grubuyla eşleşmiyor.");
      }
      const thickness = normalizeThickness(price.thicknessMm, groupId + " fiyat kalınlığı");
      if (thickness.ticks !== Math.round(group.thicknessMm * 10)) {
        throw new Error(groupId + " fiyat kalınlığı kesim planı grubuyla eşleşmiyor.");
      }
      if (
        typeof price.pricePerSheetMinor !== "number" ||
        !Number.isSafeInteger(price.pricePerSheetMinor) ||
        price.pricePerSheetMinor < 0
      ) {
        throw new Error(groupId + " levha birim fiyatı negatif olmayan güvenli bir tam sayı minor-unit olmalıdır.");
      }
      const lineCurrency = text(price.currencyCode, groupId + " fiyat para birimi", 3);
      if (!/^[A-Z]{3}$/.test(lineCurrency)) {
        throw new Error(groupId + " para birimi kodu üç büyük harf olmalıdır.");
      }
      if (currencyCode !== null && currencyCode !== lineCurrency) {
        throw new Error("Levha satın alma maliyetinde farklı para birimleri birlikte kullanılamaz.");
      }
      currencyCode = lineCurrency;
      const sourceReference = price.sourceReference === undefined
        ? undefined
        : text(price.sourceReference, groupId + " fiyat kaynak referansı");
      pricesById.set(groupId, {
        groupId,
        materialId,
        thicknessMm: thickness.mm,
        pricePerSheetMinor: price.pricePerSheetMinor,
        currencyCode: lineCurrency,
        ...(sourceReference === undefined ? {} : { sourceReference })
      });
    }

    for (const group of groups) {
      if (!pricesById.has(group.groupId)) {
        throw new Error(group.groupId + " grubu için açık levha fiyat tanımı eksik.");
      }
    }

    let totalSheetCount = 0;
    let totalCostMinor = 0n;
    const resultGroups: ProjectSheetNestingStockCostGroup[] = [];
    for (const group of groups) {
      const price = pricesById.get(group.groupId);
      if (price === undefined) {
        throw new Error(group.groupId + " grubu için levha fiyatı bulunamadı.");
      }
      totalSheetCount += group.sheetCount;
      if (!Number.isSafeInteger(totalSheetCount)) {
        throw new Error("Proje toplam levha adedi güvenli tam sayı aralığını aşıyor.");
      }
      const stockSheetCostMinor = calculateProjectCostLineTotalMinor(
        group.sheetCount,
        price.pricePerSheetMinor,
        group.groupId + " levha satın alma maliyeti"
      );
      totalCostMinor += BigInt(stockSheetCostMinor);
      if (totalCostMinor > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Proje toplam levha satın alma maliyeti güvenli tam sayı aralığını aşıyor.");
      }
      resultGroups.push({
        groupId: group.groupId,
        materialId: group.materialId,
        thicknessMm: group.thicknessMm,
        sourcePartIds: [...group.sourcePartIds],
        sheetCount: group.sheetCount,
        pricePerSheetMinor: price.pricePerSheetMinor,
        stockSheetCostMinor,
        currencyCode: price.currencyCode,
        ...(price.sourceReference === undefined ? {} : { sourceReference: price.sourceReference })
      });
    }

    return deepFreeze({
      schemaVersion: 1 as const,
      status: "ready" as const,
      result: {
        schemaVersion: 1 as const,
        groupCount: resultGroups.length,
        currencyCode,
        totals: {
          sheetCount: totalSheetCount,
          stockSheetPurchaseCostMinor: Number(totalCostMinor)
        },
        groups: resultGroups
      },
      diagnostics: [] as []
    });
  } catch (error) {
    return blocked([error instanceof Error ? error.message : String(error)]);
  }
}
