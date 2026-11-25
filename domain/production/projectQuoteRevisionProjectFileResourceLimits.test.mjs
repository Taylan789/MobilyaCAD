import assert from "node:assert/strict";
import test from "node:test";

import { PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS } from "./projectQuoteRevision.ts";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  importProjectQuoteRevisionHistoryFileIntoProject,
  PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES,
  PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH,
  readProjectQuoteRevisionHistoryFromProjectFile
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


test("DOM-150 project-v2 history read accepts the exact UTF-8 envelope limit and blocks one byte over", () => {
  const baseline = createProject({ customEnvelope: { payload: "" } });
  const baselineRead = readProjectQuoteRevisionHistoryFromProjectFile(baseline);
  assert.equal(baselineRead.status, "empty");
  const payloadBytes = PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES - utf8Bytes(JSON.stringify(baseline));
  assert.ok(payloadBytes > 0);

  const exact = createProject({ customEnvelope: { payload: "x".repeat(payloadBytes) } });
  assert.equal(utf8Bytes(JSON.stringify(exact)), PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES);
  const exactRead = readProjectQuoteRevisionHistoryFromProjectFile(exact);
  assert.equal(exactRead.status, "empty", exactRead.diagnostics.join(" | "));

  const oversized = createProject({ customEnvelope: { payload: "x".repeat(payloadBytes + 1) } });
  const originalEnvelope = oversized.customEnvelope;
  const oversizedRead = readProjectQuoteRevisionHistoryFromProjectFile(oversized);
  assert.equal(oversizedRead.status, "blocked");
  assert.equal(oversizedRead.projectId, null);
  assert.equal(oversizedRead.history, null);
  assert.match(oversizedRead.diagnostics.join(" | "), /16 MiB UTF-8/);
  assert.strictEqual(oversized.customEnvelope, originalEnvelope);
  assert.equal("quoteRevisionHistory" in oversized, false);
});

test("DOM-150 project-v2 history read enforces the 64-level limit while preserving legacy v1 reads", () => {
  const exactDepth = createProject({
    customEnvelope: createNestedObject(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH - 2)
  });
  const exactRead = readProjectQuoteRevisionHistoryFromProjectFile(exactDepth);
  assert.equal(exactRead.status, "empty", exactRead.diagnostics.join(" | "));

  const tooDeep = createProject({
    customEnvelope: createNestedObject(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH - 1)
  });
  const originalEnvelope = tooDeep.customEnvelope;
  const blocked = readProjectQuoteRevisionHistoryFromProjectFile(tooDeep);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.history, null);
  assert.match(blocked.diagnostics.join(" | "), /64 iç içe/);
  assert.strictEqual(tooDeep.customEnvelope, originalEnvelope);

  const legacy = {
    format: "MobilyaCAD",
    formatVersion: 1,
    customEnvelope: createNestedObject(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH + 8)
  };
  assert.equal(readProjectQuoteRevisionHistoryFromProjectFile(legacy).status, "legacy");
});

test("DOM-150 project-v2 history read rejects accessor fields without invoking getters", () => {
  let getterCalls = 0;
  const customEnvelope = {};
  Object.defineProperty(customEnvelope, "computed", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "must-not-be-read";
    }
  });
  const project = createProject({ customEnvelope });
  const result = readProjectQuoteRevisionHistoryFromProjectFile(project);

  assert.equal(result.status, "blocked");
  assert.equal(result.history, null);
  assert.match(result.diagnostics.join(" | "), /JSON dışı nesne alanı/);
  assert.equal(getterCalls, 0);
  assert.strictEqual(project.customEnvelope, customEnvelope);
  assert.equal("quoteRevisionHistory" in project, false);
});


test("DOM-157 project-v2 append checks revision capacity before cloning an oversized envelope", () => {
  let existingRevisionGetterCalls = 0;
  const revisions = new Array(PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS);
  Object.defineProperty(revisions, "0", {
    enumerable: true,
    configurable: true,
    get() {
      existingRevisionGetterCalls += 1;
      return {};
    }
  });
  const history = {
    schemaVersion: 1,
    projectId: "project-dom-149",
    revisions
  };
  const customEnvelope = {
    payload: "x".repeat(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES + 1)
  };
  const project = createProject({ customEnvelope, quoteRevisionHistory: history });

  let incomingRevisionGetterCalls = 0;
  const incomingRevision = createRevision("dom-157-incoming");
  Object.defineProperty(incomingRevision, "revisionId", {
    enumerable: true,
    configurable: true,
    get() {
      incomingRevisionGetterCalls += 1;
      return "dom-157-incoming";
    }
  });

  const result = appendProjectQuoteRevisionToProjectFile(project, incomingRevision);

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.history, null);
  assert.match(result.diagnostics.join(" | "), /en fazla 2000 revizyon/);
  assert.equal(existingRevisionGetterCalls, 0);
  assert.equal(incomingRevisionGetterCalls, 0);
  assert.strictEqual(project.customEnvelope, customEnvelope);
  assert.strictEqual(project.quoteRevisionHistory, history);
  assert.strictEqual(project.quoteRevisionHistory.revisions, revisions);
});

