import assert from "node:assert/strict";
import test from "node:test";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { parseProjectSheetCutPlanJson, serializeProjectSheetCutPlanJson } from "./projectSheetCutPlanFile.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { createFreshProjectSheetCutPlanExport } from "./projectSheetCutPlanExport.ts";

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

function buildSavedPlan(parts, grainDirectionsByPartId, partIds) {
  const report = productionReport(parts);
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: report,
    ...(partIds === undefined ? {} : { partIds }),
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
  const plan = createProjectSheetCutPlan({ schemaVersion: 1, batchReport: batches, layoutReports });
  assert.equal(plan.status, "ready", plan.diagnostics.join(" "));
  assert.ok(plan.json);
  return plan.json;
}

function savedPlan(parts, grainDirectionsByPartId) {
  const envelope = JSON.parse(buildSavedPlan(parts, grainDirectionsByPartId));
  delete envelope.result.projectPartSnapshot;
  envelope.formatVersion = 1;
  return JSON.stringify(envelope);
}

function savedPlanV2(parts, grainDirectionsByPartId, partIds) {
  return buildSavedPlan(parts, grainDirectionsByPartId, partIds);
}

function assertNotFresh(result, status) {
  assert.equal(result.status, status);
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.length > 0);
}

test("JSON v2 seçilmemiş Part ekleme/silme/değişim ve seçim kapsamı değişikliğinde stale olur", () => {
  const selectedPart = part();
  const excludedPart = part({
    id: "excluded-part", name: "Hariç parça", material: "Kontrplak",
    materialId: "plywood-8", thickness: 8, grainDirection: "width"
  });
  const parts = [selectedPart, excludedPart];
  const json = savedPlanV2(parts, undefined, ["part-1"]);
  const selectedIds = ["part-1"];
  const fresh = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1, savedPlanJson: json, productionReport: productionReport(parts),
    currentSelectedPartIds: selectedIds
  });
  assert.equal(fresh.status, "fresh");
  const added = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1, savedPlanJson: json,
    productionReport: productionReport([...parts, part({ id: "new-part" })]),
    currentSelectedPartIds: selectedIds
  });
  assertNotFresh(added, "stale");
  assert.match(added.diagnostics.join(" "), /yeni Part eklendi/);
  const removed = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1, savedPlanJson: json, productionReport: productionReport([selectedPart]),
    currentSelectedPartIds: selectedIds
  });
  assertNotFresh(removed, "stale");
  assert.match(removed.diagnostics.join(" "), /Part silindi/);
  const changedExcluded = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1, savedPlanJson: json,
    productionReport: productionReport([selectedPart, part({
      id: "excluded-part", name: "Hariç parça", material: "Kontrplak",
      materialId: "plywood-8", thickness: 8, grainDirection: "width", quantity: 4
    })]),
    currentSelectedPartIds: selectedIds
  });
  assertNotFresh(changedExcluded, "stale");
  assert.match(changedExcluded.diagnostics.join(" "), /excluded-part üretim Part snapshot'ı değişmiş/);
  const reordered = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1, savedPlanJson: json, productionReport: productionReport([excludedPart, selectedPart]),
    currentSelectedPartIds: selectedIds
  });
  assertNotFresh(reordered, "stale");
  assert.match(reordered.diagnostics.join(" "), /sırası değişmiş/);
  const selectionChanged = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1, savedPlanJson: json, productionReport: productionReport(parts),
    currentSelectedPartIds: ["part-1", "excluded-part"]
  });
  assertNotFresh(selectionChanged, "stale");
  assert.match(selectionChanged.diagnostics.join(" "), /seçim kapsamı/);
  const missingSelection = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1, savedPlanJson: json, productionReport: productionReport(parts)
  });
  assertNotFresh(missingSelection, "blocked");
  assert.match(missingSelection.diagnostics.join(" "), /currentSelectedPartIds/);
});

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


