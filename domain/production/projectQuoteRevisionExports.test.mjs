import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import { createProjectQuoteRevision } from "./projectQuoteRevision.ts";
import { appendProjectQuoteRevisionToProjectFile, readProjectQuoteRevisionHistoryFromProjectFile } from "./projectQuoteRevisionProjectFile.ts";
import { parseProjectQuoteRevisionHistoryFile, serializeProjectQuoteRevisionHistoryFile } from "./projectQuoteRevisionFile.ts";
import { parseProjectQuoteSummaryFile, serializeProjectQuoteSummaryFile } from "./projectQuoteSummaryFile.ts";
import { parseProjectQuoteSummaryCsv, serializeProjectQuoteSummaryCsv } from "./projectQuoteSummaryCsv.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const edgeBandingByGroup = Object.fromEntries(BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }]));
const productionReport = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: [{
    schemaVersion: 1,
    furniture: { id: "quote-export-cabinet", widthMm: 800, heightMm: 720, depthMm: 560, material: "MDF Lam 18", materialId: "mdf-18", family: "cabinet" },
    profile: { panelThicknessMm: 18, carcassStyle: "between-sides", backPanel: { enabled: false }, shelfCount: 0, doors: { enabled: false, count: 0 }, edgeBandingByGroup },
    materials: [{ id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" }]
  }]
});
const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-20",
  productionReport,
  consumptionPriceTable: [{ resourceType: "material", resourceId: "mdf-18", unit: "m2", unitPriceMinor: 1250, currencyCode: "TRY", sourceReference: "material-prices:v1" }],
  workItems: [{ id: "assembly-labor", category: "labor", description: "Dolap montaj işçiliği", duration: 1.5, unit: "h", tariffId: "labor-hourly" }],
  tariffTable: [{ tariffId: "labor-hourly", category: "labor", unit: "h", unitPriceMinor: 2400, currencyCode: "TRY", sourceReference: "labor-tariffs:v1" }],
  consumptionPriceList: { catalogId: "workshop-materials", version: "2026-11", effectiveFrom: "2026-11-01", effectiveTo: "2026-11-30" },
  laborOperationTariffList: { catalogId: "workshop-labor", version: "2026-11", effectiveFrom: "2026-11-01", effectiveTo: "2026-11-30" }
});
assert.equal(snapshotResult.status, "ready", snapshotResult.diagnostics.join(" | "));
assert.ok(snapshotResult.snapshot);

function createProjectV2() {
  return { format: "MobilyaCAD", formatVersion: 2, projectId: "quote-export-project", room: { width: 4000, length: 5000, height: 2800, unit: "mm" }, furniture: [], materials: [] };
}
function appendRevision(project, snapshot) {
  return appendProjectQuoteRevisionToProjectFile(project, { revisionId: "quote-export-r1", createdAt: "2026-11-20T19:00:00Z", pricingSnapshot: snapshot });
}