// DOM-158 — standalone history import preflight

test("DOM-158 import rejects a non-empty target history before traversing an oversized project envelope", () => {
  const existing = appendProjectQuoteRevisionToProjectFile(
    createProject(),
    createRevision("dom-158-existing")
  );
  assert.equal(existing.status, "ready", existing.diagnostics.join(" | "));
  assert.ok(existing.history);

  const customEnvelope = {
    payload: "x".repeat(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES + 1)
  };
  const project = createProject({
    customEnvelope,
    quoteRevisionHistory: existing.history
  });
  const historyFile = createHistoryFile();
  const result = importProjectQuoteRevisionHistoryFileIntoProject(project, historyFile);

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.history, null);
  assert.match(result.diagnostics.join(" | "), /zaten teklif revizyon geçmişi içeriyor/);
  assert.strictEqual(project.customEnvelope, customEnvelope);
  assert.strictEqual(project.quoteRevisionHistory, existing.history);
});

test("DOM-158 import rejects an accessor-backed target history without invoking its getter", () => {
  let getterCalls = 0;
  const project = createProject();
  Object.defineProperty(project, "quoteRevisionHistory", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return { schemaVersion: 1, projectId: "project-dom-149", revisions: [] };
    }
  });

  const result = importProjectQuoteRevisionHistoryFileIntoProject(project, createHistoryFile());

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.history, null);
  assert.match(result.diagnostics.join(" | "), /JSON dışı nesne alanı/);
  assert.equal(getterCalls, 0);
});

test("DOM-158 import keeps empty v2 history import and v1 legacy rejection", () => {
  const emptyHistory = {
    schemaVersion: 1,
    projectId: "project-dom-149",
    revisions: []
  };
  const project = createProject({ quoteRevisionHistory: emptyHistory });
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(project, createHistoryFile());

  assert.equal(imported.status, "ready", imported.diagnostics.join(" | "));
  assert.equal(imported.history?.revisions.length, 1);
  assert.equal(imported.project?.quoteRevisionHistory?.revisions.length, 1);
  assert.strictEqual(project.quoteRevisionHistory, emptyHistory);

  const legacy = {
    format: "MobilyaCAD",
    formatVersion: 1,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" }
  };
  const legacyResult = importProjectQuoteRevisionHistoryFileIntoProject(legacy, createHistoryFile());
  assert.equal(legacyResult.status, "blocked");
  assert.equal(legacyResult.project, null);
  assert.equal(legacyResult.history, null);
  assert.match(legacyResult.diagnostics.join(" | "), /JSON v1/);
});

test("DOM-159 legacy v1 reflection failures return blocked results from all project-history APIs", () => {
  function createLegacyProjectWithThrowingHistoryDescriptor() {
    let descriptorTrapCalls = 0;
    const project = new Proxy({
      format: "MobilyaCAD",
      formatVersion: 1
    }, {
      getOwnPropertyDescriptor(target, key) {
        if (key === "quoteRevisionHistory") {
          descriptorTrapCalls += 1;
          throw new Error("synthetic descriptor reflection failure");
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
      }
    });
    return { project, descriptorTrapCalls: () => descriptorTrapCalls };
  }

  const readTarget = createLegacyProjectWithThrowingHistoryDescriptor();
  const read = readProjectQuoteRevisionHistoryFromProjectFile(readTarget.project);
  assert.equal(read.status, "blocked");
  assert.equal(read.projectId, null);
  assert.equal(read.history, null);
  assert.match(read.diagnostics.join(" | "), /güvenli biçimde incelenemedi/);
  assert.equal(readTarget.descriptorTrapCalls(), 1);

  const appendTarget = createLegacyProjectWithThrowingHistoryDescriptor();
  const appended = appendProjectQuoteRevisionToProjectFile(
    appendTarget.project,
    createRevision("dom-159-append")
  );
  assert.equal(appended.status, "blocked");
  assert.equal(appended.project, null);
  assert.equal(appended.history, null);
  assert.match(appended.diagnostics.join(" | "), /güvenli biçimde incelenemedi/);
  assert.equal(appendTarget.descriptorTrapCalls(), 1);

  const importTarget = createLegacyProjectWithThrowingHistoryDescriptor();
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(
    importTarget.project,
    createHistoryFile()
  );
  assert.equal(imported.status, "blocked");
  assert.equal(imported.project, null);
  assert.equal(imported.history, null);
  assert.match(imported.diagnostics.join(" | "), /güvenli biçimde incelenemedi/);
  assert.equal(importTarget.descriptorTrapCalls(), 1);
});
