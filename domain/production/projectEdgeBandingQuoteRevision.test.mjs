import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import { createProjectQuoteRevision } from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  PROJECT_QUOTE_REVISION_FILE_TYPE,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createEdgeBandingReport({
  leftSideEdges = { top: true },
  edgeBandingAssignments = [{
    partId: "cab-cost-1-left-side",
    edgeBandingId: "pvc-white-1",
    unit: "m"
  }]
} = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  edgeBandingByGroup.leftSide = { ...noBanding, ...leftSideEdges };

  return calculateCabinetProjectProductionWithDiagnostics({
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
    edgeBandingAssignments
  });
}

const productionReport = createEdgeBandingReport();
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
    resourceId: "pvc-white-1",
    unit: "m",
    unitPriceMinor: 18,
    currencyCode: "TRY",
    sourceReference: "edge-band-catalog:v1"
  },
  {
    resourceType: "edge-banding",
    resourceId: "pvc-white-1",
    unit: "mm",
    unitPriceMinor: 1,
    currencyCode: "TRY",
    sourceReference: "edge-band-catalog:mm"
  }
];

function createSnapshot(prices = priceTable, report = productionReport) {
  return createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-19",
    productionReport: report,
    consumptionPriceTable: prices,
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
}

test("exact edge-band ID/unit pricing keeps Part provenance through quote revision JSON round-trip", () => {
  assert.equal(productionReport.status, "ready");
  const edgeBanding = calculateProjectEdgeBandingConsumptionSummary(productionReport.result);
  assert.equal(edgeBanding.length, 1);
  assert.equal(edgeBanding[0].edgeBandingId, "pvc-white-1");
  assert.equal(edgeBanding[0].unit, "m");
  assert.deepEqual(edgeBanding[0].partIds, ["cab-cost-1-left-side"]);

  const priced = calculateProjectPricedConsumptionSummary(productionReport, priceTable);
  assert.equal(priced.status, "ready");
  const edgeLine = priced.costSummary.lines.find((line) => line.description === "Kenar bandı pvc-white-1");
  assert.ok(edgeLine);
  assert.equal(edgeLine.unit, "m");
  assert.equal(edgeLine.unitPriceMinor, 18);
  assert.equal(edgeLine.sourceReference, "edge-band-catalog:v1");
  assert.deepEqual(priced.linePartSources.find((source) => source.costLineId === edgeLine.id), {
    costLineId: edgeLine.id,
    sourcePartIds: ["cab-cost-1-left-side"]
  });

  const snapshotResult = createSnapshot();
  assert.equal(snapshotResult.status, "ready");
  assert.ok(snapshotResult.snapshot);
  const snapshotLine = snapshotResult.snapshot.quoteSummary.costSummary.lines.find(
    (line) => line.description === "Kenar bandı pvc-white-1"
  );
  const snapshotSource = snapshotResult.snapshot.quoteSummary.lineSources.find(
    (source) => source.costLineId === snapshotLine.id
  );
  assert.deepEqual(snapshotSource.sourcePartIds, ["cab-cost-1-left-side"]);

  const revisionResult = createProjectQuoteRevision({
    projectId: "project-42",
    revisionId: "quote-edge-band-r1",
    revisionNumber: 1,
    createdAt: "2026-11-19T10:00:00Z",
    previousRevision: null,
    pricingSnapshot: snapshotResult.snapshot
  });
  assert.equal(revisionResult.status, "ready");
  const serialized = serializeProjectQuoteRevisionHistoryFile({
    projectId: "project-42",
    revisions: [revisionResult.revision]
  });
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  const envelope = JSON.parse(serialized.json);
  assert.equal(envelope.fileType, PROJECT_QUOTE_REVISION_FILE_TYPE);
  assert.equal(envelope.schemaVersion, 1);

  const parsed = parseProjectQuoteRevisionHistoryFile(serialized.json);
  assert.equal(parsed.status, "ready");
  const roundTripRevision = parsed.history.revisions[0];
  const roundTripLine = roundTripRevision.pricingSnapshot.quoteSummary.costSummary.lines.find(
    (line) => line.description === "Kenar bandı pvc-white-1"
  );
  const roundTripSource = roundTripRevision.pricingSnapshot.quoteSummary.lineSources.find(
    (source) => source.costLineId === roundTripLine.id
  );
  assert.equal(roundTripLine.unit, "m");
  assert.equal(roundTripLine.unitPriceMinor, 18);
  assert.equal(roundTripLine.sourceReference, "edge-band-catalog:v1");
  assert.deepEqual(roundTripSource.sourcePartIds, ["cab-cost-1-left-side"]);
  assert.equal(Object.isFrozen(roundTripRevision.pricingSnapshot), true);
});

