import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectMaterialCostBasisSummary, calculateProjectQuoteWithMaterialCostBasis } from "./projectMaterialCostBasis.ts";
import { calculateProjectSheetCutPlanAreaSummary } from "./projectSheetCutPlanAreaSummary.ts";
import { calculateProjectSheetNestingStockCostSummary } from "./projectSheetNestingStockCostSummary.ts";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

function netConsumptionReport() {
  const lines = [
    { id: "material-a", category: "material", lineTotalMinor: 1200 },
    { id: "material-b", category: "material", lineTotalMinor: 800 },
    { id: "edge-band-a", category: "material", lineTotalMinor: 100 },
    { id: "hardware-a", category: "hardware", lineTotalMinor: 350 },
    { id: "labor-a", category: "labor", lineTotalMinor: 500 }
  ];
  const categoryTotalsMinor = { material: 2100, hardware: 350, labor: 500, operation: 0, waste: 0, profit: 0 };
  return {
    status: "ready", currencyCode: "TRY", requiredLineCount: 5, pricedLineCount: 5,
    missingPrices: [], diagnostics: [],
    linePartSources: [
      { costLineId: "material-a", sourcePartIds: ["panel-a"], resourceType: "material", resourceId: "mdf-18", unit: "m2" },
      { costLineId: "material-b", sourcePartIds: ["panel-b"], resourceType: "material", resourceId: "mdf-18", unit: "m2" },
      { costLineId: "edge-band-a", sourcePartIds: ["panel-a"], resourceType: "edge-banding", resourceId: "pvc-a", unit: "m" }
    ],
    costSummary: { status: "ready", currencyCode: "TRY", lineCount: 5, lines, categoryTotalsMinor, grandTotalMinor: 2950 }
  };
}

function stockSheetReport() {
  const batchReport = validateSheetNestingInput({
    schemaVersion: 1,
    sheet: { materialId: "mdf-18", widthMm: 1000, lengthMm: 1000, thicknessMm: 18, grainDirection: "none" },
    kerfMm: 3,
    parts: [{ id: "panel-a", materialId: "mdf-18", widthMm: 200, lengthMm: 300, thicknessMm: 18, quantity: 2, grainDirection: "none", geometry: "rectangular" }]
  });
  assert.equal(batchReport.status, "ready", batchReport.diagnostics.join("; "));
  assert.ok(batchReport.result);
  const layout = calculateSheetNestingLayout(batchReport.result);
  const cutPlanReport = createSheetCutPlan({ schemaVersion: 1, batch: batchReport.result, layout });
  const areaRequest = {
    schemaVersion: 1,
    sourcePartIds: ["panel-a"],
    groups: [{ materialId: "mdf-18", thicknessMm: 18, sourcePartIds: ["panel-a"], cutPlanReport }]
  };
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaRequest);
  assert.equal(areaReport.status, "ready", areaReport.diagnostics.join("; "));
  assert.ok(areaReport.result);
  const sheetPrices = areaReport.result.groups.map(group => ({
    groupId: group.groupId, materialId: group.materialId, thicknessMm: group.thicknessMm,
    pricePerSheetMinor: 12500, currencyCode: "TRY", sourceReference: "test-sheet-price"
  }));
  return calculateProjectSheetNestingStockCostSummary({ schemaVersion: 1, areaSummaryRequest: areaRequest, sheetPrices });
}

function request(basis, sourceReport, overrides = {}) {
  return { schemaVersion: 1, basis, sourceReport, ...overrides };
}

test("net consumption basis selects only material category lines, never hardware or labor", () => {
  const report = netConsumptionReport();
  const result = calculateProjectMaterialCostBasisSummary(request("net-consumption", report));
  assert.equal(result.status, "ready");
  assert.equal(result.basis, "net-consumption");
  assert.equal(result.currencyCode, "TRY");
  assert.equal(result.materialCostMinor, 2000);
  assert.equal(result.sourceCount, 2);
  assert.deepEqual(result.diagnostics, []);
});

test("stock-sheet basis selects purchase total and validated group count from real nesting summary", () => {
  const report = stockSheetReport();
  assert.equal(report.status, "ready", report.diagnostics.join("; "));
  assert.ok(report.result);
  const result = calculateProjectMaterialCostBasisSummary(request("stock-sheet-purchase", report));
  assert.equal(result.status, "ready");
  assert.equal(result.basis, "stock-sheet-purchase");
  assert.equal(result.currencyCode, "TRY");
  assert.equal(result.materialCostMinor, report.result.totals.stockSheetPurchaseCostMinor);
  assert.equal(result.sourceCount, report.result.groupCount);
});

