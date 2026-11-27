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
    sourcePartIds: ["cab-cost-1-left-side"],
    resourceType: "edge-banding",
    resourceId: "pvc-white-1",
    unit: "m"
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
  assert.equal(snapshotSource.resourceType, "edge-banding");
  assert.equal(snapshotSource.resourceId, "pvc-white-1");
  assert.equal(snapshotSource.unit, "m");

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
  assert.equal(roundTripSource.resourceType, "edge-banding");
  assert.equal(roundTripSource.resourceId, "pvc-white-1");
  assert.equal(roundTripSource.unit, "m");
  assert.equal(Object.isFrozen(roundTripRevision.pricingSnapshot), true);
});

test("revision rejects edge-band source metadata whose unit disagrees with the cost line", () => {
  const snapshotResult = createSnapshot();
  assert.equal(snapshotResult.status, "ready");
  const invalidSnapshot = JSON.parse(JSON.stringify(snapshotResult.snapshot));
  const edgeLine = invalidSnapshot.quoteSummary.costSummary.lines.find(
    (line) => line.description === "Kenar bandı pvc-white-1"
  );
  const edgeSource = invalidSnapshot.quoteSummary.lineSources.find(
    (source) => source.costLineId === edgeLine.id
  );
  edgeSource.unit = "mm";
  const revisionResult = createProjectQuoteRevision({
    projectId: "project-42",
    revisionId: "quote-edge-band-invalid-source",
    revisionNumber: 1,
    createdAt: "2026-11-19T10:00:00Z",
    previousRevision: null,
    pricingSnapshot: invalidSnapshot
  });
  assert.equal(revisionResult.status, "blocked");
  assert.match(revisionResult.diagnostics.join(" "), /birimi maliyet satırı birimiyle uyuşmuyor/);
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
    assert.equal(originalSource.resourceType, "edge-banding");
    assert.equal(originalSource.resourceId, "pvc-directional");
    assert.equal(originalSource.unit, expected.unit);
    assert.equal(originalSource.edgeDirection, expected.edge);
    assert.deepEqual(roundTripLine, originalLine);
    assert.deepEqual(roundTripSource, originalSource);
  }
  assert.equal(Object.isFrozen(roundTripSnapshot), true);
});

