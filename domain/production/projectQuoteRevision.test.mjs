import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import { createProjectQuoteRevision } from "./projectQuoteRevision.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const edgeBandingByGroup = Object.fromEntries(
  BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
);

const productionReport = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: [{
    id: "revision-cabinet-1",
    widthMm: 800,
    heightMm: 720,
    depthMm: 560,
    material: "MDF Lam 18",
    materialId: "mdf-18",
    family: "cabinet"
  , profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials: [
      { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" }
    ]
  }]
});

const snapshotResult = createProjectQuotePricingSnapshot({
  quotedOn: "2026-11-30",
  productionReport,
  consumptionPriceTable: [{
    resourceType: "material",
    resourceId: "mdf-18",
    unit: "m2",
    unitPriceMinor: 1250,
    currencyCode: "TRY",
    sourceReference: "atolye-malzeme-fiyat-listesi"
  }],
  workItems: [{
    id: "assembly-labor",
    category: "labor",
    description: "Dolap montaj işçiliği",
    duration: 1.5,
    unit: "h",
    tariffId: "labor-hourly"
  }],
  tariffTable: [{
    tariffId: "labor-hourly",
    category: "labor",
    unit: "h",
    unitPriceMinor: 2400,
    currencyCode: "TRY",
    sourceReference: "atolye-iscilik-tarifesi"
  }],
  consumptionPriceList: {
    catalogId: "workshop-materials",
    version: "2026-11",
    effectiveFrom: "2026-11-01",
    effectiveTo: "2026-11-30"
  },
  laborOperationTariffList: {
    catalogId: "workshop-labor",
    version: "tariff-2026-11",
    effectiveFrom: "2026-11-01"
  }
});

assert.equal(snapshotResult.status, "ready");
assert.ok(snapshotResult.snapshot);

function createSnapshot() {
  return structuredClone(snapshotResult.snapshot);
}

function createFirstRevision(overrides = {}) {
  return {
    projectId: "project-42",
    revisionId: "quote-r1",
    revisionNumber: 1,
    createdAt: "2026-11-17T10:00:00Z",
    previousRevision: null,
    pricingSnapshot: createSnapshot(),
    ...overrides
  };
}

test("ilk teklif revizyonu hazır snapshot ile oluşturulur ve zincir başlangıcını açıkça işaretler", () => {
  const result = createProjectQuoteRevision(createFirstRevision());

  assert.equal(result.status, "ready");
  assert.equal(result.revision?.schemaVersion, 1);
  assert.equal(result.revision?.projectId, "project-42");
  assert.equal(result.revision?.revisionId, "quote-r1");
  assert.equal(result.revision?.revisionNumber, 1);
  assert.equal(result.revision?.previousRevisionId, null);
  assert.equal(
    result.revision?.pricingSnapshot.quoteSummary.costSummary?.grandTotalMinor,
    snapshotResult.snapshot?.quoteSummary.costSummary?.grandTotalMinor
  );
  assert.ok(Object.isFrozen(result.revision));
  assert.ok(Object.isFrozen(result.revision?.pricingSnapshot));
  assert.ok(Object.isFrozen(result.revision?.pricingSnapshot.quoteSummary.costSummary?.lines));
});

test("revizyon maliyet snapshot'ını girdiden ayırır ve sonradan değiştirilemez yapar", () => {
  const pricingSnapshot = createSnapshot();
  const originalTotal = pricingSnapshot.quoteSummary.costSummary.grandTotalMinor;
  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot }));

  assert.equal(result.status, "ready");
  pricingSnapshot.quoteSummary.costSummary.grandTotalMinor += 500;

  assert.equal(
    result.revision?.pricingSnapshot.quoteSummary.costSummary?.grandTotalMinor,
    originalTotal
  );
  assert.ok(Object.isFrozen(result.revision?.pricingSnapshot.quoteSummary.costSummary));
});