test("net-consumption basis fails closed on incomplete prices without exposing partial cost", () => {
  const report = {
    status: "incomplete", currencyCode: null, requiredLineCount: 4, pricedLineCount: 2,
    missingPrices: [{ code: "missing-price" }], diagnostics: ["Fiyat eksik"]
  };
  const result = calculateProjectMaterialCostBasisSummary(request("net-consumption", report));
  assert.equal(result.status, "incomplete");
  assert.equal(result.materialCostMinor, null);
  assert.equal(result.currencyCode, null);
  assert.equal(result.sourceCount, 4);
  assert.deepEqual(result.diagnostics, ["Fiyat eksik"]);
});

test("empty selected net-consumption source returns zero and does not require stock-sheet data", () => {
  const report = { status: "empty", currencyCode: null, requiredLineCount: 0, pricedLineCount: 0, missingPrices: [], diagnostics: [] };
  const result = calculateProjectMaterialCostBasisSummary(request("net-consumption", report));
  assert.equal(result.status, "empty");
  assert.equal(result.materialCostMinor, 0);
  assert.equal(result.currencyCode, null);
  assert.equal(result.sourceCount, 0);
});

test("inconsistent material categories or grand totals are blocked", () => {
  const report = netConsumptionReport();
  report.costSummary.categoryTotalsMinor.material = 1999;
  const result = calculateProjectMaterialCostBasisSummary(request("net-consumption", report));
  assert.equal(result.status, "blocked");
  assert.equal(result.materialCostMinor, null);
  assert.match(result.diagnostics[0], /kategori toplamı satırlarla eşleşmiyor/);
});

test("stock-sheet summary blocks inconsistent group unit cost instead of trusting totals", () => {
  const report = structuredClone(stockSheetReport());
  report.result.groups[0].stockSheetCostMinor += 1;
  const result = calculateProjectMaterialCostBasisSummary(request("stock-sheet-purchase", report));
  assert.equal(result.status, "blocked");
  assert.equal(result.materialCostMinor, null);
  assert.match(result.diagnostics[0], /levha adedi × birim fiyatla eşleşmiyor/);
});

test("unsupported basis and extra request fields fail closed", () => {
  assert.equal(calculateProjectMaterialCostBasisSummary(request("area", netConsumptionReport())).status, "blocked");
  assert.equal(calculateProjectMaterialCostBasisSummary(request("net-consumption", netConsumptionReport(), { override: true })).status, "blocked");
});

test("basis selection is deterministic and leaves the input report unchanged", () => {
  const report = netConsumptionReport();
  const before = structuredClone(report);
  const first = calculateProjectMaterialCostBasisSummary(request("net-consumption", report));
  const second = calculateProjectMaterialCostBasisSummary(request("net-consumption", report));
  assert.deepEqual(first, second);
  assert.deepEqual(report, before);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.diagnostics));
});


test("net panel material basis excludes edge-band material and requires Part provenance", () => {
  const report = netConsumptionReport();
  const result = calculateProjectMaterialCostBasisSummary(request("net-consumption", report));
  assert.equal(result.status, "ready");
  assert.equal(result.materialCostMinor, 2000);
  assert.equal(result.sourceCount, 2);

  const missingProvenance = structuredClone(report);
  delete missingProvenance.linePartSources;
  const blocked = calculateProjectMaterialCostBasisSummary(request("net-consumption", missingProvenance));
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.materialCostMinor, null);
  assert.match(blocked.diagnostics[0], /Part kaynak eşlemesi/);
});

const quoteNoBanding = { top: false, bottom: false, left: false, right: false };
const quoteWorkItems = [{
  id: "assembly-labor", category: "labor", description: "Dolap montaj işçiliği",
  duration: 1.5, unit: "h", tariffId: "labor-hourly"
}];
const quoteTariffs = [{
  tariffId: "labor-hourly", category: "labor", unit: "h",
  unitPriceMinor: 2400, currencyCode: "TRY", sourceReference: "workshop-labor:v1"
}];
const quoteMaterialAndEdgePrices = [
  { resourceType: "material", resourceId: "mdf-18", unit: "m2", unitPriceMinor: 1250, currencyCode: "TRY", sourceReference: "net-material:v1" },
  { resourceType: "edge-banding", resourceId: "pvc-a", unit: "m", unitPriceMinor: 200, currencyCode: "TRY", sourceReference: "edge-banding:v1" }
];
const quoteEdgePriceOnly = [
  { resourceType: "edge-banding", resourceId: "pvc-a", unit: "m", unitPriceMinor: 200, currencyCode: "TRY", sourceReference: "edge-banding:v1" }
];

