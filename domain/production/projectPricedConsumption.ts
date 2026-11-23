import type { CabinetProjectProductionResult } from "./projectProduction.ts";
import {
  calculateProjectEdgeBandingConsumptionSummary,
  calculateProjectHardwareConsumptionSummary,
  calculateProjectMaterialConsumptionSummary,
  type ProjectEdgeBandingConsumptionSummary,
  type ProjectEdgeBandingEdge,
  type ProjectHardwareConsumptionSummary,
  type ProjectMaterialConsumptionSummary
} from "./projectMaterialSummary.ts";
import {
  calculateProjectCostSummary,
  type ProjectCostLineEdgeDirection,
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
  /** Optional exact panel thickness in mm; omitted entries are legacy prices. */
  thicknessMm?: number;
}

export interface ProjectCostCoverageIssue {
  code: "missing-resource-id" | "missing-price" | "unit-mismatch" | "unpriced-edge-banding";
  resourceType: "material" | "hardware" | "edge-banding";
  resourceId: string | null;
  edge?: ProjectEdgeBandingEdge;
  description: string;
  requiredUnit: string;
  quantity: number;
  availableUnits?: string[];
  thicknessMm?: number;
  availableThicknessesMm?: number[];
  legacyPriceAvailable?: boolean;
}

export interface ProjectConsumptionLinePartSource {
  costLineId: string;
  sourcePartIds: string[];
  resourceType?: "material" | "edge-banding";
  resourceId?: string;
  unit?: string;
  edgeDirection?: ProjectEdgeBandingEdge;
}

/** Hardware BOM provenance is furniture-scoped; it never fabricates Part IDs. */
export interface ProjectConsumptionLineHardwareSource {
  costLineId: string;
  hardwareId: string;
  unit: string;
  furnitureIds: string[];
  sourceReferences?: string[];
}

export interface ProjectPricedConsumptionSummary {
  status: "empty" | "incomplete" | "ready" | "blocked";
  currencyCode: string | null;
  requiredLineCount: number;
  pricedLineCount: number;
  /** Missing inputs are reported separately; no partial monetary total is exposed. */
  missingPrices: ProjectCostCoverageIssue[];
  diagnostics: string[];
  /** Part provenance for material/edge-band cost lines; hardware rows are furniture-scoped. */
  linePartSources: ProjectConsumptionLinePartSource[];
  /** BOM furniture/catalog provenance for priced hardware lines; only ready summaries expose it. */
  lineHardwareSources: ProjectConsumptionLineHardwareSource[];
  costSummary: ProjectCostSummary | null;
}

