import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-flex", name: "MDF Flex 8/10/18", category: "panel", thicknessesMm: [8, 10, 18], unit: "mm" },
  { id: "plywood-flex", name: "Kontrplak Flex 8/10/18", category: "panel", thicknessesMm: [8, 10, 18], unit: "mm" }
];

function createEdgeBandingByGroup() {
  return Object.fromEntries(BODY_PANEL_GROUPS.map(group => [group, { ...noBanding }]));
}

function createWardrobeRequest() {
  return {
    schemaVersion: 1,
    family: "wardrobe",
    furniture: {
      id: "wardrobe-1",
      widthMm: 1800,
      heightMm: 2200,
      depthMm: 600,
      material: "MDF Flex 8/10/18",
      materialId: "mdf-flex"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: createEdgeBandingByGroup()
    },
    materials,
    verticalDividers: [{
      id: "center",
      offsetFromInnerLeftMm: 500,
      thicknessMm: 18,
      materialId: "mdf-flex",
      edgeBanding: { ...noBanding, left: true, right: true },
      grainDirection: "length"
    }],
    shelves: [{
      id: "lower",
      leftOffsetMm: 0,
      rightOffsetMm: 500,
      heightFromInnerBottomMm: 500,
      frontOffsetMm: 0,
      depthMm: 582,
      thicknessMm: 18,
      materialId: "mdf-flex",
      edgeBanding: { ...noBanding, top: true },
      grainDirection: "length"
    }]
  };
}

function createTvUnitRequest() {
  return {
    schemaVersion: 1,
    family: "tv-unit",
    mounting: "floor-standing",
    furniture: {
      id: "tv-1",
      widthMm: 1800,
      heightMm: 420,
      depthMm: 450,
      material: "MDF Flex 8/10/18",
      materialId: "mdf-flex"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: createEdgeBandingByGroup()
    },
    materials,
    verticalDividers: [{
      id: "center",
      leftOffsetMm: 500,
      bottomOffsetMm: 0,
      heightMm: 384,
      frontOffsetMm: 0,
      depthMm: 432,
      thicknessMm: 18,
      materialId: "mdf-flex",
      edgeBanding: { ...noBanding, left: true, right: true },
      grainDirection: "length"
    }],
    shelves: [{
      id: "middle",
      leftOffsetMm: 0,
      rightOffsetMm: 500,
      heightFromInnerBottomMm: 100,
      frontOffsetMm: 0,
      depthMm: 420,
      thicknessMm: 8,
      materialId: "mdf-flex",
      edgeBanding: { ...noBanding, top: true, left: true },
      grainDirection: "length"
    }]
  };
}

function createProductionReport(change) {
  const wardrobe = createWardrobeRequest();
  const tv = createTvUnitRequest();
  if (change) change({ wardrobe, tv });

  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [wardrobe, tv]
  });
  assert.equal(report.status, "ready", JSON.stringify({
    firstError: report.firstError,
    blockedFurniture: report.blockedFurniture,
    unsupportedFurniture: report.unsupportedFurniture,
    projectErrors: report.projectErrors
  }));
  assert.ok(report.result);

  for (const id of [
    "wardrobe-1-shelf-lower",
    "wardrobe-1-vertical-divider-center",
    "tv-1-shelf-middle",
    "tv-1-vertical-divider-center"
  ]) {
    assert.ok(report.result.parts.some(part => part.id === id), id + " gerçek üretim Part listesinde bulunmalıdır.");
  }
  return report;
}

function buildSavedPlan(report, selectedPartIds) {
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: report,
    partIds: selectedPartIds,
    stockSheets: [
      {
        sheet: {
          materialId: "mdf-flex",
          widthMm: 1200,
          lengthMm: 1000,
          thicknessMm: 18,
          grainDirection: "length"
        },
        kerfMm: 3
      },
      {
        sheet: {
          materialId: "mdf-flex",
          widthMm: 1200,
          lengthMm: 1000,
          thicknessMm: 8,
          grainDirection: "length"
        },
        kerfMm: 3
      }
    ]
  });
  assert.equal(batches.status, "ready", batches.diagnostics.join(" "));
  assert.ok(batches.result);
  assert.deepEqual(batches.sourcePartIds, selectedPartIds);
  assert.ok(batches.excludedPartIds.includes("wardrobe-1-vertical-divider-center"));
  assert.ok(batches.excludedPartIds.includes("tv-1-vertical-divider-center"));

  const layoutReports = batches.result.batches.map(group => {
    const layoutReport = calculateSheetNestingLayout(group.batch);
    assert.equal(layoutReport.status, "ready", layoutReport.diagnostics.join(" "));
    return {
      groupId: JSON.stringify([group.materialId, Math.round(group.thicknessMm * 10)]),
      layoutReport
    };
  });
  const plan = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport: batches,
    layoutReports
  });
  assert.equal(plan.status, "ready", plan.diagnostics.join(" "));
  assert.ok(plan.json);
  return plan.json;
}

