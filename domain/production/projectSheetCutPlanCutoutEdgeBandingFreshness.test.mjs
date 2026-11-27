import assert from "node:assert/strict";
import test from "node:test";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { createFreshProjectSheetCutPlanExport } from "./projectSheetCutPlanExport.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { parseProjectSheetCutPlanJson, serializeProjectSheetCutPlanJson } from "./projectSheetCutPlanFile.ts";
import { PROJECT_PART_SNAPSHOT_MAX_BYTES, createProjectPartSnapshot } from "./projectPartSnapshot.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const selectedPartId = "nestable-panel-panel";
const cutoutPartId = "custom-worktop-panel";

function panelRequest({ id, name, widthMm, lengthMm, thicknessMm, quantity, material, materialId, edgeBanding = noBanding, grainDirection = "length" }) {
  return {
    schemaVersion: 1,
    family: "panel",
    furniture: { id, name, widthMm, lengthMm, thicknessMm, quantity, material, materialId },
    profile: { edgeBanding: { ...edgeBanding }, grainDirection },
    materials: [{ id: materialId, name: material, category: "panel", thicknessesMm: [thicknessMm], unit: "mm" }]
  };
}

function cutoutProjectReport({
  topBandingId = "pvc-inner-top",
  topBandingUnit = "m",
  cutoutMaterial = "Kompakt Tezgâh",
  cutoutMaterialId = "worktop-38-a",
  grainDirection = "length",
  sinkBottomBanded = false,
  sinkOpening = {},
  cutouts,
  panelDimensions = {},
  outerEdgeBanding = noBanding,
  geometryOverrides = {},
  missingGeometryRecord = false,
  additionalCutoutPanels = [],
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

  const additionalFurniture = additionalCutoutPanels.map((panel) => panelRequest({
    id: panel.furnitureId,
    name: panel.name ?? "Ek kesitli tezgâh",
    widthMm: panel.widthMm ?? widthMm,
    lengthMm: panel.lengthMm ?? lengthMm,
    thicknessMm: panel.thicknessMm ?? thicknessMm,
    quantity: panel.quantity ?? 2,
    material: panel.material ?? "Kompakt Tezgâh",
    materialId: panel.materialId ?? "worktop-38-b",
    edgeBanding: panel.outerEdgeBanding ?? noBanding
  }));
  const additionalPanelCutouts = additionalCutoutPanels.map((panel) => {
    const panelWidthMm = panel.widthMm ?? widthMm;
    const panelLengthMm = panel.lengthMm ?? lengthMm;
    const panelThicknessMm = panel.thicknessMm ?? thicknessMm;
    return {
      partId: panel.furnitureId + "-panel",
      geometry: {
        schemaVersion: 1,
        widthMm: panelWidthMm,
        lengthMm: panelLengthMm,
        thicknessMm: panelThicknessMm,
        outerEdgeBanding: { ...(panel.outerEdgeBanding ?? noBanding) },
        cutouts: panel.cutouts ?? defaultCutouts,
        ...(panel.geometryOverrides ?? {})
      }
    };
  });
  const additionalEdgeBandingAssignments = additionalCutoutPanels.flatMap((panel) => {
    const partId = panel.furnitureId + "-panel";
    return [
      { partId, edge: "top", edgeBandingId: panel.topBandingId ?? topBandingId, unit: panel.topBandingUnit ?? topBandingUnit },
      { partId, edge: "left", edgeBandingId: "pvc-inner-left", unit: "mm" },
      { partId, edge: "right", edgeBandingId: "pvc-inner-right", unit: "mm" }
    ];
  });

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
        material: cutoutMaterial,
        materialId: cutoutMaterialId,
        edgeBanding: outerEdgeBanding,
        grainDirection
      }),
      ...additionalFurniture
    ],
    panelCutouts: [{
      partId: cutoutPartId,
      ...(missingGeometryRecord ? {} : {
        geometry: {
          schemaVersion: 1,
          widthMm,
          lengthMm,
          thicknessMm,
          outerEdgeBanding: { ...outerEdgeBanding },
          cutouts: cutouts ?? defaultCutouts,
          ...geometryOverrides
        }
      })
    }, ...additionalPanelCutouts],
    edgeBandingAssignments: [
      { partId: cutoutPartId, edge: "top", edgeBandingId: topBandingId, unit: topBandingUnit },
      { partId: cutoutPartId, edge: "left", edgeBandingId: "pvc-inner-left", unit: "mm" },
      { partId: cutoutPartId, edge: "right", edgeBandingId: "pvc-inner-right", unit: "mm" },
      ...additionalEdgeBandingAssignments
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
  const expectedExcludedPartIds = productionReport.result.parts
    .map((part) => part.id)
    .filter((id) => id !== selectedPartId);
  assert.deepEqual(batches.excludedPartIds, expectedExcludedPartIds);
  for (const excludedPartId of expectedExcludedPartIds) {
    assert.ok(batches.projectPartSnapshot?.parts.some((entry) => entry.id === excludedPartId));
  }

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

function editSavedCutoutPartSnapshot(savedPlanJson, edit, partId = cutoutPartId) {
  const envelope = JSON.parse(savedPlanJson);
  const entry = envelope.result.projectPartSnapshot.parts.find((part) => part.id === partId);
  assert.ok(entry, partId + " hariç kesitli Part snapshot içinde bulunmalı.");
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



test("DOM-212 valid cutout metadata one UTF-8 byte over 8 MiB blocks aggregation and saved v2/v3 freshness/export atomically", () => {
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
  assert.equal(
    baselineBytes + openingIdPayloadLength + 1,
    PROJECT_PART_SNAPSHOT_MAX_BYTES + 1
  );

  // The extra byte is carried by a valid, domain-accepted cutout ID, not malformed metadata.
  const oversizedOpeningId = "opening-" + "x".repeat(openingIdPayloadLength + 1);
  const oversizedReport = cutoutProjectReport({
    cutouts: [{ ...baseCutouts[0], id: oversizedOpeningId }, baseCutouts[1]]
  });
  assert.equal(oversizedReport.status, "ready");
  assert.ok(oversizedReport.result);
  const oversizedPart = oversizedReport.result.parts.find((part) => part.id === cutoutPartId);
  assert.equal(oversizedPart?.panelGeometry?.cutouts[0]?.id, oversizedOpeningId);
  assert.throws(
    () => createProjectPartSnapshot(oversizedReport.result.parts),
    /8 MiB UTF-8/
  );

  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
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
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    const freshness = validateFreshness(savedPlanJson, oversizedReport);
    assert.equal(freshness.status, "blocked", version);
    assert.equal(freshness.result, null, version);
    assert.equal(freshness.json, null, version);
    assert.deepEqual(freshness.sourcePartIds, [selectedPartId], version);
    assert.match(freshness.diagnostics.join(" "), /8 MiB UTF-8/, version);

    // Isolate the snapshot/freshness gate; this does not remove real adapter blockers.
    const freshnessExport = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: { ...oversizedReport, canExport: true, exportBlockers: [] },
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(freshnessExport.status, "blocked", version);
    assert.equal(freshnessExport.freshnessStatus, "blocked", version);
    assert.equal(freshnessExport.result, null, version);
    assert.equal(freshnessExport.json, null, version);
    assert.deepEqual(freshnessExport.sourcePartIds, [selectedPartId], version);
    assert.match(freshnessExport.diagnostics.join(" "), /8 MiB UTF-8/, version);

    const actualAdapterBlock = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: oversizedReport,
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(actualAdapterBlock.status, "blocked", version);
    assert.equal(actualAdapterBlock.result, null, version);
    assert.equal(actualAdapterBlock.json, null, version);
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /panelGeometry/.test(item.message)));
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /edgeBandingByEdge/.test(item.message)));
    assert.equal(JSON.parse(savedPlanJson).formatVersion, version === "v2" ? 2 : 3);
  }
});


