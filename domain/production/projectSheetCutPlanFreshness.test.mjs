import assert from "node:assert/strict";
import test from "node:test";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { serializeProjectSheetCutPlanJson } from "./projectSheetCutPlanFile.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

function part(overrides = {}) {
  return {
    id: "part-1",
    furnitureId: "furniture-1",
    name: "Yan panel",
    width: 500,
    length: 700,
    thickness: 18,
    quantity: 2,
    material: "MDF",
    materialId: "mdf-18",
    grainDirection: "length",
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    ...overrides
  };
}

function productionReport(parts) {
  return {
    schemaVersion: 1,
    status: "ready",
    canExport: true,
    isEmpty: false,
    supportedFurniture: [{ furnitureId: "furniture-1", family: "cabinet" }],
    unsupportedFurniture: [],
    blockedFurniture: [],
    projectErrors: [],
    exportBlockers: [],
    firstError: null,
    result: { schemaVersion: 1, furniture: [], parts }
  };
}

function savedPlan(parts, grainDirectionsByPartId) {
  const report = productionReport(parts);
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: report,
    stockSheets: [{
      sheet: {
        materialId: "mdf-18",
        widthMm: 1200,
        lengthMm: 1000,
        thicknessMm: 18,
        grainDirection: "length"
      },
      kerfMm: 3,
      ...(grainDirectionsByPartId === undefined ? {} : { grainDirectionsByPartId })
    }]
  });
  assert.equal(batches.status, "ready", batches.diagnostics.join(" "));
  assert.ok(batches.result);

  const layoutReports = batches.result.batches.map((group) => ({
    groupId: JSON.stringify([group.materialId, Math.round(group.thicknessMm * 10)]),
    layoutReport: calculateSheetNestingLayout(group.batch)
  }));
  const plan = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport: batches,
    layoutReports
  });
  assert.equal(plan.status, "ready", plan.diagnostics.join(" "));
  assert.ok(plan.json);
  return plan.json;
}

function assertNotFresh(result, status) {
  assert.equal(result.status, status);
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.length > 0);
}

test("değişmeyen seçili Part snapshot'ı kaydedilmiş proje kesim planını fresh tutar", () => {
  const report = productionReport([part()]);
  const json = savedPlan(report.result.parts);
  const result = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: report
  });

  assert.equal(result.status, "fresh");
  assert.deepEqual(result.sourcePartIds, ["part-1"]);
  assert.equal(result.json, json);
  assert.deepEqual(result.result?.sourcePartIds, ["part-1"]);
  assert.deepEqual(result.diagnostics, []);
});

test("ölçü, adet, malzeme, kalınlık ve damar değişikliği eski planı stale yapar", () => {
  const original = [part()];
  const json = savedPlan(original);
  const changes = [
    ["genişlik", { width: 550 }],
    ["uzunluk", { length: 750 }],
    ["adet", { quantity: 1 }],
    ["malzeme", { materialId: "other-18" }],
    ["kalın", { thickness: 19 }],
    ["damar yönü", { grainDirection: "width" }]
  ];

  for (const [label, overrides] of changes) {
    const result = validateProjectSheetCutPlanFreshness({
      schemaVersion: 1,
      savedPlanJson: json,
      productionReport: productionReport([part(overrides)])
    });
    assertNotFresh(result, "stale");
    assert.match(result.diagnostics.join(" "), new RegExp(label));
  }
});

test("kayıtlı kaynak Part silinmiş veya seçili kaynak sırası değişmişse plan stale olur", () => {
  const twoParts = [
    part(),
    part({ id: "part-2", name: "Üst panel", width: 400, length: 600, quantity: 1 })
  ];
  const json = savedPlan(twoParts);

  const missing = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: productionReport([twoParts[1]])
  });
  assertNotFresh(missing, "stale");
  assert.match(missing.diagnostics.join(" "), /bulunmayan kayıtlı Part ID/);

  const reordered = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: productionReport(twoParts.slice().reverse())
  });
  assertNotFresh(reordered, "stale");
  assert.match(reordered.diagnostics.join(" "), /sırası/);
});

test("legacy Part damar yönü için aynı açık override olmadan freshness doğrulaması blocked olur", () => {
  const legacyPart = part({ grainDirection: undefined });
  const json = savedPlan([legacyPart], { "part-1": "length" });
  const report = productionReport([legacyPart]);

  const missingOverride = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: report
  });
  assertNotFresh(missingOverride, "blocked");
  assert.match(missingOverride.diagnostics.join(" "), /açık grain override/);

  const sameOverride = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: report,
    grainDirectionsByPartId: { "part-1": "length" }
  });
  assert.equal(sameOverride.status, "fresh");

  const changedOverride = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: report,
    grainDirectionsByPartId: { "part-1": "width" }
  });
  assertNotFresh(changedOverride, "stale");
  assert.match(changedOverride.diagnostics.join(" "), /damar yönü/);
});

test("bozuk güncel üretim raporu veya bozuk kayıtlı JSON blocked olur", () => {
  const json = savedPlan([part()]);
  const blockedReport = {
    ...productionReport([part()]),
    status: "blocked",
    canExport: false,
    result: null,
    firstError: "Gövde konstrüksiyonu doğrulanamadı."
  };

  const blocked = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: blockedReport
  });
  assertNotFresh(blocked, "blocked");
  assert.match(blocked.diagnostics.join(" "), /Gövde konstrüksiyonu/);

  const invalidJson = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: "{bozuk",
    productionReport: productionReport([part()])
  });
  assertNotFresh(invalidJson, "blocked");
});

test("boş kayıtlı plan yalnızca boş güncel üretim snapshot'ında fresh kalır", () => {
  const emptyFile = serializeProjectSheetCutPlanJson({
    schemaVersion: 1,
    status: "empty",
    result: { schemaVersion: 1, sourcePartIds: [], groups: [] },
    diagnostics: []
  });
  assert.equal(emptyFile.status, "empty");
  assert.ok(emptyFile.json);

  const emptyReport = {
    schemaVersion: 1,
    status: "empty",
    canExport: false,
    isEmpty: true,
    supportedFurniture: [],
    unsupportedFurniture: [],
    blockedFurniture: [],
    projectErrors: [],
    exportBlockers: [],
    firstError: null,
    result: { schemaVersion: 1, furniture: [], parts: [] }
  };
  const fresh = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: emptyFile.json,
    productionReport: emptyReport
  });
  assert.equal(fresh.status, "fresh");

  const nowHasParts = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: emptyFile.json,
    productionReport: productionReport([part()])
  });
  assertNotFresh(nowHasParts, "stale");
});

test("plan dışındaki Part ID için grain override verilmesi reddedilir", () => {
  const json = savedPlan([part()]);
  const result = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: json,
    productionReport: productionReport([part()]),
    grainDirectionsByPartId: { "unknown-part": "length" }
  });
  assertNotFresh(result, "blocked");
  assert.match(result.diagnostics.join(" "), /bulunmayan Part ID/);
});
