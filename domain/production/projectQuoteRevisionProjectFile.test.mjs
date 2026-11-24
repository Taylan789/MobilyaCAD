import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  importProjectQuoteRevisionHistoryFileIntoProject,
  PROJECT_QUOTE_REVISION_HISTORY_FIELD,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "./projectQuoteRevisionProjectFile.ts";
import { serializeProjectQuoteRevisionHistoryFile } from "./projectQuoteRevisionFile.ts";
import {
  calculateProjectQuoteRevisionSourceIntegrityAudit,
  calculateProjectQuoteRevisionSourceMapAudit,
  compareProjectQuoteRevisions,
  createProjectQuoteRevision
} from "./projectQuoteRevision.ts";

const emptyProduction = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: []
});

const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-18",
  productionReport: emptyProduction,
  consumptionPriceTable: [],
  workItems: [],
  tariffTable: [],
  consumptionPriceList: null,
  laborOperationTariffList: null,
  quoteAdjustments: [{
    id: "waste-project-file",
    category: "waste",
    description: "Kullanıcı tarafından girilen fire payı",
    quantity: 0.5,
    unit: "m2",
    unitPriceMinor: 1000,
    currencyCode: "TRY",
    sourceReference: "atolye-fire-hesabi:v1"
  }, {
    id: "profit-project-file",
    category: "profit",
    description: "Kullanıcı tarafından girilen teklif kârı",
    quantity: 1,
    unit: "adet",
    unitPriceMinor: 2500,
    currencyCode: "TRY",
    sourceReference: "teklif-kalemleri:rev1"
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

function createRevision(overrides = {}) {
  return {
    revisionId: "quote-r1",
    createdAt: "2026-11-18T01:00:00+03:00",
    pricingSnapshot: structuredClone(snapshotResult.snapshot),
    ...overrides
  };
}

function createStockBasisSnapshot() {
  const snapshot = structuredClone(snapshotResult.snapshot);
  const baseCost = snapshot.quoteSummary.costSummary;
  assert.ok(baseCost);
  const panelCost = 12500;
  snapshot.schemaVersion = 2;
  snapshot.materialCostBasis = {
    schemaVersion: 1,
    basis: "stock-sheet-purchase",
    currencyCode: "TRY",
    panelMaterialCostMinor: panelCost,
    edgeBandingCostMinor: 0,
    materialCategoryTotalMinor: panelCost,
    categoryTotalsMinor: {
      ...baseCost.categoryTotalsMinor,
      material: panelCost
    },
    grandTotalMinor: baseCost.grandTotalMinor + panelCost,
    materialSourceCount: 1,
    stockSheetGroups: [{
      groupId: JSON.stringify(["mdf-18", 180]),
      materialId: "mdf-18",
      thicknessMm: 18,
      sourcePartIds: ["part-a"],
      sheetCount: 1,
      pricePerSheetMinor: panelCost,
      stockSheetCostMinor: panelCost,
      currencyCode: "TRY",
      sourceReference: "stock-sheet-price:v1"
    }]
  };
  return snapshot;
}


function createRollSnapshot() {
  const snapshot = structuredClone(snapshotResult.snapshot);
  snapshot.consumptionPriceList = {
    catalogId: "workshop-materials",
    version: "2026-11",
    effectiveFrom: "2026-11-01",
    effectiveTo: "2026-11-30"
  };
  const quoteSummary = snapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  assert.ok(costSummary);
  const lineTotalMinor = 30000;
  const line = {
    id: "edge-roll-pvc-a",
    category: "material",
    description: "PVC rulo satın alımı",
    quantity: 2,
    unit: "rulo",
    unitPriceMinor: 15000,
    lineTotalMinor,
    currencyCode: "TRY",
    sourceReference: "roll-prices:v1"
  };
  costSummary.lines.push(line);
  costSummary.lineCount = costSummary.lines.length;
  costSummary.categoryTotalsMinor.material += lineTotalMinor;
  costSummary.grandTotalMinor += lineTotalMinor;
  quoteSummary.requiredLineCount += 1;
  quoteSummary.pricedLineCount += 1;
  quoteSummary.lineSources.push({
    costLineId: line.id,
    sourceType: "production-consumption",
    sourceId: line.id,
    sourcePartIds: ["part-a", "part-b"],
    resourceType: "edge-banding",
    resourceId: "pvc-a",
    unit: "rulo",
    rollCount: 2,
    rollLengthMm: 100000,
    purchasedLengthMm: 200000,
    furnitureIds: ["cabinet-a"],
    planSourceReference: "roll-spec:v1",
    priceSourceReference: "roll-prices:v1"
  });
  return snapshot;
}

test("JSON v1 geçmiş alanı olmadan legacy kalır ve v1'e append engellenir", () => {
  const legacy = {
    format: "MobilyaCAD",
    formatVersion: 1,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: []
  };

  const read = readProjectQuoteRevisionHistoryFromProjectFile(legacy);
  const append = appendProjectQuoteRevisionToProjectFile(legacy, createRevision());

  assert.equal(read.status, "legacy");
  assert.equal(read.history, null);
  assert.equal(append.status, "blocked");
  assert.equal(append.project, null);
  assert.equal(PROJECT_QUOTE_REVISION_HISTORY_FIELD in legacy, false);
});

test("JSON v1 içine quoteRevisionHistory yazılmışsa sessiz veri kaybını önlemek için bloklanır", () => {
  const legacyWithExtension = {
    format: "MobilyaCAD",
    formatVersion: 1,
    quoteRevisionHistory: { schemaVersion: 1, projectId: "project-42", revisions: [] }
  };

  const result = readProjectQuoteRevisionHistoryFromProjectFile(legacyWithExtension);

  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /JSON v1 quoteRevisionHistory alanını desteklemez/);
});

test("JSON v2 uzantısı bulunmadığında proje kimliğiyle boş geçmiş verir", () => {
  const project = createV2Project();
  const result = readProjectQuoteRevisionHistoryFromProjectFile(project);

  assert.equal(result.status, "empty");
  assert.equal(result.projectId, "project-42");
  assert.deepEqual(result.history, {
    schemaVersion: 1,
    projectId: "project-42",
    revisions: []
  });
  assert.equal(PROJECT_QUOTE_REVISION_HISTORY_FIELD in project, false);
});

test("ilk revizyon v2 proje dosyasına eklenir, input değiştirilmez ve tekrar okunabilir", () => {
  const project = createV2Project();
  const result = appendProjectQuoteRevisionToProjectFile(project, createRevision());

  assert.equal(result.status, "ready");
  assert.ok(result.project);
  assert.equal(result.history?.revisions.length, 1);
  assert.equal(result.history?.revisions[0].revisionId, "quote-r1");
  assert.equal(PROJECT_QUOTE_REVISION_HISTORY_FIELD in project, false);
  assert.notEqual(result.project, project);

  const read = readProjectQuoteRevisionHistoryFromProjectFile(result.project);
  assert.equal(read.status, "ready");
  assert.equal(read.history?.revisions[0].previousRevisionId, null);
  assert.equal(read.history?.revisions[0].revisionNumber, 1);
  assert.ok(Object.isFrozen(read.history));
});

test("fire ve kâr satırlarının kaynak izi JSON v2 proje geçmişi round-trip'inde korunur", () => {
  const result = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(result.status, "ready");
  assert.ok(result.project);

  const read = readProjectQuoteRevisionHistoryFromProjectFile(result.project);
  assert.equal(read.status, "ready");
  const revision = read.history?.revisions[0];
  assert.ok(revision);
  assert.equal(revision.sourceIntegrityVersion, 1);

  const quoteSummary = revision.pricingSnapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  assert.ok(costSummary);
  assert.equal(costSummary.categoryTotalsMinor.waste, 500);
  assert.equal(costSummary.categoryTotalsMinor.profit, 2500);
  assert.equal(costSummary.grandTotalMinor, 3000);

  assert.deepEqual(costSummary.lines.map((line) => ({
    id: line.id,
    category: line.category,
    quantity: line.quantity,
    unit: line.unit,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    currencyCode: line.currencyCode,
    sourceReference: line.sourceReference
  })), [
    {
      id: "adjustment-0001",
      category: "waste",
      quantity: 0.5,
      unit: "m2",
      unitPriceMinor: 1000,
      lineTotalMinor: 500,
      currencyCode: "TRY",
      sourceReference: "atolye-fire-hesabi:v1"
    },
    {
      id: "adjustment-0002",
      category: "profit",
      quantity: 1,
      unit: "adet",
      unitPriceMinor: 2500,
      lineTotalMinor: 2500,
      currencyCode: "TRY",
      sourceReference: "teklif-kalemleri:rev1"
    }
  ]);
  assert.deepEqual(quoteSummary.lineSources, [
    {
      costLineId: "adjustment-0001",
      sourceType: "quote-adjustment",
      sourceId: "waste-project-file"
    },
    {
      costLineId: "adjustment-0002",
      sourceType: "quote-adjustment",
      sourceId: "profit-project-file"
    }
  ]);
});

test("ikinci revizyon önceki kayda bağlanır ve eski proje snapshot'ı değişmez", () => {
  const first = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(first.status, "ready");
  assert.ok(first.project);

  const second = appendProjectQuoteRevisionToProjectFile(first.project, createRevision({
    revisionId: "quote-r2",
    createdAt: "2026-11-18T02:00:00+03:00"
  }));

  assert.equal(second.status, "ready");
  assert.equal(second.history?.revisions.length, 2);
  assert.equal(second.history?.revisions[1].revisionNumber, 2);
  assert.equal(second.history?.revisions[1].previousRevisionId, "quote-r1");
  assert.equal(first.history?.revisions.length, 1);
});

test("proje ve geçmiş kimlikleri farklıysa geçmiş okunmaz ve append yapılmaz", () => {
  const project = createV2Project({
    quoteRevisionHistory: {
      schemaVersion: 1,
      projectId: "another-project",
      revisions: []
    }
  });

  const read = readProjectQuoteRevisionHistoryFromProjectFile(project);
  const append = appendProjectQuoteRevisionToProjectFile(project, createRevision());

  assert.equal(read.status, "blocked");
  assert.match(read.diagnostics[0], /projectId değeri.*eşleşmelidir/);
  assert.equal(append.status, "blocked");
  assert.equal(append.project, null);
});

test("bozuk veya desteklenmeyen geçmişte kısmi proje sonucu döndürülmez", () => {
  const project = createV2Project({
    quoteRevisionHistory: { schemaVersion: 1, projectId: "project-42", revisions: [{}] }
  });

  const read = readProjectQuoteRevisionHistoryFromProjectFile(project);
  const append = appendProjectQuoteRevisionToProjectFile(project, createRevision());

  assert.equal(read.status, "blocked");
  assert.equal(read.history, null);
  assert.equal(append.status, "blocked");
  assert.equal(append.project, null);
});

test("v2 kararlı projectId olmadan ve desteklenmeyen proje sürümleriyle kullanılamaz", () => {
  const missingId = readProjectQuoteRevisionHistoryFromProjectFile(createV2Project({
    projectId: undefined
  }));
  const unsupported = readProjectQuoteRevisionHistoryFromProjectFile(createV2Project({
    formatVersion: 3
  }));

  assert.equal(missingId.status, "blocked");
  assert.match(missingId.diagnostics[0], /kararlı ve geçerli projectId/);
  assert.equal(unsupported.status, "blocked");
  assert.match(unsupported.diagnostics[0], /yalnızca MobilyaCAD proje JSON v1 veya v2/);
});

test("yinelenen revizyon kimliği veya geçersiz snapshot append'i bloklar ve kaynak projeyi korur", () => {
  const first = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(first.status, "ready");
  assert.ok(first.project);

  const duplicate = appendProjectQuoteRevisionToProjectFile(
    first.project,
    createRevision({ revisionId: "quote-r1", createdAt: "2026-11-18T02:00:00+03:00" })
  );
  const invalidSnapshot = appendProjectQuoteRevisionToProjectFile(
    first.project,
    createRevision({ revisionId: "quote-r2", pricingSnapshot: {} })
  );

  assert.equal(duplicate.status, "blocked");
  assert.equal(duplicate.project, null);
  assert.equal(invalidSnapshot.status, "blocked");
  assert.equal(invalidSnapshot.project, null);
  assert.equal(first.history?.revisions.length, 1);
});
test("roll purchase metadata survives JSON v2 quote-history append/read round-trip", () => {
  const result = appendProjectQuoteRevisionToProjectFile(
    createV2Project(),
    createRevision({ pricingSnapshot: createRollSnapshot() })
  );
  assert.equal(result.status, "ready", result.diagnostics.join(" | "));
  assert.ok(result.project);

  const read = readProjectQuoteRevisionHistoryFromProjectFile(result.project);
  assert.equal(read.status, "ready");
  const revision = read.history?.revisions[0];
  assert.ok(revision);
  const summary = revision.pricingSnapshot.quoteSummary;
  const rollLine = summary.costSummary.lines.find(line => line.unit === "rulo");
  const rollSource = summary.lineSources.find(source => source.unit === "rulo");
  assert.ok(rollLine);
  assert.ok(rollSource);
  assert.equal(rollLine.quantity, 2);
  assert.equal(rollLine.unitPriceMinor, 15000);
  assert.equal(rollLine.lineTotalMinor, 30000);
  assert.equal(rollSource.rollCount, 2);
  assert.equal(rollSource.rollLengthMm, 100000);
  assert.equal(rollSource.purchasedLengthMm, 200000);
  assert.deepEqual(rollSource.sourcePartIds, ["part-a", "part-b"]);
  assert.deepEqual(rollSource.furnitureIds, ["cabinet-a"]);
  assert.equal(rollSource.planSourceReference, "roll-spec:v1");
  assert.equal(rollSource.priceSourceReference, "roll-prices:v1");
});

test("standalone revision history imports into an empty matching v2 project without mutating either input", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(source.status, "ready");
  assert.ok(source.history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(source.history);
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);

  const target = createV2Project();
  const targetBefore = structuredClone(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, serialized.json);

  assert.equal(imported.status, "ready", imported.diagnostics.join(" | "));
  assert.ok(imported.project);
  assert.ok(imported.history);
  assert.deepEqual(imported.history, source.history);
  assert.deepEqual(imported.project.quoteRevisionHistory, source.history);
  assert.deepEqual(target, targetBefore);
  assert.equal(PROJECT_QUOTE_REVISION_HISTORY_FIELD in target, false);
  assert.equal(imported.history.revisions[0].previousRevisionId, null);
  const read = readProjectQuoteRevisionHistoryFromProjectFile(imported.project);
  assert.equal(read.status, "ready");
  assert.deepEqual(read.history, source.history);
});

