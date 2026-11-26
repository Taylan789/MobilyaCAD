import assert from "node:assert/strict";
import test from "node:test";

import { BOOKSHELF_PANEL_GROUPS } from "./bookshelfConstruction.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  parseProjectQuoteRevisionComparisonCsv,
  serializeProjectQuoteRevisionComparisonCsv
} from "./projectQuoteRevisionComparisonCsv.ts";
import {
  compareProjectQuoteRevisions,
  createProjectQuoteRevision,
  validateProjectQuoteRevisionHistory
} from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const projectId = "dom-185-bookshelf-hardware-price";
const firstRevisionId = "dom-185-quote-r1";

function createProductionReport() {
  const edgeBandingByGroup = Object.fromEntries(
    BOOKSHELF_PANEL_GROUPS.map(group => [group, { ...noBanding }])
  );
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [{
      schemaVersion: 1,
      family: "bookshelf",
      furniture: {
        id: "dom-185-bookcase",
        widthMm: 800,
        heightMm: 2000,
        depthMm: 300,
        material: "MDF Lam 18",
        materialId: "mdf-18"
      },
      profile: {
        panelThicknessMm: 18,
        carcassStyle: "between-sides",
        backPanel: { enabled: false },
        shelfCount: 0,
        edgeBandingByGroup
      },
      materials: [{
        id: "mdf-18",
        name: "MDF Lam 18",
        category: "panel",
        thicknessesMm: [18],
        unit: "mm"
      }],
      verticalDividers: [],
      shelves: [{
        id: "lower",
        leftOffsetMm: 0,
        rightOffsetMm: 764,
        heightFromInnerBottomMm: 500,
        frontOffsetMm: 0,
        depthMm: 282,
        thicknessMm: 18,
        materialId: "mdf-18",
        edgeBanding: { ...noBanding },
        grainDirection: "length",
        supportHardware: [{
          id: "support-pair",
          hardwareId: "shelf-support-001",
          name: "Raf desteği",
          quantity: 4,
          unit: "adet",
          sourceReference: "manufacturer-catalogue:page-12"
        }]
      }]
    }]
  });
}

const productionReport = createProductionReport();

function createSnapshot(priceSourceReference = "hardware-price-list:2026-11", includeHardwarePrice = true) {
  const consumptionPriceTable = [{
    resourceType: "material",
    resourceId: "mdf-18",
    unit: "m2",
    unitPriceMinor: 1250,
    currencyCode: "TRY",
    sourceReference: "material-price-list:2026-11"
  }];
  if (includeHardwarePrice) {
    consumptionPriceTable.push({
      resourceType: "hardware",
      resourceId: "shelf-support-001",
      unit: "adet",
      unitPriceMinor: 175,
      currencyCode: "TRY",
      sourceReference: priceSourceReference
    });
  }
  return createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-26",
    productionReport,
    consumptionPriceTable,
    workItems: [],
    tariffTable: [],
    consumptionPriceList: {
      catalogId: "workshop-consumption",
      version: "2026-11",
      effectiveFrom: "2026-11-01",
      effectiveTo: "2026-11-30"
    },
    laborOperationTariffList: null
  });
}

function createRevision(snapshot, revisionId, revisionNumber, previousRevision = null) {
  return createProjectQuoteRevision({
    projectId,
    revisionId,
    revisionNumber,
    createdAt: revisionNumber === 1 ? "2026-11-26T08:00:00Z" : "2026-11-26T08:30:00Z",
    previousRevision,
    sourceIntegrityVersion: 1,
    pricingSnapshot: snapshot
  });
}

