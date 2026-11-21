import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import { validateProjectQuoteRevisionHistory } from "./projectQuoteRevision.ts";
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
      id: "dom-082-cabinet",
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
  }]
});

function createSnapshot({ quotedOn, materialPriceMinor, materialPriceSource, catalogVersion, laborPriceMinor, laborPriceSource, tariffVersion }) {
  const result = createProjectQuotePricingSnapshot({
    quotedOn,
    productionReport,
    consumptionPriceTable: [{
      resourceType: "material",
      resourceId: "mdf-18",
      unit: "m2",
      unitPriceMinor: materialPriceMinor,
      currencyCode: "TRY",
      sourceReference: materialPriceSource
    }],
    workItems: [{
      id: "assembly-labor",
      category: "labor",
      description: "Dolap montaj işçiliği",
      duration: 1.5,
      unit: "h",
      tariffId: "labor-hourly"
    }],
    tariffTable: [{
      tariffId: "labor-hourly",
      category: "labor",
      unit: "h",
      unitPriceMinor: laborPriceMinor,
      currencyCode: "TRY",
      sourceReference: laborPriceSource
    }],
    consumptionPriceList: {
      catalogId: "workshop-materials",
      version: catalogVersion,
      effectiveFrom: "2026-11-01"
    },
    laborOperationTariffList: {
      catalogId: "workshop-labor",
      version: tariffVersion,
      effectiveFrom: "2026-11-01"
    }
  });
  assert.equal(result.status, "ready", result.diagnostics.join(" | "));
  assert.ok(result.snapshot);
  return result.snapshot;
}

const firstSnapshot = createSnapshot({
  quotedOn: "2026-11-20",
  materialPriceMinor: 1250,
  materialPriceSource: "materials-price-list:r1",
  catalogVersion: "2026-11-r1",
  laborPriceMinor: 2400,
  laborPriceSource: "labor-tariff:r1",
  tariffVersion: "labor-2026-11-r1"
});
const secondSnapshot = createSnapshot({
  quotedOn: "2026-11-21",
  materialPriceMinor: 1800,
  materialPriceSource: "materials-price-list:r2",
  catalogVersion: "2026-11-r2",
  laborPriceMinor: 3000,
  laborPriceSource: "labor-tariff:r2",
  tariffVersion: "labor-2026-11-r2"
});

const projectId = "dom-082-project";
const sourceHistory = {
  projectId,
  revisions: [{
    schemaVersion: 1,
    sourceIntegrityVersion: 1,
    projectId,
    revisionId: "quote-r1",
    revisionNumber: 1,
    createdAt: "2026-11-20T08:00:00Z",
    previousRevisionId: null,
    pricingSnapshot: firstSnapshot
  }, {
    schemaVersion: 1,
    sourceIntegrityVersion: 1,
    projectId,
    revisionId: "quote-r2",
    revisionNumber: 2,
    createdAt: "2026-11-21T08:00:00Z",
    previousRevisionId: "quote-r1",
    pricingSnapshot: secondSnapshot
  }]
};