test("standalone history import rejects a foreign projectId and leaves the target unchanged", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.ok(source.history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(source.history);
  assert.ok(serialized.json);
  const target = createV2Project({ projectId: "different-project" });
  const before = structuredClone(target);

  const result = importProjectQuoteRevisionHistoryFileIntoProject(target, serialized.json);

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.match(result.diagnostics.join(" | "), /projectId değeri.*eşleşmelidir/);
  assert.deepEqual(target, before);
});

test("standalone history import never overwrites an existing non-empty project history", () => {
  const targetHistory = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.ok(targetHistory.project);
  const incoming = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision({
    revisionId: "incoming-r1"
  }));
  assert.ok(incoming.history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(incoming.history);
  assert.ok(serialized.json);
  const targetBefore = structuredClone(targetHistory.project);

  const result = importProjectQuoteRevisionHistoryFileIntoProject(targetHistory.project, serialized.json);

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.match(result.diagnostics.join(" | "), /sessizce değiştiremez/);
  assert.deepEqual(targetHistory.project, targetBefore);
  assert.equal(targetHistory.history?.revisions.length, 1);
});

test("standalone history import rejects malformed, empty and legacy v1 project inputs", () => {
  const emptyHistory = serializeProjectQuoteRevisionHistoryFile({
    schemaVersion: 1,
    projectId: "project-42",
    revisions: []
  });
  assert.ok(emptyHistory.json);
  const malformed = importProjectQuoteRevisionHistoryFileIntoProject(createV2Project(), "{bad json");
  const empty = importProjectQuoteRevisionHistoryFileIntoProject(createV2Project(), emptyHistory.json);
  const legacy = importProjectQuoteRevisionHistoryFileIntoProject({
    format: "MobilyaCAD",
    formatVersion: 1,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: []
  }, emptyHistory.json);

  assert.equal(malformed.status, "blocked");
  assert.equal(malformed.project, null);
  assert.match(malformed.diagnostics.join(" | "), /JSON metni|geçerli JSON/);
  assert.equal(empty.status, "blocked");
  assert.equal(empty.project, null);
  assert.match(empty.diagnostics.join(" | "), /Boş teklif revizyon geçmişi/);
  assert.equal(legacy.status, "blocked");
  assert.equal(legacy.project, null);
  assert.match(legacy.diagnostics.join(" | "), /JSON v1 dosyasına aktarılamaz/);
});

