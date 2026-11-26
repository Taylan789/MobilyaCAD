import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  compareProjectQuoteRevisions,
  createProjectQuoteRevision,
  validateProjectQuoteRevisionHistory
} from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";
import {
  parseProjectQuoteRevisionComparisonFile,
  serializeProjectQuoteRevisionComparisonFile
} from "./projectQuoteRevisionComparisonFile.ts";
import {
  parseProjectQuoteRevisionComparisonCsv,
  serializeProjectQuoteRevisionComparisonCsv
} from "./projectQuoteRevisionComparisonCsv.ts";
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
const explicitHardwarePartIds = productionReport.result.parts
  .filter((part) => part.furnitureId === "revision-cabinet-1")
  .slice(0, 2).map((part) => part.id).sort();
productionReport.result.hardwareItems = [{
  id: "bom-hinge-a",
  furnitureId: "revision-cabinet-1",
  hardwareId: "hinge-110",
  name: "Menteşe",
  quantity: 1,
  unit: "adet",
  sourceReference: "bom:catalog-a",
  sourcePartIds: explicitHardwarePartIds
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
    hardwareSourceReferences: hardwareSource.hardwareSourceReferences,
    priceSourceReference: hardwareSource.priceSourceReference,
    sourcePartIds: hardwareSource.sourcePartIds
  }, {
    hardwareId: "hinge-110",
    hardwareUnit: "adet",
    hardwareFurnitureIds: ["revision-cabinet-1"],
    hardwareSourceReferences: ["bom:catalog-a", "bom:catalog-z"],
    priceSourceReference: "hardware-price:v1",
    sourcePartIds: explicitHardwarePartIds
  });
  assert.deepEqual(hardwareSource.sourcePartIds, explicitHardwarePartIds);

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
  assert.deepEqual(importedStandalone.history.revisions[0].pricingSnapshot.quoteSummary.lineSources
    .find(source => source.hardwareId === "hinge-110").sourcePartIds, explicitHardwarePartIds);

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
  assert.deepEqual(embeddedRead.history.revisions[0].pricingSnapshot.quoteSummary.lineSources
    .find(source => source.hardwareId === "hinge-110").sourcePartIds, explicitHardwarePartIds);
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


test("DOM-126b hardware BOM source changes appear in revision comparisons without changing monetary totals", () => {
  const first = createRevision(snapshot);
  assert.equal(first.status, "ready", first.diagnostics.join("; "));
  assert.ok(first.revision);
  const secondSnapshot = structuredClone(snapshot);
  const secondHardwareSource = secondSnapshot.quoteSummary.lineSources.find(source => source.hardwareId === "hinge-110");
  assert.ok(secondHardwareSource);
  secondHardwareSource.hardwareSourceReferences = ["bom:catalog-a", "bom:catalog-m", "bom:catalog-z"];
  const second = createProjectQuoteRevision({
    projectId,
    revisionId: revisionId + "-2",
    revisionNumber: 2,
    createdAt: "2026-11-23T08:00:00Z",
    previousRevision: {
      projectId,
      revisionId: first.revision.revisionId,
      revisionNumber: first.revision.revisionNumber,
      createdAt: first.revision.createdAt
    },
    sourceIntegrityVersion: 1,
    pricingSnapshot: secondSnapshot
  });
  assert.equal(second.status, "ready", second.diagnostics.join("; "));
  assert.ok(second.revision);
  const history = validateProjectQuoteRevisionHistory({ projectId, revisions: [first.revision, second.revision] });
  assert.equal(history.status, "ready", history.diagnostics.join("; "));
  assert.ok(history.history);
  const comparisonResult = compareProjectQuoteRevisions(history.history, first.revision.revisionId, second.revision.revisionId);
  assert.equal(comparisonResult.status, "ready", comparisonResult.diagnostics.join("; "));
  assert.ok(comparisonResult.comparison);
  assert.equal(comparisonResult.comparison.lineChanges.length, 1);
  const hardwareChange = comparisonResult.comparison.lineChanges[0];
  assert.equal(hardwareChange.type, "changed");
  assert.deepEqual(hardwareChange.from.hardwareSourceReferences, ["bom:catalog-a", "bom:catalog-z"]);
  assert.deepEqual(hardwareChange.to.hardwareSourceReferences, ["bom:catalog-a", "bom:catalog-m", "bom:catalog-z"]);
  assert.deepEqual(hardwareChange.from.hardwareFurnitureIds, ["revision-cabinet-1"]);
  assert.deepEqual(hardwareChange.to.hardwareFurnitureIds, ["revision-cabinet-1"]);
  assert.deepEqual(hardwareChange.from.sourcePartIds, explicitHardwarePartIds);
  assert.deepEqual(hardwareChange.to.sourcePartIds, explicitHardwarePartIds);
  const comparisonEnvelope = { status: "ready", comparison: comparisonResult.comparison, diagnostics: [] };
  const comparisonJson = serializeProjectQuoteRevisionComparisonFile(comparisonEnvelope);
  assert.equal(comparisonJson.status, "ready", comparisonJson.diagnostics.join("; "));
  const parsedComparisonJson = parseProjectQuoteRevisionComparisonFile(comparisonJson.json);
  assert.equal(parsedComparisonJson.status, "ready", parsedComparisonJson.diagnostics.join("; "));
  assert.deepEqual(parsedComparisonJson.comparison, comparisonResult.comparison);
  const comparisonCsv = serializeProjectQuoteRevisionComparisonCsv(comparisonEnvelope);
  assert.equal(comparisonCsv.status, "ready", comparisonCsv.diagnostics.join("; "));
  const parsedComparisonCsv = parseProjectQuoteRevisionComparisonCsv(comparisonCsv.csv);
  assert.equal(parsedComparisonCsv.status, "ready", parsedComparisonCsv.diagnostics.join("; "));
  assert.deepEqual(parsedComparisonCsv.comparison, comparisonResult.comparison);
  assert.equal(comparisonResult.comparison.grandTotalDeltaMinor, 0);
  assert.equal(comparisonResult.comparison.categoryDeltasMinor.hardware, 0);
});