test("JSON v3 stock-sheet provenance is preserved when fresh and export is blocked when stale", () => {
  const parts = [part()];
  const envelope = JSON.parse(savedPlanV2(parts));
  assert.equal(envelope.formatVersion, 2);
  assert.ok(envelope.result.projectPartSnapshot);
  const stockSheetSource = { sourceId: "stock-sheet-source-01", revision: "rev-2026-11" };
  envelope.formatVersion = 3;
  envelope.result.groups[0].stockSheetSource = stockSheetSource;
  const jsonV3 = JSON.stringify(envelope);

  const fresh = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: jsonV3,
    productionReport: productionReport(parts),
    currentSelectedPartIds: ["part-1"]
  });
  assert.equal(fresh.status, "fresh");
  assert.equal(fresh.json, jsonV3);
  assert.deepEqual(fresh.result?.groups[0]?.stockSheetSource, stockSheetSource);

  const stale = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson: jsonV3,
    productionReport: productionReport([part({ quantity: 3 })]),
    currentSelectedPartIds: ["part-1"]
  });
  assertNotFresh(stale, "stale");
  assert.deepEqual(stale.sourcePartIds, ["part-1"]);
  assert.match(stale.diagnostics.join(" "), /part-1/);
  // Stale validation intentionally returns no partial export; the original saved v3
  // envelope remains unchanged and retains the user-provided source/revision metadata.
  assert.deepEqual(JSON.parse(jsonV3).result.groups[0].stockSheetSource, stockSheetSource);
});


const customPanelMaterials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "plywood-18", name: "Kontrplak 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];

function customPanelRequest(id, overrides = {}) {
  const isCounter = id === "custom-counter";
  return {
    schemaVersion: 1,
    family: "panel",
    furniture: {
      id,
      name: isCounter ? "Tezgâh paneli" : "Ek raf",
      widthMm: isCounter ? 1200 : 900,
      lengthMm: isCounter ? 620 : 400,
      thicknessMm: 18,
      quantity: isCounter ? 3 : 2,
      material: "MDF Lam 18",
      materialId: "mdf-18",
      ...overrides.furniture
    },
    profile: {
      edgeBanding: isCounter
        ? { top: true, bottom: false, left: true, right: false }
        : { top: false, bottom: true, left: false, right: true },
      grainDirection: isCounter ? "length" : "width",
      ...overrides.profile
    },
    materials: customPanelMaterials
  };
}

function customPanelProductionReport(selectedRequest, excludedRequest) {
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [selectedRequest, excludedRequest]
  });
  assert.equal(report.status, "ready", report.firstError ?? "Özel panel üretim raporu hazır olmalı.");
  assert.equal(report.canExport, true);
  assert.ok(report.result);
  return report;
}

function customPanelSavedPlanJson(productionReport, selectedPartIds) {
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport,
    partIds: selectedPartIds,
    stockSheets: [{
      sheet: {
        materialId: "mdf-18",
        widthMm: 2800,
        lengthMm: 2070,
        thicknessMm: 18,
        grainDirection: "length"
      },
      kerfMm: 3.2
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

test("özel panel ölçü, adet, malzeme, kalınlık, damar ve kenar düzenlemeleri kayıtlı JSON v2 kesim planını stale yapar", () => {
  const selectedPartId = "custom-counter-panel";
  const selectedPartIds = [selectedPartId];
  const originalSelected = customPanelRequest("custom-counter");
  const originalExcluded = customPanelRequest("custom-shelf");
  const originalReport = customPanelProductionReport(originalSelected, originalExcluded);
  const savedPlanJson = customPanelSavedPlanJson(originalReport, selectedPartIds);
  const savedPlanBefore = savedPlanJson;

  assert.equal(JSON.parse(savedPlanJson).formatVersion, 2);
  const initiallyFresh = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson,
    productionReport: originalReport,
    currentSelectedPartIds: selectedPartIds
  });
  assert.equal(initiallyFresh.status, "fresh", initiallyFresh.diagnostics.join(" "));

  const edits = [
    ["genişlik", { furniture: { widthMm: 1250 } }],
    ["uzunluk", { furniture: { lengthMm: 650 } }],
    ["adet", { furniture: { quantity: 4 } }],
    ["malzeme", { furniture: { material: "Kontrplak 18", materialId: "plywood-18" } }],
    ["kalınlık", { furniture: { thicknessMm: 8, material: "MDF Lam 8", materialId: "mdf-8" } }],
    ["damar yönü", { profile: { grainDirection: "width" } }],
    ["kenar bantlama", {
      profile: { edgeBanding: { top: false, bottom: true, left: true, right: false } }
    }]
  ];

  for (const [label, overrides] of edits) {
    const editedReport = customPanelProductionReport(
      customPanelRequest("custom-counter", overrides),
      originalExcluded
    );
    const stale = validateProjectSheetCutPlanFreshness({
      schemaVersion: 1,
      savedPlanJson,
      productionReport: editedReport,
      currentSelectedPartIds: selectedPartIds
    });
    assertNotFresh(stale, "stale");
    assert.match(
      stale.diagnostics.join(" "),
      /custom-counter-panel üretim Part snapshot'ı değişmiş/,
      label + " değişikliği kayıtlı özel panel snapshot'ını geçersiz kılmalıdır."
    );
  }

  const editedExcludedReport = customPanelProductionReport(
    originalSelected,
    customPanelRequest("custom-shelf", {
      furniture: { quantity: 3 },
      profile: { edgeBanding: { top: true, bottom: false, left: false, right: true } }
    })
  );
  const excludedStale = validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson,
    productionReport: editedExcludedReport,
    currentSelectedPartIds: selectedPartIds
  });
  assertNotFresh(excludedStale, "stale");
  assert.match(excludedStale.diagnostics.join(" "), /custom-shelf-panel üretim Part snapshot'ı değişmiş/);
  assert.equal(savedPlanJson, savedPlanBefore);
});