function createQuoteProductionReport({ empty = false, edgeBanding = true } = {}) {
  const edgeBandingByGroup = Object.fromEntries(BODY_PANEL_GROUPS.map(group => [group, { ...quoteNoBanding }]));
  if (edgeBanding) edgeBandingByGroup.leftSide = { ...quoteNoBanding, top: true };
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: empty ? [] : [{
      schemaVersion: 1,
      furniture: {
        id: "quote-basis-cabinet", widthMm: 800, heightMm: 720, depthMm: 560,
        material: "MDF Lam 18", materialId: "mdf-18", family: "cabinet"
      },
      profile: {
        panelThicknessMm: 18, carcassStyle: "between-sides",
        backPanel: { enabled: false }, shelfCount: 0,
        doors: { enabled: false, count: 0 }, edgeBandingByGroup
      },
      materials: [{ id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" }]
    }],
    ...(empty || !edgeBanding ? {} : {
      edgeBandingAssignments: [{
        partId: "quote-basis-cabinet-left-side", edge: "top", edgeBandingId: "pvc-a", unit: "m"
      }]
    })
  });
}

function createQuoteStockSheetReport(productionReport) {
  const parts = productionReport.result.parts.map(part => ({
    id: part.id, materialId: part.materialId, widthMm: part.width, lengthMm: part.length,
    thicknessMm: part.thickness, quantity: part.quantity, grainDirection: "none", geometry: "rectangular"
  }));
  if (parts.length === 0) {
    return {
      status: "empty", schemaVersion: 1, diagnostics: [],
      result: { schemaVersion: 1, groupCount: 0, groups: [], currencyCode: null, totals: { sheetCount: 0, stockSheetPurchaseCostMinor: 0 } }
    };
  }
  const batchReport = validateSheetNestingInput({
    schemaVersion: 1,
    sheet: { materialId: "mdf-18", widthMm: 3000, lengthMm: 2000, thicknessMm: 18, grainDirection: "none" },
    kerfMm: 3, parts
  });
  assert.equal(batchReport.status, "ready", batchReport.diagnostics.join("; "));
  const layout = calculateSheetNestingLayout(batchReport.result);
  const cutPlanReport = createSheetCutPlan({ schemaVersion: 1, batch: batchReport.result, layout });
  const areaRequest = {
    schemaVersion: 1,
    sourcePartIds: parts.map(part => part.id),
    groups: [{ materialId: "mdf-18", thicknessMm: 18, sourcePartIds: parts.map(part => part.id), cutPlanReport }]
  };
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaRequest);
  assert.equal(areaReport.status, "ready", areaReport.diagnostics.join("; "));
  const sheetPrices = areaReport.result.groups.map(group => ({
    groupId: group.groupId, materialId: group.materialId, thicknessMm: group.thicknessMm,
    pricePerSheetMinor: 12500, currencyCode: "TRY", sourceReference: "stock-sheet-price:v1"
  }));
  return calculateProjectSheetNestingStockCostSummary({ schemaVersion: 1, areaSummaryRequest: areaRequest, sheetPrices });
}

function quoteBasisInput(productionReport, overrides = {}) {
  return {
    schemaVersion: 1, productionReport, consumptionPriceTable: quoteMaterialAndEdgePrices,
    workItems: quoteWorkItems, tariffTable: quoteTariffs, ...overrides
  };
}

test("net-consumption quote preserves panel and edge-band totals without double counting", () => {
  const productionReport = createQuoteProductionReport();
  const result = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, { basis: "net-consumption" }));
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.equal(result.basis, "net-consumption");
  assert.ok(result.panelMaterialCostMinor > 0);
  assert.ok(result.edgeBandingCostMinor > 0);
  assert.equal(result.materialCategoryTotalMinor, result.panelMaterialCostMinor + result.edgeBandingCostMinor);
  assert.equal(result.grandTotalMinor, result.quoteSummary.costSummary.grandTotalMinor);
  assert.equal(result.categoryTotalsMinor.material, result.quoteSummary.costSummary.categoryTotalsMinor.material);
});

