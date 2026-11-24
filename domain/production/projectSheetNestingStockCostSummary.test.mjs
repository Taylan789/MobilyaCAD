import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectSheetCutPlanAreaSummary } from "./projectSheetCutPlanAreaSummary.ts";
import { calculateProjectSheetNestingStockCostSummary } from "./projectSheetNestingStockCostSummary.ts";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

function makeCutPlan(options = {}) {
  const materialId = options.materialId ?? "mdf-18";
  const thicknessMm = options.thicknessMm ?? 18;
  const id = options.id ?? "part-1";
  const batchReport = validateSheetNestingInput({
    schemaVersion: 1,
    sheet: {
      materialId,
      widthMm: options.sheetWidthMm ?? 1000,
      lengthMm: options.sheetLengthMm ?? 1000,
      thicknessMm,
      grainDirection: "none"
    },
    kerfMm: options.kerfMm ?? 3,
    parts: [{
      id,
      materialId,
      widthMm: options.partWidthMm ?? 200,
      lengthMm: options.partLengthMm ?? 300,
      thicknessMm,
      quantity: options.quantity ?? 1,
      grainDirection: "none",
      geometry: "rectangular"
    }]
  });
  assert.equal(batchReport.status, "ready", batchReport.diagnostics.join("; "));
  assert.ok(batchReport.result);
  const layout = calculateSheetNestingLayout(batchReport.result);
  return createSheetCutPlan({ schemaVersion: 1, batch: batchReport.result, layout });
}

function areaGroup(cutPlanReport) {
  const plan = cutPlanReport.result;
  assert.ok(plan);
  return {
    materialId: plan.stockSheet.materialId,
    thicknessMm: plan.stockSheet.thicknessMm,
    sourcePartIds: plan.sourceParts.map((part) => part.id),
    cutPlanReport
  };
}

function areaRequest(cutPlans) {
  const groups = cutPlans.map(areaGroup);
  return {
    schemaVersion: 1,
    sourcePartIds: groups.flatMap(group => group.sourcePartIds),
    groups
  };
}

function price(group, pricePerSheetMinor, overrides = {}) {
  return {
    groupId: group.groupId,
    materialId: group.materialId,
    thicknessMm: group.thicknessMm,
    pricePerSheetMinor,
    currencyCode: "TRY",
    sourceReference: "atolye-fiyat-listesi:v1",
    ...overrides
  };
}

function pricesFor(areaReport, perSheetPrices = []) {
  const result = areaReport.result;
  assert.ok(result);
  return result.groups.map((group, index) =>
    price(group, perSheetPrices[index] ?? 0)
  );
}

function assertBlocked(value, pattern) {
  const report = calculateProjectSheetNestingStockCostSummary(value);
  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
  assert.ok(report.diagnostics.length > 0);
  if (pattern) assert.match(report.diagnostics.join(" "), pattern);
  return report;
}

function twoGroupRequest() {
  const first = makeCutPlan({
    id: "part-mdf",
    materialId: "mdf-18",
    thicknessMm: 18,
    sheetWidthMm: 1000,
    sheetLengthMm: 1000,
    partWidthMm: 600,
    partLengthMm: 600,
    quantity: 2
  });
  const second = makeCutPlan({
    id: "part-plywood",
    materialId: "plywood-8",
    thicknessMm: 8,
    sheetWidthMm: 800,
    sheetLengthMm: 600,
    partWidthMm: 200,
    partLengthMm: 300,
    quantity: 1
  });
  return areaRequest([first, second]);
}

test("DOM-139 calculates exact stock purchase cost for validated multi-sheet material groups", () => {
  const areaSummaryRequest = twoGroupRequest();
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaSummaryRequest);
  assert.equal(areaReport.status, "ready", areaReport.diagnostics.join("; "));
  assert.ok(areaReport.result);
  assert.deepEqual(areaReport.result.groups.map(group => group.areaSummary.sheetCount), [2, 1]);

  const before = JSON.stringify(areaSummaryRequest);
  const sheetPrices = [
    price(areaReport.result.groups[1], 1000, { sourceReference: "kontrplak-fiyat:v2" }),
    price(areaReport.result.groups[0], 2500, { sourceReference: "mdf-fiyat:v4" })
  ];
  const report = calculateProjectSheetNestingStockCostSummary({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices
  });

  assert.equal(report.status, "ready");
  assert.ok(report.result);
  assert.equal(report.result.groupCount, 2);
  assert.equal(report.result.currencyCode, "TRY");
  assert.deepEqual(report.result.groups.map(group => [
    group.materialId,
    group.thicknessMm,
    group.sourcePartIds,
    group.sheetCount,
    group.pricePerSheetMinor,
    group.stockSheetCostMinor,
    group.sourceReference
  ]), [
    ["mdf-18", 18, ["part-mdf"], 2, 2500, 5000, "mdf-fiyat:v4"],
    ["plywood-8", 8, ["part-plywood"], 1, 1000, 1000, "kontrplak-fiyat:v2"]
  ]);
  assert.deepEqual(report.result.totals, {
    sheetCount: 3,
    stockSheetPurchaseCostMinor: 6000
  });
  assert.equal(JSON.stringify(areaSummaryRequest), before);
  assert.ok(Object.isFrozen(report));
  assert.ok(Object.isFrozen(report.result));
  assert.ok(Object.isFrozen(report.result.groups));
  assert.ok(Object.isFrozen(report.result.groups[0].sourcePartIds));
});