test("directional edge-band quote lines preserve edge, exact unit, price source, and Part provenance through immutable revision round-trip", () => {
  const directionalReport = createEdgeBandingReport({
    leftSideEdges: { top: true, right: true },
    edgeBandingAssignments: [
      { partId: "cab-cost-1-left-side", edge: "top", edgeBandingId: "pvc-directional", unit: "m" },
      { partId: "cab-cost-1-left-side", edge: "right", edgeBandingId: "pvc-directional", unit: "mm" }
    ]
  });
  assert.equal(directionalReport.status, "ready");
  const edgeSummaries = calculateProjectEdgeBandingConsumptionSummary(directionalReport.result);
  const topSummary = edgeSummaries.find((summary) => summary.edge === "top");
  const rightSummary = edgeSummaries.find((summary) => summary.edge === "right");
  assert.ok(topSummary);
  assert.ok(rightSummary);
  assert.equal(topSummary.edgeBandingId, "pvc-directional");
  assert.equal(topSummary.unit, "m");
  assert.deepEqual(topSummary.partIds, ["cab-cost-1-left-side"]);
  assert.equal(rightSummary.edgeBandingId, "pvc-directional");
  assert.equal(rightSummary.unit, "mm");
  assert.deepEqual(rightSummary.partIds, ["cab-cost-1-left-side"]);

  const directionalPrices = [
    priceTable[0],
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
  const priced = calculateProjectPricedConsumptionSummary(directionalReport, directionalPrices);
  assert.equal(priced.status, "ready");
  assert.ok(priced.costSummary);
  const pricedTopLine = priced.costSummary.lines.find((line) => line.description.includes("(üst kenar)"));
  const pricedRightLine = priced.costSummary.lines.find((line) => line.description.includes("(sağ kenar)"));
  assert.equal(pricedTopLine?.edgeDirection, "top");
  assert.equal(pricedRightLine?.edgeDirection, "right");

  const snapshotResult = createSnapshot(directionalPrices, directionalReport);
  assert.equal(snapshotResult.status, "ready");
  assert.ok(snapshotResult.snapshot);
  const revisionResult = createProjectQuoteRevision({
    projectId: "project-42",
    revisionId: "quote-directional-r1",
    revisionNumber: 1,
    createdAt: "2026-11-19T19:30:00Z",
    previousRevision: null,
    pricingSnapshot: snapshotResult.snapshot
  });
  assert.equal(revisionResult.status, "ready");
  assert.ok(revisionResult.revision);

  const historyFile = serializeProjectQuoteRevisionHistoryFile({
    projectId: "project-42",
    revisions: [revisionResult.revision]
  });
  assert.equal(historyFile.status, "ready");
  assert.ok(historyFile.json);
  const parsed = parseProjectQuoteRevisionHistoryFile(historyFile.json);
  assert.equal(parsed.status, "ready");
  const roundTripSnapshot = parsed.history.revisions[0].pricingSnapshot;

  const expectedLines = [
    { edge: "top", label: "üst", unit: "m", unitPriceMinor: 25, sourceReference: "edge-band-catalog:meter", summary: topSummary },
    { edge: "right", label: "sağ", unit: "mm", unitPriceMinor: 2, sourceReference: "edge-band-catalog:millimeter", summary: rightSummary }
  ];
  for (const expected of expectedLines) {
    const description = "Kenar bandı pvc-directional (" + expected.label + " kenar)";
    const originalLine = snapshotResult.snapshot.quoteSummary.costSummary.lines.find((line) => line.description === description);
    const originalSource = snapshotResult.snapshot.quoteSummary.lineSources.find((source) => source.costLineId === originalLine.id);
    const roundTripLine = roundTripSnapshot.quoteSummary.costSummary.lines.find((line) => line.description === description);
    const roundTripSource = roundTripSnapshot.quoteSummary.lineSources.find((source) => source.costLineId === roundTripLine.id);
    assert.ok(originalLine);
    assert.ok(originalSource);
    assert.ok(roundTripLine);
    assert.ok(roundTripSource);
    assert.equal(originalLine.edgeDirection, expected.edge);
    assert.equal(roundTripLine.edgeDirection, expected.edge);
    assert.equal(originalLine.unit, expected.unit);
    assert.equal(originalLine.quantity, expected.summary.totalQuantity);
    assert.equal(originalLine.unitPriceMinor, expected.unitPriceMinor);
    assert.equal(originalLine.sourceReference, expected.sourceReference);
    assert.deepEqual(originalSource.sourcePartIds, expected.summary.partIds);
    assert.deepEqual(roundTripLine, originalLine);
    assert.deepEqual(roundTripSource, originalSource);
  }
  assert.equal(Object.isFrozen(roundTripSnapshot), true);
});

test("edge-band price with the wrong unit cannot complete the quote snapshot", () => {
  const wrongUnitSnapshot = createSnapshot([
    priceTable[0],
    priceTable[2]
  ]);
  assert.equal(wrongUnitSnapshot.status, "incomplete");
  assert.equal(wrongUnitSnapshot.snapshot, null);
  assert.deepEqual(wrongUnitSnapshot.quoteSummary.missingPrices.map((issue) => ({
    resourceType: issue.resourceType,
    resourceId: issue.resourceId,
    requiredUnit: issue.requiredUnit,
    availableUnits: issue.availableUnits
  })), [{
    resourceType: "edge-banding",
    resourceId: "pvc-white-1",
    requiredUnit: "m",
    availableUnits: ["mm"]
  }]);
});
