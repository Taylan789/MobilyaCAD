import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";
import { calculateProjectQuoteSummary } from "./projectQuoteSummary.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  createProjectQuoteRevision,
  validateProjectQuoteRevisionHistory
}  from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [{
  id: "mdf-shared",
  name: "MDF Lam",
  category: "panel",
  thicknessesMm: [8, 18],
  unit: "mm"
}];

function createRequest(id, options = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "MDF Lam",
      materialId: "mdf-shared"
    },
    profile: {
      panelThicknessMm: 18,
      ...(options.panelThicknessMmByGroup === undefined
        ? {}
        : { panelThicknessMmByGroup: options.panelThicknessMmByGroup }),
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials,
    ...(options.panelThicknessMmByGroup === undefined
      ? {}
      : { panelMaterialOverrides: { top: "mdf-shared" } })
  };
}

function createProductionReport() {
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [
      createRequest("cabinet-18-a"),
      createRequest("cabinet-18-b", { panelThicknessMmByGroup: { top: 8 } })
    ]
  });
}

const prices = [
  {
    resourceType: "material",
    resourceId: "mdf-shared",
    unit: "m2",
    unitPriceMinor: 2500,
    currencyCode: "TRY",
    thicknessMm: 8
  },
  {
    resourceType: "material",
    resourceId: "mdf-shared",
    unit: "m2",
    unitPriceMinor: 1500,
    currencyCode: "TRY",
    thicknessMm: 18
  }
];

function sourceIdsForThickness(summaries, thicknessMm) {
  return summaries.find((summary) => summary.materialId === "mdf-shared" &&
    summary.thicknessMm === thicknessMm)?.partIds ?? [];
}

function createSnapshot(productionReport) {
  return createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-19",
    productionReport,
    consumptionPriceTable: prices,
    workItems: [],
    tariffTable: [],
    consumptionPriceList: {
      catalogId: "workshop-materials",
      version: "2026-11-r1",
      effectiveFrom: "2026-11-01",
      effectiveTo: "2026-11-30"
    }
  });
}

function createRevision(input) {
  const result = createProjectQuoteRevision(input);
  assert.equal(result.status, "ready", result.diagnostics.join(" "));
  assert.ok(result.revision);
  return result.revision;
}

test("gruplu malzeme teklif satırları sorted unique Part ID kaynak izini üretir ve revizyon JSON round-trip korur", () => {
  const productionReport = createProductionReport();
  assert.equal(productionReport.status, "ready", productionReport.firstError ?? "Proje üretimi hazır olmalıdır.");
  assert.ok(productionReport.result);

  const materialSummaries = calculateProjectMaterialConsumptionSummary(productionReport.result);
  const expected8mm = sourceIdsForThickness(materialSummaries, 8);
  const expected18mm = sourceIdsForThickness(materialSummaries, 18);
  assert.ok(expected8mm.length > 0);
  assert.ok(expected18mm.length > 1);

  const pricedConsumption = calculateProjectPricedConsumptionSummary(productionReport, prices);
  assert.equal(pricedConsumption.status, "ready");
  assert.ok(pricedConsumption.costSummary);
  assert.deepEqual(pricedConsumption.linePartSources, [
    { costLineId: "material-0001", sourcePartIds: expected8mm },
    { costLineId: "material-0002", sourcePartIds: expected18mm }
  ]);

  const quote = calculateProjectQuoteSummary(productionReport, prices, [], []);
  assert.equal(quote.status, "ready");
  assert.ok(quote.costSummary);
  const materialSources = quote.lineSources.filter((source) => source.sourceType === "production-consumption");
  assert.equal(materialSources.length, 2);
  for (const source of materialSources) {
    const costLine = quote.costSummary.lines.find((line) => line.id === source.costLineId);
    assert.ok(costLine);
    const thicknessMm = costLine.description.includes("(8 mm") ? 8 : 18;
    const expectedPartIds = sourceIdsForThickness(materialSummaries, thicknessMm);
    assert.deepEqual(source.sourcePartIds, expectedPartIds);
    assert.deepEqual(source.sourcePartIds, [...source.sourcePartIds].sort());
    assert.equal(new Set(source.sourcePartIds).size, source.sourcePartIds.length);
  }

  const snapshotResult = createSnapshot(productionReport);
  assert.equal(snapshotResult.status, "ready", snapshotResult.diagnostics.join(" "));
  assert.ok(snapshotResult.snapshot);
  const currentSnapshot = JSON.parse(JSON.stringify(snapshotResult.snapshot));
  const legacySnapshot = JSON.parse(JSON.stringify(snapshotResult.snapshot));
  for (const source of legacySnapshot.quoteSummary.lineSources) {
    delete source.sourcePartIds;
  }

  const projectId = "quote-project";
  const firstCreatedAt = "2026-11-19T08:30:00+03:00";
  const legacyRevision = createRevision({
    projectId,
    revisionId: "quote-legacy-v1",
    revisionNumber: 1,
    createdAt: firstCreatedAt,
    previousRevision: null,
    pricingSnapshot: legacySnapshot
  });
  const newRevision = createRevision({
    projectId,
    revisionId: "quote-with-part-sources",
    revisionNumber: 2,
    createdAt: "2026-11-19T08:31:00+03:00",
    previousRevision: {
      projectId,
      revisionId: legacyRevision.revisionId,
      revisionNumber: legacyRevision.revisionNumber,
      createdAt: legacyRevision.createdAt
    },
    sourceIntegrityVersion: 1,
    pricingSnapshot: currentSnapshot
  });

  const history = validateProjectQuoteRevisionHistory({
    schemaVersion: 1,
    projectId,
    revisions: [legacyRevision, newRevision]
  });
  assert.equal(history.status, "ready", history.diagnostics.join(" "));
  assert.ok(history.history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(history.history);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join(" "));
  assert.ok(serialized.json);
  const parsed = parseProjectQuoteRevisionHistoryFile(serialized.json);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join(" "));
  assert.ok(parsed.history);
  assert.deepEqual(
    parsed.history.revisions[0].pricingSnapshot.quoteSummary.lineSources,
    legacySnapshot.quoteSummary.lineSources
  );
  assert.deepEqual(
    parsed.history.revisions[1].pricingSnapshot.quoteSummary.lineSources,
    currentSnapshot.quoteSummary.lineSources
  );
  assert.equal(
    parsed.history.revisions[1].pricingSnapshot.quoteSummary.lineSources[0].sourcePartIds?.length,
    expected8mm.length
  );
});

