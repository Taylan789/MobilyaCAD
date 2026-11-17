import type { CabinetProjectProductionResult } from "./projectProduction.ts";
import {
  calculateProjectEdgeBandingConsumptionSummary,
  calculateProjectHardwareConsumptionSummary,
  calculateProjectMaterialConsumptionSummary,
  type ProjectEdgeBandingConsumptionSummary,
  type ProjectHardwareConsumptionSummary,
  type ProjectMaterialConsumptionSummary
} from "./projectMaterialSummary.ts";
import {
  calculateProjectCostSummary,
  type ProjectCostLineInput,
  type ProjectCostSummary
} from "./projectCostSummary.ts";

export interface ProjectConsumptionPriceInput {
  resourceType: "material" | "hardware" | "edge-banding";
  resourceId: string;
  unit: string;
  /** Price in the smallest unit of currencyCode; zero is allowed only when explicit. */
  unitPriceMinor: number;
  currencyCode: string;
  sourceReference?: string;
}

export interface ProjectCostCoverageIssue {
  code: "missing-resource-id" | "missing-price" | "unit-mismatch" | "unpriced-edge-banding";
  resourceType: "material" | "hardware" | "edge-banding";
  resourceId: string | null;
  description: string;
  requiredUnit: string;
  quantity: number;
  availableUnits?: string[];
}

export interface ProjectPricedConsumptionSummary {
  status: "empty" | "incomplete" | "ready" | "blocked";
  currencyCode: string | null;
  requiredLineCount: number;
  pricedLineCount: number;
  /** Missing inputs are reported separately; no partial monetary total is exposed. */
  missingPrices: ProjectCostCoverageIssue[];
  diagnostics: string[];
  costSummary: ProjectCostSummary | null;
}

