import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  PROJECT_QUOTE_REVISION_HISTORY_FIELD,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "./projectQuoteRevisionProjectFile.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const edgeBandingByGroup = Object.fromEntries(
  BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
);
edgeBandingByGroup.leftSide = { ...noBanding, top: true, right: true };

const productionReport = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: [{
    schemaVersion: 1,
    furniture: {
      id: "cab-cost-1",
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
    materials: [
      { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" }
    ]
  }],
  edgeBandingAssignments: [
    { partId: "cab-cost-1-left-side", edge: "top", edgeBandingId: "pvc-directional", unit: "m" },
    { partId: "cab-cost-1-left-side", edge: "right", edgeBandingId: "pvc-directional", unit: "mm" }
  ]
});

assert.equal(productionReport.status, "ready");
assert.ok(productionReport.result);

const edgeSummaries = calculateProjectEdgeBandingConsumptionSummary(productionReport.result);
const topSummary = edgeSummaries.find((summary) => summary.edge === "top");
const rightSummary = edgeSummaries.find((summary) => summary.edge === "right");
assert.ok(topSummary);
assert.ok(rightSummary);

const priceTable = [
  {
    resourceType: "material",
    resourceId: "mdf-18",
    unit: "m2",
    unitPriceMinor: 1250,
    currencyCode: "TRY",
    sourceReference: "material-list:v1"
  },
  {
    resourceType: "edge-banding",
    resourceId: "pvc-directional",
    unit: "m",
    unitPriceMinor: 25,
    currencyCode: "TRY",
    sourceReference: "edge-band-catalog:meter"
  },
  {
    resourceType: "edge-banding",
    resourceId: "pvc-directional",
    unit: "mm",
    unitPriceMinor: 2,
    currencyCode: "TRY",
    sourceReference: "edge-band-catalog:millimeter"
  }
];

const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-19",
  productionReport,
  consumptionPriceTable: priceTable,
  workItems: [],
  tariffTable: [],
  consumptionPriceList: {
    catalogId: "workshop-materials",
    version: "2026-11",
    effectiveFrom: "2026-11-01",
    effectiveTo: "2026-11-30"
  },
  laborOperationTariffList: null
});
assert.equal(snapshotResult.status, "ready");
assert.ok(snapshotResult.snapshot);

const revisionInput = {
  revisionId: "quote-directional-project-r1",
  createdAt: "2026-11-19T20:00:00+03:00",
  pricingSnapshot: snapshotResult.snapshot
};

function createV2Project(overrides = {}) {
  return {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "project-42",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: [],
    ...overrides
  };
}

test("DOM-058 directional quote revision survives versioned project JSON persistence", () => {
  const project = createV2Project();
  const appended = appendProjectQuoteRevisionToProjectFile(project, revisionInput);

  assert.equal(appended.status, "ready");
  assert.ok(appended.project);
  assert.equal(appended.history?.schemaVersion, 1);
  assert.equal(appended.history?.projectId, "project-42");
  assert.equal(appended.history?.revisions.length, 1);
  assert.equal(project[PROJECT_QUOTE_REVISION_HISTORY_FIELD], undefined);

  const persistedProject = JSON.parse(JSON.stringify(appended.project));
  const read = readProjectQuoteRevisionHistoryFromProjectFile(persistedProject);
  assert.equal(read.status, "ready");
  assert.equal(read.projectId, "project-42");
  const roundTripRevision = read.history?.revisions[0];
  assert.ok(roundTripRevision);
  assert.equal(roundTripRevision.revisionNumber, 1);
  assert.equal(roundTripRevision.previousRevisionId, null);

  const expectedLines = [
    { edge: "top", label: "üst", unit: "m", unitPriceMinor: 25, sourceReference: "edge-band-catalog:meter", summary: topSummary },
    { edge: "right", label: "sağ", unit: "mm", unitPriceMinor: 2, sourceReference: "edge-band-catalog:millimeter", summary: rightSummary }
  ];
  for (const expected of expectedLines) {
    const description = "Kenar bandı pvc-directional (" + expected.label + " kenar)";
    const originalLine = snapshotResult.snapshot.quoteSummary.costSummary.lines.find((line) => line.description === description);
    const originalSource = snapshotResult.snapshot.quoteSummary.lineSources.find((source) => source.costLineId === originalLine.id);
    const savedLine = roundTripRevision.pricingSnapshot.quoteSummary.costSummary.lines.find((line) => line.description === description);
    const savedSource = roundTripRevision.pricingSnapshot.quoteSummary.lineSources.find((source) => source.costLineId === savedLine.id);

    assert.ok(originalLine);
    assert.ok(originalSource);
    assert.ok(savedLine);
    assert.ok(savedSource);
    assert.equal(savedLine.unit, expected.unit);
    assert.equal(savedLine.quantity, expected.summary.totalQuantity);
    assert.equal(savedLine.unitPriceMinor, expected.unitPriceMinor);
    assert.equal(savedLine.sourceReference, expected.sourceReference);
    assert.deepEqual(savedSource.sourcePartIds, expected.summary.partIds);
    assert.deepEqual(savedLine, originalLine);
    assert.deepEqual(savedSource, originalSource);
  }
  assert.equal(Object.isFrozen(roundTripRevision.pricingSnapshot), true);
});

test("DOM-058 legacy project v1 cannot append directional quote history", () => {
  const legacy = {
    format: "MobilyaCAD",
    formatVersion: 1,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: []
  };
  const read = readProjectQuoteRevisionHistoryFromProjectFile(legacy);
  const append = appendProjectQuoteRevisionToProjectFile(legacy, revisionInput);

  assert.equal(read.status, "legacy");
  assert.equal(append.status, "blocked");
  assert.equal(append.project, null);
  assert.equal(legacy[PROJECT_QUOTE_REVISION_HISTORY_FIELD], undefined);
});

test("DOM-058 unsupported history version and unknown snapshot fields fail closed", () => {
  const persistedProject = appendProjectQuoteRevisionToProjectFile(
    createV2Project(),
    revisionInput
  );
  assert.equal(persistedProject.status, "ready");
  assert.ok(persistedProject.project);

  const unsupported = JSON.parse(JSON.stringify(persistedProject.project));
  unsupported.quoteRevisionHistory.schemaVersion = 2;
  assert.equal(readProjectQuoteRevisionHistoryFromProjectFile(unsupported).status, "blocked");

  const unknownSnapshotField = JSON.parse(JSON.stringify(persistedProject.project));
  unknownSnapshotField.quoteRevisionHistory.revisions[0].pricingSnapshot.futureDirectionalField = true;
  const blockedRead = readProjectQuoteRevisionHistoryFromProjectFile(unknownSnapshotField);
  const blockedAppend = appendProjectQuoteRevisionToProjectFile(
    unknownSnapshotField,
    revisionInput
  );
  assert.equal(blockedRead.status, "blocked");
  assert.equal(blockedRead.history, null);
  assert.equal(blockedAppend.status, "blocked");
  assert.equal(blockedAppend.project, null);
});
