import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  importProjectQuoteRevisionHistoryFileIntoProject,
  PROJECT_QUOTE_REVISION_HISTORY_FIELD,
  PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES,
  PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "./projectQuoteRevisionProjectFile.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";
import {
  calculateProjectQuoteRevisionSourceIntegrityAudit,
  calculateProjectQuoteRevisionSourceMapAudit,
  compareProjectQuoteRevisionSourceMaps,
  compareProjectQuoteRevisionStockSheetGroups,
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
    schemaVersion: 2,
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
    sourcePartIds: ["part-a"],
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

test("standalone import and project restore reject a broken previousRevisionId chain without partial history", () => {
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
  payload.history.revisions[1].previousRevisionId = "unrelated-revision";

  const target = createV2Project();
  const targetBefore = structuredClone(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, JSON.stringify(payload));
  assert.equal(imported.status, "blocked");
  assert.equal(imported.project, null);
  assert.equal(imported.history, null);
  assert.match(imported.diagnostics.join(" | "), /previousRevisionId alanı.*kesintisiz bir zincir/);
  assert.deepEqual(target, targetBefore);

  const restoreTarget = createV2Project({ quoteRevisionHistory: payload.history });
  const restoreBefore = structuredClone(restoreTarget);
  const restored = readProjectQuoteRevisionHistoryFromProjectFile(restoreTarget);
  assert.equal(restored.status, "blocked");
  assert.equal(restored.history, null);
  assert.match(restored.diagnostics.join(" | "), /previousRevisionId alanı.*kesintisiz bir zincir/);
  assert.deepEqual(restoreTarget, restoreBefore);
});

test("standalone import and project restore reject tampered quote source-line links", () => {
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
  payload.history.revisions[1].pricingSnapshot.quoteSummary.lineSources[0].costLineId = "foreign-cost-line";

  const target = createV2Project();
  const targetBefore = structuredClone(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, JSON.stringify(payload));
  assert.equal(imported.status, "blocked");
  assert.equal(imported.project, null);
  assert.equal(imported.history, null);
  assert.match(imported.diagnostics.join(" | "), /kaynak eşlemesi maliyet satırı kimliğiyle uyuşmuyor/);
  assert.deepEqual(target, targetBefore);

  const restoreTarget = createV2Project({ quoteRevisionHistory: payload.history });
  const restoreBefore = structuredClone(restoreTarget);
  const restored = readProjectQuoteRevisionHistoryFromProjectFile(restoreTarget);
  assert.equal(restored.status, "blocked");
  assert.equal(restored.history, null);
  assert.match(restored.diagnostics.join(" | "), /kaynak eşlemesi maliyet satırı kimliğiyle uyuşmuyor/);
  assert.deepEqual(restoreTarget, restoreBefore);
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
  assert.equal(comparison.status, "ready", comparison.diagnostics.join("; "));
  assert.ok(comparison.comparison?.stockSheetGroupComparison);
  assert.equal(comparison.comparison?.stockSheetGroupComparison.toRevisionId, "quote-r2");

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


test("DOM-170 stock-sheet v2 basis, category totals and line provenance survive standalone import, restore and append", () => {
  const snapshot = createStockBasisSnapshot();
  const first = appendProjectQuoteRevisionToProjectFile(
    createV2Project(),
    createRevision({ pricingSnapshot: snapshot })
  );
  assert.equal(first.status, "ready", first.diagnostics.join(" | "));
  assert.ok(first.project);
  assert.ok(first.history);

  const assertStockBasisSnapshot = (pricingSnapshot) => {
    assert.equal(pricingSnapshot.schemaVersion, 2);
    const basis = pricingSnapshot.materialCostBasis;
    assert.ok(basis);
    assert.equal(basis.basis, "stock-sheet-purchase");
    assert.equal(basis.schemaVersion, 2);
    assert.deepEqual(basis.sourcePartIds, ["part-a"]);
    const costSummary = pricingSnapshot.quoteSummary.costSummary;
    assert.ok(costSummary);
    assert.equal(basis.materialCategoryTotalMinor, basis.panelMaterialCostMinor + basis.edgeBandingCostMinor);
    assert.deepEqual(basis.categoryTotalsMinor, {
      ...costSummary.categoryTotalsMinor,
      material: basis.materialCategoryTotalMinor
    });
    assert.equal(
      basis.grandTotalMinor,
      Object.values(basis.categoryTotalsMinor).reduce((sum, value) => sum + value, 0)
    );
    assert.deepEqual(
      pricingSnapshot.quoteSummary.lineSources.map((source) => source.costLineId),
      costSummary.lines.map((line) => line.id)
    );
    assert.deepEqual(
      costSummary.lines
        .filter((line) => line.category === "waste" || line.category === "profit")
        .map((line) => ({ id: line.id, category: line.category, sourceReference: line.sourceReference })),
      [
        { id: "adjustment-0001", category: "waste", sourceReference: "atolye-fire-hesabi:v1" },
        { id: "adjustment-0002", category: "profit", sourceReference: "teklif-kalemleri:rev1" }
      ]
    );
    const group = basis.stockSheetGroups[0];
    assert.ok(group);
    assert.deepEqual(group.sourcePartIds, ["part-a"]);
    assert.equal(group.sourceReference, "stock-sheet-price:v1");
  };

  assertStockBasisSnapshot(first.history.revisions[0].pricingSnapshot);
  const serialized = serializeProjectQuoteRevisionHistoryFile(first.history);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join(" | "));
  assert.ok(serialized.json);

  const target = createV2Project();
  const targetBefore = structuredClone(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, serialized.json);
  assert.equal(imported.status, "ready", imported.diagnostics.join(" | "));
  assert.ok(imported.project);
  assert.ok(imported.history);
  assert.deepEqual(imported.history, first.history);
  assert.deepEqual(imported.project.quoteRevisionHistory, first.history);
  assert.deepEqual(target, targetBefore);

  const restoredProject = JSON.parse(JSON.stringify(imported.project));
  const restored = readProjectQuoteRevisionHistoryFromProjectFile(restoredProject);
  assert.equal(restored.status, "ready", restored.diagnostics.join(" | "));
  assert.deepEqual(restored.history, first.history);
  assertStockBasisSnapshot(restored.history.revisions[0].pricingSnapshot);

  const second = appendProjectQuoteRevisionToProjectFile(
    restoredProject,
    createRevision({
      revisionId: "quote-r2",
      createdAt: "2026-11-18T02:00:00+03:00",
      pricingSnapshot: createStockBasisSnapshot()
    })
  );
  assert.equal(second.status, "ready", second.diagnostics.join(" | "));
  assert.ok(second.project);

  const reloadedProject = JSON.parse(JSON.stringify(second.project));
  const reloaded = readProjectQuoteRevisionHistoryFromProjectFile(reloadedProject);
  assert.equal(reloaded.status, "ready", reloaded.diagnostics.join(" | "));
  assert.deepEqual(reloaded.history?.revisions.map((revision) => revision.revisionId), ["quote-r1", "quote-r2"]);
  assert.deepEqual(reloaded.history?.revisions.map((revision) => revision.previousRevisionId), [null, "quote-r1"]);
  for (const revision of reloaded.history?.revisions ?? []) {
    assertStockBasisSnapshot(revision.pricingSnapshot);
  }

  const comparison = compareProjectQuoteRevisions(reloaded.history, "quote-r1", "quote-r2");
  assert.equal(comparison.status, "ready", comparison.diagnostics.join(" | "));
  assert.ok(comparison.comparison?.stockSheetGroupComparison);
  assert.equal(comparison.comparison?.stockSheetGroupComparison.toRevisionId, "quote-r2");

  const sourceAudit = calculateProjectQuoteRevisionSourceMapAudit(reloaded.history);
  assert.equal(sourceAudit.status, "ready", sourceAudit.diagnostics.join(" | "));
  assert.equal(sourceAudit.audit?.revisions.length, 2);
  for (const revisionAudit of sourceAudit.audit?.revisions ?? []) {
    assert.equal(revisionAudit.counts.stockSheetGroupCount, 1);
    assert.deepEqual(revisionAudit.stockSheetGroups[0].sourcePartIds, ["part-a"]);
  }
});

test("DOM-171 standalone import and project restore reject tampered stock-sheet totals and Part coverage atomically", () => {
  const source = appendProjectQuoteRevisionToProjectFile(
    createV2Project(),
    createRevision({ pricingSnapshot: createStockBasisSnapshot() })
  );
  assert.equal(source.status, "ready", source.diagnostics.join(" | "));
  assert.ok(source.history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(source.history);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join(" | "));
  assert.ok(serialized.json);

  const tamperCases = [
    {
      name: "category totals",
      mutate(basis) {
        basis.categoryTotalsMinor.labor += 1;
      }
    },
    {
      name: "Part-group source coverage",
      mutate(basis) {
        basis.stockSheetGroups[0].sourcePartIds = ["foreign-part"];
      }
    }
  ];

  for (const tamper of tamperCases) {
    const standaloneFile = JSON.parse(serialized.json);
    tamper.mutate(standaloneFile.history.revisions[0].pricingSnapshot.materialCostBasis);
    const tamperedJson = JSON.stringify(standaloneFile);

    const target = createV2Project();
    const targetBefore = structuredClone(target);
    const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, tamperedJson);
    assert.equal(imported.status, "blocked", tamper.name);
    assert.equal(imported.project, null, tamper.name);
    assert.deepEqual(target, targetBefore, tamper.name);

    const restoredProject = createV2Project({
      quoteRevisionHistory: standaloneFile.history
    });
    const restored = readProjectQuoteRevisionHistoryFromProjectFile(restoredProject);
    assert.equal(restored.status, "blocked", tamper.name);
    assert.equal(restored.history, null, tamper.name);
  }
});

test("DOM-171 legacy material-cost-basis v1 snapshots remain readable without a Part manifest", () => {
  const legacySnapshot = createStockBasisSnapshot();
  legacySnapshot.materialCostBasis.schemaVersion = 1;
  delete legacySnapshot.materialCostBasis.sourcePartIds;
  const appended = appendProjectQuoteRevisionToProjectFile(
    createV2Project(),
    createRevision({ pricingSnapshot: legacySnapshot })
  );
  assert.equal(appended.status, "ready", appended.diagnostics.join(" | "));
  assert.ok(appended.project);

  const restored = readProjectQuoteRevisionHistoryFromProjectFile(
    JSON.parse(JSON.stringify(appended.project))
  );
  assert.equal(restored.status, "ready", restored.diagnostics.join(" | "));
  assert.equal(restored.history?.revisions[0].pricingSnapshot.materialCostBasis.schemaVersion, 1);
});


test("DOM-177 imports seven-revision mixed history into an empty v2 project, restores, appends and re-exports without losing audit coverage", () => {
  const createManifestSnapshot = (partIds, sourceReference) => {
    const snapshot = createStockBasisSnapshot();
    const sortedPartIds = [...partIds].sort();
    snapshot.materialCostBasis.sourcePartIds = sortedPartIds;
    snapshot.materialCostBasis.stockSheetGroups[0].sourcePartIds = sortedPartIds;
    snapshot.materialCostBasis.stockSheetGroups[0].sourceReference = sourceReference;
    return snapshot;
  };
  const createLegacySnapshot = (partId, sourceReference) => {
    const snapshot = createManifestSnapshot([partId], sourceReference);
    snapshot.materialCostBasis.schemaVersion = 1;
    delete snapshot.materialCostBasis.sourcePartIds;
    return snapshot;
  };

  const legacySnapshots = [
    createManifestSnapshot(["part-a", "part-shared"], "manifest:r1"),
    createLegacySnapshot("legacy-r2", "legacy:r2"),
    createManifestSnapshot(["part-b", "part-shared"], "manifest:r3"),
    createLegacySnapshot("legacy-r4", "legacy:r4"),
    createManifestSnapshot(["part-c", "part-shared"], "manifest:r5")
  ];
  let previousRevision = null;
  const legacyRevisions = legacySnapshots.map((pricingSnapshot, index) => {
    const created = createProjectQuoteRevision({
      projectId: "project-42",
      revisionId: "quote-r" + (index + 1),
      revisionNumber: index + 1,
      createdAt: "2026-11-17T" + String(10 + index).padStart(2, "0") + ":00:00Z",
      previousRevision: previousRevision === null ? null : {
        projectId: previousRevision.projectId,
        revisionId: previousRevision.revisionId,
        revisionNumber: previousRevision.revisionNumber,
        createdAt: previousRevision.createdAt
      },
      pricingSnapshot
    });
    assert.equal(created.status, "ready", created.diagnostics.join("; "));
    assert.ok(created.revision);
    assert.equal(Object.hasOwn(created.revision, "sourceIntegrityVersion"), false);
    previousRevision = created.revision;
    return created.revision;
  });

  const sourceProject = createV2Project({
    quoteRevisionHistory: {
      schemaVersion: 1,
      projectId: "project-42",
      revisions: legacyRevisions
    }
  });
  const sourceProjectBefore = JSON.stringify(sourceProject);
  const sourceRead = readProjectQuoteRevisionHistoryFromProjectFile(sourceProject);
  assert.equal(sourceRead.status, "ready", sourceRead.diagnostics.join("; "));
  assert.equal(sourceRead.history?.revisions.length, 5);

  const sixth = appendProjectQuoteRevisionToProjectFile(sourceProject, createRevision({
    revisionId: "quote-r6",
    createdAt: "2026-11-17T15:00:00Z",
    pricingSnapshot: createManifestSnapshot(["part-d", "part-shared"], "manifest:r6")
  }));
  assert.equal(sixth.status, "ready", sixth.diagnostics.join("; "));
  assert.ok(sixth.project);
  const sixthProjectBefore = JSON.stringify(sixth.project);

  const seventh = appendProjectQuoteRevisionToProjectFile(sixth.project, createRevision({
    revisionId: "quote-r7",
    createdAt: "2026-11-17T16:00:00Z"
  }));
  assert.equal(seventh.status, "ready", seventh.diagnostics.join("; "));
  assert.ok(seventh.history);
  assert.equal(seventh.history.revisions.length, 7);
  assert.equal(JSON.stringify(sourceProject), sourceProjectBefore);
  assert.equal(JSON.stringify(sixth.project), sixthProjectBefore);

  const sourceHistory = seventh.history;
  const sourceHistoryJson = JSON.stringify(sourceHistory);
  const standaloneExport = serializeProjectQuoteRevisionHistoryFile(sourceHistory);
  assert.equal(standaloneExport.status, "ready", standaloneExport.diagnostics.join("; "));
  assert.ok(standaloneExport.json);

  const target = createV2Project();
  const targetBefore = JSON.stringify(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, standaloneExport.json);
  assert.equal(imported.status, "ready", imported.diagnostics.join("; "));
  assert.ok(imported.project);
  assert.ok(imported.history);
  assert.equal(imported.project.formatVersion, 2);
  assert.equal(imported.project.projectId, "project-42");
  assert.equal(imported.history.revisions.length, 7);
  assert.deepEqual(imported.history, sourceHistory);
  assert.deepEqual(imported.project.quoteRevisionHistory, sourceHistory);
  assert.equal(PROJECT_QUOTE_REVISION_HISTORY_FIELD in target, false);
  assert.equal(JSON.stringify(target), targetBefore);
  assert.ok(Object.isFrozen(imported.project));
  assert.ok(Object.isFrozen(imported.history));

  const restoredProject = JSON.parse(JSON.stringify(imported.project));
  const restoredProjectBeforeAppend = JSON.stringify(restoredProject);
  const restored = readProjectQuoteRevisionHistoryFromProjectFile(restoredProject);
  assert.equal(restored.status, "ready", restored.diagnostics.join("; "));
  assert.ok(restored.history);
  assert.equal(restoredProject.projectId, "project-42");
  assert.equal(restoredProject.formatVersion, 2);
  assert.equal(restored.history.revisions.length, 7);
  assert.deepEqual(restored.history, sourceHistory);
  assert.deepEqual(
    restored.history.revisions.map((revision) => ({
      revisionId: revision.revisionId,
      revisionNumber: revision.revisionNumber,
      previousRevisionId: revision.previousRevisionId,
      sourceIntegrityVersion: revision.sourceIntegrityVersion ?? null,
      materialCostBasisSchemaVersion: revision.pricingSnapshot.materialCostBasis?.schemaVersion ?? null
    })),
    [
      { revisionId: "quote-r1", revisionNumber: 1, previousRevisionId: null, sourceIntegrityVersion: null, materialCostBasisSchemaVersion: 2 },
      { revisionId: "quote-r2", revisionNumber: 2, previousRevisionId: "quote-r1", sourceIntegrityVersion: null, materialCostBasisSchemaVersion: 1 },
      { revisionId: "quote-r3", revisionNumber: 3, previousRevisionId: "quote-r2", sourceIntegrityVersion: null, materialCostBasisSchemaVersion: 2 },
      { revisionId: "quote-r4", revisionNumber: 4, previousRevisionId: "quote-r3", sourceIntegrityVersion: null, materialCostBasisSchemaVersion: 1 },
      { revisionId: "quote-r5", revisionNumber: 5, previousRevisionId: "quote-r4", sourceIntegrityVersion: null, materialCostBasisSchemaVersion: 2 },
      { revisionId: "quote-r6", revisionNumber: 6, previousRevisionId: "quote-r5", sourceIntegrityVersion: 1, materialCostBasisSchemaVersion: 2 },
      { revisionId: "quote-r7", revisionNumber: 7, previousRevisionId: "quote-r6", sourceIntegrityVersion: 1, materialCostBasisSchemaVersion: null }
    ]
  );

  const getAudits = (history) => {
    const sourceMap = calculateProjectQuoteRevisionSourceMapAudit(history);
    const integrity = calculateProjectQuoteRevisionSourceIntegrityAudit(history);
    assert.equal(sourceMap.status, "ready", sourceMap.diagnostics.join("; "));
    assert.equal(integrity.status, "ready", integrity.diagnostics.join("; "));
    assert.ok(sourceMap.audit);
    assert.ok(integrity.audit);
    return { sourceMap: sourceMap.audit, integrity: integrity.audit };
  };
  const sourceAudits = getAudits(sourceHistory);
  const importedAudits = getAudits(imported.history);
  const restoredAudits = getAudits(restored.history);
  assert.deepEqual(importedAudits, sourceAudits);
  assert.deepEqual(restoredAudits, sourceAudits);
  assert.deepEqual({
    purchase: restoredAudits.sourceMap.totals.stockSheetPurchaseRevisionCount,
    manifestV2: restoredAudits.sourceMap.totals.stockSheetManifestV2RevisionCount,
    legacy: restoredAudits.sourceMap.totals.stockSheetLegacyManifestRevisionCount,
    manifestReferences: restoredAudits.sourceMap.totals.stockSheetManifestPartReferenceCount,
    manifestUniqueParts: restoredAudits.sourceMap.totals.stockSheetManifestUniquePartIdCount,
    allPartReferences: restoredAudits.sourceMap.totals.stockSheetPartReferenceCount,
    allUniqueParts: restoredAudits.sourceMap.totals.stockSheetUniquePartIdCount
  }, {
    purchase: 6,
    manifestV2: 4,
    legacy: 2,
    manifestReferences: 8,
    manifestUniqueParts: 5,
    allPartReferences: 10,
    allUniqueParts: 7
  });
  assert.equal(restoredAudits.integrity.revisionCount, 7);
  assert.equal(restoredAudits.integrity.strictRevisionCount, 2);
  assert.equal(restoredAudits.integrity.legacyRevisionCount, 5);

  const auditByRevisionId = new Map(
    restoredAudits.sourceMap.revisions.map((revision) => [revision.revisionId, revision])
  );
  const auditCoverage = (revision) => ({
    basis: revision.materialCostBasis,
    materialCostBasisSchemaVersion: revision.materialCostBasisSchemaVersion,
    manifestVersion: revision.stockSheetManifestVersion,
    partCount: revision.stockSheetManifestPartCount
  });
  const pairs = [
    ["quote-r1", "quote-r6", "comparable"],
    ["quote-r2", "quote-r6", "from-unavailable"],
    ["quote-r1", "quote-r7", "to-unavailable"],
    ["quote-r2", "quote-r7", "both-unavailable"],
    ["quote-r6", "quote-r7", "to-unavailable"]
  ];
  const comparePairs = (history) => pairs.map(([fromRevisionId, toRevisionId, expectedStatus]) => {
    const groupResult = compareProjectQuoteRevisionStockSheetGroups(history, fromRevisionId, toRevisionId);
    const fullResult = compareProjectQuoteRevisions(history, fromRevisionId, toRevisionId);
    const sourceMapResult = compareProjectQuoteRevisionSourceMaps(history, fromRevisionId, toRevisionId);
    assert.equal(groupResult.status, "ready", groupResult.diagnostics.join("; "));
    assert.equal(fullResult.status, "ready", fullResult.diagnostics.join("; "));
    assert.equal(sourceMapResult.status, "ready", sourceMapResult.diagnostics.join("; "));
    const manifest = groupResult.comparison?.stockSheetManifestComparison;
    assert.ok(manifest);
    assert.equal(manifest.status, expectedStatus);
    assert.deepEqual(
      fullResult.comparison?.stockSheetGroupComparison?.stockSheetManifestComparison,
      manifest
    );
    assert.deepEqual(sourceMapResult.comparison?.stockSheetManifestComparison, manifest);
    const fromAudit = auditByRevisionId.get(fromRevisionId);
    const toAudit = auditByRevisionId.get(toRevisionId);
    assert.ok(fromAudit);
    assert.ok(toAudit);
    assert.deepEqual(manifest.from, auditCoverage(fromAudit));
    assert.deepEqual(manifest.to, auditCoverage(toAudit));
    return { groupResult, fullResult, sourceMapResult };
  });
  const sourceComparisons = comparePairs(sourceHistory);
  const restoredComparisons = comparePairs(restored.history);
  assert.deepEqual(restoredComparisons, sourceComparisons);

  const restoredStandaloneExport = serializeProjectQuoteRevisionHistoryFile(restored.history);
  assert.equal(restoredStandaloneExport.status, "ready", restoredStandaloneExport.diagnostics.join("; "));
  assert.equal(restoredStandaloneExport.json, standaloneExport.json);
  const parsedRestoredExport = parseProjectQuoteRevisionHistoryFile(restoredStandaloneExport.json);
  assert.equal(parsedRestoredExport.status, "ready", parsedRestoredExport.diagnostics.join("; "));
  assert.deepEqual(parsedRestoredExport.history, sourceHistory);

  const eighth = appendProjectQuoteRevisionToProjectFile(restoredProject, createRevision({
    revisionId: "quote-r8",
    createdAt: "2026-11-17T17:00:00Z"
  }));
  assert.equal(eighth.status, "ready", eighth.diagnostics.join("; "));
  assert.ok(eighth.project);
  assert.equal(eighth.history?.revisions.length, 8);
  assert.equal(eighth.history?.revisions[7].revisionNumber, 8);
  assert.equal(eighth.history?.revisions[7].previousRevisionId, "quote-r7");
  assert.equal(eighth.history?.revisions[7].sourceIntegrityVersion, 1);
  assert.equal(eighth.history?.revisions[7].pricingSnapshot.materialCostBasis, undefined);
  assert.equal(JSON.stringify(restoredProject), restoredProjectBeforeAppend);

  const reloadedProject = JSON.parse(JSON.stringify(eighth.project));
  const reloaded = readProjectQuoteRevisionHistoryFromProjectFile(reloadedProject);
  assert.equal(reloaded.status, "ready", reloaded.diagnostics.join("; "));
  assert.ok(reloaded.history);
  const finalExport = serializeProjectQuoteRevisionHistoryFile(reloaded.history);
  assert.equal(finalExport.status, "ready", finalExport.diagnostics.join("; "));
  assert.ok(finalExport.json);
  const finalParsed = parseProjectQuoteRevisionHistoryFile(finalExport.json);
  assert.equal(finalParsed.status, "ready", finalParsed.diagnostics.join("; "));
  assert.deepEqual(finalParsed.history, reloaded.history);
  assert.equal(
    serializeProjectQuoteRevisionHistoryFile(finalParsed.history).json,
    finalExport.json
  );

  const finalAudits = getAudits(finalParsed.history);
  assert.equal(finalAudits.sourceMap.totals.stockSheetPurchaseRevisionCount, 6);
  assert.equal(finalAudits.sourceMap.totals.stockSheetManifestV2RevisionCount, 4);
  assert.equal(finalAudits.sourceMap.totals.stockSheetLegacyManifestRevisionCount, 2);
  assert.equal(finalAudits.sourceMap.totals.stockSheetManifestPartReferenceCount, 8);
  assert.equal(finalAudits.sourceMap.totals.stockSheetManifestUniquePartIdCount, 5);
  assert.equal(finalAudits.sourceMap.totals.stockSheetPartReferenceCount, 10);
  assert.equal(finalAudits.sourceMap.totals.stockSheetUniquePartIdCount, 7);
  assert.equal(finalAudits.integrity.revisionCount, 8);
  assert.equal(finalAudits.integrity.strictRevisionCount, 3);
  assert.equal(finalAudits.integrity.legacyRevisionCount, 5);
  assert.deepEqual(comparePairs(finalParsed.history), sourceComparisons);
  assert.equal(JSON.stringify(sourceHistory), sourceHistoryJson);
  assert.equal(JSON.stringify(target), targetBefore);
});

test("DOM-178 preserves unknown project metadata and own __proto__ JSON keys through standalone import and restore", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(source.status, "ready", source.diagnostics.join("; "));
  assert.ok(source.history);
  const standaloneJson = serializeImportFixture(source.history);
  const target = JSON.parse('{"format":"MobilyaCAD","formatVersion":2,"projectId":"project-42","room":{"width":4000,"length":5000,"height":2800,"unit":"mm"},"furniture":[],"materials":[],"metadata":{"owner":"workshop","custom":{"label":"keep","__proto__":{"nestedMarker":"preserved"}}},"__proto__":{"envelopeMarker":"preserved"}}');
  const targetBefore = JSON.stringify(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, standaloneJson);
  assert.equal(imported.status, "ready", imported.diagnostics.join("; "));
  assert.ok(imported.project);
  assert.ok(imported.history);
  assert.ok(Object.isFrozen(imported.project));
  assert.equal(Object.getPrototypeOf(imported.project), Object.prototype);
  assert.equal(Object.hasOwn(imported.project, "__proto__"), true);
  const rootPrototypeData = Object.getOwnPropertyDescriptor(imported.project, "__proto__");
  assert.ok(rootPrototypeData);
  assert.equal("value" in rootPrototypeData, true);
  assert.deepEqual(rootPrototypeData.value, { envelopeMarker: "preserved" });
  assert.equal(imported.project.metadata.owner, "workshop");
  assert.equal(Object.isFrozen(imported.project.metadata), true);
  assert.equal(Object.getPrototypeOf(imported.project.metadata.custom), Object.prototype);
  assert.equal(Object.hasOwn(imported.project.metadata.custom, "__proto__"), true);
  const nestedPrototypeData = Object.getOwnPropertyDescriptor(imported.project.metadata.custom, "__proto__");
  assert.ok(nestedPrototypeData);
  assert.equal("value" in nestedPrototypeData, true);
  assert.deepEqual(nestedPrototypeData.value, { nestedMarker: "preserved" });
  const restored = JSON.parse(JSON.stringify(imported.project));
  assert.equal(Object.getPrototypeOf(restored), Object.prototype);
  assert.equal(Object.hasOwn(restored, "__proto__"), true);
  assert.deepEqual(restored["__proto__"], { envelopeMarker: "preserved" });
  assert.equal(Object.hasOwn(restored.metadata.custom, "__proto__"), true);
  assert.deepEqual(restored.metadata.custom["__proto__"], { nestedMarker: "preserved" });
  assert.equal(({}).envelopeMarker, undefined);
  assert.equal(({}).nestedMarker, undefined);
  const restoredHistory = readProjectQuoteRevisionHistoryFromProjectFile(restored);
  assert.equal(restoredHistory.status, "ready", restoredHistory.diagnostics.join("; "));
  assert.deepEqual(restoredHistory.history, source.history);
  assert.equal(JSON.stringify(target), targetBefore);
  assert.equal(Object.hasOwn(target, PROJECT_QUOTE_REVISION_HISTORY_FIELD), false);
});

