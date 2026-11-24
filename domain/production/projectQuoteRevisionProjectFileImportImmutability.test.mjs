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


test("DOM-147 append deep-clones and freezes nested project envelope data", () => {
  const project = createV2Project({
    room: { width: 4200, length: 5100, height: 2900, unit: "mm", customRoomLabel: "studio" },
    furniture: [{
      id: "cabinet-1",
      measurements: { width: 900, depth: 600 },
      tags: ["kitchen", "base"]
    }],
    materials: [{
      id: "material-1",
      decor: "oak",
      customMetadata: { supplierCode: "A-17" }
    }],
    customEnvelope: {
      version: 3,
      nested: { preserve: true },
      items: [{ id: "item-1", tags: ["keep", "exact"] }]
    }
  });
  const projectBefore = structuredClone(project);

  const appended = appendProjectQuoteRevisionToProjectFile(project, {
    revisionId: "dom-147-r1",
    createdAt: "2026-11-24T13:30:00+03:00",
    pricingSnapshot: snapshotResult.snapshot
  });

  assert.equal(appended.status, "ready", appended.diagnostics.join(" | "));
  assert.ok(appended.project);
  assert.ok(appended.history);
  assert.strictEqual(appended.project.quoteRevisionHistory, appended.history);
  assert.deepEqual(appended.project, {
    ...projectBefore,
    quoteRevisionHistory: appended.history
  });

  assert.notStrictEqual(appended.project.room, project.room);
  assert.notStrictEqual(appended.project.furniture, project.furniture);
  assert.notStrictEqual(appended.project.furniture[0], project.furniture[0]);
  assert.notStrictEqual(
    appended.project.furniture[0].measurements,
    project.furniture[0].measurements
  );
  assert.notStrictEqual(
    appended.project.materials[0].customMetadata,
    project.materials[0].customMetadata
  );
  assert.notStrictEqual(appended.project.customEnvelope.items[0].tags, project.customEnvelope.items[0].tags);
  assert.deepEqual(project, projectBefore);

  assert.ok(Object.isFrozen(appended.project));
  assert.ok(Object.isFrozen(appended.project.room));
  assert.ok(Object.isFrozen(appended.project.furniture[0].measurements));
  assert.ok(Object.isFrozen(appended.project.customEnvelope.items[0].tags));
  assert.throws(() => {
    appended.project.room.width = 1;
  }, TypeError);
  assert.throws(() => {
    appended.project.customEnvelope.items[0].tags.push("tampered");
  }, TypeError);
  assert.deepEqual(project, projectBefore);
});

test("DOM-147 append blocks non-JSON and cyclic envelopes without partial output or input mutation", () => {
  const nonJsonProject = createV2Project({
    customEnvelope: { unsupported: () => "not-json" }
  });
  const nonJsonEnvelope = nonJsonProject.customEnvelope;
  const nonJsonResult = appendProjectQuoteRevisionToProjectFile(nonJsonProject, {
    revisionId: "dom-147-invalid",
    createdAt: "2026-11-24T13:31:00+03:00",
    pricingSnapshot: snapshotResult.snapshot
  });

  assert.equal(nonJsonResult.status, "blocked");
  assert.equal(nonJsonResult.project, null);
  assert.equal(nonJsonResult.history, null);
  assert.match(nonJsonResult.diagnostics.join(" | "), /JSON uyumlu olmayan değer/);
  assert.strictEqual(nonJsonProject.customEnvelope, nonJsonEnvelope);
  assert.equal("quoteRevisionHistory" in nonJsonProject, false);

  const cyclicProject = createV2Project();
  const cyclicEnvelope = {};
  cyclicEnvelope.self = cyclicEnvelope;
  cyclicProject.customEnvelope = cyclicEnvelope;
  const cyclicResult = appendProjectQuoteRevisionToProjectFile(cyclicProject, {
    revisionId: "dom-147-cycle",
    createdAt: "2026-11-24T13:32:00+03:00",
    pricingSnapshot: snapshotResult.snapshot
  });

  assert.equal(cyclicResult.status, "blocked");
  assert.equal(cyclicResult.project, null);
  assert.equal(cyclicResult.history, null);
  assert.match(cyclicResult.diagnostics.join(" | "), /döngüsel veri/);
  assert.strictEqual(cyclicProject.customEnvelope, cyclicEnvelope);
  assert.equal("quoteRevisionHistory" in cyclicProject, false);
});

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
