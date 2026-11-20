import {
  calculateProjectLaborOperationPricingSummary,
  type ProjectLaborOperationPricingSummary,
  type ProjectLaborOperationTariffIssue
} from "./projectLaborOperationPricing.ts";
import {
  calculateProjectPricedConsumptionSummary,
  type ProjectCostCoverageIssue,
  type ProjectPricedConsumptionSummary
} from "./projectPricedConsumption.ts";
import {
  calculateProjectCostSummary,
  type ProjectCostLineEdgeDirection,
  type ProjectCostLineInput,
  type ProjectCostSummary
} from "./projectCostSummary.ts";

export interface ProjectQuoteLineSource {
  costLineId: string;
  sourceType: "production-consumption" | "labor-operation" | "quote-adjustment";
  sourceId: string;
  tariffId?: string;
  /** Sorted unique production Part IDs for grouped consumption rows, when available. */
  sourcePartIds?: string[];
  /** Resource identity and units are machine-readable; descriptions are display-only. */
  resourceType?: "material" | "edge-banding";
  resourceId?: string;
  unit?: string;
  thicknessMm?: number;
  edgeDirection?: ProjectCostLineEdgeDirection;
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
  quoteAdjustments: unknown = []
): ProjectQuoteSummary {
  const consumption: ProjectPricedConsumptionSummary =
    calculateProjectPricedConsumptionSummary(productionReport, consumptionPriceTable);
  const laborOperation: ProjectLaborOperationPricingSummary =
    calculateProjectLaborOperationPricingSummary(workItems, tariffTable);

  const missingPrices = consumption.missingPrices;
  const missingTariffs = laborOperation.missingTariffs;
  const diagnostics = [
    ...consumption.diagnostics.map((message) => "Üretim tüketimi: " + message),
    ...laborOperation.diagnostics.map((message) => "İşçilik/operasyon: " + message)
  ];
  let adjustmentSummary: ProjectCostSummary;
  try {
    if (!Array.isArray(quoteAdjustments)) {
      throw new Error("Teklif ek maliyetleri bir liste olmalıdır.");
    }
    for (const [index, rawLine] of quoteAdjustments.entries()) {
      if (!isRecord(rawLine)) {
        throw new Error("Teklif ek maliyetinin " + (index + 1) + ". satırı geçerli bir nesne olmalıdır.");
      }
      if (rawLine.category !== "waste" && rawLine.category !== "profit") {
        throw new Error("Teklif ek maliyetleri yalnızca waste veya profit kategorisinde olabilir.");
      }
      if (typeof rawLine.sourceReference !== "string") {
        throw new Error("Her fire/kâr maliyet satırı için açık kaynak referansı zorunludur.");
      }
    }
    adjustmentSummary = calculateProjectCostSummary(quoteAdjustments);
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
  const requiredLineCount =
    consumption.requiredLineCount + laborOperation.requiredLineCount + adjustmentCount;
  const pricedLineCount =
    consumption.pricedLineCount + laborOperation.pricedLineCount + adjustmentCount;

  const invalidCounts = !Number.isSafeInteger(requiredLineCount) ||
    !Number.isSafeInteger(pricedLineCount) ||
    requiredLineCount < 0 ||
    pricedLineCount < 0 ||
    pricedLineCount > requiredLineCount;
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

  if (consumption.status === "blocked" || laborOperation.status === "blocked") {
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

  if (consumption.status === "incomplete" || laborOperation.status === "incomplete") {
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

  if (consumption.status === "empty" && laborOperation.status === "empty" && adjustmentCount === 0) {
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

  if (
    (consumption.status === "ready" && consumption.costSummary === null) ||
    (laborOperation.status === "ready" &&
      (laborOperation.costSummary === null ||
        laborOperation.lines.length !== laborOperation.requiredLineCount))
  ) {
    return {
      status: "blocked",
      currencyCode: null,
      requiredLineCount,
      pricedLineCount,
      missingPrices,
      missingTariffs,
      diagnostics: [...diagnostics, "Hazır alt maliyet özeti doğrulanmış satırlarını içermiyor."],
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
    lineSources.push({
      costLineId,
      sourceType: "production-consumption",
      sourceId: line.id,
      ...(partSource === undefined ? {} : {
        sourcePartIds: [...partSource.sourcePartIds],
        resourceType: partSource.resourceType,
        resourceId: partSource.resourceId,
        unit: partSource.unit,
        ...(partSource.thicknessMm === undefined ? {} : { thicknessMm: partSource.thicknessMm }),
        ...(partSource.edgeDirection === undefined ? {} : { edgeDirection: partSource.edgeDirection })
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
    lineSources.push({
      costLineId,
      sourceType: "quote-adjustment",
      sourceId: line.id
    });
  });

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