function checkFreshness(savedPlanJson, productionReport, selectedPartIds) {
  return validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson,
    productionReport,
    currentSelectedPartIds: selectedPartIds
  });
}

test("gardırop ve TV özel raf/bölücü değişiklikleri tam proje snapshot freshness kontrolünü stale yapar", () => {
  const selectedPartIds = ["wardrobe-1-shelf-lower", "tv-1-shelf-middle"];
  const savedReport = createProductionReport();
  const savedPlanJson = buildSavedPlan(savedReport, selectedPartIds);

  const fresh = checkFreshness(savedPlanJson, savedReport, selectedPartIds);
  assert.equal(fresh.status, "fresh", fresh.diagnostics.join(" "));
  assert.equal(fresh.json, savedPlanJson);
  assert.deepEqual(fresh.sourcePartIds, selectedPartIds);

  const changes = [
    {
      label: "gardırop özel raf materialId",
      partId: "wardrobe-1-shelf-lower",
      apply: ({ wardrobe }) => { wardrobe.shelves[0].materialId = "plywood-flex"; }
    },
    {
      label: "gardırop özel raf kalınlığı",
      partId: "wardrobe-1-shelf-lower",
      apply: ({ wardrobe }) => { wardrobe.shelves[0].thicknessMm = 10; }
    },
    {
      label: "gardırop özel raf yerleşimi",
      partId: "wardrobe-1-shelf-lower",
      apply: ({ wardrobe }) => { wardrobe.shelves[0].heightFromInnerBottomMm = 520; }
    },
    {
      label: "gardırop dikey bölücü materialId",
      partId: "wardrobe-1-vertical-divider-center",
      apply: ({ wardrobe }) => { wardrobe.verticalDividers[0].materialId = "plywood-flex"; }
    },
    {
      label: "gardırop dikey bölücü kalınlığı",
      partId: "wardrobe-1-vertical-divider-center",
      apply: ({ wardrobe }) => { wardrobe.verticalDividers[0].thicknessMm = 10; }
    },
    {
      label: "gardırop dikey bölücü yerleşimi",
      partId: "wardrobe-1-vertical-divider-center",
      apply: ({ wardrobe }) => { wardrobe.verticalDividers[0].offsetFromInnerLeftMm = 520; }
    },
    {
      label: "TV özel raf materialId",
      partId: "tv-1-shelf-middle",
      apply: ({ tv }) => { tv.shelves[0].materialId = "plywood-flex"; }
    },
    {
      label: "TV özel raf kalınlığı",
      partId: "tv-1-shelf-middle",
      apply: ({ tv }) => { tv.shelves[0].thicknessMm = 10; }
    },
    {
      label: "TV özel raf yerleşimi",
      partId: "tv-1-shelf-middle",
      apply: ({ tv }) => { tv.shelves[0].heightFromInnerBottomMm = 120; }
    },
    {
      label: "TV dikey bölücü materialId",
      partId: "tv-1-vertical-divider-center",
      apply: ({ tv }) => { tv.verticalDividers[0].materialId = "plywood-flex"; }
    },
    {
      label: "TV dikey bölücü kalınlığı",
      partId: "tv-1-vertical-divider-center",
      apply: ({ tv }) => { tv.verticalDividers[0].thicknessMm = 10; }
    },
    {
      label: "TV dikey bölücü yerleşimi",
      partId: "tv-1-vertical-divider-center",
      apply: ({ tv }) => { tv.verticalDividers[0].leftOffsetMm = 520; }
    }
  ];

  for (const change of changes) {
    const changedReport = createProductionReport(change.apply);
    const stale = checkFreshness(savedPlanJson, changedReport, selectedPartIds);
    assert.equal(stale.status, "stale", change.label + ": " + stale.diagnostics.join(" "));
    assert.equal(stale.result, null, change.label + " için kısmi plan dönmemelidir.");
    assert.equal(stale.json, null, change.label + " için kısmi JSON dönmemelidir.");
    assert.ok(
      stale.diagnostics.some(message => message.includes(change.partId + " üretim Part snapshot'ı değişmiş")),
      change.label + " değişikliği kaynak Part tanısında görünmelidir."
    );
  }
});
