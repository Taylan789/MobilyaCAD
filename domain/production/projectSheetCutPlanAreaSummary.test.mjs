import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectSheetCutPlanAreaSummary } from "./projectSheetCutPlanAreaSummary.ts";
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
      quantity: options.quantity ?? 2,
      grainDirection: "none",
      geometry: "rectangular"
    }]
  });
  assert.equal(batchReport.status, "ready");
  assert.ok(batchReport.result);
  const layout = calculateSheetNestingLayout({
    ...batchReport.result,
    ...(options.edgeTrimMm === undefined ? {} : { edgeTrimMm: options.edgeTrimMm })
  });
  return createSheetCutPlan({ schemaVersion: 1, batch: batchReport.result, layout });
}

function group(cutPlanReport, overrides = {}) {
  const plan = cutPlanReport.result;
  assert.ok(plan);
  return {
    materialId: plan.stockSheet.materialId,
    thicknessMm: plan.stockSheet.thicknessMm,
    sourcePartIds: plan.sourceParts.map((part) => part.id),
    cutPlanReport,
    ...overrides
  };
}

function assertBlocked(value, pattern) {
  const report = calculateProjectSheetCutPlanAreaSummary(value);
  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
  assert.ok(report.diagnostics.length > 0);
  if (pattern) assert.match(report.diagnostics.join(" "), pattern);
  return report;
}

test("proje alan özeti malzeme/kalınlık gruplarını, kaynak kimliklerini ve levha toplamlarını korur", () => {
  const mdf = makeCutPlan({
    id: "part-mdf",
    materialId: "mdf-18",
    thicknessMm: 18,
    sheetWidthMm: 1000,
    sheetLengthMm: 1000,
    quantity: 2,
    edgeTrimMm: { left: 10, right: 10, top: 5, bottom: 5 }
  });
  const plywood = makeCutPlan({
    id: "part-plywood",
    materialId: "plywood-8",
    thicknessMm: 8,
    sheetWidthMm: 800,
    sheetLengthMm: 600,
    partWidthMm: 100,
    partLengthMm: 200,
    quantity: 1
  });

  const report = calculateProjectSheetCutPlanAreaSummary({
    schemaVersion: 1,
    sourcePartIds: ["part-mdf", "part-plywood"],
    groups: [group(mdf), group(plywood)]
  });

  assert.equal(report.status, "ready");
  assert.ok(report.result);
  assert.equal(report.result.groupCount, 2);
  assert.deepEqual(report.result.sourcePartIds, ["part-mdf", "part-plywood"]);
  assert.deepEqual(report.result.groups.map((item) => item.groupId), [
    JSON.stringify(["mdf-18", 180]),
    JSON.stringify(["plywood-8", 80])
  ]);
  assert.deepEqual(report.result.groups.map((item) => item.sourcePartIds), [
    ["part-mdf"],
    ["part-plywood"]
  ]);
  assert.deepEqual(report.result.groups.map((item) => item.areaSummary.sheets.map((sheet) => sheet.sheetIndex)), [
    [1],
    [1]
  ]);
  assert.deepEqual(report.result.groups.map((item) => item.areaSummary.sheetCount), [1, 1]);
  assert.equal(report.result.totals.sheetCount, 2);
  assert.equal(report.result.totals.grossSheetAreaMm2, 1480000);
  assert.equal(report.result.totals.trimExcludedAreaMm2, 29800);
  assert.equal(report.result.totals.usableSheetAreaMm2, 1450200);
  assert.equal(report.result.totals.placedPartAreaMm2, 140000);
  assert.equal(report.result.totals.unoccupiedUsableAreaMm2, 1310200);
  assert.equal(report.result.totals.geometricOccupancyPercent, 9.65);
});