test("DOM-213 multiple individually bounded cutout Parts over the shared 8 MiB snapshot budget block aggregation and saved v2/v3 freshness/export atomically", () => {
  const baseCutouts = [
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
    }
  ];
  const secondPanelId = "custom-worktop-second-panel";
  const additionalCutoutPanels = [{
    furnitureId: "custom-worktop-second",
    material: "Kompakt Tezgâh B",
    materialId: "worktop-38-b",
    cutouts: baseCutouts.map((cutout) => ({ ...cutout, edgeBanding: { ...cutout.edgeBanding } }))
  }];
  const baselineReport = cutoutProjectReport({
    cutouts: baseCutouts,
    additionalCutoutPanels
  });
  const baselineSnapshot = createProjectPartSnapshot(baselineReport.result.parts);
  const baselineBytes = new TextEncoder().encode(JSON.stringify(baselineSnapshot)).byteLength;
  const totalExtraBytes = PROJECT_PART_SNAPSHOT_MAX_BYTES - baselineBytes + 1;
  assert.ok(totalExtraBytes > 2);

  const firstExtraBytes = Math.floor(totalExtraBytes / 2);
  const secondExtraBytes = totalExtraBytes - firstExtraBytes;
  const oversizedReport = cutoutProjectReport({
    cutouts: [
      { ...baseCutouts[0], id: "sink-opening" + "x".repeat(firstExtraBytes) },
      baseCutouts[1]
    ],
    additionalCutoutPanels: [{
      furnitureId: "custom-worktop-second",
      material: "Kompakt Tezgâh B",
      materialId: "worktop-38-b",
      cutouts: [
        { ...baseCutouts[0], id: "sink-opening" + "y".repeat(secondExtraBytes) },
        baseCutouts[1]
      ]
    }]
  });

  assert.equal(oversizedReport.status, "ready");
  const firstCutoutPart = oversizedReport.result.parts.find((part) => part.id === cutoutPartId);
  const secondCutoutPart = oversizedReport.result.parts.find((part) => part.id === secondPanelId);
  assert.ok(firstCutoutPart?.panelGeometry);
  assert.ok(secondCutoutPart?.panelGeometry);
  for (const part of [firstCutoutPart, secondCutoutPart]) {
    const singlePartSnapshot = createProjectPartSnapshot([part]);
    const singlePartBytes = new TextEncoder().encode(JSON.stringify(singlePartSnapshot)).byteLength;
    assert.ok(singlePartBytes < PROJECT_PART_SNAPSHOT_MAX_BYTES);
  }
  assert.equal(
    baselineBytes + firstExtraBytes + secondExtraBytes,
    PROJECT_PART_SNAPSHOT_MAX_BYTES + 1
  );
  assert.throws(
    () => createProjectPartSnapshot(oversizedReport.result.parts),
    /8 MiB UTF-8/
  );

  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
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
  assert.deepEqual(batches.sourcePartIds, [selectedPartId]);
  assert.deepEqual(batches.excludedPartIds, [cutoutPartId, secondPanelId]);
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
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    const freshness = validateFreshness(savedPlanJson, oversizedReport);
    assert.equal(freshness.status, "blocked", version);
    assert.equal(freshness.result, null, version);
    assert.equal(freshness.json, null, version);
    assert.deepEqual(freshness.sourcePartIds, [selectedPartId], version);
    assert.match(freshness.diagnostics.join(" "), /8 MiB UTF-8/, version);

    const freshnessExport = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: { ...oversizedReport, canExport: true, exportBlockers: [] },
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(freshnessExport.status, "blocked", version);
    assert.equal(freshnessExport.freshnessStatus, "blocked", version);
    assert.equal(freshnessExport.result, null, version);
    assert.equal(freshnessExport.json, null, version);
    assert.match(freshnessExport.diagnostics.join(" "), /8 MiB UTF-8/, version);

    const actualAdapterBlock = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: oversizedReport,
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(actualAdapterBlock.status, "blocked", version);
    assert.equal(actualAdapterBlock.result, null, version);
    assert.equal(actualAdapterBlock.json, null, version);
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /panelGeometry/.test(item.message)));
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /edgeBandingByEdge/.test(item.message)));
    assert.equal(JSON.parse(savedPlanJson).formatVersion, version === "v2" ? 2 : 3);
  }
});