// DOM-080 import hardening fixtures: serialized files are mutated only after
// a valid history has been generated, so the importer—not the fixture setup—
// is exercised against adversarial payloads.
function serializeImportFixture(history) {
  const serialized = serializeProjectQuoteRevisionHistoryFile(history);
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  return serialized.json;
}

test("standalone import blocks duplicate revision IDs and preserves the target", () => {
  const first = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(first.status, "ready");
  assert.ok(first.project);
  const second = appendProjectQuoteRevisionToProjectFile(first.project, createRevision({
    revisionId: "quote-r2",
    createdAt: "2026-11-18T02:00:00+03:00"
  }));
  assert.equal(second.status, "ready");
  assert.ok(second.history);

  const payload = JSON.parse(serializeImportFixture(second.history));
  payload.history.revisions[1].revisionId = payload.history.revisions[0].revisionId;
  const target = createV2Project();
  const before = structuredClone(target);
  const result = importProjectQuoteRevisionHistoryFileIntoProject(target, JSON.stringify(payload));

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.match(result.diagnostics.join(" | "), /revisionId değerleri benzersiz/);
  assert.deepEqual(target, before);
});

test("standalone import blocks a foreign revision inside a matching history envelope", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.ok(source.history);
  const payload = JSON.parse(serializeImportFixture(source.history));
  payload.history.revisions[0].projectId = "foreign-project";
  const target = createV2Project();
  const before = structuredClone(target);
  const result = importProjectQuoteRevisionHistoryFileIntoProject(target, JSON.stringify(payload));

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.match(result.diagnostics.join(" | "), /aynı proje kimliğine ait/);
  assert.deepEqual(target, before);
});