test("herhangi bir blocked grup tüm proje özetini blocked yapar ve kısmi toplam döndürmez", () => {
  const valid = makeCutPlan({ id: "part-a", materialId: "mdf-18", thicknessMm: 18, quantity: 1 });
  const blockedPlan = {
    schemaVersion: 1,
    status: "blocked",
    result: null,
    diagnostics: ["Levha yerleşimi operatör girdisi bekliyor."]
  };

  assertBlocked({
    schemaVersion: 1,
    sourcePartIds: ["part-a", "part-b"],
    groups: [
      group(valid),
      { materialId: "mdf-8", thicknessMm: 8, sourcePartIds: ["part-b"], cutPlanReport: blockedPlan }
    ]
  }, /operatör girdisi bekliyor/);
});

test("grup malzemesi, kalınlığı ve kaynak Part sırası doğrulanmış kesim planıyla eşleşmelidir", () => {
  const plan = makeCutPlan({ id: "part-a", materialId: "mdf-18", thicknessMm: 18, quantity: 1 });
  assertBlocked({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [group(plan, { materialId: "plywood-18" })]
  }, /levha malzeme kimliği/);

  assertBlocked({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [group(plan, { thicknessMm: 16 })]
  }, /levha kalınlığı/);

  assertBlocked({
    schemaVersion: 1,
    sourcePartIds: ["different-part"],
    groups: [group(plan, { sourcePartIds: ["different-part"] })]
  }, /kaynak Part ID listesi/);
});

test("seçili proje Part listesi her grupta tam bir kez temsil edilmelidir", () => {
  const first = makeCutPlan({ id: "part-a", materialId: "mdf-18", thicknessMm: 18, quantity: 1 });
  const second = makeCutPlan({ id: "part-b", materialId: "mdf-8", thicknessMm: 8, quantity: 1 });

  assertBlocked({
    schemaVersion: 1,
    sourcePartIds: ["part-a", "part-b", "part-c"],
    groups: [group(first), group(second)]
  }, /karşılığı bulunmayan seçili Part ID/);

  assertBlocked({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [
      group(first),
      { ...group(second), sourcePartIds: ["part-a"] }
    ]
  }, /birden fazla malzeme\/kalınlık grubunda/);
});

test("boş proje seçimi boş ve sıfır alan toplamları üretir", () => {
  const report = calculateProjectSheetCutPlanAreaSummary({
    schemaVersion: 1,
    sourcePartIds: [],
    groups: []
  });

  assert.equal(report.status, "empty");
  assert.deepEqual(report.result?.totals, {
    sheetCount: 0,
    grossSheetAreaMm2: 0,
    trimExcludedAreaMm2: 0,
    usableSheetAreaMm2: 0,
    placedPartAreaMm2: 0,
    unoccupiedUsableAreaMm2: 0,
    geometricOccupancyPercent: null
  });
  assert.deepEqual(report.result?.groups, []);
});


// DOM-120: independent cross-consumer area reconciliation from cut-plan geometry.
function independentlyReconcileArea(cutPlanReport) {
  const plan = cutPlanReport.result;
  assert.ok(plan);
  const trim = plan.edgeTrimMm ?? { left: 0, right: 0, top: 0, bottom: 0 };
  const grossPerSheet = plan.stockSheet.widthMm * plan.stockSheet.lengthMm;
  const usablePerSheet =
    (plan.stockSheet.widthMm - trim.left - trim.right) *
    (plan.stockSheet.lengthMm - trim.top - trim.bottom);
  const trimPerSheet = grossPerSheet - usablePerSheet;
  const roundedArea = (value) => Math.round(value * 100) / 100;
  const roundedPercent = (placed, usable) =>
    usable === 0 ? null : Math.round((placed / usable) * 10_000) / 100;
  const sheets = plan.sheets.map((sheet) => {
    const placedArea = sheet.placements.reduce(
      (sum, placement) => sum + placement.widthMm * placement.lengthMm,
      0
    );
    return {
      sheetIndex: sheet.index,
      grossSheetAreaMm2: roundedArea(grossPerSheet),
      trimExcludedAreaMm2: roundedArea(trimPerSheet),
      usableSheetAreaMm2: roundedArea(usablePerSheet),
      placedPartAreaMm2: roundedArea(placedArea),
      unoccupiedUsableAreaMm2: roundedArea(usablePerSheet - placedArea),
      geometricOccupancyPercent: roundedPercent(placedArea, usablePerSheet)
    };
  });
  const placedArea = sheets.reduce((sum, sheet) => sum + sheet.placedPartAreaMm2, 0);
  const usableArea = usablePerSheet * sheets.length;
  return {
    schemaVersion: 1,
    sheetCount: sheets.length,
    grossSheetAreaMm2: roundedArea(grossPerSheet * sheets.length),
    trimExcludedAreaMm2: roundedArea(trimPerSheet * sheets.length),
    usableSheetAreaMm2: roundedArea(usableArea),
    placedPartAreaMm2: roundedArea(placedArea),
    unoccupiedUsableAreaMm2: roundedArea(usableArea - placedArea),
    geometricOccupancyPercent: roundedPercent(placedArea, usableArea),
    sheets
  };
}