test("DOM-214 multiple individually bounded cutout Parts at the exact shared 8 MiB snapshot boundary remain valid through nesting and saved v2/v3 freshness", async (t) => {
  const baseCutouts = [
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
    }
  ];
  const secondPanelId = "custom-worktop-second-panel";
  const additionalCutoutPanels = [{
    furnitureId: "custom-worktop-second",
    material: "Kompakt Tezgâh B",
    materialId: "worktop-38-b",
    cutouts: baseCutouts.map((cutout) => ({ ...cutout, edgeBanding: { ...cutout.edgeBanding } }))
  }];
  const baselineReport = cutoutProjectReport({
    cutouts: baseCutouts,
    additionalCutoutPanels
  });
  const baselineSnapshot = createProjectPartSnapshot(baselineReport.result.parts);
  const baselineBytes = new TextEncoder().encode(JSON.stringify(baselineSnapshot)).byteLength;
  const totalExtraBytes = PROJECT_PART_SNAPSHOT_MAX_BYTES - baselineBytes;
  assert.ok(totalExtraBytes > 2);

  const firstExtraBytes = Math.floor(totalExtraBytes / 2);
  const secondExtraBytes = totalExtraBytes - firstExtraBytes;
  const exactReport = cutoutProjectReport({
    cutouts: [
      { ...baseCutouts[0], id: "sink-opening" + "x".repeat(firstExtraBytes) },
      baseCutouts[1]
    ],
    additionalCutoutPanels: [{
      furnitureId: "custom-worktop-second",
      material: "Kompakt Tezgâh B",
      materialId: "worktop-38-b",
      cutouts: [
        { ...baseCutouts[0], id: "sink-opening" + "y".repeat(secondExtraBytes) },
        baseCutouts[1]
      ]
    }]
  });

  assert.equal(exactReport.status, "ready");
  const firstCutoutPart = exactReport.result.parts.find((part) => part.id === cutoutPartId);
  const secondCutoutPart = exactReport.result.parts.find((part) => part.id === secondPanelId);
  assert.ok(firstCutoutPart?.panelGeometry);
  assert.ok(secondCutoutPart?.panelGeometry);
  for (const part of [firstCutoutPart, secondCutoutPart]) {
    const singlePartSnapshot = createProjectPartSnapshot([part]);
    const singlePartBytes = new TextEncoder().encode(JSON.stringify(singlePartSnapshot)).byteLength;
    assert.ok(singlePartBytes < PROJECT_PART_SNAPSHOT_MAX_BYTES, part.id);
  }

  const exactSnapshot = createProjectPartSnapshot(exactReport.result.parts);
  assert.equal(
    new TextEncoder().encode(JSON.stringify(exactSnapshot)).byteLength,
    PROJECT_PART_SNAPSHOT_MAX_BYTES
  );

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
  assert.deepEqual(batches.excludedPartIds, [cutoutPartId, secondPanelId]);
  assert.deepEqual(batches.projectPartSnapshot, exactSnapshot);

  const jsonV2 = savedPlanV2(exactReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  for (const [version, savedPlanJson] of plans) {
    const savedEnvelope = JSON.parse(savedPlanJson);
    assert.equal(
      new TextEncoder().encode(JSON.stringify(savedEnvelope.result.projectPartSnapshot)).byteLength,
      PROJECT_PART_SNAPSHOT_MAX_BYTES,
      version
    );
    assert.deepEqual(savedEnvelope.result.projectPartSnapshot, exactSnapshot, version);

    const freshness = validateFreshness(savedPlanJson, exactReport);
    assert.equal(freshness.status, "fresh", version);
    assert.equal(freshness.json, savedPlanJson, version);

    // This override isolates the verified snapshot/freshness gate. It does not
    // claim that the current panelGeometry/edgeBandingByEdge adapters can export.
    const freshnessExport = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson,
        productionReport: { ...exactReport, canExport: true, exportBlockers: [] },
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
    assert.equal(actualAdapterBlock.result, null, version);
    assert.equal(actualAdapterBlock.json, null, version);
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /panelGeometry/.test(item.message)));
    assert.ok(actualAdapterBlock.productionDiagnostics?.some((item) => /edgeBandingByEdge/.test(item.message)));
    assert.equal(savedEnvelope.formatVersion, version === "v2" ? 2 : 3);
  }

  await t.test("DOM-215 JSON v2/v3 parse-restore preserves canonical freshness and blocks project Part order changes", () => {
    function reverseObjectKeys(value) {
      if (Array.isArray(value)) return value.map(reverseObjectKeys);
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(
          Object.keys(value).reverse().map((key) => [key, reverseObjectKeys(value[key])])
        );
      }
      return value;
    }

    for (const [version, savedPlanJson] of plans) {
      const parsed = parseProjectSheetCutPlanJson(savedPlanJson);
      assert.equal(parsed.status, "ready", version);
      assert.ok(parsed.result, version);

      const restored = serializeProjectSheetCutPlanJson(parsed);
      assert.equal(restored.status, "ready", version);
      assert.ok(restored.json, version);
      const restoredEnvelope = JSON.parse(restored.json);
      assert.deepEqual(restoredEnvelope, JSON.parse(savedPlanJson), version);
      assert.equal(restoredEnvelope.formatVersion, version === "v2" ? 2 : 3, version);
      assert.equal(
        new TextEncoder().encode(JSON.stringify(restoredEnvelope.result.projectPartSnapshot)).byteLength,
        PROJECT_PART_SNAPSHOT_MAX_BYTES,
        version
      );
      assert.deepEqual(restoredEnvelope.result.projectPartSnapshot, exactSnapshot, version);

      const restoredFreshness = validateFreshness(restored.json, exactReport);
      assert.equal(restoredFreshness.status, "fresh", version);
      assert.equal(restoredFreshness.json, restored.json, version);
      assert.deepEqual(restoredFreshness.result?.projectPartSnapshot, exactSnapshot, version);

      const keyReorderedReport = {
        ...exactReport,
        result: {
          ...exactReport.result,
          parts: exactReport.result.parts.map(reverseObjectKeys)
        }
      };
      const keyOrderFreshness = validateFreshness(restored.json, keyReorderedReport);
      assert.equal(keyOrderFreshness.status, "fresh", version);
      assert.deepEqual(keyOrderFreshness.diagnostics, [], version);

      const partReorderedReport = {
        ...exactReport,
        result: {
          ...exactReport.result,
          parts: [...exactReport.result.parts].reverse()
        }
      };
      const stale = validateFreshness(restored.json, partReorderedReport);
      assert.equal(stale.status, "stale", version);
      assert.equal(stale.result, null, version);
      assert.equal(stale.json, null, version);
      assert.match(stale.diagnostics.join(" "), /Proje Part sırası değişmiş/, version);

      const staleExport = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson: restored.json,
          productionReport: { ...partReorderedReport, canExport: true, exportBlockers: [] },
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(staleExport.status, "blocked", version);
      assert.equal(staleExport.result, null, version);
      assert.equal(staleExport.json, null, version);
    }
  });
});


