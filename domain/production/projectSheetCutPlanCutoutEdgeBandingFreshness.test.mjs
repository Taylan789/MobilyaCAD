import assert from "node:assert/strict";
import test from "node:test";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { createFreshProjectSheetCutPlanExport } from "./projectSheetCutPlanExport.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const selectedPartId = "nestable-panel-panel";
const cutoutPartId = "custom-worktop-panel";

function panelRequest({ id, name, widthMm, lengthMm, thicknessMm, quantity, material, materialId }) {
  return {
    schemaVersion: 1,
    family: "panel",
    furniture: { id, name, widthMm, lengthMm, thicknessMm, quantity, material, materialId },
    profile: { edgeBanding: { ...noBanding }, grainDirection: "length" },
    materials: [{ id: materialId, name: material, category: "panel", thicknessesMm: [thicknessMm], unit: "mm" }]
  };
}

function cutoutProjectReport({
  topBandingId = "pvc-inner-top",
  topBandingUnit = "m",
  sinkBottomBanded = false,
  sinkOpening = {}
} = {}) {
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [
      panelRequest({
        id: "nestable-panel",
        name: "Kesilebilir dikdörtgen panel",
        widthMm: 500,
        lengthMm: 700,
        thicknessMm: 18,
        quantity: 1,
        material: "MDF Lam 18",
        materialId: "mdf-18"
      }),
      panelRequest({
        id: "custom-worktop",
        name: "Kesitli özel tezgâh",
        widthMm: 2000,
        lengthMm: 600,
        thicknessMm: 38,
        quantity: 2,
        material: "Kompakt Tezgâh",
        materialId: "worktop-38-a"
      })
    ],
    panelCutouts: [{
      partId: cutoutPartId,
      geometry: {
        schemaVersion: 1,
        widthMm: 2000,
        lengthMm: 600,
        thicknessMm: 38,
        outerEdgeBanding: { ...noBanding },
        cutouts: [
          {
            id: "sink-opening",
            xMm: sinkOpening.xMm ?? 100,
            yMm: sinkOpening.yMm ?? 100,
            widthMm: sinkOpening.widthMm ?? 400,
            lengthMm: sinkOpening.lengthMm ?? 300,
            edgeBanding: { top: true, bottom: sinkBottomBanded, left: true, right: false }
          },
          {
            id: "cooktop-opening",
            xMm: 800,
            yMm: 100,
            widthMm: 300,
            lengthMm: 200,
            edgeBanding: { top: true, bottom: false, left: false, right: true }
          }
        ]
      }
    }],
    edgeBandingAssignments: [
      { partId: cutoutPartId, edge: "top", edgeBandingId: topBandingId, unit: topBandingUnit },
      { partId: cutoutPartId, edge: "left", edgeBandingId: "pvc-inner-left", unit: "mm" },
      { partId: cutoutPartId, edge: "right", edgeBandingId: "pvc-inner-right", unit: "mm" }
    ]
  });

  assert.equal(report.status, "ready", report.firstError ?? "Kesitli proje üretimi hazır olmalı.");
  assert.ok(report.result);
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some((message) => /panelGeometry/.test(message)));
  assert.ok(report.exportBlockers.some((message) => /edgeBandingByEdge/.test(message)));

  const cutoutPart = report.result.parts.find((part) => part.id === cutoutPartId);
  assert.ok(cutoutPart?.panelGeometry);
  assert.equal(cutoutPart.edgeBandingByEdge?.top?.edgeBandingId, topBandingId);
  assert.equal(cutoutPart.edgeBandingByEdge?.top?.unit, topBandingUnit);
  return report;
}

function savedPlanV2(productionReport) {
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport,
    partIds: [selectedPartId],
    stockSheets: [{
      sheet: {
        materialId: "mdf-18",
        widthMm: 1200,
        lengthMm: 1000,
        thicknessMm: 18,
        grainDirection: "length"
      },
      kerfMm: 3
    }]
  });

  assert.equal(batches.status, "ready", batches.diagnostics.join(" "));
  assert.ok(batches.result);
  assert.deepEqual(batches.sourcePartIds, [selectedPartId]);
  assert.deepEqual(batches.excludedPartIds, [cutoutPartId]);
  assert.ok(batches.projectPartSnapshot?.parts.some((entry) => entry.id === cutoutPartId));

  const layoutReports = batches.result.batches.map((group) => ({
    groupId: JSON.stringify([group.materialId, Math.round(group.thicknessMm * 10)]),
    layoutReport: calculateSheetNestingLayout(group.batch)
  }));
  const plan = createProjectSheetCutPlan({ schemaVersion: 1, batchReport: batches, layoutReports });
  assert.equal(plan.status, "ready", plan.diagnostics.join(" "));
  assert.ok(plan.json);
  assert.equal(JSON.parse(plan.json).formatVersion, 2);
  return plan.json;
}