test("DOM-227 JSON v2/v3 restore validates currentSelectedPartIds identity and order at freshness/export", () => {
  const parts = [
    part({ quantity: 1 }),
    part({ id: "part-2", furnitureId: "furniture-2", name: "İkinci panel", quantity: 1 })
  ];
  const report = productionReport(parts);
  const jsonV2 = savedPlanV2(parts, undefined, ["part-1", "part-2"]);
  const stockSheetSource = { sourceId: "stock-sheet-source-01", revision: "rev-2026-11" };
  const v3Envelope = JSON.parse(jsonV2);
  v3Envelope.formatVersion = 3;
  v3Envelope.result.groups[0].stockSheetSource = stockSheetSource;
  const plans = [["v2", jsonV2], ["v3", JSON.stringify(v3Envelope)]];
  const savedSourcePartIds = ["part-1", "part-2"];
  const scenarios = [
    { name: "duplicate selected IDs", currentSelectedPartIds: ["part-1", "part-1"], expectedStatus: "blocked", diagnostic: /yinelenen kimlik/ },
    { name: "reordered selected IDs", currentSelectedPartIds: ["part-2", "part-1"], expectedStatus: "stale", diagnostic: /seçim kapsamı/ },
    { name: "missing selected ID", currentSelectedPartIds: ["part-1"], expectedStatus: "stale", diagnostic: /seçim kapsamı/ },
    { name: "missing current selection list", expectedStatus: "blocked", diagnostic: /currentSelectedPartIds/ }
  ];

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    const restoredEnvelope = JSON.parse(savedPlanJson);
    assert.equal(restoredEnvelope.formatVersion, version === "v2" ? 2 : 3, version);
    assert.deepEqual(restoredEnvelope.result.sourcePartIds, savedSourcePartIds, version);
    if (version === "v3") assert.deepEqual(restoredEnvelope.result.groups[0].stockSheetSource, stockSheetSource);

    const baseline = validateProjectSheetCutPlanFreshness({ schemaVersion: 1, savedPlanJson, productionReport: report, currentSelectedPartIds: savedSourcePartIds });
    assert.equal(baseline.status, "fresh", version);
    assert.deepEqual(baseline.sourcePartIds, savedSourcePartIds, version);

    for (const scenario of scenarios) {
      const freshnessRequest = { schemaVersion: 1, savedPlanJson, productionReport: report, ...(scenario.currentSelectedPartIds === undefined ? {} : { currentSelectedPartIds: scenario.currentSelectedPartIds }) };
      const freshness = validateProjectSheetCutPlanFreshness(freshnessRequest);
      assert.equal(freshness.status, scenario.expectedStatus, version + " / " + scenario.name);
      assert.equal(freshness.result, null, version + " / " + scenario.name);
      assert.equal(freshness.json, null, version + " / " + scenario.name);
      assert.deepEqual(freshness.sourcePartIds, savedSourcePartIds, version + " / " + scenario.name);
      assert.match(freshness.diagnostics.join(" "), scenario.diagnostic, version + " / " + scenario.name);

      const exported = createFreshProjectSheetCutPlanExport({ schemaVersion: 1, freshness: freshnessRequest });
      assert.equal(exported.status, "blocked", version + " / " + scenario.name);
      assert.equal(exported.freshnessStatus, scenario.expectedStatus, version + " / " + scenario.name);
      assert.equal(exported.result, null, version + " / " + scenario.name);
      assert.equal(exported.json, null, version + " / " + scenario.name);
      assert.deepEqual(exported.sourcePartIds, savedSourcePartIds, version + " / " + scenario.name);
      assert.match(exported.diagnostics.join(" "), scenario.diagnostic, version + " / " + scenario.name);
    }
  }
});