test("DOM-216 restored JSON v2/v3 plans become stale when project Parts are added, removed or their stable IDs change", () => {
  const baselineReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [
    ["v2", jsonV2],
    ["v3", savedPlanV3(jsonV2)]
  ];

  const addedReport = cutoutProjectReport({
    additionalCutoutPanels: [{
      furnitureId: "added-worktop",
      cutouts: [
        {
          id: "added-sink-opening",
          xMm: 100,
          yMm: 100,
          widthMm: 400,
          lengthMm: 300,
          edgeBanding: { top: true, bottom: false, left: true, right: false }
        },
        {
          id: "added-cooktop-opening",
          xMm: 800,
          yMm: 100,
          widthMm: 300,
          lengthMm: 200,
          edgeBanding: { top: true, bottom: false, left: false, right: true }
        }
      ]
    }]
  });
  const removedReport = {
    ...baselineReport,
    result: {
      ...baselineReport.result,
      parts: baselineReport.result.parts.filter((part) => part.id !== cutoutPartId)
    }
  };
  const renamedReport = {
    ...baselineReport,
    result: {
      ...baselineReport.result,
      parts: baselineReport.result.parts.map((part) =>
        part.id === selectedPartId
          ? { ...part, id: selectedPartId + "-renamed" }
          : part
      )
    }
  };
  const scenarios = [
    {
      name: "added excluded Part",
      report: addedReport,
      diagnostics: [/yeni Part eklendi/]
    },
    {
      name: "removed excluded Part",
      report: removedReport,
      diagnostics: [/Part silindi/]
    },
    {
      name: "renamed selected Part identity",
      report: renamedReport,
      diagnostics: [/yeni Part eklendi/, /Part silindi/]
    }
  ];

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    assert.equal(JSON.parse(savedPlanJson).formatVersion, version === "v2" ? 2 : 3, version);
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    for (const scenario of scenarios) {
      const stale = validateFreshness(savedPlanJson, scenario.report);
      assert.equal(stale.status, "stale", version + " / " + scenario.name);
      assert.equal(stale.result, null, version + " / " + scenario.name);
      assert.equal(stale.json, null, version + " / " + scenario.name);
      assert.deepEqual(stale.sourcePartIds, [selectedPartId], version + " / " + scenario.name);
      for (const diagnostic of scenario.diagnostics) {
        assert.match(stale.diagnostics.join(" "), diagnostic, version + " / " + scenario.name);
      }

      const staleExport = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson,
          productionReport: { ...scenario.report, canExport: true, exportBlockers: [] },
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(staleExport.status, "blocked", version + " / " + scenario.name);
      assert.equal(staleExport.freshnessStatus, "stale", version + " / " + scenario.name);
      assert.equal(staleExport.result, null, version + " / " + scenario.name);
      assert.equal(staleExport.json, null, version + " / " + scenario.name);
      assert.deepEqual(staleExport.sourcePartIds, [selectedPartId], version + " / " + scenario.name);
    }
  }
});


test("DOM-217 restored JSON v2/v3 cut plans become stale when an excluded Part quantity changes", () => {
  const baselineReport = cutoutProjectReport();
  const baselineExcludedPart = baselineReport.result.parts.find((part) => part.id === cutoutPartId);
  assert.ok(baselineExcludedPart);
  assert.equal(baselineExcludedPart.quantity, 2);

  const changedReport = {
    ...baselineReport,
    result: {
      ...baselineReport.result,
      parts: baselineReport.result.parts.map((part) =>
        part.id === cutoutPartId
          ? { ...part, quantity: part.quantity + 1 }
          : part
      )
    }
  };
  const changedExcludedPart = changedReport.result.parts.find((part) => part.id === cutoutPartId);
  assert.equal(changedExcludedPart?.quantity, baselineExcludedPart.quantity + 1);
  assert.deepEqual(
    changedReport.result.parts.find((part) => part.id === selectedPartId),
    baselineReport.result.parts.find((part) => part.id === selectedPartId)
  );

  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [
    ["v2", jsonV2],
    ["v3", savedPlanV3(jsonV2)]
  ];

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    assert.equal(JSON.parse(restored.json).formatVersion, version === "v2" ? 2 : 3, version);
    assert.equal(validateFreshness(restored.json, baselineReport).status, "fresh", version);

    const stale = validateFreshness(restored.json, changedReport);
    assert.equal(stale.status, "stale", version);
    assert.equal(stale.result, null, version);
    assert.equal(stale.json, null, version);
    assert.deepEqual(stale.sourcePartIds, [selectedPartId], version);
    assert.match(
      stale.diagnostics.join(" "),
      /custom-worktop-panel üretim Part snapshot'ı değişmiş/,
      version
    );

    // Bypass only the known adapter blockers to prove the freshness gate itself
    // blocks the export; this does not claim panelGeometry/edgeBandingByEdge support.
    const staleExport = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson: restored.json,
        productionReport: { ...changedReport, canExport: true, exportBlockers: [] },
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(staleExport.status, "blocked", version);
    assert.equal(staleExport.freshnessStatus, "stale", version);
    assert.equal(staleExport.result, null, version);
    assert.equal(staleExport.json, null, version);
    assert.deepEqual(staleExport.sourcePartIds, [selectedPartId], version);
  }
});


test("DOM-218 excluded Part dimensions, material, thickness and grain invalidate restored JSON v2/v3 freshness and export", () => {
  const baselineReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [
    ["v2", jsonV2],
    ["v3", savedPlanV3(jsonV2)]
  ];
  const scenarios = [
    ["width", cutoutProjectReport({ panelDimensions: { widthMm: 2010 } })],
    ["length", cutoutProjectReport({ panelDimensions: { lengthMm: 620 } })],
    ["material", cutoutProjectReport({
      cutoutMaterial: "Kompakt Tezgâh Revize",
      cutoutMaterialId: "worktop-38-b"
    })],
    ["thickness", cutoutProjectReport({
      panelDimensions: { thicknessMm: 36 },
      cutoutMaterial: "Kompakt 36",
      cutoutMaterialId: "worktop-36"
    })],
    ["grain direction", cutoutProjectReport({ grainDirection: "width" })]
  ];

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    assert.equal(JSON.parse(savedPlanJson).formatVersion, version === "v2" ? 2 : 3, version);
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    for (const [label, changedReport] of scenarios) {
      assert.deepEqual(
        changedReport.result.parts.find((part) => part.id === selectedPartId),
        baselineReport.result.parts.find((part) => part.id === selectedPartId),
        version + " / " + label + " must not change the selected Part"
      );
      assert.notDeepEqual(
        changedReport.result.parts.find((part) => part.id === cutoutPartId),
        baselineReport.result.parts.find((part) => part.id === cutoutPartId),
        version + " / " + label + " must change only the excluded Part metadata"
      );

      const stale = validateFreshness(savedPlanJson, changedReport);
      assertStaleWithoutPartialExport(stale);

      // Bypass only the known panelGeometry/edgeBandingByEdge adapter blockers
      // to verify the real freshness gate. This does not claim adapter support.
      const staleExport = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson,
          productionReport: { ...changedReport, canExport: true, exportBlockers: [] },
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(staleExport.status, "blocked", version + " / " + label);
      assert.equal(staleExport.freshnessStatus, "stale", version + " / " + label);
      assert.equal(staleExport.result, null, version + " / " + label);
      assert.equal(staleExport.json, null, version + " / " + label);
      assert.deepEqual(staleExport.sourcePartIds, [selectedPartId], version + " / " + label);
    }
  }
});

