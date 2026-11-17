import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  PROJECT_QUOTE_REVISION_HISTORY_FIELD,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "./projectQuoteRevisionProjectFile.ts";

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