test("standalone import blocks unsupported revision integrity metadata", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.ok(source.history);
  const payload = JSON.parse(serializeImportFixture(source.history));
  payload.history.revisions[0].sourceIntegrityVersion = 2;
  const target = createV2Project();
  const before = structuredClone(target);
  const result = importProjectQuoteRevisionHistoryFileIntoProject(target, JSON.stringify(payload));

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.match(result.diagnostics.join(" | "), /sourceIntegrityVersion/);
  assert.deepEqual(target, before);
});

test("standalone and project-history import block version downgrade payloads", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.ok(source.history);
  const payload = JSON.parse(serializeImportFixture(source.history));
  payload.schemaVersion = 0;
  const target = createV2Project();
  const before = structuredClone(target);
  const standaloneDowngrade = importProjectQuoteRevisionHistoryFileIntoProject(target, JSON.stringify(payload));

  const projectV1WithHistory = {
    format: "MobilyaCAD",
    formatVersion: 1,
    quoteRevisionHistory: source.history,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: []
  };
  const projectDowngrade = importProjectQuoteRevisionHistoryFileIntoProject(
    projectV1WithHistory,
    serializeImportFixture(source.history)
  );

  assert.equal(standaloneDowngrade.status, "blocked");
  assert.equal(standaloneDowngrade.project, null);
  assert.match(standaloneDowngrade.diagnostics.join(" | "), /Desteklenmeyen teklif revizyon geçmişi dosya sürümü/);
  assert.equal(projectDowngrade.status, "blocked");
  assert.equal(projectDowngrade.project, null);
  assert.match(projectDowngrade.diagnostics.join(" | "), /JSON v1 quoteRevisionHistory alanını desteklemez/);
  assert.deepEqual(target, before);
  assert.deepEqual(projectV1WithHistory.quoteRevisionHistory, source.history);
});