test("DOM-219 JSON v2/v3 freshness rejects edits to excluded Part derived cutout geometry and blocks export", () => {
  const baselineReport = cutoutProjectReport();
  const excludedPart = baselineReport.result.parts.find((part) => part.id === cutoutPartId);
  assert.ok(excludedPart?.panelGeometry);
  assert.equal(excludedPart.panelGeometry.cutoutAreaMm2, 180000);
  assert.equal(excludedPart.panelGeometry.netFaceAreaMm2, 1020000);
  assert.equal(excludedPart.panelGeometry.netVolumeMm3, 38760000);
  assert.equal(excludedPart.panelGeometry.cutoutPerimeterMm, 2400);
  assert.equal(excludedPart.panelGeometry.edgeBanding.cutoutLengthMm, 1200);
  assert.equal(excludedPart.panelGeometry.edgeBanding.cutoutEdgeCount, 4);

  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const derivedGeometryEdits = [
    ["cutout area", (part) => { part.panelGeometry.cutoutAreaMm2 += 1; }],
    ["net face area", (part) => { part.panelGeometry.netFaceAreaMm2 -= 1; }],
    ["net volume", (part) => { part.panelGeometry.netVolumeMm3 -= 1; }],
    ["cutout perimeter", (part) => { part.panelGeometry.cutoutPerimeterMm += 1; }],
    ["inner edge-band length", (part) => { part.panelGeometry.edgeBanding.cutoutLengthMm += 1; }],
    ["inner edge count", (part) => { part.panelGeometry.edgeBanding.cutoutEdgeCount += 1; }]
  ];
  const exportReport = (savedPlanJson) => createFreshProjectSheetCutPlanExport({
    schemaVersion: 1,
    freshness: {
      schemaVersion: 1,
      savedPlanJson,
      productionReport: { ...baselineReport, canExport: true, exportBlockers: [] },
      currentSelectedPartIds: [selectedPartId]
    }
  });

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    assert.equal(JSON.parse(savedPlanJson).formatVersion, version === "v2" ? 2 : 3, version);
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    for (const [change, edit] of derivedGeometryEdits) {
      const editedSnapshot = editSavedCutoutPartSnapshot(savedPlanJson, edit);
      const stale = validateFreshness(editedSnapshot, baselineReport);
      assertStaleWithoutPartialExport(stale);

      const staleExport = exportReport(editedSnapshot);
      assert.equal(staleExport.status, "blocked", version + " / " + change);
      assert.equal(staleExport.freshnessStatus, "stale", version + " / " + change);
      assert.equal(staleExport.result, null, version + " / " + change);
      assert.equal(staleExport.json, null, version + " / " + change);
      assert.deepEqual(staleExport.sourcePartIds, [selectedPartId], version + " / " + change);
    }
  }
});


test("DOM-220 invalid or missing excluded cutout geometry records fail closed through restored JSON v2/v3 freshness and export", () => {
  const baselineReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const savedSnapshotEdits = [
    ["missing panelGeometry", (part) => { delete part.panelGeometry; }],
    ["incomplete panelGeometry", (part) => { part.panelGeometry = { schemaVersion: 1, cutouts: [] }; }]
  ];
  const blockedReports = [
    ["missing geometry object", cutoutProjectReport({ missingGeometryRecord: true, expectBlocked: true })],
    ["missing cutout list", cutoutProjectReport({ geometryOverrides: { cutouts: undefined }, expectBlocked: true })],
    ["malformed opening record", cutoutProjectReport({ cutouts: [null], expectBlocked: true })]
  ];

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    assert.equal(JSON.parse(savedPlanJson).formatVersion, version === "v2" ? 2 : 3, version);
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    for (const [label, edit] of savedSnapshotEdits) {
      const damagedSnapshotJson = editSavedCutoutPartSnapshot(savedPlanJson, edit);
      const stale = validateFreshness(damagedSnapshotJson, baselineReport);
      assertStaleWithoutPartialExport(stale);
      const staleExport = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson: damagedSnapshotJson,
          productionReport: { ...baselineReport, canExport: true, exportBlockers: [] },
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(staleExport.status, "blocked", version + " / " + label);
      assert.equal(staleExport.freshnessStatus, "stale", version + " / " + label);
      assert.equal(staleExport.result, null, version + " / " + label);
      assert.equal(staleExport.json, null, version + " / " + label);
      assert.deepEqual(staleExport.sourcePartIds, [selectedPartId], version + " / " + label);
    }

    for (const [label, blockedReport] of blockedReports) {
      assert.equal(blockedReport.status, "blocked", version + " / " + label);
      assert.equal(blockedReport.canExport, false, version + " / " + label);
      assert.equal(blockedReport.result, null, version + " / " + label);
      assert.ok(blockedReport.blockedFurniture.some((item) =>
        item.furnitureId === "custom-worktop" && item.code === "invalid-panel-geometry"
      ), version + " / " + label);

      const blockedFreshness = validateFreshness(savedPlanJson, blockedReport);
      assert.equal(blockedFreshness.status, "blocked", version + " / " + label);
      assert.equal(blockedFreshness.result, null, version + " / " + label);
      assert.equal(blockedFreshness.json, null, version + " / " + label);
      assert.deepEqual(blockedFreshness.sourcePartIds, [selectedPartId], version + " / " + label);
      assert.ok(blockedFreshness.diagnostics.length > 0, version + " / " + label);

      const blockedExport = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson,
          productionReport: blockedReport,
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(blockedExport.status, "blocked", version + " / " + label);
      assert.equal(blockedExport.freshnessStatus, "blocked", version + " / " + label);
      assert.equal(blockedExport.result, null, version + " / " + label);
      assert.equal(blockedExport.json, null, version + " / " + label);
      assert.ok(blockedExport.productionDiagnostics?.some((item) =>
        item.furnitureId === "custom-worktop" && item.code === "invalid-panel-geometry"
      ), version + " / " + label);
    }
  }
});


