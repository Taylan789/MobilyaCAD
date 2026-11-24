import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  importProjectQuoteRevisionHistoryFileIntoProject,
  PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES,
  PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH
} from "./projectQuoteRevisionProjectFile.ts";
import {
  PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";

const production = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: []
});
const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-24",
  productionReport: production,
  consumptionPriceTable: [],
  workItems: [],
  tariffTable: [],
  consumptionPriceList: null,
  laborOperationTariffList: null,
  quoteAdjustments: [{
    id: "dom-149-adjustment",
    category: "profit",
    description: "Kaynak sınırı testi",
    quantity: 1,
    unit: "adet",
    unitPriceMinor: 100,
    currencyCode: "TRY",
    sourceReference: "dom-149-test:v1"
  }]
});
assert.equal(snapshotResult.status, "ready");
assert.ok(snapshotResult.snapshot);

function createProject(overrides = {}) {
  return {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "project-dom-149",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: [],
    ...overrides
  };
}

function createRevision(revisionId = "dom-149-r1") {
  return {
    revisionId,
    createdAt: "2026-11-24T18:00:00+03:00",
    pricingSnapshot: structuredClone(snapshotResult.snapshot)
  };
}

function createHistoryFile() {
  const appended = appendProjectQuoteRevisionToProjectFile(createProject(), createRevision("dom-149-import-r1"));
  assert.equal(appended.status, "ready", appended.diagnostics.join(" | "));
  assert.ok(appended.history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(appended.history);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join(" | "));
  assert.ok(serialized.json);
  assert.ok(new TextEncoder().encode(serialized.json).byteLength <= PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES);
  return serialized.json;
}

function createNestedObject(childLevels) {
  const root = {};
  let cursor = root;
  for (let index = 0; index < childLevels; index += 1) {
    cursor.child = {};
    cursor = cursor.child;
  }
  return root;
}

const utf8Bytes = (value) => new TextEncoder().encode(value).byteLength;

test("DOM-149 append accepts the exact 16 MiB UTF-8 envelope boundary and rejects one byte over", () => {
  assert.equal(PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES, 1_048_576);
  const baseline = appendProjectQuoteRevisionToProjectFile(
    createProject({ customEnvelope: { payload: "" } }),
    createRevision()
  );
  assert.equal(baseline.status, "ready", baseline.diagnostics.join(" | "));
  assert.ok(baseline.project);
  const baselineBytes = utf8Bytes(JSON.stringify(baseline.project));
  const payloadBytes = PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES - baselineBytes;
  assert.ok(payloadBytes > 0);

  const exact = appendProjectQuoteRevisionToProjectFile(
    createProject({ customEnvelope: { payload: "x".repeat(payloadBytes) } }),
    createRevision()
  );
  assert.equal(exact.status, "ready", exact.diagnostics.join(" | "));
  assert.ok(exact.project);
  assert.equal(utf8Bytes(JSON.stringify(exact.project)), PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES);
  assert.ok(utf8Bytes(JSON.stringify(exact.project)) > PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES);

  const oversizedProject = createProject({
    customEnvelope: { payload: "x".repeat(payloadBytes + 1) }
  });
  const originalCustomEnvelope = oversizedProject.customEnvelope;
  const oversized = appendProjectQuoteRevisionToProjectFile(oversizedProject, createRevision());
  assert.equal(oversized.status, "blocked");
  assert.equal(oversized.project, null);
  assert.equal(oversized.history, null);
  assert.match(oversized.diagnostics.join(" | "), /16 MiB UTF-8/);
  assert.strictEqual(oversizedProject.customEnvelope, originalCustomEnvelope);
  assert.equal("quoteRevisionHistory" in oversizedProject, false);
});

test("DOM-149 append counts UTF-8 bytes rather than UTF-16 code units", () => {
  const payload = "🪵".repeat(Math.floor(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES / 4) + 1);
  assert.ok(payload.length < PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES);
  const project = createProject({ customEnvelope: { payload } });
  const result = appendProjectQuoteRevisionToProjectFile(project, createRevision("dom-149-utf8"));

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.history, null);
  assert.match(result.diagnostics.join(" | "), /16 MiB UTF-8/);
  assert.equal("quoteRevisionHistory" in project, false);
});

test("DOM-149 append and import enforce 64 nested object/array levels", () => {
  const withinLimit = appendProjectQuoteRevisionToProjectFile(
    createProject({ customEnvelope: createNestedObject(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH - 2) }),
    createRevision("dom-149-depth-ok")
  );
  assert.equal(withinLimit.status, "ready", withinLimit.diagnostics.join(" | "));

  const tooDeepProject = createProject({
    customEnvelope: createNestedObject(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH - 1)
  });
  const originalCustomEnvelope = tooDeepProject.customEnvelope;
  const tooDeepAppend = appendProjectQuoteRevisionToProjectFile(tooDeepProject, createRevision("dom-149-depth-append"));
  assert.equal(tooDeepAppend.status, "blocked");
  assert.equal(tooDeepAppend.project, null);
  assert.equal(tooDeepAppend.history, null);
  assert.match(tooDeepAppend.diagnostics.join(" | "), /64 iç içe/);
  assert.strictEqual(tooDeepProject.customEnvelope, originalCustomEnvelope);

  const tooDeepImportProject = createProject({
    customEnvelope: createNestedObject(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH - 1)
  });
  const historyFile = createHistoryFile();
  const tooDeepImport = importProjectQuoteRevisionHistoryFileIntoProject(tooDeepImportProject, historyFile);
  assert.equal(tooDeepImport.status, "blocked");
  assert.equal(tooDeepImport.project, null);
  assert.equal(tooDeepImport.history, null);
  assert.match(tooDeepImport.diagnostics.join(" | "), /64 iç içe/);
  assert.equal("quoteRevisionHistory" in tooDeepImportProject, false);
});

test("DOM-149 import blocks a merged project that would exceed the envelope cap", () => {
  const historyFile = createHistoryFile();
  const baseline = importProjectQuoteRevisionHistoryFileIntoProject(
    createProject({ customEnvelope: { payload: "" } }),
    historyFile
  );
  assert.equal(baseline.status, "ready", baseline.diagnostics.join(" | "));
  assert.ok(baseline.project);
  const baselineBytes = utf8Bytes(JSON.stringify(baseline.project));
  const payloadBytes = PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES - baselineBytes + 1;
  const target = createProject({ customEnvelope: { payload: "x".repeat(payloadBytes) } });
  assert.ok(utf8Bytes(JSON.stringify(target)) < PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES);
  const originalCustomEnvelope = target.customEnvelope;

  const result = importProjectQuoteRevisionHistoryFileIntoProject(target, historyFile);
  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.history, null);
  assert.match(result.diagnostics.join(" | "), /16 MiB UTF-8/);
  assert.strictEqual(target.customEnvelope, originalCustomEnvelope);
  assert.equal("quoteRevisionHistory" in target, false);
});