test("DOM-137 project-file append/read integrity coverage reconciles strict and legacy markers without upgrading history", () => {
  const legacyCreated = createProjectQuoteRevision({
    projectId: "project-42",
    revisionId: "quote-r1",
    revisionNumber: 1,
    createdAt: "2026-11-17T20:00:00Z",
    previousRevision: null,
    pricingSnapshot: structuredClone(snapshotResult.snapshot)
  });
  assert.equal(legacyCreated.status, "ready");
  assert.ok(legacyCreated.revision);
  assert.equal(Object.prototype.hasOwnProperty.call(legacyCreated.revision, "sourceIntegrityVersion"), false);

  const initialProject = createV2Project({
    quoteRevisionHistory: {
      schemaVersion: 1,
      projectId: "project-42",
      revisions: [legacyCreated.revision]
    }
  });
  const initialProjectBefore = JSON.stringify(initialProject);
  const firstAppend = appendProjectQuoteRevisionToProjectFile(initialProject, createRevision({
    revisionId: "quote-r2",
    createdAt: "2026-11-18T01:00:00Z"
  }));

  assert.equal(firstAppend.status, "ready");
  assert.ok(firstAppend.project);
  assert.equal(JSON.stringify(initialProject), initialProjectBefore);
  const firstProjectBefore = JSON.stringify(firstAppend.project);

  const firstRead = readProjectQuoteRevisionHistoryFromProjectFile(firstAppend.project);
  assert.equal(firstRead.status, "ready");
  assert.ok(firstRead.history);
  assert.equal(Object.prototype.hasOwnProperty.call(firstRead.history.revisions[0], "sourceIntegrityVersion"), false);
  assert.equal(firstRead.history.revisions[1].sourceIntegrityVersion, 1);

  const firstAuditResult = calculateProjectQuoteRevisionSourceIntegrityAudit(firstRead.history);
  assert.equal(firstAuditResult.status, "ready");
  assert.ok(firstAuditResult.audit);
  assert.equal(firstAuditResult.audit.revisionCount, 2);
  assert.equal(firstAuditResult.audit.strictRevisionCount, 1);
  assert.equal(firstAuditResult.audit.legacyRevisionCount, 1);
  assert.deepEqual(firstAuditResult.audit.revisions.map((revision) => revision.sourceIntegrityVersion), [null, 1]);

  const secondAppend = appendProjectQuoteRevisionToProjectFile(firstAppend.project, createRevision({
    revisionId: "quote-r3",
    createdAt: "2026-11-19T01:00:00Z"
  }));
  assert.equal(secondAppend.status, "ready");
  assert.ok(secondAppend.project);
  assert.equal(JSON.stringify(firstAppend.project), firstProjectBefore);
  assert.equal(JSON.stringify(initialProject), initialProjectBefore);

  const secondRead = readProjectQuoteRevisionHistoryFromProjectFile(secondAppend.project);
  assert.equal(secondRead.status, "ready");
  assert.ok(secondRead.history);
  assert.deepEqual(secondRead.history.revisions.map((revision) => revision.revisionNumber), [1, 2, 3]);
  assert.deepEqual(secondRead.history.revisions.map((revision) => revision.previousRevisionId), [null, "quote-r1", "quote-r2"]);

  const secondAuditResult = calculateProjectQuoteRevisionSourceIntegrityAudit(secondRead.history);
  assert.equal(secondAuditResult.status, "ready");
  assert.ok(secondAuditResult.audit);
  assert.equal(secondAuditResult.audit.revisionCount, 3);
  assert.equal(secondAuditResult.audit.strictRevisionCount, 2);
  assert.equal(secondAuditResult.audit.legacyRevisionCount, 1);
  assert.deepEqual(secondAuditResult.audit.revisions.map((revision) => revision.sourceIntegrityVersion), [null, 1, 1]);
  assert.ok(Object.isFrozen(secondAuditResult.audit));
  assert.ok(Object.isFrozen(secondAuditResult.audit.revisions));
});