test("project history, standalone revision JSON and quote-summary JSON/CSV reconcile exactly", () => {
  const embedded = appendRevision(createProjectV2(), snapshotResult.snapshot);
  assert.equal(embedded.status, "ready", embedded.diagnostics.join(" | "));
  assert.ok(embedded.history);
  const projectRead = readProjectQuoteRevisionHistoryFromProjectFile(embedded.project);
  assert.equal(projectRead.status, "ready", projectRead.diagnostics.join(" | "));
  assert.deepEqual(projectRead.history, embedded.history);

  const historyJson = serializeProjectQuoteRevisionHistoryFile(projectRead.history);
  assert.equal(historyJson.status, "ready", historyJson.diagnostics.join(" | "));
  assert.ok(historyJson.json);
  const historyParsed = parseProjectQuoteRevisionHistoryFile(historyJson.json);
  assert.equal(historyParsed.status, "ready", historyParsed.diagnostics.join(" | "));
  assert.deepEqual(historyParsed.history, projectRead.history);

  const revision = historyParsed.history.revisions[0];
  const summary = revision.pricingSnapshot.quoteSummary;
  const jsonExport = serializeProjectQuoteSummaryFile(summary);
  assert.equal(jsonExport.status, "ready", jsonExport.diagnostics.join(" | "));
  assert.ok(jsonExport.json);
  const jsonParsed = parseProjectQuoteSummaryFile(jsonExport.json);
  assert.equal(jsonParsed.status, "ready", jsonParsed.diagnostics.join(" | "));
  assert.deepEqual(jsonParsed.summary, summary);

  const csvExport = serializeProjectQuoteSummaryCsv(summary);
  assert.equal(csvExport.status, "ready", csvExport.diagnostics.join(" | "));
  assert.ok(csvExport.csv);
  const csvParsed = parseProjectQuoteSummaryCsv(csvExport.csv);
  assert.equal(csvParsed.status, "ready", csvParsed.diagnostics.join(" | "));
  assert.deepEqual(csvParsed.summary, summary);

  const materialLine = summary.costSummary.lines.find((line) => line.category === "material");
  assert.ok(materialLine);
  assert.equal(materialLine.unit, "m2");
  assert.equal(materialLine.currencyCode, "TRY");
  const materialSource = summary.lineSources.find((source) => source.costLineId === materialLine.id);
  assert.ok(materialSource);
  assert.equal(materialSource.sourceType, "production-consumption");
  assert.equal(materialSource.sourceId, "mdf-18");
  assert.ok(materialSource.sourcePartIds?.length);
  assert.deepEqual(materialSource.sourcePartIds, [...materialSource.sourcePartIds].sort());
  assert.equal(new Set(materialSource.sourcePartIds).size, materialSource.sourcePartIds.length);

  const laborLine = summary.costSummary.lines.find((line) => line.category === "labor");
  assert.ok(laborLine);
  assert.equal(laborLine.unit, "h");
  assert.equal(laborLine.currencyCode, "TRY");
  const laborSource = summary.lineSources.find((source) => source.costLineId === laborLine.id);
  assert.ok(laborSource);
  assert.equal(laborSource.sourceType, "labor-operation");
  assert.equal(laborSource.tariffId, "labor-hourly");
  assert.equal(jsonParsed.summary.currencyCode, revision.pricingSnapshot.quoteSummary.currencyCode);
  assert.equal(csvParsed.summary.costSummary.grandTotalMinor, revision.pricingSnapshot.quoteSummary.costSummary.grandTotalMinor);
  assert.deepEqual(csvParsed.summary.lineSources, revision.pricingSnapshot.quoteSummary.lineSources);
});

test("incomplete quote summaries and legacy project v1 revision append fail closed", () => {
  const incomplete = structuredClone(snapshotResult.snapshot.quoteSummary);
  incomplete.status = "incomplete";
  incomplete.currencyCode = null;
  incomplete.pricedLineCount = 0;
  incomplete.missingPrices = [{ resourceType: "material", resourceId: "mdf-18", unit: "m2" }];
  incomplete.diagnostics = ["Eksik fiyat"];
  const jsonExport = serializeProjectQuoteSummaryFile(incomplete);
  const csvExport = serializeProjectQuoteSummaryCsv(incomplete);
  assert.equal(jsonExport.status, "blocked");
  assert.equal(jsonExport.json, null);
  assert.equal(csvExport.status, "blocked");
  assert.equal(csvExport.csv, null);

  const legacyProject = { format: "MobilyaCAD", formatVersion: 1, room: { width: 4000, length: 5000, height: 2800, unit: "mm" }, furniture: [] };
  const legacyAppend = appendRevision(legacyProject, snapshotResult.snapshot);
  assert.equal(legacyAppend.status, "blocked");
  assert.equal(legacyAppend.project, null);
});

test("revision snapshot rejects a cost line with currency inconsistent with its summary", () => {
  const corruptSnapshot = structuredClone(snapshotResult.snapshot);
  const materialLine = corruptSnapshot.quoteSummary.costSummary.lines.find((line) => line.category === "material");
  assert.ok(materialLine);
  materialLine.currencyCode = "USD";
  const invalidRevision = createProjectQuoteRevision({
    projectId: "quote-export-project", revisionId: "quote-export-invalid", revisionNumber: 1,
    createdAt: "2026-11-20T19:00:00Z", previousRevision: null, sourceIntegrityVersion: 1,
    pricingSnapshot: corruptSnapshot
  });
  assert.equal(invalidRevision.status, "blocked");
  assert.equal(invalidRevision.revision, null);
  assert.match(invalidRevision.diagnostics.join(" | "), /maliyet satırı alanları geçersiz/i);
});