test("DOM-178 standalone import rejects nested accessors and Proxy reflection failures without partial output", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(source.status, "ready");
  assert.ok(source.history);
  const standaloneJson = serializeImportFixture(source.history);
  const target = createV2Project({ metadata: { label: "preserved" } });
  let getterCalls = 0;
  const unsafeGetter = () => {
    getterCalls += 1;
    return "must not execute";
  };
  Object.defineProperty(target.metadata, "unsafe", {
    enumerable: true,
    configurable: true,
    get: unsafeGetter
  });
  const result = importProjectQuoteRevisionHistoryFileIntoProject(target, standaloneJson);
  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.history, null);
  assert.equal(getterCalls, 0);
  assert.equal(Object.getOwnPropertyDescriptor(target.metadata, "unsafe").get, unsafeGetter);
  assert.equal(Object.hasOwn(target, PROJECT_QUOTE_REVISION_HISTORY_FIELD), false);
  assert.equal(target.metadata.label, "preserved");
  const proxyMetadata = new Proxy({ label: "proxy" }, {
    ownKeys() {
      throw new Error("reflection denied");
    }
  });
  const proxyTarget = createV2Project({ metadata: proxyMetadata });
  const proxyResult = importProjectQuoteRevisionHistoryFileIntoProject(proxyTarget, standaloneJson);
  assert.equal(proxyResult.status, "blocked");
  assert.equal(proxyResult.project, null);
  assert.equal(proxyResult.history, null);
  assert.match(proxyResult.diagnostics.join(" | "), /reflection denied/);
  assert.equal(Object.hasOwn(proxyTarget, PROJECT_QUOTE_REVISION_HISTORY_FIELD), false);
});

