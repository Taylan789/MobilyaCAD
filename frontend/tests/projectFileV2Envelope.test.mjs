import assert from "node:assert/strict";
import test from "node:test";

import {
  createProjectFileEnvelope,
  getProjectFileEnvelope,
  parseProjectFile,
  serializeProjectFile
} from "../src/engine/projectFile.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "../../domain/production/projectQuoteRevisionProjectFile.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "../../domain/production/projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "../../domain/production/projectQuotePricingSnapshot.ts";

const emptyProduction = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: []
});

const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-24",
  productionReport: emptyProduction,
  consumptionPriceTable: [],
  workItems: [],
  tariffTable: [],
  consumptionPriceList: null,
  laborOperationTariffList: null,
  quoteAdjustments: [{
    id: "int003-waste",
    category: "waste",
    description: "Kullanıcı tarafından girilen fire payı",
    quantity: 0.5,
    unit: "m2",
    unitPriceMinor: 1000,
    currencyCode: "TRY",
    sourceReference: "int003-fixture:v1"
  }]
});

assert.equal(snapshotResult.status, "ready");
assert.ok(snapshotResult.snapshot);

const room = { width: 4000, length: 5000, height: 2800, unit: "mm" };

function createFurniture() {
  return {
    id: "furniture-int003",
    catalogId: "kitchen-base",
    name: "Alt modül",
    width: 800,
    height: 720,
    depth: 560,
    position: [0, 0, 0],
    rotation: 0,
    color: "#ffffff",
    doorCount: 1,
    drawerCount: 0,
    shelfCount: 0,
    hasBackPanel: true,
    backThickness: 8,
    edgeBanding: true,
    material: "MDF",
    vendorFurnitureMetadata: { source: "fixture", nested: { keep: true } },
    drawerBoxSpecs: [],
    parts: [{
      id: "part-int003",
      name: "Kapak",
      type: "door",
      width: 397,
      height: 714,
      depth: 18,
      position: [0, 0, 0],
      rotation: 0,
      color: "#ffffff",
      material: "MDF",
      vendorPartMetadata: { machiningNote: "keep-as-data" }
    }]
  };
}

function createV2Project() {
  const vendorMetadata = {
    nested: { owner: "fixture", flags: ["preserve", "round-trip"] }
  };
  Object.defineProperty(vendorMetadata, "__proto__", {
    value: { preservedAsData: true },
    enumerable: true,
    configurable: true,
    writable: true
  });

  const project = {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "project-int003",
    savedAt: "2026-11-24T18:00:00.000Z",
    room: {
      ...room,
      vendorRoomMetadata: { gridProfile: "shop-floor", nested: { keep: true } }
    },
    furniture: [createFurniture()],
    materials: [{
      id: "mdf-white",
      name: "MDF Beyaz",
      category: "panel",
      decor: "Mat Beyaz",
      thicknessesMm: [18, 8],
      unit: "mm",
      vendorMaterialMetadata: { supplierCode: "SUP-42", nested: { keep: true } }
    }],
    vendorMetadata
  };

  Object.defineProperty(project, "__proto__", {
    value: { preservedAsData: "top-level" },
    enumerable: true,
    configurable: true,
    writable: true
  });
  return project;
}

function appendRevision(project, revisionId, createdAt) {
  const result = appendProjectQuoteRevisionToProjectFile(project, {
    revisionId,
    createdAt,
    pricingSnapshot: structuredClone(snapshotResult.snapshot)
  });
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.project);
  return result.project;
}

test("new editor projects start with a persistent v2 identity and empty validated history", () => {
  const envelope = createProjectFileEnvelope("new-project-int003");
  const json = serializeProjectFile(
    { width: room.width, length: room.length, height: room.height },
    [],
    "snapshot",
    [],
    envelope
  );
  const parsed = parseProjectFile(json);

  assert.equal(parsed.formatVersion, 2);
  assert.equal(parsed.projectId, "new-project-int003");
  const history = readProjectQuoteRevisionHistoryFromProjectFile(parsed);
  assert.equal(history.status, "empty");
  assert.deepEqual(history.history, {
    schemaVersion: 1,
    projectId: "new-project-int003",
    revisions: []
  });
});

