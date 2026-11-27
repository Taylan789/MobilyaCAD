import assert from "node:assert/strict";
import test from "node:test";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { createFreshProjectSheetCutPlanExport } from "./projectSheetCutPlanExport.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { PROJECT_PART_SNAPSHOT_MAX_BYTES, createProjectPartSnapshot } from "./projectPartSnapshot.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const selectedPartId = "nestable-panel-panel";
const cutoutPartId = "custom-worktop-panel";

function panelRequest({ id, name, widthMm, lengthMm, thicknessMm, quantity, material, materialId, edgeBanding = noBanding }) {
  return {
    schemaVersion: 1,
    family: "panel",
    furniture: { id, name, widthMm, lengthMm, thicknessMm, quantity, material, materialId },
    profile: { edgeBanding: { ...edgeBanding }, grainDirection: "length" },
    materials: [{ id: materialId, name: material, category: "panel", thicknessesMm: [thicknessMm], unit: "mm" }]
  };
}

function cutoutProjectReport({
  topBandingId = "pvc-inner-top",
  topBandingUnit = "m",
  sinkBottomBanded = false,
  sinkOpening = {},
  cutouts,
  panelDimensions = {},
  outerEdgeBanding = noBanding,
  geometryOverrides = {},
  expectBlocked = false
} = {}) {
  const widthMm = panelDimensions.widthMm ?? 2000;
  const lengthMm = panelDimensions.lengthMm ?? 600;
  const thicknessMm = panelDimensions.thicknessMm ?? 38;
  const defaultCutouts = [
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
        ];

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
        widthMm,
        lengthMm,
        thicknessMm,
        quantity: 2,
        material: "Kompakt Tezgâh",
        materialId: "worktop-38-a",
        edgeBanding: outerEdgeBanding
      })
    ],
    panelCutouts: [{
      partId: cutoutPartId,
      geometry: {
        schemaVersion: 1,
        widthMm,
        lengthMm,
        thicknessMm,
        outerEdgeBanding: { ...outerEdgeBanding },
        cutouts: cutouts ?? defaultCutouts,
        ...geometryOverrides
      }
    }],
    edgeBandingAssignments: [
      { partId: cutoutPartId, edge: "top", edgeBandingId: topBandingId, unit: topBandingUnit },
      { partId: cutoutPartId, edge: "left", edgeBandingId: "pvc-inner-left", unit: "mm" },
      { partId: cutoutPartId, edge: "right", edgeBandingId: "pvc-inner-right", unit: "mm" }
    ]
  });

  if (expectBlocked) {
    assert.equal(report.status, "blocked", report.firstError ?? "Geçersiz panel geometrisi projeyi bloklamalı.");
    assert.equal(report.result, null);
    assert.equal(report.canExport, false);
    assert.ok(report.blockedFurniture.length > 0);
    return report;
  }

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

