import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  importProjectQuoteRevisionHistoryFileIntoProject
} from "./projectQuoteRevisionProjectFile.ts";
import { serializeProjectQuoteRevisionHistoryFile } from "./projectQuoteRevisionFile.ts";

const production = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: []
});
const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-21",
  productionReport: production,
  consumptionPriceTable: [],
  workItems: [],
  tariffTable: [],
  consumptionPriceList: null,
  laborOperationTariffList: null,
  quoteAdjustments: [{
    id: "dom-081-import-fixture",
    category: "profit",
    description: "Import fixture",
    quantity: 1,
    unit: "adet",
    unitPriceMinor: 100,
    currencyCode: "TRY",
    sourceReference: "dom-081-test:v1"
  }]
});
assert.equal(snapshotResult.status, "ready");
assert.ok(snapshotResult.snapshot);

function createV2Project(overrides = {}) {
  return {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "project-42",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: [],
    ...overrides
  };
}

function createSerializedHistory() {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
    revisionId: "dom-081-r1",
    createdAt: "2026-11-21T07:56:00+03:00",
    pricingSnapshot: snapshotResult.snapshot
  });
  assert.equal(source.status, "ready", source.diagnostics.join(" | "));
  assert.ok(source.history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(source.history);
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  return { history: source.history, json: serialized.json };
}

test("DOM-081 import preserves unrelated envelope data and isolates deep nested values", () => {
  const incoming = createSerializedHistory();
  const target = createV2Project({
    room: { width: 4200, length: 5100, height: 2900, unit: "mm", customRoomLabel: "studio" },
    furniture: [{ id: "cabinet-1", measurements: { width: 900, depth: 600 }, customTag: "keep" }],
    materials: [{ id: "material-1", decor: "oak", customMetadata: { supplierCode: "A-17" } }],
    customEnvelope: {
      version: 3,
      nested: { preserve: true },
      items: [{ id: "item-1", tags: ["keep", "exact"] }]
    }
  });
  const targetBefore = structuredClone(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, incoming.json);

  assert.equal(imported.status, "ready", imported.diagnostics.join(" | "));
  assert.ok(imported.project);
  assert.ok(imported.history);
  assert.deepEqual(imported.project, {
    ...targetBefore,
    quoteRevisionHistory: incoming.history
  });
  assert.strictEqual(imported.project.quoteRevisionHistory, imported.history);
  assert.notStrictEqual(imported.project.room, target.room);
  assert.notStrictEqual(imported.project.furniture, target.furniture);
  assert.notStrictEqual(imported.project.furniture[0].measurements, target.furniture[0].measurements);
  assert.notStrictEqual(imported.project.customEnvelope, target.customEnvelope);
  assert.notStrictEqual(imported.project.customEnvelope.items, target.customEnvelope.items);
  assert.notStrictEqual(imported.project.customEnvelope.items[0], target.customEnvelope.items[0]);
  assert.deepEqual(target, targetBefore);

  assert.ok(Object.isFrozen(imported.project));
  assert.ok(Object.isFrozen(imported.project.room));
  assert.ok(Object.isFrozen(imported.project.furniture[0].measurements));
  assert.ok(Object.isFrozen(imported.project.customEnvelope.items[0].tags));
  assert.throws(() => {
    imported.project.customEnvelope.items[0].tags[0] = "tampered";
  }, TypeError);
  assert.throws(() => {
    imported.project.customEnvelope.items.push({ id: "mutated" });
  }, TypeError);
  assert.deepEqual(target, targetBefore);
});

test("DOM-081 import rejects non-JSON or cyclic target envelope without partial output", () => {
  const incoming = createSerializedHistory();
  const unsupported = () => "not-json";
  const target = createV2Project({ customEnvelope: { unsupported } });
  const customEnvelopeBefore = target.customEnvelope;
  const result = importProjectQuoteRevisionHistoryFileIntoProject(target, incoming.json);

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.match(result.diagnostics.join(" | "), /JSON uyumlu olmayan değer/);
  assert.strictEqual(target.customEnvelope, customEnvelopeBefore);
  assert.equal("quoteRevisionHistory" in target, false);

  const cyclicTarget = createV2Project();
  const cyclic = {};
  cyclic.self = cyclic;
  cyclicTarget.customEnvelope = cyclic;
  const cycleBefore = cyclicTarget.customEnvelope;
  const cycleResult = importProjectQuoteRevisionHistoryFileIntoProject(cyclicTarget, incoming.json);
  assert.equal(cycleResult.status, "blocked");
  assert.equal(cycleResult.project, null);
  assert.match(cycleResult.diagnostics.join(" | "), /döngüsel veri/);
  assert.strictEqual(cyclicTarget.customEnvelope, cycleBefore);
  assert.equal("quoteRevisionHistory" in cyclicTarget, false);
});