test("DOM-178 standalone import blocks project-envelope depth and UTF-8 size limit violations atomically", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(source.status, "ready");
  assert.ok(source.history);
  const standaloneJson = serializeImportFixture(source.history);
  const deepTarget = createV2Project();
  let nested = { leaf: "preserved" };
  for (let index = 0; index <= PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_DEPTH; index += 1) {
    nested = { next: nested };
  }
  deepTarget.metadata = nested;
  const deepResult = importProjectQuoteRevisionHistoryFileIntoProject(deepTarget, standaloneJson);
  assert.equal(deepResult.status, "blocked");
  assert.equal(deepResult.project, null);
  assert.equal(deepResult.history, null);
  assert.match(deepResult.diagnostics.join(" | "), /64/);
  assert.equal(Object.hasOwn(deepTarget, PROJECT_QUOTE_REVISION_HISTORY_FIELD), false);
  const oversizedTarget = createV2Project({
    metadata: { payload: "x".repeat(PROJECT_QUOTE_REVISION_PROJECT_ENVELOPE_MAX_BYTES + 1) }
  });
  const oversizedResult = importProjectQuoteRevisionHistoryFileIntoProject(oversizedTarget, standaloneJson);
  assert.equal(oversizedResult.status, "blocked");
  assert.equal(oversizedResult.project, null);
  assert.equal(oversizedResult.history, null);
  assert.match(oversizedResult.diagnostics.join(" | "), /16 MiB/);
  assert.equal(Object.hasOwn(oversizedTarget, PROJECT_QUOTE_REVISION_HISTORY_FIELD), false);
});