const currencyPattern = /^[A-Z]{3}$/;
const allowedPriceKeys = new Set([
  "resourceType",
  "resourceId",
  "unit",
  "unitPriceMinor",
  "currencyCode",
  "sourceReference"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnosticMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireText(value: unknown, label: string, maxLength: number): string {
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

function priceKey(resourceType: string, resourceId: string, unit: string): string {
  return JSON.stringify([resourceType, resourceId, unit]);
}

function validatePriceTable(value: unknown): Map<string, ProjectConsumptionPriceInput> {
  if (!Array.isArray(value)) {
    throw new Error("Proje fiyat tablosu bir liste olmalıdır.");
  }

  const prices = new Map<string, ProjectConsumptionPriceInput>();
  for (const [index, rawPrice] of value.entries()) {
    const label = "Fiyat tablosunun " + (index + 1) + ". satırı";
    if (!isRecord(rawPrice)) {
      throw new Error(label + " geçerli bir nesne olmalıdır.");
    }
    for (const key of Object.keys(rawPrice)) {
      if (!allowedPriceKeys.has(key)) {
        throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
      }
    }

    if (rawPrice.resourceType !== "material" &&
        rawPrice.resourceType !== "hardware" &&
        rawPrice.resourceType !== "edge-banding") {
      throw new Error(label + " kaynak türü material, hardware veya edge-banding olmalıdır.");
    }
    const resourceType = rawPrice.resourceType;
    const resourceId = requireText(rawPrice.resourceId, label + " kaynak kimliği", 128);
    const unit = requireText(rawPrice.unit, label + " birimi", 32);
    if (
      typeof rawPrice.unitPriceMinor !== "number" ||
      !Number.isSafeInteger(rawPrice.unitPriceMinor) ||
      rawPrice.unitPriceMinor < 0
    ) {
      throw new Error(label + " birim fiyatı negatif olmayan güvenli bir tam sayı olmalıdır.");
    }
    const currencyCode = requireText(rawPrice.currencyCode, label + " para birimi kodu", 3);
    if (!currencyPattern.test(currencyCode)) {
      throw new Error(label + " para birimi kodu üç büyük harf olmalıdır.");
    }
    const sourceReference = rawPrice.sourceReference === undefined
      ? undefined
      : requireText(rawPrice.sourceReference, label + " kaynak referansı", 256);

    const key = priceKey(resourceType, resourceId, unit);
    if (prices.has(key)) {
      throw new Error("Yinelenen fiyat anahtarı: " + resourceType + "/" + resourceId + "/" + unit + ".");
    }
    prices.set(key, {
      resourceType,
      resourceId,
      unit,
      unitPriceMinor: rawPrice.unitPriceMinor,
      currencyCode,
      ...(sourceReference === undefined ? {} : { sourceReference })
    });
  }

  return prices;
}

function emptySummary(): ProjectPricedConsumptionSummary {
  return {
    status: "empty",
    currencyCode: null,
    requiredLineCount: 0,
    pricedLineCount: 0,
    missingPrices: [],
    diagnostics: [],
    costSummary: null
  };
}

function blockedSummary(
  diagnostics: string[],
  missingPrices: ProjectCostCoverageIssue[] = [],
  requiredLineCount = 0,
  pricedLineCount = 0
): ProjectPricedConsumptionSummary {
  return {
    status: "blocked",
    currencyCode: null,
    requiredLineCount,
    pricedLineCount,
    missingPrices,
    diagnostics,
    costSummary: null
  };
}

function findMissingPrice(
  resourceType: "material" | "hardware" | "edge-banding",
  resourceId: string,
  description: string,
  requiredUnit: string,
  quantity: number,
  prices: Map<string, ProjectConsumptionPriceInput>
): ProjectCostCoverageIssue {
  const availableUnits = [...new Set(
    [...prices.values()]
      .filter((price) => price.resourceType === resourceType && price.resourceId === resourceId)
      .map((price) => price.unit)
  )].sort((first, second) => first.localeCompare(second, "tr"));

  if (availableUnits.length > 0) {
    return {
      code: "unit-mismatch",
      resourceType,
      resourceId,
      description,
      requiredUnit,
      quantity,
      availableUnits
    };
  }

  return {
    code: "missing-price",
    resourceType,
    resourceId,
    description,
    requiredUnit,
    quantity
  };
}

function addPriceLine(
  lines: ProjectCostLineInput[],
  id: string,
  category: "material" | "hardware",
  description: string,
  quantity: number,
  unit: string,
  price: ProjectConsumptionPriceInput
): void {
  lines.push({
    id,
    category,
    description,
    quantity,
    unit,
    unitPriceMinor: price.unitPriceMinor,
    currencyCode: price.currencyCode,
    ...(price.sourceReference === undefined ? {} : { sourceReference: price.sourceReference })
  });
}

/**
 * Prices validated material, hardware and edge-band consumption summaries.
 *
 * Material consumption is priced only in the summary's explicit m2 unit.
 * Hardware and edge-band resources must match their exact declared units.
 * Edge-band mm-to-m conversion occurs only when the Part assignment explicitly
 * selects m. No fallback price, waste rate, tax or currency conversion is
 * inferred. A monetary summary is returned only when every required input is
 * covered by one consistent currency.
 */
export function calculateProjectPricedConsumptionSummary(
  productionReport: unknown,
  priceTable: unknown
): ProjectPricedConsumptionSummary {
  let prices: Map<string, ProjectConsumptionPriceInput>;
  try {
    prices = validatePriceTable(priceTable);
  } catch (error) {
    return blockedSummary([diagnosticMessage(error)]);
  }

  if (!isRecord(productionReport) || productionReport.schemaVersion !== 1) {
    return blockedSummary(["Proje üretim raporu geçerli bir v1 raporu olmalıdır."]);
  }

  if (productionReport.status === "blocked") {
    const message = typeof productionReport.firstError === "string" && productionReport.firstError !== ""
      ? productionReport.firstError
      : "Proje üretim raporu blocked durumunda; kısmi tüketim fiyatlandırılamaz.";
    return blockedSummary([message]);
  }
  if (productionReport.status !== "ready" && productionReport.status !== "empty") {
    return blockedSummary(["Proje üretim raporu ready, empty veya blocked durumunda olmalıdır."]);
  }

  const rawResult = productionReport.result;
  if (
    !isRecord(rawResult) ||
    rawResult.schemaVersion !== 1 ||
    !Array.isArray(rawResult.furniture) ||
    !Array.isArray(rawResult.parts)
  ) {
    return blockedSummary(["Proje üretim raporu doğrulanmış bir v1 üretim sonucu içermelidir."]);
  }

  let materialSummaries: ProjectMaterialConsumptionSummary[];
  let hardwareSummaries: ProjectHardwareConsumptionSummary[];
  let edgeBandingSummaries: ProjectEdgeBandingConsumptionSummary[];
  try {
    const result = rawResult as unknown as CabinetProjectProductionResult;
    materialSummaries = calculateProjectMaterialConsumptionSummary(result);
    hardwareSummaries = calculateProjectHardwareConsumptionSummary(result);
    edgeBandingSummaries = calculateProjectEdgeBandingConsumptionSummary(result);
  } catch (error) {
    return blockedSummary([diagnosticMessage(error)]);
  }

  if (productionReport.status === "empty") {
    if (materialSummaries.length !== 0 || hardwareSummaries.length !== 0 || edgeBandingSummaries.length !== 0) {
      return blockedSummary(["Empty üretim raporu tüketim satırı içeremez."]);
    }
    return emptySummary();
  }

  const costLines: ProjectCostLineInput[] = [];
  const missingPrices: ProjectCostCoverageIssue[] = [];
  let materialLineNumber = 0;
  let hardwareLineNumber = 0;
  let edgeBandingLineNumber = 0;

  for (const material of materialSummaries) {
    const description = material.material + " (" + material.thicknessMm + " mm)";
    if (material.materialId === undefined) {
      missingPrices.push({
        code: "missing-resource-id",
        resourceType: "material",
        resourceId: null,
        description,
        requiredUnit: "m2",
        quantity: material.panelAreaM2
      });
    } else {
      const price = prices.get(priceKey("material", material.materialId, "m2"));
      if (price === undefined) {
        missingPrices.push(findMissingPrice(
          "material",
          material.materialId,
          description,
          "m2",
          material.panelAreaM2,
          prices
        ));
      } else {
        materialLineNumber += 1;
        addPriceLine(
          costLines,
          "material-" + String(materialLineNumber).padStart(4, "0"),
          "material",
          description,
          material.panelAreaM2,
          "m2",
          price
        );
      }
    }

  }

  for (const hardware of hardwareSummaries) {
    const price = prices.get(priceKey("hardware", hardware.hardwareId, hardware.unit));
    if (price === undefined) {
      missingPrices.push(findMissingPrice(
        "hardware",
        hardware.hardwareId,
        hardware.name,
        hardware.unit,
        hardware.totalQuantity,
        prices
      ));
    } else {
      hardwareLineNumber += 1;
      addPriceLine(
        costLines,
        "hardware-" + String(hardwareLineNumber).padStart(4, "0"),
        "hardware",
        hardware.name,
        hardware.totalQuantity,
        hardware.unit,
        price
      );
    }
  }

  for (const edgeBanding of edgeBandingSummaries) {
    const description = edgeBanding.edgeBandingId === null
      ? "Katalog kimliği atanmamış kenar bandı (" + edgeBanding.partLineCount + " parça)"
      : "Kenar bandı " + edgeBanding.edgeBandingId;
    if (edgeBanding.edgeBandingId === null) {
      missingPrices.push({
        code: "unpriced-edge-banding",
        resourceType: "edge-banding",
        resourceId: null,
        description,
        requiredUnit: edgeBanding.unit,
        quantity: edgeBanding.totalQuantity
      });
      continue;
    }

    const price = prices.get(priceKey("edge-banding", edgeBanding.edgeBandingId, edgeBanding.unit));
    if (price === undefined) {
      missingPrices.push(findMissingPrice(
        "edge-banding",
        edgeBanding.edgeBandingId,
        description,
        edgeBanding.unit,
        edgeBanding.totalQuantity,
        prices
      ));
    } else {
      edgeBandingLineNumber += 1;
      addPriceLine(
        costLines,
        "edge-banding-" + String(edgeBandingLineNumber).padStart(4, "0"),
        "material",
        description,
        edgeBanding.totalQuantity,
        edgeBanding.unit,
        price
      );
    }
  }

  const requiredLineCount = materialSummaries.length + hardwareSummaries.length + edgeBandingSummaries.length;
  const pricedLineCount = costLines.length;
  const currencies = [...new Set(costLines.map((line) => line.currencyCode))];
  if (currencies.length > 1) {
    return blockedSummary(
      ["Fiyatı bulunan tüketim satırları farklı para birimleri içeriyor; tek proje toplamı hesaplanamaz."],
      missingPrices,
      requiredLineCount,
      pricedLineCount
    );
  }

  if (missingPrices.length > 0) {
    return {
      status: "incomplete",
      currencyCode: null,
      requiredLineCount,
      pricedLineCount,
      missingPrices,
      diagnostics: [],
      costSummary: null
    };
  }

  if (requiredLineCount === 0) return emptySummary();
  if (pricedLineCount !== requiredLineCount) {
    return blockedSummary(
      ["Fiyatlandırılan satır sayısı gerekli tüketim satırı sayısıyla eşleşmiyor."],
      [],
      requiredLineCount,
      pricedLineCount
    );
  }

  try {
    const costSummary = calculateProjectCostSummary(costLines);
    return {
      status: "ready",
      currencyCode: costSummary.currencyCode,
      requiredLineCount,
      pricedLineCount,
      missingPrices: [],
      diagnostics: [],
      costSummary
    };
  } catch (error) {
    return blockedSummary(
      [diagnosticMessage(error)],
      [],
      requiredLineCount,
      pricedLineCount
    );
  }
}