test("editor save-open-save preserves two quote revisions and unknown nested/top-level metadata", () => {
  const first = appendRevision(createV2Project(), "quote-int003-r1", "2026-11-24T18:01:00+03:00");
  const second = appendRevision(first, "quote-int003-r2", "2026-11-24T18:02:00+03:00");

  const firstJson = JSON.stringify(second);
  const opened = parseProjectFile(firstJson);
  const envelope = getProjectFileEnvelope(opened, "must-not-replace-v2-id");
  const savedAgain = serializeProjectFile(
    { width: opened.room.width, length: opened.room.length, height: opened.room.height },
    opened.furniture,
    "snapshot",
    opened.materials ?? [],
    envelope
  );
  const reopened = parseProjectFile(savedAgain);
  const history = readProjectQuoteRevisionHistoryFromProjectFile(reopened);

  assert.equal(reopened.formatVersion, 2);
  assert.equal(reopened.projectId, "project-int003");
  assert.equal(history.status, "ready");
  assert.deepEqual(
    history.history?.revisions.map((revision) => ({
      revisionId: revision.revisionId,
      revisionNumber: revision.revisionNumber,
      previousRevisionId: revision.previousRevisionId
    })),
    [
      { revisionId: "quote-int003-r1", revisionNumber: 1, previousRevisionId: null },
      { revisionId: "quote-int003-r2", revisionNumber: 2, previousRevisionId: "quote-int003-r1" }
    ]
  );

  const expectedVendorMetadata = {
    nested: { owner: "fixture", flags: ["preserve", "round-trip"] }
  };
  Object.defineProperty(expectedVendorMetadata, "__proto__", {
    value: { preservedAsData: true },
    enumerable: true,
    configurable: true,
    writable: true
  });
  assert.deepEqual(reopened.vendorMetadata, expectedVendorMetadata);
  assert.equal(Object.prototype.hasOwnProperty.call(reopened, "__proto__"), true);
  assert.deepEqual(reopened.__proto__, { preservedAsData: "top-level" });
  assert.equal(Object.getPrototypeOf(reopened), Object.prototype);
  assert.deepEqual(reopened.room.vendorRoomMetadata, {
    gridProfile: "shop-floor",
    nested: { keep: true }
  });
  assert.deepEqual(reopened.furniture[0].vendorFurnitureMetadata, {
    source: "fixture",
    nested: { keep: true }
  });
  assert.deepEqual(reopened.furniture[0].parts[0].vendorPartMetadata, {
    machiningNote: "keep-as-data"
  });
  assert.deepEqual(reopened.materials?.[0].vendorMaterialMetadata, {
    supplierCode: "SUP-42",
    nested: { keep: true }
  });
});

test("legacy v1 opens without a history and migrates to v2 only when saved", () => {
  const legacy = {
    format: "MobilyaCAD",
    formatVersion: 1,
    savedAt: "2026-11-20T10:00:00.000Z",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm", legacyRoomMeta: { keep: true } },
    furniture: [],
    vendorMetadata: { source: "legacy-import", nested: { keep: true } }
  };
  const opened = parseProjectFile(JSON.stringify(legacy));
  const envelope = getProjectFileEnvelope(opened, "migrated-int003-project");
  const saved = serializeProjectFile(
    { width: opened.room.width, length: opened.room.length, height: opened.room.height },
    opened.furniture,
    "snapshot",
    opened.materials ?? [],
    envelope
  );
  const migrated = parseProjectFile(saved);

  assert.equal(opened.formatVersion, 1);
  assert.equal(migrated.formatVersion, 2);
  assert.equal(migrated.projectId, "migrated-int003-project");
  assert.deepEqual(migrated.vendorMetadata, legacy.vendorMetadata);
  assert.deepEqual(migrated.room.legacyRoomMeta, { keep: true });
  assert.equal(readProjectQuoteRevisionHistoryFromProjectFile(migrated).status, "empty");
});

test("v1 quote history is rejected instead of being silently discarded", () => {
  const legacy = {
    format: "MobilyaCAD",
    formatVersion: 1,
    room,
    furniture: [],
    quoteRevisionHistory: {
      schemaVersion: 1,
      projectId: "project-int003",
      revisions: []
    }
  };

  assert.throws(
    () => parseProjectFile(JSON.stringify(legacy)),
    /JSON v1 quoteRevisionHistory alanını desteklemez/
  );
});

test("v2 with mismatched quote-history identity is rejected by the domain contract", () => {
  const invalid = {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "project-int003",
    room,
    furniture: [],
    quoteRevisionHistory: {
      schemaVersion: 1,
      projectId: "another-project",
      revisions: []
    }
  };

  assert.throws(
    () => parseProjectFile(JSON.stringify(invalid)),
    /projectId/
  );
});
