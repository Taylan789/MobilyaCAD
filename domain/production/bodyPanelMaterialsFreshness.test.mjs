import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { BOOKSHELF_PANEL_GROUPS } from "./bookshelfConstruction.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "plywood-8", name: "Kontrplak 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "mdf-flex", name: "MDF Lam 8/10", category: "panel", thicknessesMm: [8, 10], unit: "mm" }
];
const noBanding = { top: false, bottom: false, left: false, right: false };
const families = [
  { id: "cabinet-freshness", family: "cabinet", shelfCount: 2 },
  { id: "bookshelf-freshness", family: "bookshelf", shelfCount: 2 },
  { id: "wardrobe-freshness", family: "wardrobe", shelfCount: 2 },
  { id: "tv-unit-freshness", family: "tv-unit", shelfCount: 2 },
  { id: "vanity-freshness", family: "bathroom-vanity", shelfCount: 0 }
];

function createFamilyRequest(item, materialId, thicknessMm) {
  const groups = item.family === "bookshelf" ? BOOKSHELF_PANEL_GROUPS : BODY_PANEL_GROUPS;
  const request = {
    schemaVersion: 1,
    family: item.family,
    furniture: {
      id: item.id, widthMm: 800, heightMm: 720, depthMm: 560,
      material: "MDF Lam 18", materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      panelThicknessMmByGroup: { top: thicknessMm },
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: item.shelfCount,
      ...(item.family === "bookshelf" ? {} : { doors: { enabled: false, count: 0 } }),
      edgeBandingByGroup: Object.fromEntries(groups.map(group => [group, { ...noBanding }]))
    },
    materials,
    panelMaterialOverrides: { top: materialId }
  };
  if (item.family === "wardrobe") request.verticalDividers = [];
  if (item.family === "tv-unit") request.mounting = "floor-standing";
  return request;
}

function createReport(materialId, thicknessMm) {
  const templateReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createFamilyRequest(
      { id: "vanity-geometry-template", family: "cabinet", shelfCount: 0 },
      materialId,
      thicknessMm
    )]
  });
  assert.equal(templateReport.status, "ready", JSON.stringify(templateReport.blockedFurniture));
  const templateTop = templateReport.result.parts.find(part => part.id === "vanity-geometry-template-top");
  assert.ok(templateTop);

  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: families.map(item => createFamilyRequest(item, materialId, thicknessMm)),
    panelCutouts: [{
      partId: "vanity-freshness-top",
      geometry: {
        schemaVersion: 1,
        widthMm: templateTop.width,
        lengthMm: templateTop.length,
        thicknessMm: templateTop.thickness,
        outerEdgeBanding: templateTop.edgeBanding,
        cutouts: [{
          id: "basin-opening",
          xMm: 100,
          yMm: 100,
          widthMm: 200,
          lengthMm: 150,
          edgeBanding: { ...noBanding }
        }]
      }
    }]
  });
  assert.equal(report.status, "ready", JSON.stringify({
    blockedFurniture: report.blockedFurniture,
    unsupportedFurniture: report.unsupportedFurniture,
    projectErrors: report.projectErrors
  }));
  assert.ok(report.result);
  return report;
}

function selectedTopPartIds(report) {
  const allTopParts = report.result.parts.filter(part => part.id.endsWith("-top"));
  assert.equal(allTopParts.length, families.length, "beş ailenin üst paneli bulunmalı");
  const vanityTop = allTopParts.find(part => part.id === "vanity-freshness-top");
  assert.ok(vanityTop?.panelGeometry, "banyo dolabı açıklıklı üst paneli tam snapshot'ta kalmalı");
  const rectangularTopParts = allTopParts.filter(part => part.panelGeometry === undefined);
  assert.equal(rectangularTopParts.length, families.length - 1);
  return rectangularTopParts.map(part => part.id);
}

function buildSavedPlan(report, selectedPartIds, materialId, thicknessMm) {
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: report,
    partIds: selectedPartIds,
    stockSheets: [{
      sheet: {
        materialId,
        widthMm: 5000,
        lengthMm: 5000,
        thicknessMm,
        grainDirection: "none"
      },
      kerfMm: 0,
      grainDirectionsByPartId: Object.fromEntries(selectedPartIds.map(id => [id, "none"]))
    }]
  });
  assert.equal(batches.status, "ready", batches.diagnostics.join(" "));
  assert.ok(batches.result);
  const layoutReports = batches.result.batches.map(group => {
    const layoutReport = calculateSheetNestingLayout(group.batch);
    assert.equal(layoutReport.status, "ready", layoutReport.diagnostics.join(" "));
    return {
      groupId: JSON.stringify([group.materialId, Math.round(group.thicknessMm * 10)]),
      layoutReport
    };
  });
  const plan = createProjectSheetCutPlan({ schemaVersion: 1, batchReport: batches, layoutReports });
  assert.equal(plan.status, "ready", plan.diagnostics.join(" "));
  assert.ok(plan.json);
  return plan.json;
}

function checkFreshness(savedPlanJson, report, selectedPartIds) {
  return validateProjectSheetCutPlanFreshness({
    schemaVersion: 1,
    savedPlanJson,
    productionReport: report,
    currentSelectedPartIds: selectedPartIds
  });
}

function assertStaleWithoutPartialExport(result) {
  assert.equal(result.status, "stale");
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.diagnostics.some(message => /-top üretim Part snapshot'ı değişmiş/.test(message)));
}

test("beş ailede gövde panel materialId değişimi kayıtlı kesim planını stale yapar", () => {
  const savedReport = createReport("mdf-8", 8);
  const selectedPartIds = selectedTopPartIds(savedReport);
  const savedPlanJson = buildSavedPlan(savedReport, selectedPartIds, "mdf-8", 8);
  assert.equal(checkFreshness(savedPlanJson, savedReport, selectedPartIds).status, "fresh");

  const changedReport = createReport("plywood-8", 8);
  assertStaleWithoutPartialExport(checkFreshness(savedPlanJson, changedReport, selectedPartIds));
});

test("beş ailede gövde panel kalınlık değişimi kayıtlı kesim planını stale yapar", () => {
  const savedReport = createReport("mdf-flex", 8);
  const selectedPartIds = selectedTopPartIds(savedReport);
  const savedPlanJson = buildSavedPlan(savedReport, selectedPartIds, "mdf-flex", 8);
  assert.equal(checkFreshness(savedPlanJson, savedReport, selectedPartIds).status, "fresh");

  const changedReport = createReport("mdf-flex", 10);
  assertStaleWithoutPartialExport(checkFreshness(savedPlanJson, changedReport, selectedPartIds));
});