test("DOM-228 JSON v2/v3 restore blocks empty, whitespace and non-string currentSelectedPartIds", () => {
  const parts = [
    part({ quantity: 1 }),
    part({ id: "part-2", furnitureId: "furniture-2", name: "İkinci panel", quantity: 1 })
  ];
  const report = productionReport(parts);
  const jsonV2 = savedPlanV2(parts, undefined, ["part-1", "part-2"]);
  const stockSheetSource = { sourceId: "stock-sheet-source-01", revision: "rev-2026-11" };
  const v3Envelope = JSON.parse(jsonV2);
  v3Envelope.formatVersion = 3;
  v3Envelope.result.groups[0].stockSheetSource = stockSheetSource;
  const plans = [["v2", jsonV2], ["v3", JSON.stringify(v3Envelope)]];
  const savedSourcePartIds = ["part-1", "part-2"];
  const invalidIdDiagnostic = /Güncel seçili Part ID 1 boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır/;
  const scenarios = [
    { name: "empty ID", currentSelectedPartIds: ["", "part-2"] },
    { name: "whitespace-only ID", currentSelectedPartIds: ["   ", "part-2"] },
    { name: "leading whitespace", currentSelectedPartIds: [" part-1", "part-2"] },
    { name: "trailing whitespace", currentSelectedPartIds: ["part-1 ", "part-2"] },
    { name: "numeric ID", currentSelectedPartIds: [1, "part-2"] },
    { name: "null ID", currentSelectedPartIds: [null, "part-2"] },
    { name: "object ID", currentSelectedPartIds: [{ id: "part-1" }, "part-2"] }
  ];

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    const restoredEnvelope = JSON.parse(savedPlanJson);
    assert.equal(restoredEnvelope.formatVersion, version === "v2" ? 2 : 3, version);
    assert.deepEqual(restoredEnvelope.result.sourcePartIds, savedSourcePartIds, version);
    if (version === "v3") {
      assert.deepEqual(restoredEnvelope.result.groups[0].stockSheetSource, stockSheetSource);
    }

    const baseline = validateProjectSheetCutPlanFreshness({
      schemaVersion: 1,
      savedPlanJson,
      productionReport: report,
      currentSelectedPartIds: savedSourcePartIds
    });
    assert.equal(baseline.status, "fresh", version);

    for (const scenario of scenarios) {
      const freshnessRequest = {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: report,
        currentSelectedPartIds: scenario.currentSelectedPartIds
      };
      const freshness = validateProjectSheetCutPlanFreshness(freshnessRequest);
      assert.equal(freshness.status, "blocked", version + " / " + scenario.name);
      assert.equal(freshness.result, null, version + " / " + scenario.name);
      assert.equal(freshness.json, null, version + " / " + scenario.name);
      assert.deepEqual(freshness.sourcePartIds, savedSourcePartIds, version + " / " + scenario.name);
      assert.match(freshness.diagnostics.join(" "), invalidIdDiagnostic, version + " / " + scenario.name);

      const exported = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: freshnessRequest
      });
      assert.equal(exported.status, "blocked", version + " / " + scenario.name);
      assert.equal(exported.freshnessStatus, "blocked", version + " / " + scenario.name);
      assert.equal(exported.result, null, version + " / " + scenario.name);
      assert.equal(exported.json, null, version + " / " + scenario.name);
      assert.deepEqual(exported.sourcePartIds, savedSourcePartIds, version + " / " + scenario.name);
      assert.match(exported.diagnostics.join(" "), invalidIdDiagnostic, version + " / " + scenario.name);
    }
  }
});