test("DOM-185 shelf-support price source stays distinct from BOM provenance through quote revision round-trip", () => {
  assert.equal(productionReport.status, "ready", productionReport.firstError ?? "Kitaplık üretim raporu hazır olmalıdır.");
  assert.ok(productionReport.result);
  const shelfPart = productionReport.result.parts.find(part => part.id === "dom-185-bookcase-shelf-lower");
  assert.ok(shelfPart, "Açık ölçülü raf Part satırı bulunmalıdır.");
  assert.deepEqual(productionReport.result.hardwareItems?.[0].sourcePartIds, [shelfPart.id]);

  const first = createSnapshot("hardware-price-list:2026-11");
  const second = createSnapshot("hardware-price-list:2026-11-revised");
  assert.equal(first.status, "ready", first.diagnostics.join("; "));
  assert.equal(second.status, "ready", second.diagnostics.join("; "));
  assert.ok(first.snapshot);
  assert.ok(second.snapshot);

  const firstHardwareSource = first.snapshot.quoteSummary.lineSources.find(source => source.hardwareId === "shelf-support-001");
  const secondHardwareSource = second.snapshot.quoteSummary.lineSources.find(source => source.hardwareId === "shelf-support-001");
  assert.ok(firstHardwareSource);
  assert.ok(secondHardwareSource);
  assert.deepEqual(firstHardwareSource.hardwareSourceReferences, ["manufacturer-catalogue:page-12"]);
  assert.deepEqual(firstHardwareSource.sourcePartIds, [shelfPart.id]);

  const firstHardwareLine = first.snapshot.quoteSummary.costSummary?.lines.find(line => line.category === "hardware");
  const secondHardwareLine = second.snapshot.quoteSummary.costSummary?.lines.find(line => line.category === "hardware");
  assert.ok(firstHardwareLine);
  assert.ok(secondHardwareLine);
  assert.equal(firstHardwareLine.quantity, 4);
  assert.equal(firstHardwareLine.unit, "adet");
  assert.equal(firstHardwareLine.unitPriceMinor, 175);
  assert.equal(firstHardwareLine.sourceReference, "hardware-price-list:2026-11");
  assert.equal(secondHardwareLine.sourceReference, "hardware-price-list:2026-11-revised");
  assert.equal(first.snapshot.quoteSummary.costSummary?.grandTotalMinor, second.snapshot.quoteSummary.costSummary?.grandTotalMinor);
  assert.ok(Object.isFrozen(first.snapshot));
  assert.ok(Object.isFrozen(firstHardwareSource));

  const firstRevision = createRevision(first.snapshot, firstRevisionId, 1);
  const secondRevision = createRevision(second.snapshot, "dom-185-quote-r2", 2, {
    projectId,
    revisionId: firstRevisionId,
    revisionNumber: 1,
    createdAt: "2026-11-26T08:00:00Z"
  });
  assert.equal(firstRevision.status, "ready", firstRevision.diagnostics.join("; "));
  assert.equal(secondRevision.status, "ready", secondRevision.diagnostics.join("; "));
  assert.ok(firstRevision.revision);
  assert.ok(secondRevision.revision);

  const history = validateProjectQuoteRevisionHistory({ projectId, revisions: [firstRevision.revision, secondRevision.revision] });
  assert.equal(history.status, "ready", history.diagnostics.join("; "));
  assert.ok(history.history);
  const comparison = compareProjectQuoteRevisions(history.history, firstRevisionId, "dom-185-quote-r2");
  assert.equal(comparison.status, "ready", comparison.diagnostics.join("; "));
  assert.ok(comparison.comparison);
  const hardwareChange = comparison.comparison.lineChanges.find(change =>
    change.from?.hardwareId === "shelf-support-001" && change.to?.hardwareId === "shelf-support-001"
  );
  assert.ok(hardwareChange);
  assert.equal(hardwareChange.type, "changed");
  assert.equal(hardwareChange.from.sourceReference, "hardware-price-list:2026-11");
  assert.equal(hardwareChange.to.sourceReference, "hardware-price-list:2026-11-revised");

  const comparisonCsv = serializeProjectQuoteRevisionComparisonCsv(comparison.comparison);
  assert.equal(comparisonCsv.status, "ready", comparisonCsv.diagnostics.join("; "));
  assert.ok(comparisonCsv.csv);
  const comparisonCsvParsed = parseProjectQuoteRevisionComparisonCsv(comparisonCsv.csv);
  assert.equal(comparisonCsvParsed.status, "ready", comparisonCsvParsed.diagnostics.join("; "));
  assert.ok(comparisonCsvParsed.comparison);
  const csvHardwareChange = comparisonCsvParsed.comparison.lineChanges.find(change =>
    change.from?.hardwareId === "shelf-support-001" && change.to?.hardwareId === "shelf-support-001"
  );
  assert.ok(csvHardwareChange);
  assert.equal(csvHardwareChange.from.sourceReference, "hardware-price-list:2026-11");
  assert.equal(csvHardwareChange.to.sourceReference, "hardware-price-list:2026-11-revised");

  const serialized = serializeProjectQuoteRevisionHistoryFile(history.history);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join("; "));
  assert.ok(serialized.json);
  const parsed = parseProjectQuoteRevisionHistoryFile(serialized.json);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join("; "));
  assert.deepEqual(parsed.history, history.history);


});

test("DOM-185 missing shelf-support price blocks the quote snapshot without a default price or partial source map", () => {
  const result = createSnapshot(undefined, false);
  assert.equal(result.status, "incomplete");
  assert.equal(result.snapshot, null);
  assert.equal(result.quoteSummary?.costSummary, null);
  assert.deepEqual(result.quoteSummary?.lineSources, []);
  assert.ok(result.quoteSummary?.missingPrices.some(issue =>
    issue.resourceType === "hardware" && issue.resourceId === "shelf-support-001" && issue.requiredUnit === "adet"
  ));
});
