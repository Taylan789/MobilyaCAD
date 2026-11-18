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
    sourcePartIds: ["part-a"],
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