function savedPlanV3(jsonV2) {
  const envelope = JSON.parse(jsonV2);
  envelope.formatVersion = 3;
  envelope.result.groups[0].stockSheetSource = {
    sourceId: "stock-sheet-source-01",
    revision: "rev-2026-11"
  };
  return JSON.stringify(envelope);
}

function validateFreshness(savedPlanJson, productionReport) {
  return validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson,
    productionReport,
    currentSelectedPartIds: [selectedPartId]
  });
}

function assertStaleWithoutPartialExport(result) {
  assert.equal(result.status, "stale");
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.deepEqual(result.sourcePartIds, [selectedPartId]);
  assert.ok(result.diagnostics.length > 0);
  assert.match(result.diagnostics.join(" "), /custom-worktop-panel üretim Part snapshot'ı değişmiş/);
}

test("DOM-204 JSON v2/v3 freshness rejects cutout edge-band catalog identity and unit edits on an excluded Part", () => {
  const originalReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(originalReport);
  const plans = [
    ["v2", jsonV2],
    ["v3", savedPlanV3(jsonV2)]
  ];

  for (const [version, savedPlanJson] of plans) {
    const unchanged = validateFreshness(savedPlanJson, originalReport);
    assert.equal(unchanged.status, "fresh", version);
    assert.equal(unchanged.json, savedPlanJson, version);

    const changedCatalog = validateFreshness(
      savedPlanJson,
      cutoutProjectReport({ topBandingId: "pvc-inner-top-revised" })
    );
    assertStaleWithoutPartialExport(changedCatalog);

    const changedUnit = validateFreshness(
      savedPlanJson,
      cutoutProjectReport({ topBandingUnit: "mm" })
    );
    assertStaleWithoutPartialExport(changedUnit);

    if (version === "v3") {
      assert.deepEqual(
        JSON.parse(savedPlanJson).result.groups[0].stockSheetSource,
        { sourceId: "stock-sheet-source-01", revision: "rev-2026-11" }
      );
    }
  }
});

test("DOM-204 JSON v2/v3 freshness rejects cutout inner-edge flag edits on an excluded Part", () => {
  const originalReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(originalReport);
  const plans = [
    ["v2", jsonV2],
    ["v3", savedPlanV3(jsonV2)]
  ];

  for (const [version, savedPlanJson] of plans) {
    assert.equal(validateFreshness(savedPlanJson, originalReport).status, "fresh", version);

    const editedGeometry = cutoutProjectReport({ sinkBottomBanded: true });
    const stale = validateFreshness(savedPlanJson, editedGeometry);
    assertStaleWithoutPartialExport(stale);
    assert.equal(JSON.parse(savedPlanJson).result.projectPartSnapshot.parts.length, 2);
  }
});

 
test("DOM-205 downstream v2/v3 export gate rejects stale cutout edge-band edits", () => {
  const originalReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(originalReport);
  const plans = [
    ["v2", jsonV2],
    ["v3", savedPlanV3(jsonV2)]
  ];
  const changedReports = [
    ["catalog identity", cutoutProjectReport({ topBandingId: "pvc-inner-top-revised" })],
    ["explicit unit", cutoutProjectReport({ topBandingUnit: "mm" })],
    ["cutout edge flag", cutoutProjectReport({ sinkBottomBanded: true })]
  ];
  const selectedPartIds = [selectedPartId];
  const exportReport = (savedPlanJson, productionReport) =>
    createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport,
        currentSelectedPartIds: selectedPartIds
      }
    });
  // Test-only override isolates the freshness gate from the real adapter blocker.
  // The actual production report remains non-exportable and is asserted below.
  const adapterReadyForFreshnessOnly = (report) => ({
    ...report,
    canExport: true,
    exportBlockers: []
  });

  for (const [version, savedPlanJson] of plans) {
    const unchanged = exportReport(
      savedPlanJson,
      adapterReadyForFreshnessOnly(originalReport)
    );
    assert.equal(unchanged.status, "ready", version);
    assert.equal(unchanged.freshnessStatus, "fresh", version);
    assert.equal(unchanged.json, savedPlanJson, version);
    assert.deepEqual(unchanged.sourcePartIds, selectedPartIds, version);

    for (const [change, changedReport] of changedReports) {
      const stale = exportReport(
        savedPlanJson,
        adapterReadyForFreshnessOnly(changedReport)
      );
      assert.equal(stale.status, "blocked", version + " " + change);
      assert.equal(stale.freshnessStatus, "stale", version + " " + change);
      assert.equal(stale.result, null, version + " " + change);
      assert.equal(stale.json, null, version + " " + change);
      assert.deepEqual(stale.sourcePartIds, selectedPartIds, version + " " + change);
      assert.match(
        stale.diagnostics.join(" "),
        /custom-worktop-panel üretim Part snapshot'ı değişmiş/,
        version + " " + change
      );
    }

    const actualAdapterBlock = exportReport(savedPlanJson, originalReport);
    assert.equal(actualAdapterBlock.status, "blocked", version);
    assert.equal(actualAdapterBlock.freshnessStatus, "blocked", version);
    assert.equal(actualAdapterBlock.result, null, version);
    assert.equal(actualAdapterBlock.json, null, version);
    assert.ok(
      actualAdapterBlock.productionDiagnostics?.some((item) => /panelGeometry/.test(item.message)),
      version + " panelGeometry export blocker must remain visible"
    );
    assert.ok(
      actualAdapterBlock.productionDiagnostics?.some((item) => /edgeBandingByEdge/.test(item.message)),
      version + " edgeBandingByEdge export blocker must remain visible"
    );
  }
});


