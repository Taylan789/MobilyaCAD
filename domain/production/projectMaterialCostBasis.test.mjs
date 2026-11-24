import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectMaterialCostBasisSummary } from "./projectMaterialCostBasis.ts";
import { calculateProjectSheetCutPlanAreaSummary } from "./projectSheetCutPlanAreaSummary.ts";
import { calculateProjectSheetNestingStockCostSummary } from "./projectSheetNestingStockCostSummary.ts";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

function netConsumptionReport() {
  const lines = [
    { id: "material-a", category: "material", lineTotalMinor: 1200 },
    { id: "material-b", category: "material", lineTotalMinor: 800 },
    { id: "hardware-a", category: "hardware", lineTotalMinor: 350 },
    { id: "labor-a", category: "labor", lineTotalMinor: 500 }
  ];
  const categoryTotalsMinor = { material: 2000, hardware: 350, labor: 500, operation: 0, waste: 0, profit: 0 };
  return {
    status: "ready", currencyCode: "TRY", requiredLineCount: 4, pricedLineCount: 4,
    missingPrices: [], diagnostics: [],
    costSummary: { status: "ready", currencyCode: "TRY", lineCount: 4, lines, categoryTotalsMinor, grandTotalMinor: 2850 }
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