test("sonraki revizyon önceki kimliğe bağlanır ve sıra numarasını bir artırır", () => {
  const result = createProjectQuoteRevision(createFirstRevision({
    revisionId: "quote-r2",
    revisionNumber: 2,
    createdAt: "2026-11-17T11:00:00Z",
    previousRevision: {
      projectId: "project-42",
      revisionId: "quote-r1",
      revisionNumber: 1,
      createdAt: "2026-11-17T10:00:00Z"
    }
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.revision?.revisionNumber, 2);
  assert.equal(result.revision?.previousRevisionId, "quote-r1");
});

test("ilk revizyon numarası 1 dışında olamaz", () => {
  const result = createProjectQuoteRevision(createFirstRevision({ revisionNumber: 2 }));

  assert.equal(result.status, "blocked");
  assert.equal(result.revision, null);
  assert.match(result.diagnostics[0], /numarası 1/);
});

test("sonraki revizyon numarası önceki revizyondan tam olarak bir fazla olmalıdır", () => {
  const result = createProjectQuoteRevision(createFirstRevision({
    revisionId: "quote-r3",
    revisionNumber: 3,
    createdAt: "2026-11-17T11:00:00Z",
    previousRevision: {
      projectId: "project-42",
      revisionId: "quote-r1",
      revisionNumber: 1,
      createdAt: "2026-11-17T10:00:00Z"
    }
  }));

  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /tam olarak bir fazla/);
});

test("önceki revizyon başka projeye aitse yeni revizyon bloklanır", () => {
  const result = createProjectQuoteRevision(createFirstRevision({
    revisionId: "quote-r2",
    revisionNumber: 2,
    createdAt: "2026-11-17T11:00:00Z",
    previousRevision: {
      projectId: "another-project",
      revisionId: "quote-r1",
      revisionNumber: 1,
      createdAt: "2026-11-17T10:00:00Z"
    }
  }));

  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /aynı proje kimliğine/);
});

test("revizyon kimliği önceki revizyon kimliğiyle aynı olamaz", () => {
  const result = createProjectQuoteRevision(createFirstRevision({
    revisionNumber: 2,
    createdAt: "2026-11-17T11:00:00Z",
    previousRevision: {
      projectId: "project-42",
      revisionId: "quote-r1",
      revisionNumber: 1,
      createdAt: "2026-11-17T10:00:00Z"
    }
  }));

  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /kimliğinden farklı/);
});

test("revizyon tarihi geçerli ve önceki revizyondan daha yeni olmalıdır", () => {
  const earlier = createProjectQuoteRevision(createFirstRevision({
    revisionId: "quote-r2",
    revisionNumber: 2,
    createdAt: "2026-11-17T09:59:59Z",
    previousRevision: {
      projectId: "project-42",
      revisionId: "quote-r1",
      revisionNumber: 1,
      createdAt: "2026-11-17T10:00:00Z"
    }
  }));
  const invalidDate = createProjectQuoteRevision(createFirstRevision({
    createdAt: "2026-02-30T10:00:00Z"
  }));

  assert.equal(earlier.status, "blocked");
  assert.match(earlier.diagnostics[0], /önceki revizyon tarihinden sonra/);
  assert.equal(invalidDate.status, "blocked");
  assert.match(invalidDate.diagnostics[0], /geçerli bir takvim tarihi/);
});

test("hazır olmayan veya maliyet toplamı tutarsız snapshot revizyona alınamaz", () => {
  const incompleteSnapshot = createSnapshot();
  incompleteSnapshot.quoteSummary.status = "incomplete";
  const inconsistentSnapshot = createSnapshot();
  inconsistentSnapshot.quoteSummary.costSummary.grandTotalMinor += 1;

  const incomplete = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: incompleteSnapshot
  }));
  const inconsistent = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: inconsistentSnapshot
  }));

  assert.equal(incomplete.status, "blocked");
  assert.match(incomplete.diagnostics[0], /Yalnızca hazır teklif/);
  assert.equal(inconsistent.status, "blocked");
  assert.match(inconsistent.diagnostics[0], /satır toplamları genel toplamla uyuşmuyor/);
});

test("boş teklif snapshot'ı ve saat dilimsiz revizyon tarihi kabul edilmez", () => {
  const emptyReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: []
  });
  const emptyQuote = createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-30",
    productionReport: emptyReport,
    consumptionPriceTable: [],
    workItems: [],
    tariffTable: [],
    consumptionPriceList: null,
    laborOperationTariffList: null
  });
  const empty = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: emptyQuote.snapshot
  }));
  const noTimezone = createProjectQuoteRevision(createFirstRevision({
    createdAt: "2026-11-17T10:00:00"
  }));

  assert.equal(emptyQuote.status, "empty");
  assert.equal(empty.status, "blocked");
  assert.equal(noTimezone.status, "blocked");
  assert.match(noTimezone.diagnostics[0], /saat dilimi içeren ISO 8601/);
});

test("bilinmeyen revizyon alanları ve eksik önceki revizyon referansı reddedilir", () => {
  const unknownField = createProjectQuoteRevision(createFirstRevision({ unexpected: true }));
  const missingPrevious = createFirstRevision();
  delete missingPrevious.previousRevision;
  const missing = createProjectQuoteRevision(missingPrevious);

  assert.equal(unknownField.status, "blocked");
  assert.match(unknownField.diagnostics[0], /desteklenmeyen alan/);
  assert.equal(missing.status, "blocked");
  assert.match(missing.diagnostics[0], /açıkça sağlanmalıdır/);
});