test("DOM-179 imported prototype-sensitive metadata survives restore and immutable revision append", () => {
  const source = appendProjectQuoteRevisionToProjectFile(createV2Project(), createRevision());
  assert.equal(source.status, "ready", source.diagnostics.join("; "));
  assert.ok(source.history);
  const standalone = serializeProjectQuoteRevisionHistoryFile(source.history);
  assert.equal(standalone.status, "ready", standalone.diagnostics.join("; "));
  assert.ok(standalone.json);

  const target = JSON.parse('{"format":"MobilyaCAD","formatVersion":2,"projectId":"project-42","room":{"width":4000,"length":5000,"height":2800,"unit":"mm"},"furniture":[],"materials":[],"metadata":{"owner":"workshop","custom":{"label":"keep","__proto__":{"nestedMarker":"preserved"}}},"__proto__":{"envelopeMarker":"preserved"}}');
  const targetBefore = JSON.stringify(target);
  const imported = importProjectQuoteRevisionHistoryFileIntoProject(target, standalone.json);
  assert.equal(imported.status, "ready", imported.diagnostics.join("; "));
  assert.ok(imported.project);

  const restored = JSON.parse(JSON.stringify(imported.project));
  const restoredBeforeAppend = JSON.stringify(restored);
  const appended = appendProjectQuoteRevisionToProjectFile(restored, createRevision({
    revisionId: "quote-r2",
    createdAt: "2026-11-18T02:00:00+03:00"
  }));
  assert.equal(appended.status, "ready", appended.diagnostics.join("; "));
  assert.ok(appended.project);
  assert.ok(appended.history);
  assert.equal(appended.history.revisions.length, 2);
  assert.equal(appended.history.revisions[1].revisionId, "quote-r2");
  assert.equal(appended.history.revisions[1].previousRevisionId, "quote-r1");
  assert.equal(JSON.stringify(restored), restoredBeforeAppend);
  assert.equal(JSON.stringify(target), targetBefore);

  const rootPrototypeData = Object.getOwnPropertyDescriptor(appended.project, "__proto__");
  assert.ok(rootPrototypeData);
  assert.equal("value" in rootPrototypeData, true);
  assert.deepEqual(rootPrototypeData.value, { envelopeMarker: "preserved" });
  assert.equal(Object.getPrototypeOf(appended.project), Object.prototype);
  assert.equal(appended.project.metadata.owner, "workshop");
  const nestedPrototypeData = Object.getOwnPropertyDescriptor(appended.project.metadata.custom, "__proto__");
  assert.ok(nestedPrototypeData);
  assert.equal("value" in nestedPrototypeData, true);
  assert.deepEqual(nestedPrototypeData.value, { nestedMarker: "preserved" });

  const reloaded = JSON.parse(JSON.stringify(appended.project));
  assert.equal(Object.getPrototypeOf(reloaded), Object.prototype);
  assert.equal(Object.hasOwn(reloaded, "__proto__"), true);
  assert.deepEqual(reloaded["__proto__"], { envelopeMarker: "preserved" });
  assert.equal(Object.hasOwn(reloaded.metadata.custom, "__proto__"), true);
  assert.deepEqual(reloaded.metadata.custom["__proto__"], { nestedMarker: "preserved" });
  assert.equal(({}).envelopeMarker, undefined);
  assert.equal(({}).nestedMarker, undefined);

  const reloadedHistory = readProjectQuoteRevisionHistoryFromProjectFile(reloaded);
  assert.equal(reloadedHistory.status, "ready", reloadedHistory.diagnostics.join("; "));
  assert.deepEqual(reloadedHistory.history, appended.history);
  const finalExport = serializeProjectQuoteRevisionHistoryFile(reloadedHistory.history);
  assert.equal(finalExport.status, "ready", finalExport.diagnostics.join("; "));
  assert.ok(finalExport.json);
  const finalParsed = parseProjectQuoteRevisionHistoryFile(finalExport.json);
  assert.equal(finalParsed.status, "ready", finalParsed.diagnostics.join("; "));
  assert.deepEqual(finalParsed.history, reloadedHistory.history);
});
