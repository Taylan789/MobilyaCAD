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

function createEdgeBandingReport() {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  edgeBandingByGroup.leftSide = { ...noBanding, top: true };

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
    edgeBandingAssignments: [{
      partId: "cab-cost-1-left-side",
      edgeBandingId: "pvc-white-1",
      unit: "m"
    }]
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

function createSnapshot(prices = priceTable) {
  return createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-19",
    productionReport,
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