test("stock-sheet quote replaces panel net-area cost but keeps edge-band and labor costs", () => {
  const productionReport = createQuoteProductionReport();
  const stockSheetPurchaseReport = createQuoteStockSheetReport(productionReport);
  const result = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, {
    basis: "stock-sheet-purchase", stockSheetPurchaseReport, consumptionPriceTable: quoteEdgePriceOnly
  }));
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.equal(result.panelMaterialCostMinor, stockSheetPurchaseReport.result.totals.stockSheetPurchaseCostMinor);
  assert.ok(result.edgeBandingCostMinor > 0);
  assert.equal(result.quoteSummary.costSummary.categoryTotalsMinor.material, result.edgeBandingCostMinor);
  assert.equal(result.materialCategoryTotalMinor, result.panelMaterialCostMinor + result.edgeBandingCostMinor);
  assert.equal(result.grandTotalMinor, result.quoteSummary.costSummary.grandTotalMinor + result.panelMaterialCostMinor);
  assert.equal(result.categoryTotalsMinor.labor, 3600);
  assert.equal(result.quoteSummary.costSummary.lines.some(line =>
    line.category === "material" && result.quoteSummary.lineSources.some(source =>
      source.costLineId === line.id && source.resourceType === "material"
    )
  ), false);
});

test("stock-sheet quote blocks foreign or incomplete Part/material/thickness coverage", () => {
  const productionReport = createQuoteProductionReport({ edgeBanding: false });
  const stockSheetPurchaseReport = structuredClone(createQuoteStockSheetReport(productionReport));
  stockSheetPurchaseReport.result.groups[0].sourcePartIds = ["foreign-part"];
  const result = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, {
    basis: "stock-sheet-purchase", stockSheetPurchaseReport, consumptionPriceTable: []
  }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /proje dışı Part|tamamını bire bir/);
  assert.equal(result.grandTotalMinor, null);
});

test("stock-sheet quote blocks currency mismatch with work tariffs", () => {
  const productionReport = createQuoteProductionReport({ edgeBanding: false });
  const stockSheetPurchaseReport = createQuoteStockSheetReport(productionReport);
  const result = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, {
    basis: "stock-sheet-purchase", stockSheetPurchaseReport, consumptionPriceTable: [],
    tariffTable: [{ ...quoteTariffs[0], currencyCode: "USD" }]
  }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /para birimleri eşleşmiyor/);
  assert.equal(result.grandTotalMinor, null);
});

test("stock-sheet basis supports a panel-only quote with no other priced lines", () => {
  const productionReport = createQuoteProductionReport({ edgeBanding: false });
  const stockSheetPurchaseReport = createQuoteStockSheetReport(productionReport);
  const result = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, {
    basis: "stock-sheet-purchase", stockSheetPurchaseReport, consumptionPriceTable: [],
    workItems: [], tariffTable: []
  }));
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.equal(result.quoteSummary.status, "empty");
  assert.equal(result.grandTotalMinor, result.panelMaterialCostMinor);
  assert.ok(result.grandTotalMinor > 0);
});

test("empty project and empty stock basis remain empty without inventing a currency", () => {
  const productionReport = createQuoteProductionReport({ empty: true });
  const result = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, {
    basis: "stock-sheet-purchase", stockSheetPurchaseReport: createQuoteStockSheetReport(productionReport),
    consumptionPriceTable: [], workItems: [], tariffTable: []
  }));
  assert.equal(result.status, "empty");
  assert.equal(result.currencyCode, null);
  assert.equal(result.panelMaterialCostMinor, 0);
  assert.equal(result.grandTotalMinor, 0);
});

test("net and stock basis requests cannot mix their source reports", () => {
  const productionReport = createQuoteProductionReport({ edgeBanding: false });
  const netWithStock = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, {
    basis: "net-consumption", stockSheetPurchaseReport: createQuoteStockSheetReport(productionReport)
  }));
  const stockWithoutReport = calculateProjectQuoteWithMaterialCostBasis(quoteBasisInput(productionReport, {
    basis: "stock-sheet-purchase", consumptionPriceTable: []
  }));
  assert.equal(netWithStock.status, "blocked");
  assert.equal(stockWithoutReport.status, "blocked");
});
