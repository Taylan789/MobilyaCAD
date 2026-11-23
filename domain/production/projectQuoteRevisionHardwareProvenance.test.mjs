import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  createProjectQuoteRevision,
  validateProjectQuoteRevisionHistory
} from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "./projectQuoteRevisionProjectFile.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const edgeBandingByGroup = Object.fromEntries(
  BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
);
const productionReport = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: [{
    schemaVersion: 1,
    furniture: {
      id: "revision-cabinet-1",
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "MDF Lam 18",
      materialId: "mdf-18",
      family: "cabinet"
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
      name: "MDF Lam 18",
      category: "panel",
      thicknessesMm: [18],
      unit: "mm"
    }]
  }]
});
assert.ok(productionReport.result);
productionReport.result.hardwareItems = [{
  id: "bom-hinge-a",
  furnitureId: "revision-cabinet-1",
  hardwareId: "hinge-110",
  name: "Menteşe",
  quantity: 1,
  unit: "adet",
  sourceReference: "bom:catalog-a"
}, {
  id: "bom-hinge-z",
  furnitureId: "revision-cabinet-1",
  hardwareId: "hinge-110",
  name: "Menteşe",
  quantity: 2,
  unit: "adet",
  sourceReference: "bom:catalog-z"
}];

const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-23",
  productionReport,
  consumptionPriceTable: [{
    resourceType: "material",
    resourceId: "mdf-18",
    unit: "m2",
    unitPriceMinor: 1250,
    currencyCode: "TRY",
    sourceReference: "material-price:v1"
  }, {
    resourceType: "hardware",
    resourceId: "hinge-110",
    unit: "adet",
    unitPriceMinor: 700,
    currencyCode: "TRY",
    sourceReference: "hardware-price:v1"
  }],
  workItems: [],
  tariffTable: [],
  consumptionPriceList: {
    catalogId: "workshop-materials",
    version: "materials-2026-11",
    effectiveFrom: "2026-11-01",
    effectiveTo: "2026-11-30"
  },
  laborOperationTariffList: null
});
assert.equal(snapshotResult.status, "ready");
assert.ok(snapshotResult.snapshot);

const projectId = "dom-126-hardware-project";
const revisionId = "dom-126-hardware-revision";
const createdAt = "2026-11-23T07:30:00Z";
const snapshot = structuredClone(snapshotResult.snapshot);

function createRevision(pricingSnapshot = snapshot) {
  return createProjectQuoteRevision({
    projectId,
    revisionId,
    revisionNumber: 1,
    createdAt,
    previousRevision: null,
    sourceIntegrityVersion: 1,
    pricingSnapshot
  });
}

function createProjectV2() {
  return {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: []
  };
}

test("DOM-126a hardware BOM provenance survives validated quote revision, standalone and project-v2 history round-trips", () => {
  const hardwareSource = snapshot.quoteSummary.lineSources.find(source => source.hardwareId === "hinge-110");
  assert.ok(hardwareSource);
  assert.deepEqual({
    hardwareId: hardwareSource.hardwareId,
    hardwareUnit: hardwareSource.hardwareUnit,
    hardwareFurnitureIds: hardwareSource.hardwareFurnitureIds,
    hardwareSourceReferences: hardwareSource.hardwareSourceReferences
  }, {
    hardwareId: "hinge-110",
    hardwareUnit: "adet",
    hardwareFurnitureIds: ["revision-cabinet-1"],
    hardwareSourceReferences: ["bom:catalog-a", "bom:catalog-z"]
  });
  assert.equal(hardwareSource.sourcePartIds, undefined);

  const hardwareLine = snapshot.quoteSummary.costSummary?.lines.find(line => line.category === "hardware");
  assert.ok(hardwareLine);
  assert.equal(hardwareLine.quantity, 3);
  assert.equal(hardwareLine.unit, "adet");
  assert.equal(hardwareLine.unitPriceMinor, 700);
  assert.equal(hardwareLine.lineTotalMinor, 2100);
  assert.equal(hardwareLine.sourceReference, "hardware-price:v1");

  const revisionResult = createRevision();
  assert.equal(revisionResult.status, "ready", revisionResult.diagnostics.join("; "));
  assert.ok(revisionResult.revision);
  assert.deepEqual(revisionResult.revision.pricingSnapshot.quoteSummary.lineSources.find(source => source.hardwareId === "hinge-110"), hardwareSource);

  const validatedHistory = validateProjectQuoteRevisionHistory({
    projectId,
    revisions: [revisionResult.revision]
  });
  assert.equal(validatedHistory.status, "ready", validatedHistory.diagnostics.join("; "));
  assert.ok(validatedHistory.history);

  const standalone = serializeProjectQuoteRevisionHistoryFile(validatedHistory.history);
  assert.equal(standalone.status, "ready", standalone.diagnostics.join("; "));
  assert.ok(standalone.json);
  const importedStandalone = parseProjectQuoteRevisionHistoryFile(standalone.json);
  assert.equal(importedStandalone.status, "ready", importedStandalone.diagnostics.join("; "));
  assert.ok(importedStandalone.history);
  assert.deepEqual(importedStandalone.history, validatedHistory.history);

  const project = createProjectV2();
  const originalProject = structuredClone(project);
  const embeddedAppend = appendProjectQuoteRevisionToProjectFile(project, {
    revisionId,
    createdAt,
    pricingSnapshot: snapshot
  });
  assert.equal(embeddedAppend.status, "ready", embeddedAppend.diagnostics.join("; "));
  assert.ok(embeddedAppend.project);
  const embeddedRead = readProjectQuoteRevisionHistoryFromProjectFile(embeddedAppend.project);
  assert.equal(embeddedRead.status, "ready", embeddedRead.diagnostics.join("; "));
  assert.ok(embeddedRead.history);
  assert.deepEqual(embeddedRead.history, importedStandalone.history);
  assert.deepEqual(project, originalProject);
});

test("DOM-126a revision snapshots reject partial or misplaced hardware BOM metadata", () => {
  const partial = structuredClone(snapshot);
  const partialSource = partial.quoteSummary.lineSources.find(source => source.hardwareId === "hinge-110");
  assert.ok(partialSource);
  delete partialSource.hardwareUnit;
  const partialResult = createRevision(partial);
  assert.equal(partialResult.status, "blocked");
  assert.match(partialResult.diagnostics[0], /Donanım BOM metadata kimlik, birim ve mobilya kimliklerini birlikte/);

  const misplaced = structuredClone(snapshot);
  const materialSource = misplaced.quoteSummary.lineSources.find(source => source.resourceType === "material");
  assert.ok(materialSource);
  Object.assign(materialSource, {
    hardwareId: "hinge-110",
    hardwareUnit: "adet",
    hardwareFurnitureIds: ["revision-cabinet-1"]
  });
  const misplacedResult = createRevision(misplaced);
  assert.equal(misplacedResult.status, "blocked");
  assert.match(misplacedResult.diagnostics[0], /yalnızca production-consumption hardware/);
});