test("DOM-221 one invalid geometry among multiple excluded cutout Parts atomically blocks snapshot, nesting, restored freshness and export", () => {
  const secondPanelId = "custom-worktop-second-panel";
  const additionalCutoutPanels = [{
    furnitureId: "custom-worktop-second",
    material: "Kompakt Tezgâh B",
    materialId: "worktop-38-b",
    cutouts: [
      {
        id: "second-sink-opening",
        xMm: 100,
        yMm: 100,
        widthMm: 400,
        lengthMm: 300,
        edgeBanding: { top: true, bottom: false, left: true, right: false }
      },
      {
        id: "second-cooktop-opening",
        xMm: 800,
        yMm: 100,
        widthMm: 300,
        lengthMm: 200,
        edgeBanding: { top: true, bottom: false, left: false, right: true }
      }
    ]
  }];
  const baselineReport = cutoutProjectReport({ additionalCutoutPanels });
  assert.equal(baselineReport.status, "ready", baselineReport.firstError ?? "İki kesitli tezgâh Part'ı da geçerli olmalı.");
  assert.ok(baselineReport.result.parts.some((part) => part.id === cutoutPartId && part.panelGeometry));
  assert.ok(baselineReport.result.parts.some((part) => part.id === secondPanelId && part.panelGeometry));

  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const invalidReports = [
    {
      label: "ilk hariç kesitli Part",
      invalidFurnitureId: "custom-worktop",
      report: cutoutProjectReport({
        geometryOverrides: { cutouts: undefined },
        additionalCutoutPanels,
        expectBlocked: true
      })
    },
    {
      label: "ikinci hariç kesitli Part",
      invalidFurnitureId: "custom-worktop-second",
      report: cutoutProjectReport({
        additionalCutoutPanels: [{
          ...additionalCutoutPanels[0],
          geometryOverrides: { cutouts: undefined }
        }],
        expectBlocked: true
      })
    }
  ];
  const stockSheets = [{
    sheet: {
      materialId: "mdf-18",
      widthMm: 1200,
      lengthMm: 1000,
      thicknessMm: 18,
      grainDirection: "length"
    },
    kerfMm: 3
  }];

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    const savedSnapshot = JSON.parse(savedPlanJson).result.projectPartSnapshot;
    assert.ok(savedSnapshot.parts.some((part) => part.id === cutoutPartId), version);
    assert.ok(savedSnapshot.parts.some((part) => part.id === secondPanelId), version);
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    for (const scenario of invalidReports) {
      const blockedReport = scenario.report;
      assert.equal(blockedReport.status, "blocked", version + " / " + scenario.label);
      assert.equal(blockedReport.result, null, version + " / " + scenario.label);
      assert.equal(blockedReport.canExport, false, version + " / " + scenario.label);
      assert.ok(
        blockedReport.blockedFurniture.some((item) =>
          item.furnitureId === scenario.invalidFurnitureId && item.code === "invalid-panel-geometry"
        ),
        version + " / " + scenario.label
      );
      const otherFurnitureId = scenario.invalidFurnitureId === "custom-worktop"
        ? "custom-worktop-second"
        : "custom-worktop";
      assert.equal(
        blockedReport.blockedFurniture.some((item) => item.furnitureId === otherFurnitureId),
        false,
        version + " / " + scenario.label + " — diğer kesitli Part geçerli kalmalı"
      );

      const batches = createProjectSheetNestingBatches({
        schemaVersion: 1,
        productionReport: blockedReport,
        partIds: [selectedPartId],
        stockSheets
      });
      assert.equal(batches.status, "blocked", version + " / " + scenario.label);
      assert.equal(batches.result, null, version + " / " + scenario.label);
      assert.equal(batches.projectPartSnapshot, undefined, version + " / " + scenario.label);
      assert.ok(
        batches.productionDiagnostics?.some((item) =>
          item.furnitureId === scenario.invalidFurnitureId && item.code === "invalid-panel-geometry"
        ),
        version + " / " + scenario.label
      );

      const cutPlan = createProjectSheetCutPlan({
        schemaVersion: 1,
        batchReport: batches,
        layoutReports: []
      });
      assert.equal(cutPlan.status, "blocked", version + " / " + scenario.label);
      assert.equal(cutPlan.result, null, version + " / " + scenario.label);
      assert.equal(cutPlan.json, null, version + " / " + scenario.label);

      const freshness = validateFreshness(savedPlanJson, blockedReport);
      assert.equal(freshness.status, "blocked", version + " / " + scenario.label);
      assert.equal(freshness.result, null, version + " / " + scenario.label);
      assert.equal(freshness.json, null, version + " / " + scenario.label);
      assert.deepEqual(freshness.sourcePartIds, [selectedPartId], version + " / " + scenario.label);

      const blockedExport = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson,
          productionReport: blockedReport,
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(blockedExport.status, "blocked", version + " / " + scenario.label);
      assert.equal(blockedExport.freshnessStatus, "blocked", version + " / " + scenario.label);
      assert.equal(blockedExport.result, null, version + " / " + scenario.label);
      assert.equal(blockedExport.json, null, version + " / " + scenario.label);
      // Blocked production reports are rejected before freshness, so the export gate intentionally returns no selected IDs.
      assert.ok(
        blockedExport.productionDiagnostics?.some((item) =>
          item.furnitureId === scenario.invalidFurnitureId && item.code === "invalid-panel-geometry"
        ),
        version + " / " + scenario.label
      );
    }
  }
});


test("DOM-222 one malformed saved panelGeometry snapshot among multiple excluded cutout Parts makes JSON v2/v3 freshness and export fail closed", () => {
  const secondPanelId = "custom-worktop-second-panel";
  const additionalCutoutPanels = [{
    furnitureId: "custom-worktop-second",
    material: "Kompakt Tezgâh B",
    materialId: "worktop-38-b",
    cutouts: [
      {
        id: "second-sink-opening",
        xMm: 100,
        yMm: 100,
        widthMm: 400,
        lengthMm: 300,
        edgeBanding: { top: true, bottom: false, left: true, right: false }
      },
      {
        id: "second-cooktop-opening",
        xMm: 800,
        yMm: 100,
        widthMm: 300,
        lengthMm: 200,
        edgeBanding: { top: true, bottom: false, left: false, right: true }
      }
    ]
  }];
  const baselineReport = cutoutProjectReport({ additionalCutoutPanels });
  assert.equal(baselineReport.status, "ready", baselineReport.firstError ?? "İki excluded kesitli Part da geçerli olmalı.");

  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const damagedParts = [
    { label: "ilk excluded Part", partId: cutoutPartId, otherPartId: secondPanelId },
    { label: "ikinci excluded Part", partId: secondPanelId, otherPartId: cutoutPartId }
  ];
  const adapterReadyForFreshnessOnly = {
    ...baselineReport,
    canExport: true,
    exportBlockers: []
  };

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    const baselineSnapshot = JSON.parse(savedPlanJson).result.projectPartSnapshot;
    const baselineIds = baselineSnapshot.parts.map((part) => part.id);
    const baselineSnapshotsById = new Map(baselineSnapshot.parts.map((part) => [part.id, part.snapshot]));

    assert.ok(baselineIds.includes(cutoutPartId), version);
    assert.ok(baselineIds.includes(secondPanelId), version);
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    for (const scenario of damagedParts) {
      const damagedSnapshotJson = editSavedCutoutPartSnapshot(
        savedPlanJson,
        (part) => {
          part.panelGeometry = { schemaVersion: 1, cutouts: [] };
        },
        scenario.partId
      );
      const damagedParsed = parseProjectSheetCutPlanJson(damagedSnapshotJson);
      assert.equal(damagedParsed.status, "ready", version + " / " + scenario.label);
      const damagedRestored = serializeProjectSheetCutPlanJson(damagedParsed);
      assert.equal(damagedRestored.status, "ready", version + " / " + scenario.label);
      assert.ok(damagedRestored.json, version + " / " + scenario.label);

      const damagedPlanJson = damagedRestored.json;
      const damagedSnapshot = JSON.parse(damagedPlanJson).result.projectPartSnapshot;
      assert.deepEqual(damagedSnapshot.parts.map((part) => part.id), baselineIds, version + " / " + scenario.label);
      const damagedPart = damagedSnapshot.parts.find((part) => part.id === scenario.partId);
      const unaffectedPart = damagedSnapshot.parts.find((part) => part.id === scenario.otherPartId);
      assert.ok(damagedPart, version + " / " + scenario.label);
      assert.ok(unaffectedPart, version + " / " + scenario.label);
      assert.deepEqual(JSON.parse(damagedPart.snapshot).panelGeometry, { schemaVersion: 1, cutouts: [] }, version + " / " + scenario.label);
      assert.equal(unaffectedPart.snapshot, baselineSnapshotsById.get(scenario.otherPartId), version + " / " + scenario.label);

      const stale = validateFreshness(damagedPlanJson, baselineReport);
      assert.equal(stale.status, "stale", version + " / " + scenario.label);
      assert.equal(stale.result, null, version + " / " + scenario.label);
      assert.equal(stale.json, null, version + " / " + scenario.label);
      assert.deepEqual(stale.sourcePartIds, [selectedPartId], version + " / " + scenario.label);
      assert.ok(stale.diagnostics.some((message) => message.includes(scenario.partId)), version + " / " + scenario.label);

      const staleExport = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson: damagedPlanJson,
          productionReport: adapterReadyForFreshnessOnly,
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(staleExport.status, "blocked", version + " / " + scenario.label);
      assert.equal(staleExport.freshnessStatus, "stale", version + " / " + scenario.label);
      assert.equal(staleExport.result, null, version + " / " + scenario.label);
      assert.equal(staleExport.json, null, version + " / " + scenario.label);
      assert.deepEqual(staleExport.sourcePartIds, [selectedPartId], version + " / " + scenario.label);
      assert.ok(staleExport.diagnostics.some((message) => message.includes(scenario.partId)), version + " / " + scenario.label);
    }
  }
});