function canonicalJsonForTest(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJsonForTest).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const source = value;
    return "{" + Object.keys(source).filter((key) => source[key] !== undefined).sort().map((key) =>
      JSON.stringify(key) + ":" + canonicalJsonForTest(source[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

function editSavedCutoutPartSnapshot(savedPlanJson, edit) {
  const envelope = JSON.parse(savedPlanJson);
  const entry = envelope.result.projectPartSnapshot.parts.find((part) => part.id === cutoutPartId);
  assert.ok(entry, "Hariç kesitli Part snapshot içinde bulunmalı.");
  const part = JSON.parse(entry.snapshot);
  edit(part);
  entry.snapshot = canonicalJsonForTest(part);
  return JSON.stringify(envelope);
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


test("DOM-207 JSON v2/v3 freshness and downstream export reject excluded cutout opening add, remove, ID and order changes", () => {
  const originalCutouts = [
    {
      id: "sink-opening",
      xMm: 100,
      yMm: 100,
      widthMm: 400,
      lengthMm: 300,
      edgeBanding: { top: true, bottom: false, left: true, right: false }
    },
    {
      id: "cooktop-opening",
      xMm: 800,
      yMm: 100,
      widthMm: 300,
      lengthMm: 200,
      edgeBanding: { top: true, bottom: false, left: false, right: true }
    },
    {
      id: "third-opening",
      xMm: 1300,
      yMm: 100,
      widthMm: 200,
      lengthMm: 200,
      edgeBanding: { top: true, bottom: false, left: true, right: true }
    }
  ];
  const openingChanges = [
    ["opening added", [
      ...originalCutouts,
      {
        id: "fourth-opening",
        xMm: 1600,
        yMm: 100,
        widthMm: 200,
        lengthMm: 200,
        edgeBanding: { ...noBanding }
      }
    ]],
    ["opening removed", originalCutouts.slice(0, 2)],
    ["opening ID", [
      originalCutouts[0],
      originalCutouts[1],
      { ...originalCutouts[2], id: "third-opening-revised" }
    ]],
    ["opening order", [...originalCutouts].reverse()]
  ];
  const originalReport = cutoutProjectReport({ cutouts: originalCutouts });
  const jsonV2 = savedPlanV2(originalReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
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

    for (const [change, openings] of openingChanges) {
      const editedReport = cutoutProjectReport({ cutouts: openings });
      const stale = validateFreshness(savedPlanJson, editedReport);
      assertStaleWithoutPartialExport(stale);

      const downstream = exportReport(
        savedPlanJson,
        adapterReadyForFreshnessOnly(editedReport)
      );
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


test("DOM-208 JSON v2/v3 freshness tracks excluded cutout Part geometry schema, board dimensions and outer-edge metadata", () => {
  const originalReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(originalReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const selectedPartIds = [selectedPartId];
  const changedReports = [
    ["board width", cutoutProjectReport({ panelDimensions: { widthMm: 2100 } })],
    ["board length", cutoutProjectReport({ panelDimensions: { lengthMm: 650 } })],
    ["board thickness", cutoutProjectReport({ panelDimensions: { thicknessMm: 40 } })],
    ["outer-edge metadata", cutoutProjectReport({ outerEdgeBanding: { ...noBanding, top: true } })]
  ];
  const exportReport = (savedPlanJson, productionReport) =>
    createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: { schemaVersion: 1, savedPlanJson, productionReport, currentSelectedPartIds: selectedPartIds }
    });
  const adapterReadyForFreshnessOnly = (report) => ({ ...report, canExport: true, exportBlockers: [] });

  for (const [version, savedPlanJson] of plans) {
    const unchanged = validateFreshness(savedPlanJson, originalReport);
    assert.equal(unchanged.status, "fresh", version);
    assert.equal(unchanged.json, savedPlanJson, version);

    for (const [change, changedReport] of changedReports) {
      assert.equal(changedReport.status, "ready", version + " " + change);
      assertStaleWithoutPartialExport(validateFreshness(savedPlanJson, changedReport));
      const downstream = exportReport(savedPlanJson, adapterReadyForFreshnessOnly(changedReport));
      assert.equal(downstream.status, "blocked", version + " " + change);
      assert.equal(downstream.freshnessStatus, "stale", version + " " + change);
      assert.equal(downstream.result, null, version + " " + change);
      assert.equal(downstream.json, null, version + " " + change);
      assert.deepEqual(downstream.sourcePartIds, selectedPartIds, version + " " + change);

      const actualAdapterBlock = exportReport(savedPlanJson, changedReport);
      assert.equal(actualAdapterBlock.status, "blocked", version + " " + change);
      assert.equal(actualAdapterBlock.result, null, version + " " + change);
      assert.equal(actualAdapterBlock.json, null, version + " " + change);
      assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /panelGeometry/.test(item.message)));
      assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /edgeBandingByEdge/.test(item.message)));
    }

    const editedSavedSchema = editSavedCutoutPartSnapshot(savedPlanJson, (part) => { part.panelGeometry.schemaVersion = 2; });
    assertStaleWithoutPartialExport(validateFreshness(editedSavedSchema, originalReport));
    const schemaExport = exportReport(editedSavedSchema, adapterReadyForFreshnessOnly(originalReport));
    assert.equal(schemaExport.status, "blocked", version + " saved panelGeometry schema");
    assert.equal(schemaExport.freshnessStatus, "stale", version + " saved panelGeometry schema");
    assert.equal(schemaExport.result, null, version + " saved panelGeometry schema");
    assert.equal(schemaExport.json, null, version + " saved panelGeometry schema");
    assert.equal(JSON.parse(JSON.parse(savedPlanJson).result.projectPartSnapshot.parts.find((part) => part.id === cutoutPartId).snapshot).panelGeometry.schemaVersion, 1);

    if (version === "v3") {
      assert.deepEqual(JSON.parse(savedPlanJson).result.groups[0].stockSheetSource, { sourceId: "stock-sheet-source-01", revision: "rev-2026-11" });
    }
  }

  const invalidGeometryInputs = [
    ["unsupported schema", { schemaVersion: 2 }],
    ["missing outer-edge metadata", { outerEdgeBanding: undefined }],
    ["missing cutout list", { cutouts: undefined }],
    ["board dimensions do not match the Part", { widthMm: 1999 }],
    ["outer-edge metadata does not match the Part", { outerEdgeBanding: { ...noBanding, top: true } }],
    ["unknown geometry metadata", { legacySchema: 1 }]
  ];
  for (const [label, geometryOverrides] of invalidGeometryInputs) {
    const blocked = cutoutProjectReport({ geometryOverrides, expectBlocked: true });
    assert.equal(blocked.status, "blocked", label);
    assert.equal(blocked.result, null, label);
    assert.equal(blocked.canExport, false, label);
    assert.ok(blocked.blockedFurniture.length > 0, label);
  }
});


test("DOM-210 oversized excluded Part snapshot blocks the real batch aggregator and saved v2/v3 freshness export", () => {
  const originalReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(originalReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const oversizedReport = structuredClone(cutoutProjectReport());
  const oversizedPart = oversizedReport.result.parts.find((part) => part.id === cutoutPartId);
  assert.ok(oversizedPart?.panelGeometry, "Hariç kesitli Part geometri metadata'sı taşımalı.");
  oversizedPart.panelGeometry.snapshotPayload = "x".repeat(8 * 1024 * 1024);

  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: oversizedReport,
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
  assert.equal(batches.status, "blocked");
  assert.equal(batches.result, null);
  assert.equal(batches.projectPartSnapshot, undefined);
  assert.match(batches.diagnostics.join(" "), /8 MiB UTF-8/);

  const cutPlan = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport: batches,
    layoutReports: []
  });
  assert.equal(cutPlan.status, "blocked");
  assert.equal(cutPlan.result, null);
  assert.equal(cutPlan.json, null);

  for (const [version, savedPlanJson] of plans) {
    const unchanged = validateFreshness(savedPlanJson, originalReport);
    assert.equal(unchanged.status, "fresh", version);

    const freshness = validateFreshness(savedPlanJson, oversizedReport);
    assert.equal(freshness.status, "blocked", version);
    assert.equal(freshness.result, null, version);
    assert.equal(freshness.json, null, version);
    assert.match(freshness.diagnostics.join(" "), /8 MiB UTF-8/, version);

    // Test-only adapter bypass isolates the full-project snapshot freshness gate.
    const freshnessExport = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: {
          ...oversizedReport,
          canExport: true,
          exportBlockers: []
        },
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(freshnessExport.status, "blocked", version);
    assert.equal(freshnessExport.freshnessStatus, "blocked", version);
    assert.equal(freshnessExport.result, null, version);
    assert.equal(freshnessExport.json, null, version);
    assert.deepEqual(freshnessExport.sourcePartIds, [selectedPartId], version);
    assert.match(freshnessExport.diagnostics.join(" "), /8 MiB UTF-8/, version);
    assert.equal(JSON.parse(savedPlanJson).formatVersion, version === "v2" ? 2 : 3);
  }
});

test("DOM-211 exact 8 MiB snapshot remains lossless through real nesting and saved JSON v2/v3 freshness", () => {
  const baseCutouts = [
    {
      id: "opening-",
      xMm: 100,
      yMm: 100,
      widthMm: 400,
      lengthMm: 300,
      edgeBanding: { top: true, bottom: false, left: true, right: false }
    },
    {
      id: "cooktop-opening",
      xMm: 800,
      yMm: 100,
      widthMm: 300,
      lengthMm: 200,
      edgeBanding: { top: true, bottom: false, left: false, right: true }
    }
  ];
  const baselineReport = cutoutProjectReport({ cutouts: baseCutouts });
  const baselineSnapshot = createProjectPartSnapshot(baselineReport.result.parts);
  const baselineBytes = new TextEncoder().encode(JSON.stringify(baselineSnapshot)).byteLength;
  const openingIdPayloadLength = PROJECT_PART_SNAPSHOT_MAX_BYTES - baselineBytes;
  assert.ok(openingIdPayloadLength > 0);

  // The long ID is valid geometry metadata: the geometry validator requires a
  // stable non-empty ID but deliberately does not invent an arbitrary length cap.
  const largeOpeningId = "opening-" + "x".repeat(openingIdPayloadLength);
  const exactReport = cutoutProjectReport({
    cutouts: [{ ...baseCutouts[0], id: largeOpeningId }, baseCutouts[1]]
  });
  const expectedSnapshot = createProjectPartSnapshot(exactReport.result.parts);
  assert.equal(
    new TextEncoder().encode(JSON.stringify(expectedSnapshot)).byteLength,
    PROJECT_PART_SNAPSHOT_MAX_BYTES
  );

  const expectedExcludedEntry = expectedSnapshot.parts.find((entry) => entry.id === cutoutPartId);
  assert.ok(expectedExcludedEntry);
  const expectedGeometry = JSON.parse(expectedExcludedEntry.snapshot).panelGeometry;
  assert.equal(expectedGeometry.cutouts[0].id, largeOpeningId);

  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: exactReport,
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
  assert.ok(batches.projectPartSnapshot);
  assert.equal(
    new TextEncoder().encode(JSON.stringify(batches.projectPartSnapshot)).byteLength,
    PROJECT_PART_SNAPSHOT_MAX_BYTES
  );
  const aggregatedExcludedEntry = batches.projectPartSnapshot.parts.find((entry) => entry.id === cutoutPartId);
  assert.equal(aggregatedExcludedEntry?.snapshot, expectedExcludedEntry.snapshot);

  const jsonV2 = savedPlanV2(exactReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  for (const [version, savedPlanJson] of plans) {
    const savedEnvelope = JSON.parse(savedPlanJson);
    const savedExcludedEntry = savedEnvelope.result.projectPartSnapshot.parts.find((entry) => entry.id === cutoutPartId);
    assert.equal(savedExcludedEntry?.snapshot, expectedExcludedEntry.snapshot, version);

    const freshness = validateFreshness(savedPlanJson, exactReport);
    assert.equal(freshness.status, "fresh", version);
    assert.equal(freshness.json, savedPlanJson, version);

    // Isolate the snapshot/freshness gate without claiming the unsupported
    // panelGeometry and edgeBandingByEdge adapters are production-ready.
    const adapterReadyForFreshnessOnly = {
      ...exactReport,
      canExport: true,
      exportBlockers: []
    };
    const freshnessExport = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: adapterReadyForFreshnessOnly,
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(freshnessExport.status, "ready", version);
    assert.equal(freshnessExport.freshnessStatus, "fresh", version);
    assert.equal(freshnessExport.json, savedPlanJson, version);

    const actualAdapterBlock = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: exactReport,
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(actualAdapterBlock.status, "blocked", version);
    assert.equal(actualAdapterBlock.freshnessStatus, "blocked", version);
    assert.equal(actualAdapterBlock.result, null, version);
    assert.equal(actualAdapterBlock.json, null, version);
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /panelGeometry/.test(item.message)));
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /edgeBandingByEdge/.test(item.message)));
    assert.equal(savedEnvelope.formatVersion, version === "v2" ? 2 : 3);
  }
});