test("DOM-128 hardware catalog identity and explicit source-map changes are add/remove comparisons across JSON and CSV", () => {
  const first = createRevision(snapshot);
  assert.equal(first.status, "ready", first.diagnostics.join("; "));
  assert.ok(first.revision);

  const alternativePart = productionReport.result.parts.find(part =>
    part.furnitureId === "revision-cabinet-1" && !explicitHardwarePartIds.includes(part.id)
  );
  assert.ok(alternativePart, "fixture needs an additional valid Part for a mapping-change comparison");
  const variants = [
    ["hardware identity", source => { source.hardwareId = "hinge-120"; }],
    ["furniture scope", source => { source.hardwareFurnitureIds = ["revision-cabinet-1", "revision-cabinet-2"]; }],
    ["explicit Part mapping", source => { source.sourcePartIds = [alternativePart.id]; }]
  ];

  for (const [label, changeSource] of variants) {
    const secondSnapshot = structuredClone(snapshot);
    const secondHardwareSource = secondSnapshot.quoteSummary.lineSources.find(source => source.hardwareId === "hinge-110");
    assert.ok(secondHardwareSource, label);
    changeSource(secondHardwareSource);

    const second = createProjectQuoteRevision({
      projectId,
      revisionId: revisionId + "-dom128-" + label.replace(/\s+/g, "-"),
      revisionNumber: 2,
      createdAt: "2026-11-23T08:00:00Z",
      previousRevision: {
        projectId,
        revisionId: first.revision.revisionId,
        revisionNumber: first.revision.revisionNumber,
        createdAt: first.revision.createdAt
      },
      sourceIntegrityVersion: 1,
      pricingSnapshot: secondSnapshot
    });
    assert.equal(second.status, "ready", label + ": " + second.diagnostics.join("; "));
    assert.ok(second.revision);
    const history = validateProjectQuoteRevisionHistory({ projectId, revisions: [first.revision, second.revision] });
    assert.equal(history.status, "ready", label + ": " + history.diagnostics.join("; "));
    assert.ok(history.history);
    const compared = compareProjectQuoteRevisions(history.history, first.revision.revisionId, second.revision.revisionId);
    assert.equal(compared.status, "ready", label + ": " + compared.diagnostics.join("; "));
    assert.ok(compared.comparison);
    const hardwareChanges = compared.comparison.lineChanges.filter(change => (change.from ?? change.to)?.category === "hardware");
    assert.equal(hardwareChanges.length, 2, label);
    assert.deepEqual(hardwareChanges.map(change => change.type).sort(), ["added", "removed"], label);
    const removed = hardwareChanges.find(change => change.type === "removed");
    const added = hardwareChanges.find(change => change.type === "added");
    assert.ok(removed?.from);
    assert.ok(added?.to);
    assert.equal(removed.from.unit, "adet");
    assert.equal(removed.from.hardwareUnit, removed.from.unit);
    assert.equal(added.to.unit, "adet");
    assert.equal(added.to.hardwareUnit, added.to.unit);
    assert.deepEqual(removed.from.hardwareFurnitureIds, ["revision-cabinet-1"]);
    assert.deepEqual(removed.from.sourcePartIds, explicitHardwarePartIds);
    assert.deepEqual(added.to.sourcePartIds, secondHardwareSource.sourcePartIds);
    assert.equal(compared.comparison.grandTotalDeltaMinor, 0);
    assert.equal(compared.comparison.categoryDeltasMinor.hardware, 0);

    const envelope = { status: "ready", comparison: compared.comparison, diagnostics: [] };
    const json = serializeProjectQuoteRevisionComparisonFile(envelope);
    assert.equal(json.status, "ready", label + ": " + json.diagnostics.join("; "));
    const jsonParsed = parseProjectQuoteRevisionComparisonFile(json.json);
    assert.equal(jsonParsed.status, "ready", label + ": " + jsonParsed.diagnostics.join("; "));
    assert.deepEqual(jsonParsed.comparison, compared.comparison);

    const csv = serializeProjectQuoteRevisionComparisonCsv(envelope);
    assert.equal(csv.status, "ready", label + ": " + csv.diagnostics.join("; "));
    const csvParsed = parseProjectQuoteRevisionComparisonCsv(csv.csv);
    assert.equal(csvParsed.status, "ready", label + ": " + csvParsed.diagnostics.join("; "));
    assert.deepEqual(csvParsed.comparison, compared.comparison);
  }

  const wrongUnit = structuredClone(snapshot);
  const wrongUnitSource = wrongUnit.quoteSummary.lineSources.find(source => source.hardwareId === "hinge-110");
  assert.ok(wrongUnitSource);
  wrongUnitSource.hardwareUnit = "mm";
  const wrongUnitRevision = createRevision(wrongUnit);
  assert.equal(wrongUnitRevision.status, "blocked");
  assert.match(wrongUnitRevision.diagnostics.join("; "), /Teklif donanım birimi maliyet satırı birimiyle uyuşmalıdır/);

  const secondSnapshot = structuredClone(snapshot);
  const changedHardwareSource = secondSnapshot.quoteSummary.lineSources.find(source => source.hardwareId === "hinge-110");
  assert.ok(changedHardwareSource);
  changedHardwareSource.hardwareId = "hinge-120";
  const second = createProjectQuoteRevision({
    projectId,
    revisionId: revisionId + "-dom128-forged",
    revisionNumber: 2,
    createdAt: "2026-11-23T08:00:00Z",
    previousRevision: {
      projectId,
      revisionId: first.revision.revisionId,
      revisionNumber: first.revision.revisionNumber,
      createdAt: first.revision.createdAt
    },
    sourceIntegrityVersion: 1,
    pricingSnapshot: secondSnapshot
  });
  assert.equal(second.status, "ready", second.diagnostics.join("; "));
  assert.ok(second.revision);
  const history = validateProjectQuoteRevisionHistory({ projectId, revisions: [first.revision, second.revision] });
  assert.equal(history.status, "ready", history.diagnostics.join("; "));
  assert.ok(history.history);
  const compared = compareProjectQuoteRevisions(history.history, first.revision.revisionId, second.revision.revisionId);
  assert.equal(compared.status, "ready", compared.diagnostics.join("; "));
  assert.ok(compared.comparison);
  const hardwareChanges = compared.comparison.lineChanges.filter(change => (change.from ?? change.to)?.category === "hardware");
  const removed = hardwareChanges.find(change => change.type === "removed");
  const added = hardwareChanges.find(change => change.type === "added");
  assert.ok(removed?.from);
  assert.ok(added?.to);
  const forged = structuredClone(compared.comparison);
  forged.lineChanges = [{ type: "changed", from: removed.from, to: added.to }];
  const forgedEnvelope = { status: "ready", comparison: forged, diagnostics: [] };
  assert.equal(serializeProjectQuoteRevisionComparisonFile(forgedEnvelope).status, "blocked");
  assert.equal(serializeProjectQuoteRevisionComparisonCsv(forgedEnvelope).status, "blocked");
});