test("DOM-206 JSON v2/v3 freshness and downstream export reject excluded cutout geometry edits", () => {
  const originalReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(originalReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const geometryChanges = [
    ["x", { xMm: 120 }],
    ["y", { yMm: 120 }],
    ["width", { widthMm: 420 }],
    ["length", { lengthMm: 320 }]
  ];
  const selectedPartIds = [selectedPartId];
  const exportReport = (savedPlanJson, productionReport) =>
    createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport,
        currentSelectedPartIds: selectedPartIds
      }
    });
  // Test-only override isolates freshness from the still-unsupported adapter fields.
  const adapterReadyForFreshnessOnly = (report) => ({
    ...report,
    canExport: true,
    exportBlockers: []
  });

  for (const [version, savedPlanJson] of plans) {
    const unchanged = validateFreshness(savedPlanJson, originalReport);
    assert.equal(unchanged.status, "fresh", version);
    assert.equal(unchanged.json, savedPlanJson, version);

    for (const [change, opening] of geometryChanges) {
      const editedReport = cutoutProjectReport({ sinkOpening: opening });
      const stale = validateFreshness(savedPlanJson, editedReport);
      assertStaleWithoutPartialExport(stale);

      const downstream = exportReport(savedPlanJson, adapterReadyForFreshnessOnly(editedReport));
      assert.equal(downstream.status, "blocked", version + " " + change);
      assert.equal(downstream.freshnessStatus, "stale", version + " " + change);
      assert.equal(downstream.result, null, version + " " + change);
      assert.equal(downstream.json, null, version + " " + change);
      assert.deepEqual(downstream.sourcePartIds, selectedPartIds, version + " " + change);
      assert.match(
        downstream.diagnostics.join(" "),
        /custom-worktop-panel üretim Part snapshot'ı değişmiş/,
        version + " " + change
      );

      // The real production report must keep both unsupported-field blockers.
      const adapterBlocked = exportReport(savedPlanJson, editedReport);
      assert.equal(adapterBlocked.status, "blocked", version + " " + change);
      assert.equal(adapterBlocked.result, null, version + " " + change);
      assert.equal(adapterBlocked.json, null, version + " " + change);
      assert.ok(adapterBlocked.productionDiagnostics?.some((item) => /panelGeometry/.test(item.message)));
      assert.ok(adapterBlocked.productionDiagnostics?.some((item) => /edgeBandingByEdge/.test(item.message)));
    }

    if (version === "v3") {
      assert.deepEqual(
        JSON.parse(savedPlanJson).result.groups[0].stockSheetSource,
        { sourceId: "stock-sheet-source-01", revision: "rev-2026-11" }
      );
    }
  }
});
