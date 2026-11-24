import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  importProjectQuoteRevisionHistoryFileIntoProject,
  readProjectQuoteRevisionHistoryFromProjectFile
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


test("DOM-148 append preserves null-prototype records and treats __proto__ as ordinary JSON data", () => {
  const customEnvelope = Object.create(null);
  const protoPayload = { safe: true, nested: { value: 7 } };
  Object.defineProperty(customEnvelope, "__proto__", {
    value: protoPayload,
    enumerable: true,
    configurable: true,
    writable: true
  });
  const nullPrototypeNested = Object.create(null);
  nullPrototypeNested.label = "preserved";
  customEnvelope.nested = nullPrototypeNested;

  const project = createV2Project({ customEnvelope });
  const appended = appendProjectQuoteRevisionToProjectFile(project, {
    revisionId: "dom-148-proto-key",
    createdAt: "2026-11-24T17:30:00+03:00",
    pricingSnapshot: snapshotResult.snapshot
  });

  assert.equal(appended.status, "ready", appended.diagnostics.join(" | "));
  assert.ok(appended.project);
  const copied = appended.project.customEnvelope;
  assert.ok(Object.hasOwn(copied, "__proto__"));
  assert.deepEqual(copied["__proto__"], protoPayload);
  assert.notStrictEqual(copied["__proto__"], protoPayload);
  assert.notStrictEqual(copied["__proto__"].nested, protoPayload.nested);
  assert.equal(Object.getPrototypeOf(copied), Object.prototype);
  assert.equal(Object.getPrototypeOf(copied.nested), Object.prototype);
  assert.equal(Object.getPrototypeOf(customEnvelope), null);
  assert.equal(Object.getPrototypeOf(nullPrototypeNested), null);
  assert.ok(Object.isFrozen(copied["__proto__"]));
  assert.ok(Object.isFrozen(copied.nested));
  assert.equal("quoteRevisionHistory" in project, false);
});

test("DOM-148 append blocks sparse arrays without returning a partial project", () => {
  const sparse = new Array(2);
  sparse[1] = { id: "second-only" };
  const project = createV2Project({ customEnvelope: { sparse } });
  const result = appendProjectQuoteRevisionToProjectFile(project, {
    revisionId: "dom-148-sparse-array",
    createdAt: "2026-11-24T17:30:00+03:00",
    pricingSnapshot: snapshotResult.snapshot
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.history, null);
  assert.match(result.diagnostics.join(" | "), /JSON dışı dizi alanı/);
  assert.equal(sparse.length, 2);
  assert.equal(0 in sparse, false);
  assert.deepEqual(Object.keys(sparse), ["1"]);
  assert.equal("quoteRevisionHistory" in project, false);
  assert.strictEqual(project.customEnvelope.sparse, sparse);
});

test("DOM-148 append rejects object and array accessors without invoking getters", () => {
  let getterCalls = 0;
  const objectWithAccessor = {};
  Object.defineProperty(objectWithAccessor, "computed", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return "must-not-be-read";
    }
  });

  const arrayWithAccessor = [];
  Object.defineProperty(arrayWithAccessor, "0", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return "must-not-be-read";
    }
  });
  arrayWithAccessor.length = 1;

  for (const [index, customEnvelope] of [objectWithAccessor, { values: arrayWithAccessor }].entries()) {
    const project = createV2Project({ customEnvelope });
    const result = appendProjectQuoteRevisionToProjectFile(project, {
      revisionId: `dom-148-accessor-${index}`,
      createdAt: "2026-11-24T17:30:00+03:00",
      pricingSnapshot: snapshotResult.snapshot
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.project, null);
    assert.equal(result.history, null);
    assert.match(result.diagnostics.join(" | "), /JSON dışı (nesne|dizi) alanı/);
    assert.equal("quoteRevisionHistory" in project, false);
  }

  assert.equal(getterCalls, 0);
});

test("DOM-148 append rejects symbol and non-enumerable object/array properties", () => {
  const secret = Symbol("private");
  const objectWithSymbol = { visible: true };
  objectWithSymbol[secret] = "hidden";
  const objectWithHiddenProperty = { visible: true };
  Object.defineProperty(objectWithHiddenProperty, "hidden", {
    value: "not-json",
    enumerable: false
  });

  const arrayWithSymbol = ["visible"];
  arrayWithSymbol[secret] = "hidden";
  const arrayWithHiddenProperty = ["visible"];
  Object.defineProperty(arrayWithHiddenProperty, "hidden", {
    value: "not-json",
    enumerable: false
  });

  const invalidValues = [
    objectWithSymbol,
    objectWithHiddenProperty,
    { values: arrayWithSymbol },
    { values: arrayWithHiddenProperty }
  ];

  for (const [index, customEnvelope] of invalidValues.entries()) {
    const project = createV2Project({ customEnvelope });
    const result = appendProjectQuoteRevisionToProjectFile(project, {
      revisionId: `dom-148-descriptor-${index}`,
      createdAt: "2026-11-24T17:30:00+03:00",
      pricingSnapshot: snapshotResult.snapshot
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.project, null);
    assert.equal(result.history, null);
    assert.match(result.diagnostics.join(" | "), /JSON dışı (nesne|dizi) alanı/);
    assert.strictEqual(project.customEnvelope, customEnvelope);
    assert.equal("quoteRevisionHistory" in project, false);
  }
});

test("DOM-152 project envelope discriminator accessors are blocked without invoking getters", () => {
  const fields = [
    ["format", "MobilyaCAD"],
    ["formatVersion", 2],
    ["projectId", "project-42"]
  ];

  for (const [field, value] of fields) {
    let getterCalls = 0;
    const project = createV2Project();
    Object.defineProperty(project, field, {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return value;
      }
    });

    const read = readProjectQuoteRevisionHistoryFromProjectFile(project);
    assert.equal(read.status, "blocked", String(field));
    assert.equal(read.history, null);

    const appended = appendProjectQuoteRevisionToProjectFile(project, {
      revisionId: `dom-152-own-${field}`,
      createdAt: "2026-11-24T23:30:00+03:00",
      pricingSnapshot: snapshotResult.snapshot
    });
    assert.equal(appended.status, "blocked", String(field));
    assert.equal(appended.project, null);
    assert.equal(appended.history, null);
    assert.equal(getterCalls, 0, `${String(field)} getter must not run`);
  }
});

test("DOM-152 inherited project envelope discriminator accessors are rejected without invoking getters", () => {
  const fields = [
    ["format", "MobilyaCAD"],
    ["formatVersion", 2],
    ["projectId", "project-42"]
  ];

  for (const [field, value] of fields) {
    let getterCalls = 0;
    const project = createV2Project();
    delete project[field];
    const prototype = Object.create(Object.prototype);
    Object.defineProperty(prototype, field, {
      configurable: true,
      get() {
        getterCalls += 1;
        return value;
      }
    });
    Object.setPrototypeOf(project, prototype);

    const read = readProjectQuoteRevisionHistoryFromProjectFile(project);
    assert.equal(read.status, "blocked", String(field));
    assert.equal(read.history, null);

    const appended = appendProjectQuoteRevisionToProjectFile(project, {
      revisionId: `dom-152-inherited-${field}`,
      createdAt: "2026-11-24T23:30:00+03:00",
      pricingSnapshot: snapshotResult.snapshot
    });
    assert.equal(appended.status, "blocked", String(field));
    assert.equal(appended.project, null);
    assert.equal(appended.history, null);
    assert.equal(getterCalls, 0, `${String(field)} inherited getter must not run`);
  }
});

