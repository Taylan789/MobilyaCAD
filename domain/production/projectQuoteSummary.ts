import {
  calculateProjectLaborOperationPricingSummary,
  type ProjectLaborOperationPricingSummary,
  type ProjectLaborOperationTariffIssue
} from "./projectLaborOperationPricing.ts";
import {
  calculateProjectPricedConsumptionSummary,
  type ProjectCostCoverageIssue,
  type ProjectConsumptionLineHardwareSource,
  type ProjectPricedConsumptionSummary
} from "./projectPricedConsumption.ts";
import {
  calculateProjectCostSummary,
  type ProjectCostLineEdgeDirection,
  type ProjectCostLineInput,
  type ProjectCostSummary
} from "./projectCostSummary.ts";
import { calculateProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";
import type { CabinetProjectProductionResult } from "./projectProduction.ts";
import { calculateProjectEdgeBandingRollPlan } from "./projectEdgeBandingRollPlan.ts";
import {
  calculateProjectEdgeBandingRollCostSummary,
  type ProjectEdgeBandingRollCostSummary
} from "./projectEdgeBandingRollCostSummary.ts";

export interface ProjectQuoteLineSource {
  costLineId: string;
  sourceType: "production-consumption" | "labor-operation" | "quote-adjustment";
  sourceId: string;
  tariffId?: string;
  /** Hardware BOM identity is separate from the hardware price-list reference. */
  hardwareId?: string;
  hardwareUnit?: string;
  hardwareFurnitureIds?: string[];
  hardwareSourceReferences?: string[];
  /** Sorted unique production Part IDs for grouped consumption rows, when available. */
  sourcePartIds?: string[];
  /** Resource identity and units are machine-readable; descriptions are display-only. */
  resourceType?: "material" | "edge-banding";
  resourceId?: string;
  unit?: string;
  edgeDirection?: ProjectCostLineEdgeDirection;
  rollCount?: number;
  rollLengthMm?: number;
  purchasedLengthMm?: number;
  furnitureIds?: string[];
  planSourceReference?: string;
  /** User-supplied price-list source for hardware, or explicit roll-price source. */
  priceSourceReference?: string;
}

export interface ProjectQuoteSummary {
  status: "empty" | "incomplete" | "ready" | "blocked";
  currencyCode: string | null;
  requiredLineCount: number;
  pricedLineCount: number;
  missingPrices: ProjectCostCoverageIssue[];
  missingTariffs: ProjectLaborOperationTariffIssue[];
  diagnostics: string[];
  /** Source mapping is exposed only when the complete quote is ready. */
  lineSources: ProjectQuoteLineSource[];
  costSummary: ProjectCostSummary | null;
}

export interface ProjectQuoteEdgeBandingRollOptions {
  edgeBandingPricingMode?: "length" | "roll";
  edgeBandingRollSpecs?: unknown;
  edgeBandingRollPriceTable?: unknown;
  /** Excludes panel material prices only; hardware and edge-banding remain priced. */
  panelMaterialPricingMode?: "included" | "excluded";
}
interface ResolvedQuoteOptions {
  edgeBandingPricingMode: "length" | "roll";
  edgeBandingRollSpecs?: unknown;
  edgeBandingRollPriceTable?: unknown;
  panelMaterialPricingMode: "included" | "excluded";
}
const quoteOptionKeys = new Set([
  "edgeBandingPricingMode", "edgeBandingRollSpecs", "edgeBandingRollPriceTable", "panelMaterialPricingMode"
]);

function inspectQuoteOption<T>(read: () => T, label: string): T {
  try { return read(); }
  catch { throw new Error(label + " güvenli biçimde incelenemedi."); }
}

function copyQuoteOptions(value: unknown): Record<string, unknown> {
  const label = "Teklif fiyatlama seçenekleri";
  if (typeof value !== "object" || value === null ||
      inspectQuoteOption(() => Array.isArray(value), label)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  const prototype = inspectQuoteOption(() => Object.getPrototypeOf(value), label);
  if (prototype !== Object.prototype && prototype !== null) throw new Error(label + " düz JSON nesnesi olmalıdır.");

  const copy = Object.create(null) as Record<string, unknown>;
  const keys = inspectQuoteOption(() => Reflect.ownKeys(value), label);
  for (const key of keys) {
    if (typeof key !== "string") throw new Error(label + " sembol anahtarı içeremez.");
    if (!quoteOptionKeys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    const descriptor = inspectQuoteOption(() => Object.getOwnPropertyDescriptor(value, key), label);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      throw new Error(label + " own enumerable data property içermelidir.");
    }
    Object.defineProperty(copy, key, {
      value: descriptor.value, enumerable: true, configurable: true, writable: true
    });
  }
  return copy;
}

function resolveQuoteOptions(value: unknown): ResolvedQuoteOptions {
  if (value === undefined) return { edgeBandingPricingMode: "length", panelMaterialPricingMode: "included" };
  const options = copyQuoteOptions(value);
  const mode = options.edgeBandingPricingMode === undefined || options.edgeBandingPricingMode === null
    ? "length" : options.edgeBandingPricingMode;
  if (mode !== "length" && mode !== "roll") throw new Error("Kenar bandı fiyatlama modu length veya roll olmalıdır.");
  const panelMaterialPricingMode = options.panelMaterialPricingMode === undefined || options.panelMaterialPricingMode === null
    ? "included" : options.panelMaterialPricingMode;
  if (panelMaterialPricingMode !== "included" && panelMaterialPricingMode !== "excluded") {
    throw new Error("Panel malzeme fiyatlama modu included veya excluded olmalıdır.");
  }
  if (mode === "length") {
    if (Object.prototype.hasOwnProperty.call(options, "edgeBandingRollSpecs") ||
        Object.prototype.hasOwnProperty.call(options, "edgeBandingRollPriceTable")) {
      throw new Error("Rulo girdileri yalnızca roll fiyatlama modunda kullanılabilir.");
    }
    return { edgeBandingPricingMode: "length", panelMaterialPricingMode };
  }
  const rollSpecs = options.edgeBandingRollSpecs;
  const rollPriceTable = options.edgeBandingRollPriceTable;
  if (!inspectQuoteOption(() => Array.isArray(rollSpecs) && Array.isArray(rollPriceTable), "Rulo girdileri")) {
    throw new Error("Roll modu açık rulo ölçüleri ve rulo fiyat tablosu listelerini gerektirir.");
  }
  return { edgeBandingPricingMode: "roll", edgeBandingRollSpecs: rollSpecs, edgeBandingRollPriceTable: rollPriceTable, panelMaterialPricingMode };
}
function hasCompleteHardwareSourceCoverage(consumption: ProjectPricedConsumptionSummary): boolean {
  if (consumption.status !== "ready") return true;
  if (consumption.costSummary === null) return false;
  const hardwareLines = consumption.costSummary.lines.filter((line) => line.category === "hardware");
  const sourceIds = new Set<string>();
  for (const source of consumption.lineHardwareSources) {
    if (sourceIds.has(source.costLineId) ||
      !hardwareLines.some((line) => line.id === source.costLineId) ||
      source.hardwareId.trim() === "" || source.unit.trim() === "" || source.furnitureIds.length === 0) {
      return false;
    }
    sourceIds.add(source.costLineId);
  }
  return sourceIds.size === hardwareLines.length && hardwareLines.every((line) => sourceIds.has(line.id));
}


function diagnosticMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function quoteLineId(prefix: "consumption" | "work" | "adjustment", index: number): string {
  return prefix + "-" + String(index + 1).padStart(4, "0");
}

function toCostLine(line: ProjectCostLineInput, id: string): ProjectCostLineInput {
  return {
    id,
    category: line.category,
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    unitPriceMinor: line.unitPriceMinor,
    currencyCode: line.currencyCode,
    ...(line.sourceReference === undefined ? {} : { sourceReference: line.sourceReference }),
    ...(line.edgeDirection === undefined ? {} : { edgeDirection: line.edgeDirection })
  };
}

/**
 * Builds one quote from fully priced production consumption and explicit
 * labor/operation usage and optional, explicit waste/profit quote lines.
 * Neither sub-calculator's partial totals are exposed: every required source
 * line must be priced in one currency before the combined cost summary is ready.
 */
export function calculateProjectQuoteSummary(
  productionReport: unknown,
  consumptionPriceTable: unknown,
  workItems: unknown,
  tariffTable: unknown,
  quoteAdjustments: unknown = [],
  options: unknown = {}
): ProjectQuoteSummary {
  let resolvedOptions: ResolvedQuoteOptions;
  try { resolvedOptions = resolveQuoteOptions(options); }
  catch (error) {
    return { status:"blocked", currencyCode:null, requiredLineCount:0, pricedLineCount:0, missingPrices:[], missingTariffs:[], diagnostics:[diagnosticMessage(error)], lineSources:[], costSummary:null };
  }
  const consumption: ProjectPricedConsumptionSummary = calculateProjectPricedConsumptionSummary(productionReport, consumptionPriceTable, {
    edgeBandingPricingMode: resolvedOptions.edgeBandingPricingMode,
    panelMaterialPricingMode: resolvedOptions.panelMaterialPricingMode
  });
  const laborOperation: ProjectLaborOperationPricingSummary = calculateProjectLaborOperationPricingSummary(workItems, tariffTable);
  let rollCostSummary: ProjectEdgeBandingRollCostSummary | null = null;
  if (resolvedOptions.edgeBandingPricingMode === "roll") {
    let rollPlan: unknown = { status:"blocked", plans:null, missingRollSpecs:[], diagnostics:["Rulo planı üretim tüketiminden oluşturulamadı."] };
    try {
      if (!isRecord(productionReport) || !isRecord(productionReport.result)) throw new Error("Rulo planı için doğrulanmış proje üretim sonucu bulunmalıdır.");
      const groups = calculateProjectEdgeBandingConsumptionSummary(productionReport.result as unknown as CabinetProjectProductionResult);
      rollPlan = calculateProjectEdgeBandingRollPlan(groups, resolvedOptions.edgeBandingRollSpecs);
    } catch (error) { rollPlan = { status:"blocked", plans:null, missingRollSpecs:[], diagnostics:[diagnosticMessage(error)] }; }
    rollCostSummary = calculateProjectEdgeBandingRollCostSummary(rollPlan, resolvedOptions.edgeBandingRollPriceTable);
  }
  const missingPrices = consumption.missingPrices;
  const missingTariffs = laborOperation.missingTariffs;
  const diagnostics = [
    ...consumption.diagnostics.map((message) => "Üretim tüketimi: " + message),
    ...laborOperation.diagnostics.map((message) => "İşçilik/operasyon: " + message)
  ];
  if (rollCostSummary !== null && rollCostSummary.status !== "ready" && rollCostSummary.status !== "empty") {
    diagnostics.push(...rollCostSummary.diagnostics.map((message) => "Kenar bandı rulo: " + message));
    if (rollCostSummary.missingRollSpecs.length) diagnostics.push("Kenar bandı rulo ölçüsü eksik: " + rollCostSummary.missingRollSpecs.join(", ") + ".");
    if (rollCostSummary.missingPrices.length) diagnostics.push("Kenar bandı rulo fiyatı eksik: " + rollCostSummary.missingPrices.join(", ") + ".");
  }
  let adjustmentSummary: ProjectCostSummary;
  try {
    adjustmentSummary = calculateProjectCostSummary(quoteAdjustments);
    for (const line of adjustmentSummary.lines) {
      if (line.category !== "waste" && line.category !== "profit") {
        throw new Error("Teklif ek maliyetleri yalnızca waste veya profit kategorisinde olabilir.");
      }
      if (typeof line.sourceReference !== "string") {
        throw new Error("Her fire/kâr maliyet satırı için açık kaynak referansı zorunludur.");
      }
    }
  } catch (error) {
    return {
      status: "blocked",
      currencyCode: null,
      requiredLineCount: consumption.requiredLineCount + laborOperation.requiredLineCount,
      pricedLineCount: consumption.pricedLineCount + laborOperation.pricedLineCount,
      missingPrices,
      missingTariffs,
      diagnostics: [...diagnostics, "Teklif ek maliyetleri: " + diagnosticMessage(error)],
      lineSources: [],
      costSummary: null
    };
  }
  const adjustmentCount = adjustmentSummary.lines.length;
  const rollRequiredLineCount = rollCostSummary?.requiredLineCount ?? 0;
  const rollPricedLineCount = rollCostSummary?.pricedLineCount ?? 0;
  const requiredLineCount = consumption.requiredLineCount + laborOperation.requiredLineCount + adjustmentCount + rollRequiredLineCount;
  const pricedLineCount = consumption.pricedLineCount + laborOperation.pricedLineCount + adjustmentCount + rollPricedLineCount;

  const invalidCounts = !Number.isSafeInteger(requiredLineCount) ||
    !Number.isSafeInteger(pricedLineCount) ||
    requiredLineCount < 0 ||
    pricedLineCount < 0 ||
    pricedLineCount > requiredLineCount ||
    !Number.isSafeInteger(rollRequiredLineCount) || !Number.isSafeInteger(rollPricedLineCount) ||
    rollRequiredLineCount < 0 || rollPricedLineCount < 0 || rollPricedLineCount > rollRequiredLineCount;
  if (invalidCounts) {
    return {
      status: "blocked",
      currencyCode: null,
      requiredLineCount: 0,
      pricedLineCount: 0,
      missingPrices,
      missingTariffs,
      diagnostics: [...diagnostics, "Birleşik teklif satır sayıları güvenli aralıkta değil."],
      lineSources: [],
      costSummary: null
    };
  }

  if (consumption.status === "blocked" || laborOperation.status === "blocked" || rollCostSummary?.status === "blocked") {
    return {
      status: "blocked",
      currencyCode: null,
      requiredLineCount,
      pricedLineCount,
      missingPrices,
      missingTariffs,
      diagnostics,
      lineSources: [],
      costSummary: null
    };
  }

  if (consumption.status === "incomplete" || laborOperation.status === "incomplete" || rollCostSummary?.status === "incomplete") {
    return {
      status: "incomplete",
      currencyCode: null,
      requiredLineCount,
      pricedLineCount,
      missingPrices,
      missingTariffs,
      diagnostics,
      lineSources: [],
      costSummary: null
    };
  }

  if (consumption.status === "empty" && laborOperation.status === "empty" && adjustmentCount === 0 && (rollCostSummary === null || rollCostSummary.status === "empty")) {
    return {
      status: "empty",
      currencyCode: null,
      requiredLineCount: 0,
      pricedLineCount: 0,
      missingPrices: [],
      missingTariffs: [],
      diagnostics: [],
      lineSources: [],
      costSummary: null
    };
  }

  const hardwareSourceCoverageValid = hasCompleteHardwareSourceCoverage(consumption);
  const hardwareSourceByCostLine = new Map<string, ProjectConsumptionLineHardwareSource>(
    consumption.lineHardwareSources.map((source) => [source.costLineId, source])
  );

  if (
    (consumption.status === "ready" && (consumption.costSummary === null || !hardwareSourceCoverageValid)) ||
    (laborOperation.status === "ready" && (laborOperation.costSummary === null || laborOperation.lines.length !== laborOperation.requiredLineCount)) ||
    (rollCostSummary?.status === "ready" && (rollCostSummary.costSummary === null || rollCostSummary.costSummary.lineCount !== rollRequiredLineCount || rollCostSummary.lineSources.length !== rollRequiredLineCount))
  ) {
    return {
      status: "blocked",
      currencyCode: null,
      requiredLineCount,
      pricedLineCount,
      missingPrices,
      missingTariffs,
      diagnostics: [...diagnostics, hardwareSourceCoverageValid
        ? "Hazır alt maliyet özeti doğrulanmış satırlarını içermiyor."
        : "Hazır hardware BOM kaynak eşlemesi tüm fiyatlı hardware satırlarını benzersiz biçimde kapsamıyor."],
      lineSources: [],
      costSummary: null
    };
  }

  const costLines: ProjectCostLineInput[] = [];
  const lineSources: ProjectQuoteLineSource[] = [];

  const consumptionLines = consumption.costSummary?.lines ?? [];
  consumptionLines.forEach((line, index) => {
    const costLineId = quoteLineId("consumption", index);
    costLines.push(toCostLine(line, costLineId));
    const partSource = consumption.linePartSources.find((source) => source.costLineId === line.id);
    const hardwareSource = line.category === "hardware" ? hardwareSourceByCostLine.get(line.id) : undefined;
    lineSources.push({
      costLineId,
      sourceType: "production-consumption",
      sourceId: line.id,
      ...(hardwareSource === undefined ? {} : {
        hardwareId: hardwareSource.hardwareId,
        hardwareUnit: hardwareSource.unit,
        hardwareFurnitureIds: [...hardwareSource.furnitureIds],
        ...(hardwareSource.sourcePartIds === undefined ? {} : { sourcePartIds: [...hardwareSource.sourcePartIds] }),
        ...(hardwareSource.sourceReferences === undefined
          ? {}
          : { hardwareSourceReferences: [...hardwareSource.sourceReferences] }),
        ...(line.sourceReference === undefined
          ? {}
          : { priceSourceReference: line.sourceReference })
      }),
      ...(partSource === undefined ? {} : {
        sourcePartIds: [...partSource.sourcePartIds],
        ...(partSource.resourceType === undefined ? {} : {
          resourceType: partSource.resourceType,
          resourceId: partSource.resourceId,
          unit: partSource.unit,
          ...(partSource.edgeDirection === undefined ? {} : { edgeDirection: partSource.edgeDirection })
        })
      })
    });
  });

  laborOperation.lines.forEach((line, index) => {
    const costLineId = quoteLineId("work", index);
    costLines.push(toCostLine(line, costLineId));
    lineSources.push({
      costLineId,
      sourceType: "labor-operation",
      sourceId: line.id,
      tariffId: line.tariffId
    });
  });

  adjustmentSummary.lines.forEach((line, index) => {
    const costLineId = quoteLineId("adjustment", index);
    costLines.push(toCostLine(line, costLineId));
    lineSources.push({ costLineId, sourceType: "quote-adjustment", sourceId: line.id });
  });

  if (rollCostSummary?.status === "ready") {
    rollCostSummary.costSummary!.lines.forEach((line, index) => {
      const source = rollCostSummary!.lineSources[index];
      costLines.push(toCostLine(line, line.id));
      lineSources.push({
        costLineId: line.id, sourceType: "production-consumption", sourceId: line.id,
        sourcePartIds: [...source.partIds], resourceType: "edge-banding", resourceId: source.edgeBandingId,
        unit: "rulo", rollCount: source.rollCount, rollLengthMm: source.rollLengthMm,
        purchasedLengthMm: source.purchasedLengthMm, furnitureIds: [...source.furnitureIds],
        ...(source.planSourceReference === undefined ? {} : { planSourceReference: source.planSourceReference }),
        ...(source.priceSourceReference === undefined ? {} : { priceSourceReference: source.priceSourceReference })
      });
    });
  }

  if (costLines.length !== requiredLineCount || lineSources.length !== costLines.length) {
    return {
      status: "blocked",
      currencyCode: null,
      requiredLineCount,
      pricedLineCount,
      missingPrices,
      missingTariffs,
      diagnostics: [...diagnostics, "Birleşik teklif satırları gerekli kaynak satırlarıyla eşleşmiyor."],
      lineSources: [],
      costSummary: null
    };
  }

  try {
    const costSummary = calculateProjectCostSummary(costLines);
    if (costSummary.status !== "ready" || costSummary.lineCount !== requiredLineCount) {
      return {
        status: "blocked",
        currencyCode: null,
        requiredLineCount,
        pricedLineCount,
        missingPrices,
        missingTariffs,
        diagnostics: [...diagnostics, "Birleşik teklif maliyet motoru tüm satırları hazır duruma getiremedi."],
        lineSources: [],
        costSummary: null
      };
    }
    return {
      status: "ready",
      currencyCode: costSummary.currencyCode,
      requiredLineCount,
      pricedLineCount,
      missingPrices: [],
      missingTariffs: [],
      diagnostics: [],
      lineSources,
      costSummary
    };
  } catch (error) {
    return {
      status: "blocked",
      currencyCode: null,
      requiredLineCount,
      pricedLineCount,
      missingPrices,
      missingTariffs,
      diagnostics: [...diagnostics, diagnosticMessage(error)],
      lineSources: [],
      costSummary: null
    };
  }
}