test("DOM-223 JSON v2/v3 restore keeps Part identity and deterministic diagnostics when snapshots are reordered", () => {
  const secondPanelId = "custom-worktop-second-panel";
  const additionalCutoutPanels = [{
    furnitureId: "custom-worktop-second",
    material: "Kompakt Tezgâh B",
    materialId: "worktop-38-b",
    cutouts: [
      {
        id: "second-sink-opening",
        xMm: 100,
        yMm: 100,
        widthMm: 400,
        lengthMm: 300,
        edgeBanding: { top: true, bottom: false, left: true, right: false }
      },
      {
        id: "second-cooktop-opening",
        xMm: 800,
        yMm: 100,
        widthMm: 300,
        lengthMm: 200,
        edgeBanding: { top: true, bottom: false, left: false, right: true }
      }
    ]
  }];
  const baselineReport = cutoutProjectReport({ additionalCutoutPanels });
  assert.equal(baselineReport.status, "ready", baselineReport.firstError ?? "İki excluded kesitli Part da geçerli olmalı.");

  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const damagedPartIds = [cutoutPartId, secondPanelId];
  const adapterReadyForFreshnessOnly = {
    ...baselineReport,
    canExport: true,
    exportBlockers: []
  };

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    const savedPlanJson = restored.json;
    const baselineSnapshot = JSON.parse(savedPlanJson).result.projectPartSnapshot;
    const baselineIds = baselineSnapshot.parts.map((part) => part.id);
    const baselineSnapshotsById = new Map(baselineSnapshot.parts.map((part) => [part.id, part.snapshot]));

    for (const partId of damagedPartIds) {
      assert.ok(baselineIds.includes(partId), version + " / " + partId);
    }
    assert.equal(validateFreshness(savedPlanJson, baselineReport).status, "fresh", version);

    let damagedJson = savedPlanJson;
    for (const partId of damagedPartIds) {
      damagedJson = editSavedCutoutPartSnapshot(
        damagedJson,
        (part) => {
          part.panelGeometry = { schemaVersion: 1, cutouts: [] };
        },
        partId
      );
    }

    const reorderedEnvelope = JSON.parse(damagedJson);
    reorderedEnvelope.result.projectPartSnapshot.parts.reverse();
    const reorderedJson = JSON.stringify(reorderedEnvelope);
    const reorderedParsed = parseProjectSheetCutPlanJson(reorderedJson);
    assert.equal(reorderedParsed.status, "ready", version);
    const reorderedRestored = serializeProjectSheetCutPlanJson(reorderedParsed);
    assert.equal(reorderedRestored.status, "ready", version);
    assert.ok(reorderedRestored.json, version);

    const reorderedSnapshot = JSON.parse(reorderedRestored.json).result.projectPartSnapshot;
    assert.deepEqual(reorderedSnapshot.parts.map((part) => part.id), [...baselineIds].reverse(), version);
    for (const entry of reorderedSnapshot.parts) {
      assert.equal(JSON.parse(entry.snapshot).id, entry.id, version + " / " + entry.id);
    }
    for (const partId of damagedPartIds) {
      const entry = reorderedSnapshot.parts.find((part) => part.id === partId);
      assert.ok(entry, version + " / " + partId);
      assert.deepEqual(
        JSON.parse(entry.snapshot).panelGeometry,
        { schemaVersion: 1, cutouts: [] },
        version + " / " + partId
      );
    }
    const selectedEntry = reorderedSnapshot.parts.find((part) => part.id === selectedPartId);
    assert.ok(selectedEntry, version);
    assert.equal(selectedEntry.snapshot, baselineSnapshotsById.get(selectedPartId), version);

    const expectedDiagnostics = [
      "Proje Part sırası değişmiş.",
      ...baselineIds
        .filter((id) => damagedPartIds.includes(id))
        .map((id) => id + " üretim Part snapshot'ı değişmiş.")
    ];
    const stale = validateFreshness(reorderedRestored.json, baselineReport);
    assert.equal(stale.status, "stale", version);
    assert.equal(stale.result, null, version);
    assert.equal(stale.json, null, version);
    assert.deepEqual(stale.sourcePartIds, [selectedPartId], version);
    assert.deepEqual(stale.diagnostics, expectedDiagnostics, version);

    const staleExport = createFreshProjectSheetCutPlanExport({
      schemaVersion: 1,
      freshness: {
        schemaVersion: 1,
        savedPlanJson: reorderedRestored.json,
        productionReport: adapterReadyForFreshnessOnly,
        currentSelectedPartIds: [selectedPartId]
      }
    });
    assert.equal(staleExport.status, "blocked", version);
    assert.equal(staleExport.freshnessStatus, "stale", version);
    assert.equal(staleExport.result, null, version);
    assert.equal(staleExport.json, null, version);
    assert.deepEqual(staleExport.sourcePartIds, [selectedPartId], version);
    for (const partId of damagedPartIds) {
      assert.ok(staleExport.diagnostics.some((message) => message.includes(partId)), version + " / " + partId);
    }

    if (version === "v3") {
      assert.deepEqual(
        JSON.parse(reorderedRestored.json).result.groups[0].stockSheetSource,
        { sourceId: "stock-sheet-source-01", revision: "rev-2026-11" }
      );
    }
  }
});


