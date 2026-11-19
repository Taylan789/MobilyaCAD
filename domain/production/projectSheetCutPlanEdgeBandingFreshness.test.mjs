import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { validateProjectSheetCutPlanFreshness } from "./projectSheetCutPlanFreshness.ts";
import { createFreshProjectSheetCutPlanExport } from "./projectSheetCutPlanExport.ts";
import { serializeProjectSheetCutPlanJson } from "./projectSheetCutPlanFile.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function cabinetRequest(id) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  edgeBandingByGroup.leftSide = { ...noBanding, top: true, right: true };

  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "MDF"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials: [{
      id: "mdf-18",
      name: "MDF",
      category: "panel",
      thicknessesMm: [18],
      unit: "mm"
    }]
  };
}

function assignedProductionReport(furnitureId, edgeBandingId, unit) {
  const assignments = edgeBandingId === null
    ? []
    : [{
        partId: furnitureId + "-left-side",
        edgeBandingId,
        unit
      }];
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [cabinetRequest(furnitureId)],
    edgeBandingAssignments: assignments
  });
  assert.equal(report.status, "ready", report.firstError ?? "");
  assert.ok(report.result);
  return report;
}

function createSavedV3Plan(productionReport) {
  const partId = productionReport.result.parts.find((part) => part.id.endsWith("-left-side"))?.id;
  assert.ok(partId);
  const selectedPartIds = [partId];
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport,
    partIds: selectedPartIds,
    stockSheets: [{
      sheet: {
        materialId: "mdf-18",
        widthMm: 2000,
        lengthMm: 2000,
        thicknessMm: 18,
        grainDirection: "length"
      },
      kerfMm: 3,
      grainDirectionsByPartId: { [partId]: "length" }
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

  const envelope = JSON.parse(plan.json);
  assert.equal(envelope.formatVersion, 2);
  envelope.formatVersion = 3;
  envelope.result.groups[0].stockSheetSource = {
    sourceId: "workshop-stock-sheet-18",
    revision: "rev-2026-11-19-a"
  };
  const serialized = serializeProjectSheetCutPlanJson({
    schemaVersion: 1,
    status: plan.status,
    result: envelope.result,
    diagnostics: plan.diagnostics
  });
  assert.equal(serialized.status, "ready", serialized.diagnostics.join(" "));
  assert.ok(serialized.json);
  return { json: serialized.json, selectedPartIds };
}

function freshnessRequest(saved, report) {
  return {
    schemaVersion: 1,
    savedPlanJson: saved.json,
    productionReport: report,
    currentSelectedPartIds: saved.selectedPartIds
  };
}

function assertStale(result, partId) {
  assert.equal(result.status, "stale");
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.sourcePartIds.includes(partId));
  assert.match(result.diagnostics.join(" "), new RegExp(partId));
}

test("edge-band catalogue ID and unit changes stale the saved v3 plan without losing its provenance", () => {
  const furnitureId = "edge-band-freshness-cabinet";
  const original = assignedProductionReport(furnitureId, "pvc-white-1", "m");
  const partId = furnitureId + "-left-side";
  const assignedPart = original.result.parts.find((part) => part.id === partId);
  assert.ok(assignedPart);
  assert.equal(assignedPart.edgeBandingMaterialId, "pvc-white-1");
  assert.equal(assignedPart.edgeBandingUnit, "m");
  assert.equal(original.canExport, false);
  assert.ok(original.exportBlockers.some((message) => /edgeBandingMaterialId.*edgeBandingUnit/.test(message)));

  const saved = createSavedV3Plan(original);
  const originalJson = saved.json;
  const stockSheetSource = {
    sourceId: "workshop-stock-sheet-18",
    revision: "rev-2026-11-19-a"
  };
  const fresh = validateProjectSheetCutPlanFreshness(freshnessRequest(saved, original));
  assert.equal(fresh.status, "fresh");
  assert.equal(fresh.json, originalJson);
  assert.deepEqual(fresh.result?.groups[0]?.stockSheetSource, stockSheetSource);

  const changedCatalogueId = assignedProductionReport(furnitureId, "pvc-white-2", "m");
  assertStale(
    validateProjectSheetCutPlanFreshness(freshnessRequest(saved, changedCatalogueId)),
    partId
  );
  const changedUnit = assignedProductionReport(furnitureId, "pvc-white-1", "mm");
  assertStale(validateProjectSheetCutPlanFreshness(freshnessRequest(saved, changedUnit)), partId);
  const removedAssignment = assignedProductionReport(furnitureId, null, undefined);
  assertStale(validateProjectSheetCutPlanFreshness(freshnessRequest(saved, removedAssignment)), partId);

  assert.equal(saved.json, originalJson);
  assert.deepEqual(JSON.parse(saved.json).result.groups[0].stockSheetSource, stockSheetSource);
});

test("assigned edge-band plans remain blocked at the JSON export gate with source diagnostics", () => {
  const furnitureId = "edge-band-export-cabinet";
  const original = assignedProductionReport(furnitureId, "pvc-white-1", "m");
  const saved = createSavedV3Plan(original);
  const changed = assignedProductionReport(furnitureId, "pvc-white-2", "m");
  const result = createFreshProjectSheetCutPlanExport({
    schemaVersion: 1,
    freshness: freshnessRequest(saved, changed)
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.freshnessStatus, "blocked");
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.some((message) => /edgeBandingMaterialId.*edgeBandingUnit/.test(message)));
  assert.ok(result.productionDiagnostics?.some((diagnostic) =>
    diagnostic.source === "exportBlockers" && /edgeBandingMaterialId.*edgeBandingUnit/.test(diagnostic.message)
  ));
});