test("DOM-120 mixed-stock project area summary reconciles against per-sheet cut-plan geometry and weighted totals", () => {
  const mdf = makeCutPlan({
    id: "part-mdf",
    materialId: "mdf-18",
    thicknessMm: 18,
    sheetWidthMm: 1000,
    sheetLengthMm: 1000,
    quantity: 2,
    edgeTrimMm: { left: 10, right: 10, top: 5, bottom: 5 }
  });
  const plywood = makeCutPlan({
    id: "part-plywood",
    materialId: "plywood-8",
    thicknessMm: 8,
    sheetWidthMm: 800,
    sheetLengthMm: 600,
    partWidthMm: 700,
    partLengthMm: 500,
    quantity: 3
  });
  assert.equal(mdf.status, "ready");
  assert.equal(plywood.status, "ready");
  assert.ok(plywood.result);
  assert.ok(plywood.result.sheets.length > 1, "fixture must exercise a multi-sheet stock group");

  const inputGroups = [group(mdf), group(plywood)];
  const report = calculateProjectSheetCutPlanAreaSummary({
    schemaVersion: 1,
    sourcePartIds: ["part-mdf", "part-plywood"],
    groups: inputGroups
  });
  assert.equal(report.status, "ready");
  assert.ok(report.result);
  assert.equal(report.result.groupCount, inputGroups.length);

  for (let index = 0; index < inputGroups.length; index += 1) {
    assert.deepEqual(
      report.result.groups[index].areaSummary,
      independentlyReconcileArea(inputGroups[index].cutPlanReport),
      "each material group must reconcile gross, trim, usable, placement, offcut and sheet-level occupancy"
    );
  }

  const expectedTotals = report.result.groups.reduce((totals, groupSummary) => {
    const area = groupSummary.areaSummary;
    totals.sheetCount += area.sheetCount;
    totals.grossSheetAreaMm2 += area.grossSheetAreaMm2;
    totals.trimExcludedAreaMm2 += area.trimExcludedAreaMm2;
    totals.usableSheetAreaMm2 += area.usableSheetAreaMm2;
    totals.placedPartAreaMm2 += area.placedPartAreaMm2;
    totals.unoccupiedUsableAreaMm2 += area.unoccupiedUsableAreaMm2;
    return totals;
  }, {
    sheetCount: 0,
    grossSheetAreaMm2: 0,
    trimExcludedAreaMm2: 0,
    usableSheetAreaMm2: 0,
    placedPartAreaMm2: 0,
    unoccupiedUsableAreaMm2: 0
  });
  expectedTotals.geometricOccupancyPercent = expectedTotals.usableSheetAreaMm2 === 0
    ? null
    : Math.round(
        (expectedTotals.placedPartAreaMm2 / expectedTotals.usableSheetAreaMm2) * 10_000
      ) / 100;
  assert.deepEqual(report.result.totals, expectedTotals);
});