test("DOM-224 JSON v2/v3 restore rejects duplicate and mismatched nested Part identities before freshness/export", () => {
  const baselineReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const adapterReadyForFreshnessOnly = {
    ...baselineReport,
    canExport: true,
    exportBlockers: []
  };

  for (const [version, sourceJson] of plans) {
    const parsedBaseline = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsedBaseline.status, "ready", version);
    const restoredBaseline = serializeProjectSheetCutPlanJson(parsedBaseline);
    assert.equal(restoredBaseline.status, "ready", version);
    assert.ok(restoredBaseline.json, version);
    assert.equal(validateFreshness(restoredBaseline.json, baselineReport).status, "fresh", version);

    const baselineParts = JSON.parse(restoredBaseline.json).result.projectPartSnapshot.parts;
    assert.ok(baselineParts.some((entry) => entry.id === selectedPartId), version);
    assert.ok(baselineParts.some((entry) => entry.id === cutoutPartId), version);

    const scenarios = [
      {
        label: "duplicate nested Part snapshot identity",
        diagnostic: /yinelenen kimlik/,
        edit(envelope) {
          const parts = envelope.result.projectPartSnapshot.parts;
          assert.ok(parts.length > 1, version);
          parts[1].id = parts[0].id;
        }
      },
      {
        label: "mismatched nested Part JSON identity",
        diagnostic: /kimlikle eşleşmiyor/,
        edit(envelope) {
          const entry = envelope.result.projectPartSnapshot.parts.find((part) => part.id === cutoutPartId);
          assert.ok(entry, version);
          const nestedPart = JSON.parse(entry.snapshot);
          nestedPart.id = "identity-mismatch";
          entry.snapshot = canonicalJsonForTest(nestedPart);
        }
      }
    ];

    for (const scenario of scenarios) {
      const tamperedEnvelope = JSON.parse(restoredBaseline.json);
      scenario.edit(tamperedEnvelope);
      const tamperedJson = JSON.stringify(tamperedEnvelope);

      const parsed = parseProjectSheetCutPlanJson(tamperedJson);
      assert.equal(parsed.status, "blocked", version + " / " + scenario.label);
      assert.equal(parsed.result, null, version + " / " + scenario.label);
      assert.match(parsed.diagnostics.join(" "), scenario.diagnostic);

      const serialized = serializeProjectSheetCutPlanJson(parsed);
      assert.equal(serialized.status, "blocked", version + " / " + scenario.label);
      assert.equal(serialized.json, null, version + " / " + scenario.label);
      assert.match(serialized.diagnostics.join(" "), scenario.diagnostic);

      const freshness = validateFreshness(tamperedJson, baselineReport);
      assert.equal(freshness.status, "blocked", version + " / " + scenario.label);
      assert.equal(freshness.result, null, version + " / " + scenario.label);
      assert.equal(freshness.json, null, version + " / " + scenario.label);
      assert.deepEqual(freshness.sourcePartIds, [], version + " / " + scenario.label);
      assert.match(freshness.diagnostics.join(" "), scenario.diagnostic);

      const exported = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson: tamperedJson,
          productionReport: adapterReadyForFreshnessOnly,
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(exported.status, "blocked", version + " / " + scenario.label);
      assert.equal(exported.freshnessStatus, "blocked", version + " / " + scenario.label);
      assert.equal(exported.result, null, version + " / " + scenario.label);
      assert.equal(exported.json, null, version + " / " + scenario.label);
      assert.deepEqual(exported.sourcePartIds, [], version + " / " + scenario.label);
      assert.match(exported.diagnostics.join(" "), scenario.diagnostic);
    }
  }
});


test("DOM-225 JSON v2/v3 restored freshness/export blocks duplicate stable IDs in the current production Part list", () => {
  const baselineReport = cutoutProjectReport();
  const jsonV2 = savedPlanV2(baselineReport);
  const plans = [["v2", jsonV2], ["v3", savedPlanV3(jsonV2)]];
  const adapterReadyForFreshnessOnly = {
    ...baselineReport,
    canExport: true,
    exportBlockers: []
  };

  for (const [version, sourceJson] of plans) {
    const parsed = parseProjectSheetCutPlanJson(sourceJson);
    assert.equal(parsed.status, "ready", version);
    const restored = serializeProjectSheetCutPlanJson(parsed);
    assert.equal(restored.status, "ready", version);
    assert.ok(restored.json, version);
    assert.equal(validateFreshness(restored.json, baselineReport).status, "fresh", version);

    for (const duplicatePartId of [selectedPartId, cutoutPartId]) {
      const duplicateCurrentReport = structuredClone(adapterReadyForFreshnessOnly);
      const originalPart = duplicateCurrentReport.result.parts.find((part) => part.id === duplicatePartId);
      assert.ok(originalPart, version + " / " + duplicatePartId);
      duplicateCurrentReport.result.parts.push(structuredClone(originalPart));
      assert.equal(duplicateCurrentReport.status, "ready", version + " / " + duplicatePartId);
      assert.equal(duplicateCurrentReport.canExport, true, version + " / " + duplicatePartId);

      const freshness = validateFreshness(restored.json, duplicateCurrentReport);
      assert.equal(freshness.status, "blocked", version + " / " + duplicatePartId);
      assert.equal(freshness.result, null, version + " / " + duplicatePartId);
      assert.equal(freshness.json, null, version + " / " + duplicatePartId);
      assert.deepEqual(freshness.sourcePartIds, [selectedPartId], version + " / " + duplicatePartId);
      assert.match(freshness.diagnostics.join(" "), /yinelenen kimlik/, version + " / " + duplicatePartId);
      assert.ok(freshness.diagnostics.join(" ").includes(duplicatePartId), version + " / " + duplicatePartId);

      const exported = createFreshProjectSheetCutPlanExport({
        schemaVersion: 1,
        freshness: {
          schemaVersion: 1,
          savedPlanJson: restored.json,
          productionReport: duplicateCurrentReport,
          currentSelectedPartIds: [selectedPartId]
        }
      });
      assert.equal(exported.status, "blocked", version + " / " + duplicatePartId);
      assert.equal(exported.freshnessStatus, "blocked", version + " / " + duplicatePartId);
      assert.equal(exported.result, null, version + " / " + duplicatePartId);
      assert.equal(exported.json, null, version + " / " + duplicatePartId);
      assert.deepEqual(exported.sourcePartIds, [selectedPartId], version + " / " + duplicatePartId);
      assert.match(exported.diagnostics.join(" "), /yinelenen kimlik/, version + " / " + duplicatePartId);
      assert.ok(exported.diagnostics.join(" ").includes(duplicatePartId), version + " / " + duplicatePartId);
    }
  }
});