test("quote pricing snapshot v2 preserves selected stock basis and Part-group provenance through revision JSON", () => {
  const first = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(first.status, "ready");
  assert.ok(first.project);
  const second = appendProjectQuoteRevisionToProjectFile(first.project, {
    revisionId: "quote-r2",
    createdAt: "2026-11-18T02:00:00+03:00",
    pricingSnapshot: createStockBasisSnapshot()
  });
  assert.equal(second.status, "ready", second.diagnostics.join("; "));
  assert.ok(second.project);

  const read = readProjectQuoteRevisionHistoryFromProjectFile(second.project);
  assert.equal(read.status, "ready");
  const stockSnapshot = read.history?.revisions[1].pricingSnapshot;
  assert.equal(stockSnapshot?.schemaVersion, 2);
  assert.equal(stockSnapshot?.materialCostBasis?.basis, "stock-sheet-purchase");
  assert.deepEqual(stockSnapshot?.materialCostBasis?.stockSheetGroups[0].sourcePartIds, ["part-a"]);
  assert.equal(stockSnapshot?.materialCostBasis?.stockSheetGroups[0].sourceReference, "stock-sheet-price:v1");
  assert.ok(Object.isFrozen(stockSnapshot?.materialCostBasis?.stockSheetGroups[0]));

  const comparison = compareProjectQuoteRevisions(read.history, "quote-r1", "quote-r2");
  assert.equal(comparison.status, "blocked");
  assert.match(comparison.diagnostics[0], /grup bazlı fark desteği/);

  const sourceAudit = calculateProjectQuoteRevisionSourceMapAudit(read.history);
  assert.equal(sourceAudit.status, "ready", sourceAudit.diagnostics.join("; "));
  assert.ok(sourceAudit.audit);
  const stockAuditRevision = sourceAudit.audit.revisions[1];
  assert.equal(stockAuditRevision.counts.stockSheetGroupCount, 1);
  assert.equal(stockAuditRevision.counts.stockSheetPartReferenceCount, 1);
  assert.equal(stockAuditRevision.counts.stockSheetUniquePartIdCount, 1);
  assert.deepEqual(stockAuditRevision.stockSheetGroups, stockSnapshot?.materialCostBasis?.stockSheetGroups);
  assert.deepEqual(stockAuditRevision.stockSheetGroups[0].sourcePartIds, ["part-a"]);
  assert.equal(sourceAudit.audit.totals.stockSheetUniquePartIdCount, 1);
  assert.equal(stockAuditRevision.lines.some(line => line.resourceType === "material"), false);
});

test("quote pricing snapshot v2 rejects tampered stock group arithmetic", () => {
  const snapshot = createStockBasisSnapshot();
  snapshot.materialCostBasis.stockSheetGroups[0].stockSheetCostMinor += 1;
  const result = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision({
    pricingSnapshot: snapshot
  }));

  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.match(result.diagnostics[0], /levha adedi × birim fiyatla eşleşmiyor/);
});