test("DOM-082 two-revision standalone history round-trip preserves chain and pricing/source snapshots exactly", () => {
  const validated = validateProjectQuoteRevisionHistory(sourceHistory);
  assert.equal(validated.status, "ready", validated.diagnostics.join(" | "));
  assert.ok(validated.history);

  const exported = serializeProjectQuoteRevisionHistoryFile(validated.history);
  assert.equal(exported.status, "ready", exported.diagnostics.join(" | "));
  assert.ok(exported.json);

  const imported = parseProjectQuoteRevisionHistoryFile(exported.json);
  assert.equal(imported.status, "ready", imported.diagnostics.join(" | "));
  assert.ok(imported.history);
  assert.deepEqual(imported.history, validated.history);

  assert.deepEqual(imported.history.revisions.map((revision) => ({
    revisionId: revision.revisionId,
    revisionNumber: revision.revisionNumber,
    createdAt: revision.createdAt,
    previousRevisionId: revision.previousRevisionId,
    sourceIntegrityVersion: revision.sourceIntegrityVersion
  })), [{
    revisionId: "quote-r1",
    revisionNumber: 1,
    createdAt: "2026-11-20T08:00:00Z",
    previousRevisionId: null,
    sourceIntegrityVersion: 1
  }, {
    revisionId: "quote-r2",
    revisionNumber: 2,
    createdAt: "2026-11-21T08:00:00Z",
    previousRevisionId: "quote-r1",
    sourceIntegrityVersion: 1
  }]);

  for (const [index, expectedSnapshot] of [firstSnapshot, secondSnapshot].entries()) {
    const revision = imported.history.revisions[index];
    assert.deepEqual(revision.pricingSnapshot, expectedSnapshot);
    assert.equal(
      revision.pricingSnapshot.consumptionPriceList?.version,
      expectedSnapshot.consumptionPriceList?.version
    );
    const materialSource = revision.pricingSnapshot.quoteSummary.lineSources.find((source) => source.resourceType === "material");
    assert.ok(materialSource);
    assert.equal(materialSource.resourceId, "mdf-18");
    assert.equal(materialSource.unit, "m2");
    assert.ok(materialSource.sourcePartIds.length > 0);
    const materialLine = revision.pricingSnapshot.quoteSummary.costSummary?.lines.find((line) => line.id === materialSource.costLineId);
    assert.ok(materialLine);
    assert.equal(materialLine.sourceReference, index === 0 ? "materials-price-list:r1" : "materials-price-list:r2");
  }

  const firstTotal = imported.history.revisions[0].pricingSnapshot.quoteSummary.costSummary?.grandTotalMinor;
  const secondTotal = imported.history.revisions[1].pricingSnapshot.quoteSummary.costSummary?.grandTotalMinor;
  assert.equal(firstTotal, firstSnapshot.quoteSummary.costSummary?.grandTotalMinor);
  assert.equal(secondTotal, secondSnapshot.quoteSummary.costSummary?.grandTotalMinor);
  assert.notEqual(firstTotal, secondTotal);

  const reexported = serializeProjectQuoteRevisionHistoryFile(imported.history);
  assert.equal(reexported.status, "ready");
  assert.equal(reexported.json, exported.json);
});
test("DOM-083 project-v2 embedded history and standalone export preserve the same two-revision chain", () => {
  const projectFile = {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: []
  };
  const originalProjectFile = structuredClone(projectFile);

  const firstAppend = appendProjectQuoteRevisionToProjectFile(projectFile, {
    revisionId: "quote-r1",
    createdAt: "2026-11-20T08:00:00Z",
    pricingSnapshot: firstSnapshot
  });
  assert.equal(firstAppend.status, "ready", firstAppend.diagnostics.join(" | "));
  assert.ok(firstAppend.project);

  const secondAppend = appendProjectQuoteRevisionToProjectFile(firstAppend.project, {
    revisionId: "quote-r2",
    createdAt: "2026-11-21T08:00:00Z",
    pricingSnapshot: secondSnapshot
  });
  assert.equal(secondAppend.status, "ready", secondAppend.diagnostics.join(" | "));
  assert.ok(secondAppend.project);

  const embedded = readProjectQuoteRevisionHistoryFromProjectFile(secondAppend.project);
  assert.equal(embedded.status, "ready", embedded.diagnostics.join(" | "));
  assert.ok(embedded.history);
  const expected = validateProjectQuoteRevisionHistory(sourceHistory);
  assert.equal(expected.status, "ready", expected.diagnostics.join(" | "));
  assert.ok(expected.history);
  assert.deepEqual(embedded.history, expected.history);
  assert.deepEqual(projectFile, originalProjectFile);
  assert.equal(secondAppend.project.formatVersion, 2);
  assert.equal(secondAppend.project.projectId, projectId);

  const embeddedExport = serializeProjectQuoteRevisionHistoryFile(embedded.history);
  const standaloneExport = serializeProjectQuoteRevisionHistoryFile(expected.history);
  assert.equal(embeddedExport.status, "ready");
  assert.equal(standaloneExport.status, "ready");
  assert.ok(embeddedExport.json);
  assert.ok(standaloneExport.json);
  assert.equal(embeddedExport.json, standaloneExport.json);

  const embeddedImport = parseProjectQuoteRevisionHistoryFile(embeddedExport.json);
  const standaloneImport = parseProjectQuoteRevisionHistoryFile(standaloneExport.json);
  assert.equal(embeddedImport.status, "ready", embeddedImport.diagnostics.join(" | "));
  assert.equal(standaloneImport.status, "ready", standaloneImport.diagnostics.join(" | "));
  assert.ok(embeddedImport.history);
  assert.ok(standaloneImport.history);
  assert.deepEqual(embeddedImport.history, standaloneImport.history);
});