test("legacy sourcePartIds alanı olmadan kabul edilir; yeni kaynak Part kimlikleri boş, yinelenen veya sırasız olamaz", () => {
  const productionReport = createProductionReport();
  const snapshotResult = createSnapshot(productionReport);
  assert.equal(snapshotResult.status, "ready", snapshotResult.diagnostics.join(" "));
  assert.ok(snapshotResult.snapshot);

  const legacySnapshot = JSON.parse(JSON.stringify(snapshotResult.snapshot));
  for (const source of legacySnapshot.quoteSummary.lineSources) {
    delete source.sourcePartIds;
  }
  const legacyRevision = createProjectQuoteRevision({
    projectId: "quote-validation",
    revisionId: "legacy-v1",
    revisionNumber: 1,
    createdAt: "2026-11-19T08:40:00+03:00",
    previousRevision: null,
    pricingSnapshot: legacySnapshot
  });
  assert.equal(legacyRevision.status, "ready", legacyRevision.diagnostics.join(" "));

  const source = snapshotResult.snapshot.quoteSummary.lineSources.find((entry) =>
    entry.sourcePartIds && entry.sourcePartIds.length > 1
  );
  assert.ok(source);
  const invalidSnapshots = [
    { ...snapshotResult.snapshot, quoteSummary: {
      ...snapshotResult.snapshot.quoteSummary,
      lineSources: snapshotResult.snapshot.quoteSummary.lineSources.map((entry) =>
        entry.costLineId === source.costLineId
          ? { ...entry, sourcePartIds: [...entry.sourcePartIds].reverse() }
          : entry
      )
    }},
    { ...snapshotResult.snapshot, quoteSummary: {
      ...snapshotResult.snapshot.quoteSummary,
      lineSources: snapshotResult.snapshot.quoteSummary.lineSources.map((entry) =>
        entry.costLineId === source.costLineId
          ? { ...entry, sourcePartIds: [entry.sourcePartIds[0], entry.sourcePartIds[0]] }
          : entry
      )
    }},
    { ...snapshotResult.snapshot, quoteSummary: {
      ...snapshotResult.snapshot.quoteSummary,
      lineSources: snapshotResult.snapshot.quoteSummary.lineSources.map((entry) =>
        entry.costLineId === source.costLineId
          ? { ...entry, sourcePartIds: [] }
          : entry
      )
    }}
  ];

  for (const invalidSnapshot of invalidSnapshots) {
    const blocked = createProjectQuoteRevision({
      projectId: "quote-validation",
      revisionId: "invalid-source-ids",
      revisionNumber: 1,
      createdAt: "2026-11-19T08:41:00+03:00",
      previousRevision: null,
      pricingSnapshot: invalidSnapshot
    });
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.revision, null);
    assert.match(blocked.diagnostics.join(" "), /Part kimlikleri|Part kimliği/);
  }
});