test("DOM-139 empty cut plans return zero totals and reject unused prices", () => {
  const areaSummaryRequest = { schemaVersion: 1, sourcePartIds: [], groups: [] };
  const report = calculateProjectSheetNestingStockCostSummary({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: []
  });
  assert.equal(report.status, "empty");
  assert.deepEqual(report.result?.totals, { sheetCount: 0, stockSheetPurchaseCostMinor: 0 });
  assert.equal(report.result?.currencyCode, null);
  assert.deepEqual(report.result?.groups, []);
  assert.ok(Object.isFrozen(report.result));
  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [{ groupId: "unused", materialId: "mdf-18", thicknessMm: 18, pricePerSheetMinor: 1, currencyCode: "TRY" }]
  }, /kullanılmayan/);
});

test("DOM-139 requires exact one-to-one price coverage and matching material/thickness", () => {
  const areaSummaryRequest = twoGroupRequest();
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaSummaryRequest);
  assert.ok(areaReport.result);
  const validPrices = pricesFor(areaReport, [2500, 1000]);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [validPrices[0]]
  }, /eksik/);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [...validPrices, { ...validPrices[0] }]
  }, /Yinelenen/);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [{ ...validPrices[0], groupId: "unknown-group" }, validPrices[1]]
  }, /bulunmayan veya kullanılmayan/);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [
      { ...validPrices[0], materialId: "other-material" },
      validPrices[1]
    ]
  }, /malzeme kimliği/);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [
      { ...validPrices[0], thicknessMm: 16 },
      validPrices[1]
    ]
  }, /kalınlığı/);
});

test("DOM-139 requires explicit homogeneous currency, safe integer prices and source references", () => {
  const areaSummaryRequest = twoGroupRequest();
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaSummaryRequest);
  assert.ok(areaReport.result);
  const validPrices = pricesFor(areaReport, [2500, 1000]);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [
      { ...validPrices[0], currencyCode: "try" },
      validPrices[1]
    ]
  }, /üç büyük harf/);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [validPrices[0], { ...validPrices[1], currencyCode: "USD" }]
  }, /farklı para birimleri/);

  for (const invalidPrice of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assertBlocked({
      schemaVersion: 1,
      areaSummaryRequest,
      sheetPrices: [
        { ...validPrices[0], pricePerSheetMinor: invalidPrice },
        validPrices[1]
      ]
    }, /güvenli bir tam sayı minor-unit/);
  }

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [
      { ...validPrices[0], sourceReference: " " },
      validPrices[1]
    ]
  }, /kaynak referansı/);
});

test("DOM-139 blocks overflow without exposing partial group totals", () => {
  const areaSummaryRequest = areaRequest([
    makeCutPlan({ id: "part-a", materialId: "mdf-18", thicknessMm: 18, quantity: 1 }),
    makeCutPlan({ id: "part-b", materialId: "plywood-8", thicknessMm: 8, quantity: 1 })
  ]);
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaSummaryRequest);
  assert.equal(areaReport.status, "ready");
  assert.ok(areaReport.result);
  assert.deepEqual(areaReport.result.groups.map(group => group.areaSummary.sheetCount), [1, 1]);
  const maximum = Number.MAX_SAFE_INTEGER;
  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: pricesFor(areaReport, [maximum, maximum])
  }, /toplam levha satın alma maliyeti güvenli tam sayı aralığını/);
});

test("DOM-139 propagates blocked cut-plan validation and rejects unknown request fields", () => {
  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest: { schemaVersion: 1, sourcePartIds: ["part-a"], groups: [] },
    sheetPrices: []
  }, /eksiksiz sağlanmalıdır/);

  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest: { schemaVersion: 1, sourcePartIds: [], groups: [] },
    sheetPrices: [],
    ignoredPriceSource: true
  }, /desteklenmeyen alan/);

  const areaSummaryRequest = twoGroupRequest();
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaSummaryRequest);
  assert.ok(areaReport.result);
  assertBlocked({
    schemaVersion: 1,
    areaSummaryRequest,
    sheetPrices: [...pricesFor(areaReport, [2500, 1000]), { unknown: true }]
  }, /desteklenmeyen alan/);
});