const currencyPattern = /^[A-Z]{3}$/;
const allowedPriceKeys = new Set([
  "resourceType",
  "resourceId",
  "unit",
  "unitPriceMinor",
  "currencyCode",
  "sourceReference",
  "thicknessMm"
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

function requireMaterialThicknessMm(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(label + " sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }
  const normalized = Math.round(value * 10) / 10;
  if (Math.abs(normalized - value) > 1e-9) {
    throw new Error(label + " en fazla 0.1 mm hassasiyetinde olmalıdır.");
  }
  return normalized;
}

function priceKey(
  resourceType: string,
  resourceId: string,
  unit: string,
  thicknessMm?: number
): string {
  return JSON.stringify([resourceType, resourceId, unit, thicknessMm ?? null]);
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
    const thicknessMm = rawPrice.thicknessMm === undefined
      ? undefined
      : requireMaterialThicknessMm(rawPrice.thicknessMm, label + " malzeme kalınlığı");
    if (thicknessMm !== undefined && resourceType !== "material") {
      throw new Error(label + " thicknessMm yalnızca material fiyatlarında kullanılabilir.");
    }
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

    const key = priceKey(resourceType, resourceId, unit, thicknessMm);
    if (prices.has(key)) {
      throw new Error(
        "Yinelenen fiyat anahtarı: " + resourceType + "/" + resourceId + "/" + unit +
        (thicknessMm === undefined ? "" : "/" + thicknessMm + " mm") + "."
      );
    }
    prices.set(key, {
      resourceType,
      resourceId,
      unit,
      unitPriceMinor: rawPrice.unitPriceMinor,
      currencyCode,
      ...(sourceReference === undefined ? {} : { sourceReference }),
      ...(thicknessMm === undefined ? {} : { thicknessMm })
    });
  }

  return prices;
}

const edgeLabelByDirection: Record<ProjectEdgeBandingEdge, string> = {
  top: "üst",
  bottom: "alt",
  left: "sol",
  right: "sağ"
};

function emptySummary(): ProjectPricedConsumptionSummary {
  return {
    status: "empty",
    currencyCode: null,
    requiredLineCount: 0,
    pricedLineCount: 0,
    missingPrices: [],
    diagnostics: [],
    linePartSources: [],
    lineHardwareSources: [],
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
    linePartSources: [],
    lineHardwareSources: [],
    costSummary: null
  };
}

function findMissingPrice(
  resourceType: "material" | "hardware" | "edge-banding",
  resourceId: string,
  description: string,
  requiredUnit: string,
  quantity: number,
  prices: Map<string, ProjectConsumptionPriceInput>,
  thicknessMm?: number,
  edge?: ProjectEdgeBandingEdge
): ProjectCostCoverageIssue {
  const resourcePrices = [...prices.values()].filter(
    (price) => price.resourceType === resourceType && price.resourceId === resourceId
  );
  const availableUnits = [...new Set(resourcePrices.map((price) => price.unit))]
    .sort((first, second) => first.localeCompare(second, "tr"));

  if (thicknessMm !== undefined) {
    const sameUnitPrices = resourcePrices.filter((price) => price.unit === requiredUnit);
    if (sameUnitPrices.length > 0) {
      const availableThicknessesMm = [...new Set(
        sameUnitPrices.flatMap((price) =>
          price.thicknessMm === undefined ? [] : [price.thicknessMm]
        )
      )].sort((first, second) => first - second);
      return {
        code: "missing-price",
        resourceType,
        resourceId,
        description,
        requiredUnit,
        quantity,
        thicknessMm,
        ...(availableThicknessesMm.length === 0 ? {} : { availableThicknessesMm }),
        ...(sameUnitPrices.some((price) => price.thicknessMm === undefined)
          ? { legacyPriceAvailable: true }
          : {}),
        ...(edge === undefined ? {} : { edge })
      };
    }
  }

  if (availableUnits.length > 0) {
    return {
      code: "unit-mismatch",
      resourceType,
      resourceId,
      description,
      requiredUnit,
      quantity,
      availableUnits,
      ...(edge === undefined ? {} : { edge })
    };
  }

  return {
    code: "missing-price",
    resourceType,
    resourceId,
    description,
    requiredUnit,
    quantity,
    ...(thicknessMm === undefined ? {} : { thicknessMm }),
    ...(edge === undefined ? {} : { edge })
  };
}

function addPriceLine(
  lines: ProjectCostLineInput[],
  id: string,
  category: "material" | "hardware",
  description: string,
  quantity: number,
  unit: string,
  price: ProjectConsumptionPriceInput,
  edgeDirection?: ProjectCostLineEdgeDirection
): void {
  lines.push({
    id,
    category,
    description,
    quantity,
    unit,
    unitPriceMinor: price.unitPriceMinor,
    currencyCode: price.currencyCode,
    ...(price.sourceReference === undefined ? {} : { sourceReference: price.sourceReference }),
    ...(edgeDirection === undefined ? {} : { edgeDirection })
  });
}

/**
 * Prices validated material, hardware and edge-band consumption summaries.
 *
 * Material consumption is priced only in the summary's explicit m2 unit and
 * can use an exact thicknessMm price. A legacy material price without thickness
 * is accepted only when that material ID has one distinct thickness in the
 * project. Hardware and edge-band resources must match their exact declared units.
 * Edge-band mm-to-m conversion occurs only when the Part assignment explicitly
 * selects m. No fallback price, waste rate, tax or currency conversion is
 * inferred. A monetary summary is returned only when every required input is
 * covered by one consistent currency.
 */
export interface ProjectPricedConsumptionOptions {
  edgeBandingPricingMode?: "length" | "roll";
}

function resolveEdgeBandingPricingMode(value: unknown): "length" | "roll" {
  if (!isRecord(value)) throw new Error("Fiyatlı tüketim seçenekleri geçerli bir nesne olmalıdır.");
  for (const key of Object.keys(value)) if (key !== "edgeBandingPricingMode") throw new Error("Fiyatlı tüketim seçenekleri desteklenmeyen alan içeriyor: " + key + ".");
  const mode = value.edgeBandingPricingMode ?? "length";
  if (mode !== "length" && mode !== "roll") throw new Error("Kenar bandı fiyatlama modu length veya roll olmalıdır.");
  return mode;
}

export function calculateProjectPricedConsumptionSummary(
  productionReport: unknown,
  priceTable: unknown,
  options: unknown = {}
): ProjectPricedConsumptionSummary {
  let edgeBandingPricingMode: "length" | "roll";
  try { edgeBandingPricingMode = resolveEdgeBandingPricingMode(options); }
  catch (error) { return blockedSummary([diagnosticMessage(error)]); }
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

  const materialThicknessesById = new Map<string, Set<number>>();
  for (const material of materialSummaries) {
    if (material.materialId === undefined) continue;
    const thicknesses = materialThicknessesById.get(material.materialId) ?? new Set<number>();
    thicknesses.add(material.thicknessMm);
    materialThicknessesById.set(material.materialId, thicknesses);
  }

  const costLines: ProjectCostLineInput[] = [];
  const linePartSources: ProjectConsumptionLinePartSource[] = [];
  const lineHardwareSources: ProjectConsumptionLineHardwareSource[] = [];
  const missingPrices: ProjectCostCoverageIssue[] = [];
  let materialLineNumber = 0;
  let hardwareLineNumber = 0;
  let edgeBandingLineNumber = 0;

  for (const material of materialSummaries) {
    const description = material.material + " (" + material.thicknessMm + " mm" +
      (material.materialId === undefined ? "" : "; " + material.materialId) + ")";
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
      const exactPrice = prices.get(priceKey("material", material.materialId, "m2", material.thicknessMm));
      const legacyPrice = prices.get(priceKey("material", material.materialId, "m2"));
      const hasSingleThickness = (materialThicknessesById.get(material.materialId)?.size ?? 0) === 1;
      const price = exactPrice ?? (hasSingleThickness ? legacyPrice : undefined);
      if (price === undefined) {
        missingPrices.push(findMissingPrice(
          "material",
          material.materialId,
          description,
          "m2",
          material.panelAreaM2,
          prices,
          material.thicknessMm
        ));
      } else {
        materialLineNumber += 1;
        const costLineId = "material-" + String(materialLineNumber).padStart(4, "0");
        addPriceLine(
          costLines,
          costLineId,
          "material",
          description,
          material.panelAreaM2,
          "m2",
          price
        );
        linePartSources.push({
          costLineId,
          sourcePartIds: [...material.partIds].sort(),
          resourceType: "material",
          resourceId: material.materialId,
          unit: "m2"
        });
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
      const costLineId = "hardware-" + String(hardwareLineNumber).padStart(4, "0");
      addPriceLine(
        costLines,
        costLineId,
        "hardware",
        hardware.name,
        hardware.totalQuantity,
        hardware.unit,
        price
      );
      lineHardwareSources.push({
        costLineId,
        hardwareId: hardware.hardwareId,
        unit: hardware.unit,
        furnitureIds: [...hardware.furnitureIds].sort((a, b) => a.localeCompare(b, "tr")),
        ...(hardware.sourceReferences === undefined
          ? {}
          : { sourceReferences: [...hardware.sourceReferences].sort((a, b) => a.localeCompare(b, "tr")) })
      });
    }
  }

  for (const edgeBanding of edgeBandingSummaries) {
    if (edgeBandingPricingMode === "roll") continue;
    const directionLabel = edgeBanding.edge === undefined
      ? ""
      : " (" + edgeLabelByDirection[edgeBanding.edge] + " kenar)";
    const description = edgeBanding.edgeBandingId === null
      ? "Katalog kimliği atanmamış kenar bandı (" + edgeBanding.partLineCount + " parça)" + directionLabel
      : "Kenar bandı " + edgeBanding.edgeBandingId + directionLabel;
    if (edgeBanding.edgeBandingId === null) {
      missingPrices.push({
        code: "unpriced-edge-banding",
        resourceType: "edge-banding",
        resourceId: null,
        description,
        requiredUnit: edgeBanding.unit,
        quantity: edgeBanding.totalQuantity,
        ...(edgeBanding.edge === undefined ? {} : { edge: edgeBanding.edge })
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
        prices,
        undefined,
        edgeBanding.edge
      ));
    } else {
      edgeBandingLineNumber += 1;
      const costLineId = "edge-banding-" + String(edgeBandingLineNumber).padStart(4, "0");
      addPriceLine(
        costLines,
        costLineId,
        "material",
        description,
        edgeBanding.totalQuantity,
        edgeBanding.unit,
        price,
        edgeBanding.edge
      );
      linePartSources.push({
        costLineId,
        sourcePartIds: [...edgeBanding.partIds].sort(),
        resourceType: "edge-banding",
        resourceId: edgeBanding.edgeBandingId,
        unit: edgeBanding.unit,
        ...(edgeBanding.edge === undefined ? {} : { edgeDirection: edgeBanding.edge })
      });
    }
  }

  const requiredLineCount = materialSummaries.length + hardwareSummaries.length +
    (edgeBandingPricingMode === "length" ? edgeBandingSummaries.length : 0);
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
      linePartSources: [],
      lineHardwareSources: [],
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
      linePartSources,
      lineHardwareSources,
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