test("DOM-203 kesit iç kenar bantları quantity ile toplanır ve fiyat/kaynak Part izi teklif revizyonunda korunur", () => {
  const partId = "custom-worktop-panel";
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [{
      schemaVersion: 1,
      family: "panel",
      furniture: {
        id: "custom-worktop",
        name: "Kesitli özel tezgâh",
        widthMm: 2000,
        lengthMm: 600,
        thicknessMm: 38,
        quantity: 2,
        material: "Kompakt Tezgâh",
        materialId: "worktop-38-a"
      },
      profile: {
        edgeBanding: { ...noBanding },
        grainDirection: "length"
      },
      materials: [{
        id: "worktop-38-a",
        name: "Kompakt Tezgâh",
        category: "panel",
        thicknessesMm: [38],
        unit: "mm"
      }]
    }],
    panelCutouts: [{
      partId,
      geometry: {
        schemaVersion: 1,
        widthMm: 2000,
        lengthMm: 600,
        thicknessMm: 38,
        outerEdgeBanding: { ...noBanding },
        cutouts: [
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
        ]
      }
    }],
    edgeBandingAssignments: [
      { partId, edge: "top", edgeBandingId: "pvc-inner-top", unit: "m" },
      { partId, edge: "left", edgeBandingId: "pvc-inner-left", unit: "mm" },
      { partId, edge: "right", edgeBandingId: "pvc-inner-right", unit: "mm" }
    ]
  });

  assert.equal(report.status, "ready", report.firstError ?? "Kesitli panel üretimi hazır olmalı.");
  assert.ok(report.result);
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some((message) => /panelGeometry/.test(message)));
  assert.ok(report.exportBlockers.some((message) => /edgeBandingByEdge/.test(message)));

  const part = report.result.parts.find((item) => item.id === partId);
  assert.ok(part);
  assert.equal(part.quantity, 2);
  assert.deepEqual(part.edgeBanding, noBanding);
  assert.equal(part.panelGeometry.edgeBanding.outerLengthMm, 0);
  assert.equal(part.panelGeometry.edgeBanding.cutoutLengthMm, 1200);
  assert.equal(part.panelGeometry.edgeBanding.cutoutEdgeCount, 4);
  assert.deepEqual(part.edgeBandingByEdge, {
    top: { edgeBandingId: "pvc-inner-top", unit: "m" },
    left: { edgeBandingId: "pvc-inner-left", unit: "mm" },
    right: { edgeBandingId: "pvc-inner-right", unit: "mm" }
  });

  const summaries = calculateProjectEdgeBandingConsumptionSummary(report.result);
  const expectedEdges = [
    { edge: "top", id: "pvc-inner-top", unit: "m", lengthMm: 1400, quantity: 1.4, edgeCount: 4 },
    { edge: "left", id: "pvc-inner-left", unit: "mm", lengthMm: 600, quantity: 600, edgeCount: 2 },
    { edge: "right", id: "pvc-inner-right", unit: "mm", lengthMm: 400, quantity: 400, edgeCount: 2 }
  ];
  assert.equal(summaries.length, expectedEdges.length);
  for (const expected of expectedEdges) {
    const summary = summaries.find((item) => item.edge === expected.edge);
    assert.ok(summary);
    assert.equal(summary.edgeBandingId, expected.id);
    assert.equal(summary.unit, expected.unit);
    assert.equal(summary.totalLengthMm, expected.lengthMm);
    assert.equal(summary.totalQuantity, expected.quantity);
    assert.equal(summary.edgeCount, expected.edgeCount);
    assert.equal(summary.partLineCount, 1);
    assert.deepEqual(summary.partIds, [partId]);
    assert.deepEqual(summary.furnitureIds, ["custom-worktop"]);
  }

  const prices = [
    {
      resourceType: "material",
      resourceId: "worktop-38-a",
      unit: "m2",
      unitPriceMinor: 1250,
      currencyCode: "TRY",
      sourceReference: "workshop-materials:cutout-v1:worktop-38-a",
      thicknessMm: 38
    },
    {
      resourceType: "edge-banding",
      resourceId: "pvc-inner-top",
      unit: "m",
      unitPriceMinor: 25,
      currencyCode: "TRY",
      sourceReference: "edge-catalog:inner-top:meter"
    },
    {
      resourceType: "edge-banding",
      resourceId: "pvc-inner-left",
      unit: "mm",
      unitPriceMinor: 2,
      currencyCode: "TRY",
      sourceReference: "edge-catalog:inner-left:millimeter"
    },
    {
      resourceType: "edge-banding",
      resourceId: "pvc-inner-right",
      unit: "mm",
      unitPriceMinor: 3,
      currencyCode: "TRY",
      sourceReference: "edge-catalog:inner-right:millimeter"
    }
  ];
  const priced = calculateProjectPricedConsumptionSummary(report, prices);
  assert.equal(priced.status, "ready", priced.diagnostics.join(" "));
  assert.ok(priced.costSummary);
  assert.equal(priced.costSummary.grandTotalMinor, 4985);

  const expectedLines = [
    { id: "pvc-inner-top", edge: "top", label: "üst", unit: "m", quantity: 1.4, price: 25, total: 35, source: "edge-catalog:inner-top:meter" },
    { id: "pvc-inner-left", edge: "left", label: "sol", unit: "mm", quantity: 600, price: 2, total: 1200, source: "edge-catalog:inner-left:millimeter" },
    { id: "pvc-inner-right", edge: "right", label: "sağ", unit: "mm", quantity: 400, price: 3, total: 1200, source: "edge-catalog:inner-right:millimeter" }
  ];
  for (const expected of expectedLines) {
    const description = "Kenar bandı " + expected.id + " (" + expected.label + " kenar)";
    const line = priced.costSummary.lines.find((item) => item.description === description);
    assert.ok(line);
    assert.equal(line.edgeDirection, expected.edge);
    assert.equal(line.unit, expected.unit);
    assert.equal(line.quantity, expected.quantity);
    assert.equal(line.unitPriceMinor, expected.price);
    assert.equal(line.lineTotalMinor, expected.total);
    assert.equal(line.sourceReference, expected.source);
    const source = priced.linePartSources.find((item) => item.costLineId === line.id);
    assert.deepEqual(source, {
      costLineId: line.id,
      sourcePartIds: [partId],
      resourceType: "edge-banding",
      resourceId: expected.id,
      unit: expected.unit,
      edgeDirection: expected.edge
    });
  }

  const snapshotResult = createSnapshot(prices, report);
  assert.equal(snapshotResult.status, "ready");
  assert.ok(snapshotResult.snapshot);
  const revisionResult = createProjectQuoteRevision({
    projectId: "project-42",
    revisionId: "quote-cutout-inner-edge-r1",
    revisionNumber: 1,
    createdAt: "2026-11-27T04:30:00+03:00",
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

  for (const expected of expectedLines) {
    const description = "Kenar bandı " + expected.id + " (" + expected.label + " kenar)";
    const originalLine = snapshotResult.snapshot.quoteSummary.costSummary.lines.find((item) => item.description === description);
    const originalSource = snapshotResult.snapshot.quoteSummary.lineSources.find((item) => item.costLineId === originalLine.id);
    const roundTripLine = roundTripSnapshot.quoteSummary.costSummary.lines.find((item) => item.description === description);
    const roundTripSource = roundTripSnapshot.quoteSummary.lineSources.find((item) => item.costLineId === roundTripLine.id);
    assert.ok(originalLine);
    assert.ok(originalSource);
    assert.ok(roundTripLine);
    assert.ok(roundTripSource);
    assert.equal(originalLine.sourceReference, expected.source);
    assert.equal(originalLine.edgeDirection, expected.edge);
    assert.deepEqual(originalSource.sourcePartIds, [partId]);
    assert.equal(originalSource.resourceId, expected.id);
    assert.deepEqual(roundTripLine, originalLine);
    assert.deepEqual(roundTripSource, originalSource);
  }
  assert.equal(Object.isFrozen(roundTripSnapshot), true);

  const missingInnerPrice = createSnapshot(
    prices.filter((item) => item.resourceId !== "pvc-inner-left"),
    report
  );
  assert.equal(missingInnerPrice.status, "incomplete");
  assert.equal(missingInnerPrice.snapshot, null);
  assert.equal(missingInnerPrice.quoteSummary.costSummary, null);
  assert.deepEqual(missingInnerPrice.quoteSummary.lineSources, []);
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
