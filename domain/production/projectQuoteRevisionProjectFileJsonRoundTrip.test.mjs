import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  PROJECT_QUOTE_REVISION_HISTORY_FIELD,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "./projectQuoteRevisionProjectFile.ts";

const productionReport = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: []
});
const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-24",
  productionReport,
  consumptionPriceTable: [],
  workItems: [],
  tariffTable: [],
  consumptionPriceList: null,
  laborOperationTariffList: null,
  quoteAdjustments: [{
    id: "dom-151-fixture",
    category: "waste",
    description: "DOM-151 test fixture",
    quantity: 1,
    unit: "adet",
    unitPriceMinor: 1000,
    currencyCode: "TRY",
    sourceReference: "dom-151:test"
  }]
});

assert.equal(snapshotResult.status, "ready");
assert.ok(snapshotResult.snapshot);

function createV2Project(overrides = {}) {
  return {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "dom-151-project",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [{
      id: "furniture-1",
      dimensionsMm: [800, 720, 560],
      futurePartMetadata: { source: "future-module:v1" }
    }],
    materials: [{
      id: "mdf-18",
      name: "MDF 18",
      category: "panel",
      thicknessesMm: [18],
      unit: "mm"
    }],
    ...overrides
  };
}

function createRevision(revisionId, createdAt) {
  return {
    revisionId,
    createdAt,
    pricingSnapshot: structuredClone(snapshotResult.snapshot)
  };
}

test("DOM-151 JSON v2 stringify/parse round-trip preserves quote history and unknown envelope metadata", () => {
  const futureEnvelope = JSON.parse(
    '{"schema":"future-module:v1","nested":{"labels":["özel","panel"],"revision":4},"__proto__":{"polluted":true}}'
  );
  const topLevelFutureField = JSON.parse('{"__proto__":{"future":"safe"}}');
  const sourceProject = {
    ...createV2Project({ futureEnvelope }),
    ...topLevelFutureField
  };

  const first = appendProjectQuoteRevisionToProjectFile(
    sourceProject,
    createRevision("quote-r1", "2026-11-24T18:00:00+03:00")
  );
  assert.equal(first.status, "ready", first.diagnostics.join(" | "));
  assert.ok(first.project);

  const second = appendProjectQuoteRevisionToProjectFile(
    first.project,
    createRevision("quote-r2", "2026-11-24T19:00:00+03:00")
  );
  assert.equal(second.status, "ready", second.diagnostics.join(" | "));
  assert.ok(second.project);
  assert.equal(second.history?.revisions[1].previousRevisionId, "quote-r1");

  const persistedJson = JSON.stringify(second.project);
  const restoredProject = JSON.parse(persistedJson);
  const restoredHistory = readProjectQuoteRevisionHistoryFromProjectFile(restoredProject);

  assert.equal(restoredHistory.status, "ready", restoredHistory.diagnostics.join(" | "));
  assert.deepEqual(restoredHistory.history, second.history);
  assert.deepEqual(restoredProject.futureEnvelope, futureEnvelope);
  assert.equal(Object.hasOwn(restoredProject, "__proto__"), true);
  assert.deepEqual(restoredProject.__proto__, { future: "safe" });
  assert.strictEqual(Object.getPrototypeOf(restoredProject), Object.prototype);
  assert.equal(Object.hasOwn(restoredProject.futureEnvelope, "__proto__"), true);
  assert.deepEqual(restoredProject.futureEnvelope.__proto__, { polluted: true });
  assert.strictEqual(Object.getPrototypeOf(restoredProject.futureEnvelope), Object.prototype);
  assert.equal(({}).polluted, undefined);

  const third = appendProjectQuoteRevisionToProjectFile(
    restoredProject,
    createRevision("quote-r3", "2026-11-24T20:00:00+03:00")
  );
  assert.equal(third.status, "ready", third.diagnostics.join(" | "));
  assert.ok(third.project);
  assert.equal(third.history?.revisions.length, 3);
  assert.equal(third.history?.revisions[2].previousRevisionId, "quote-r2");

  const reloadedProject = JSON.parse(JSON.stringify(third.project));
  const reloadedHistory = readProjectQuoteRevisionHistoryFromProjectFile(reloadedProject);
  assert.equal(reloadedHistory.status, "ready", reloadedHistory.diagnostics.join(" | "));
  assert.deepEqual(reloadedHistory.history, third.history);
  assert.deepEqual(reloadedProject.futureEnvelope, futureEnvelope);
  assert.deepEqual(reloadedProject.furniture, sourceProject.furniture);
  assert.deepEqual(reloadedProject.materials, sourceProject.materials);
});

test("DOM-151 JSON v1 legacy history read remains unchanged and cannot carry the v2 extension", () => {
  const legacyProject = {
    format: "MobilyaCAD",
    formatVersion: 1,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: []
  };

  const legacyRead = readProjectQuoteRevisionHistoryFromProjectFile(legacyProject);
  assert.equal(legacyRead.status, "legacy");
  assert.equal(legacyRead.projectId, null);
  assert.equal(legacyRead.history, null);

  const v1WithHistory = {
    ...legacyProject,
    [PROJECT_QUOTE_REVISION_HISTORY_FIELD]: {
      schemaVersion: 1,
      projectId: "dom-151-project",
      revisions: []
    }
  };
  const blockedRead = readProjectQuoteRevisionHistoryFromProjectFile(v1WithHistory);
  assert.equal(blockedRead.status, "blocked");
  assert.equal(blockedRead.projectId, null);
  assert.equal(blockedRead.history, null);
});
