import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import { calculateProjectCostLineTotalMinor } from "./projectCostSummary.ts";
import {
  appendProjectQuoteRevision,
  compareProjectQuoteRevisions,
  calculateProjectQuoteRevisionSourceMapAudit,
  compareProjectQuoteRevisionSourceMaps,
  createProjectQuoteRevision,
  validateProjectQuoteRevisionHistory
} from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  PROJECT_QUOTE_REVISION_FILE_TYPE,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";
import {
  parseProjectQuoteRevisionComparisonFile,
  serializeProjectQuoteRevisionComparisonFile
} from "./projectQuoteRevisionComparisonFile.ts";
import {
  parseProjectQuoteRevisionComparisonCsv,
  PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION,
  serializeProjectQuoteRevisionComparisonCsv
} from "./projectQuoteRevisionComparisonCsv.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const edgeBandingByGroup = Object.fromEntries(
  BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
);

const productionReport = calculateCabinetProjectProductionWithDiagnostics({
  schemaVersion: 1,
  furniture: [{
    schemaVersion: 1,
    furniture: {
      id: "revision-cabinet-1",
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "MDF Lam 18",
      materialId: "mdf-18",
      family: "cabinet"
    },
    profile: {
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


function createSnapshotWithQuoteLines(entries) {
  const snapshot = createSnapshot();
  const quoteSummary = snapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  assert.ok(costSummary);
  let additionalTotalMinor = 0;
  for (const entry of entries) {
    const lineTotalMinor = calculateProjectCostLineTotalMinor(
      entry.line.quantity,
      entry.line.unitPriceMinor
    );
    costSummary.lines.push({ ...entry.line, lineTotalMinor });
    quoteSummary.lineSources.push({ ...entry.source, sourcePartIds: [...entry.source.sourcePartIds] });
    additionalTotalMinor += lineTotalMinor;
  }
  costSummary.lineCount = costSummary.lines.length;
  costSummary.categoryTotalsMinor.material += additionalTotalMinor;
  costSummary.grandTotalMinor += additionalTotalMinor;
  quoteSummary.requiredLineCount += entries.length;
  quoteSummary.pricedLineCount += entries.length;
  return snapshot;
}


function createSnapshotWithQuoteAdjustmentLines(entries) {
  const snapshot = createSnapshot();
  const quoteSummary = snapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  assert.ok(costSummary);
  for (const entry of entries) {
    const lineTotalMinor = calculateProjectCostLineTotalMinor(1, entry.unitPriceMinor);
    costSummary.lines.push({
      id: entry.id, category: entry.category, description: entry.description, quantity: 1,
      unit: "kalem", unitPriceMinor: entry.unitPriceMinor, lineTotalMinor, currencyCode: "TRY",
      sourceReference: entry.sourceReference
    });
    quoteSummary.lineSources.push({ costLineId: entry.id, sourceType: "quote-adjustment", sourceId: entry.sourceId });
    costSummary.categoryTotalsMinor[entry.category] += lineTotalMinor;
    costSummary.grandTotalMinor += lineTotalMinor;
  }
  costSummary.lineCount = costSummary.lines.length;
  quoteSummary.requiredLineCount += entries.length;
  quoteSummary.pricedLineCount += entries.length;
  return snapshot;
}

function createEdgeQuoteLine({
  id,
  edge,
  quantity,
  unit,
  unitPriceMinor,
  sourceReference,
  sourceId,
  sourcePartIds,
  edgeDirection,
  description
}) {
  return {
    line: {
      id,
      category: "material",
      description: description ?? "Kenar bandı pvc-directional (" + edge + " kenar)",
      ...(edgeDirection === undefined ? {} : { edgeDirection }),
      quantity,
      unit,
      unitPriceMinor,
      currencyCode: "TRY",
      sourceReference
    },
    source: {
      costLineId: id,
      sourceType: "production-consumption",
      sourceId,
      sourcePartIds
    }
  };
}

function createHistoryWithSnapshots(fromSnapshot, toSnapshot) {
  return {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ pricingSnapshot: fromSnapshot }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: toSnapshot
      })
    ]
  };
}



function createRollSnapshot() {
  const snapshot = createSnapshotWithQuoteLines([
    createEdgeQuoteLine({
      id: "edge-roll-pvc-a",
      edge: "rulo",
      quantity: 2,
      unit: "rulo",
      unitPriceMinor: 15000,
      sourceReference: "roll-prices:v1",
      sourceId: "edge-roll-pvc-a",
      sourcePartIds: ["part-a", "part-b"],
      description: "PVC rulo satın alımı"
    })
  ]);
  const source = snapshot.quoteSummary.lineSources.at(-1);
  Object.assign(source, {
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

function createFirstRevision(overrides = {}) {
  return {
    projectId: "project-42",
    revisionId: "quote-r1",
    revisionNumber: 1,
    createdAt: "2026-11-17T10:00:00Z",
    previousRevision: null,
    sourceIntegrityVersion: 1,
    pricingSnapshot: createSnapshot(),
    ...overrides
  };
}

test("ilk teklif revizyonu hazır snapshot ile oluşturulur ve zincir başlangıcını açıkça işaretler", () => {
  const result = createProjectQuoteRevision(createFirstRevision());

  assert.equal(result.status, "ready");
  assert.equal(result.revision?.schemaVersion, 1);
  assert.equal(result.revision?.sourceIntegrityVersion, 1);
  assert.equal(result.revision?.projectId, "project-42");
  assert.equal(result.revision?.revisionId, "quote-r1");
  assert.equal(result.revision?.revisionNumber, 1);
  assert.equal(result.revision?.previousRevisionId, null);
  const materialSource = result.revision?.pricingSnapshot.quoteSummary.lineSources.find((source) => source.resourceType === "material");
  assert.equal(materialSource?.resourceId, "mdf-18");
  assert.equal(materialSource?.unit, "m2");
  assert.ok(materialSource?.sourcePartIds?.length > 0);
  assert.equal(
    result.revision?.pricingSnapshot.quoteSummary.costSummary?.grandTotalMinor,
    snapshotResult.snapshot?.quoteSummary.costSummary?.grandTotalMinor
  );
  assert.ok(Object.isFrozen(result.revision));
  assert.ok(Object.isFrozen(result.revision?.pricingSnapshot));
  assert.ok(Object.isFrozen(result.revision?.pricingSnapshot.quoteSummary.costSummary?.lines));
});

test("revizyon panel malzeme katalog metadata’sı m2/Part sözleşmesini zorunlu kılar", () => {
  const snapshot = createSnapshot();
  const materialSource = snapshot.quoteSummary.lineSources.find((source) => source.resourceType === "material");
  assert.ok(materialSource);
  materialSource.unit = "mm";
  const materialLine = snapshot.quoteSummary.costSummary.lines.find((line) => line.id === materialSource.costLineId);
  assert.ok(materialLine);
  materialLine.unit = "mm";
  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: snapshot }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /m2 birimiyle/);
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


test("açık fire/kâr satırları revizyon snapshot'ında kaynak referansıyla korunur", () => {
  const adjustedSnapshot = createProjectQuotePricingSnapshot({
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
    workItems: [],
    tariffTable: [],
    consumptionPriceList: {
      catalogId: "workshop-materials",
      version: "2026-11",
      effectiveFrom: "2026-11-01",
      effectiveTo: "2026-11-30"
    },
    laborOperationTariffList: null,
    quoteAdjustments: [{
      id: "waste-board-cut",
      category: "waste",
      description: "Kullanıcı tarafından girilen fire",
      quantity: 0.5,
      unit: "m2",
      unitPriceMinor: 1000,
      currencyCode: "TRY",
      sourceReference: "atolye-fire-hesabi:v1"
    }, {
      id: "profit-service",
      category: "profit",
      description: "Kullanıcı tarafından girilen kâr",
      quantity: 1,
      unit: "adet",
      unitPriceMinor: 2500,
      currencyCode: "TRY",
      sourceReference: "teklif-kalemleri:rev1"
    }]
  });
  assert.equal(adjustedSnapshot.status, "ready");
  const result = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: adjustedSnapshot.snapshot
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.revision?.pricingSnapshot.quoteSummary.costSummary?.categoryTotalsMinor.waste, 500);
  assert.equal(result.revision?.pricingSnapshot.quoteSummary.costSummary?.categoryTotalsMinor.profit, 2500);
  assert.equal(result.revision?.pricingSnapshot.quoteSummary.lineSources.at(-2).sourceType, "quote-adjustment");
  assert.equal(
    result.revision?.pricingSnapshot.quoteSummary.costSummary?.lines.at(-2).sourceReference,
    "atolye-fire-hesabi:v1"
  );
});
function createHistoryRevision(overrides = {}) {
  return {
    schemaVersion: 1, projectId: "project-42", revisionId: "quote-r1", revisionNumber: 1,
    createdAt: "2026-11-17T10:00:00Z", previousRevisionId: null,
    pricingSnapshot: createSnapshot(), ...overrides
  };
}

function createTwoRevisionHistory(secondOverrides = {}) {
  return {
    projectId: "project-42",
    revisions: [
      createHistoryRevision(),
      createHistoryRevision({
        revisionId: "quote-r2", revisionNumber: 2, createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1", ...secondOverrides
      })
    ]
  };
}

test("teklif revizyon geçmişi proje başına kronolojik ve değiştirilemez zincir olarak doğrulanır", () => {
  const result = validateProjectQuoteRevisionHistory(createTwoRevisionHistory());
  assert.equal(result.status, "ready");
  assert.equal(result.history?.projectId, "project-42");
  assert.deepEqual(result.history?.revisions.map((revision) => ({
    revisionId: revision.revisionId, revisionNumber: revision.revisionNumber,
    previousRevisionId: revision.previousRevisionId
  })), [
    { revisionId: "quote-r1", revisionNumber: 1, previousRevisionId: null },
    { revisionId: "quote-r2", revisionNumber: 2, previousRevisionId: "quote-r1" }
  ]);
  assert.equal(Object.isFrozen(result.history), true);
  assert.equal(Object.isFrozen(result.history?.revisions), true);
  assert.equal(Object.isFrozen(result.history?.revisions[1].pricingSnapshot), true);
});

test("boş revizyon geçmişi empty durumunu korur ve kayıt üretmez", () => {
  const result = validateProjectQuoteRevisionHistory({ projectId: "project-42", revisions: [] });
  assert.equal(result.status, "empty");
  assert.deepEqual(result.history?.revisions, []);
});

test("revizyon geçmişinde yinelenen kimlikler reddedilir", () => {
  const history = createTwoRevisionHistory();
  history.revisions.push(createHistoryRevision({ revisionNumber: 3, createdAt: "2026-11-17T12:00:00Z", previousRevisionId: "quote-r2" }));
  const result = validateProjectQuoteRevisionHistory(history);
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /revisionId değerleri benzersiz/);
});

test("revizyon geçmişindeki sıra boşluğu ve sırasız kayıtlar reddedilir", () => {
  const gap = validateProjectQuoteRevisionHistory(createTwoRevisionHistory({ revisionNumber: 3 }));
  const reversed = validateProjectQuoteRevisionHistory({
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ revisionId: "quote-r2", revisionNumber: 2, createdAt: "2026-11-17T11:00:00Z", previousRevisionId: "quote-r1" }),
      createHistoryRevision({ revisionId: "quote-r1" })
    ]
  });
  assert.equal(gap.status, "blocked");
  assert.match(gap.diagnostics[0], /kesintisiz/);
  assert.equal(reversed.status, "blocked");
  assert.match(reversed.diagnostics[0], /numarası kesintisiz/);
});

test("revizyon geçmişindeki fork veya kopuk previousRevisionId zinciri reddedilir", () => {
  const result = validateProjectQuoteRevisionHistory(createTwoRevisionHistory({ previousRevisionId: "unrelated-revision" }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /kesintisiz bir zincir/);
});

test("farklı projelere ait revizyonlar aynı geçmişte birleştirilemez", () => {
  const result = validateProjectQuoteRevisionHistory(createTwoRevisionHistory({ projectId: "another-project" }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /aynı proje kimliğine/);
});

test("revizyon geçmişinde tarih sırası geriye gidemez", () => {
  const result = validateProjectQuoteRevisionHistory(createTwoRevisionHistory({ createdAt: "2026-11-17T09:59:59Z" }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /önceki revizyon tarihinden sonra/);
});

test("bilinmeyen alan, şema sürümü ve bozuk geçmiş girdisi reddedilir", () => {
  const unknownField = createTwoRevisionHistory();
  unknownField.revisions[1].unexpected = true;
  const unsupportedVersion = createTwoRevisionHistory();
  unsupportedVersion.revisions[1].schemaVersion = 2;
  const invalidInput = validateProjectQuoteRevisionHistory({ projectId: "project-42", revisions: "not-an-array" });
  const unknown = validateProjectQuoteRevisionHistory(unknownField);
  const version = validateProjectQuoteRevisionHistory(unsupportedVersion);
  assert.equal(unknown.status, "blocked");
  assert.match(unknown.diagnostics[0], /desteklenmeyen alan/);
  assert.equal(version.status, "blocked");
  assert.match(version.diagnostics[0], /şemasını kullanmalıdır/);
  assert.equal(invalidInput.status, "blocked");
  assert.match(invalidInput.diagnostics[0], /revisions dizisi/);
});


test("boş teklif geçmişine ilk revizyon açık kimlik ve tarih ile eklenir", () => {
  const emptyHistory = { projectId: "project-42", revisions: [] };
  const result = appendProjectQuoteRevision(emptyHistory, {
    revisionId: "quote-r1",
    createdAt: "2026-11-17T10:00:00Z",
    pricingSnapshot: createSnapshot()
  });

  assert.equal(result.status, "ready");
  assert.equal(result.history?.revisions.length, 1);
  assert.equal(result.history?.revisions[0].revisionNumber, 1);
  assert.equal(result.history?.revisions[0].previousRevisionId, null);
  assert.equal(result.history?.revisions[0].revisionId, "quote-r1");
  assert.deepEqual(emptyHistory.revisions, []);
  assert.equal(Object.isFrozen(result.history?.revisions[0].pricingSnapshot), true);
});

test("geçerli geçmişe ekleme sıra numarasını ve önceki kimliği doğrulanmış zincirden türetir", () => {
  const history = createTwoRevisionHistory();
  const original = structuredClone(history);
  const result = appendProjectQuoteRevision(history, {
    revisionId: "quote-r3",
    createdAt: "2026-11-17T12:00:00Z",
    pricingSnapshot: createSnapshot()
  });

  assert.equal(result.status, "ready");
  assert.equal(result.history?.revisions.length, 3);
  assert.equal(result.history?.revisions[2].revisionNumber, 3);
  assert.equal(result.history?.revisions[2].previousRevisionId, "quote-r2");
  assert.equal(result.history?.revisions[2].revisionId, "quote-r3");
  assert.deepEqual(history, original);
  assert.equal(Object.isFrozen(result.history?.revisions), true);
  assert.equal(Object.isFrozen(result.history?.revisions[2]), true);
});

test("append geçmişte daha önce kullanılmış herhangi bir revisionId değerini reddeder", () => {
  const result = appendProjectQuoteRevision(createTwoRevisionHistory(), {
    revisionId: "quote-r1",
    createdAt: "2026-11-17T12:00:00Z",
    pricingSnapshot: createSnapshot()
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.history, null);
  assert.match(result.diagnostics[0], /revisionId benzersiz/);
});

test("append bozuk mevcut geçmişi onarmaz ve kısmi sonuç üretmez", () => {
  const history = createTwoRevisionHistory({ previousRevisionId: "broken-link" });
  const original = structuredClone(history);
  const result = appendProjectQuoteRevision(history, {
    revisionId: "quote-r3",
    createdAt: "2026-11-17T12:00:00Z",
    pricingSnapshot: createSnapshot()
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.history, null);
  assert.match(result.diagnostics[0], /previousRevisionId/);
  assert.deepEqual(history, original);
});

test("append kronolojiyi, hazır snapshot'ı ve kapalı girdi şemasını zorunlu tutar", () => {
  const history = createTwoRevisionHistory();
  const earlierDate = appendProjectQuoteRevision(history, {
    revisionId: "quote-r3",
    createdAt: "2026-11-17T10:59:59Z",
    pricingSnapshot: createSnapshot()
  });
  const invalidSnapshot = appendProjectQuoteRevision(history, {
    revisionId: "quote-r3",
    createdAt: "2026-11-17T12:00:00Z",
    pricingSnapshot: null
  });
  const overriddenSequence = appendProjectQuoteRevision(history, {
    revisionId: "quote-r3",
    revisionNumber: 3,
    createdAt: "2026-11-17T12:00:00Z",
    pricingSnapshot: createSnapshot()
  });

  assert.equal(earlierDate.status, "blocked");
  assert.match(earlierDate.diagnostics[0], /önceki revizyon tarihinden sonra/);
  assert.equal(invalidSnapshot.status, "blocked");
  assert.match(invalidSnapshot.diagnostics[0], /snapshot/);
  assert.equal(overriddenSequence.status, "blocked");
  assert.match(overriddenSequence.diagnostics[0], /desteklenmeyen alan/);
});


test("append çıktısı schemaVersion alanıyla yeniden doğrulanır ve sonraki revizyona bağlanır", () => {
  const first = appendProjectQuoteRevision(
    { projectId: "project-42", revisions: [] },
    {
      revisionId: "quote-r1",
      createdAt: "2026-11-17T10:00:00Z",
      pricingSnapshot: createSnapshot()
    }
  );
  assert.equal(first.status, "ready");

  const revalidated = validateProjectQuoteRevisionHistory(first.history);
  assert.equal(revalidated.status, "ready");

  const second = appendProjectQuoteRevision(first.history, {
    revisionId: "quote-r2",
    createdAt: "2026-11-17T11:00:00Z",
    pricingSnapshot: createSnapshot()
  });
  assert.equal(second.status, "ready");
  assert.equal(second.history?.schemaVersion, 1);
  assert.equal(second.history?.revisions.length, 2);
  assert.equal(second.history?.revisions[1].revisionNumber, 2);
  assert.equal(second.history?.revisions[1].previousRevisionId, "quote-r1");

  const unsupportedVersion = validateProjectQuoteRevisionHistory({
    ...first.history,
    schemaVersion: 2
  });
  assert.equal(unsupportedVersion.status, "blocked");
  assert.match(unsupportedVersion.diagnostics[0], /desteklenen şema sürümünü/);
});


test("maliyet satırı tutarı altı basamaklı miktarı ve yarım-yukarı yuvarlamayı tek kaynaktan hesaplar", () => {
  assert.equal(calculateProjectCostLineTotalMinor(0.000001, 500000), 1);
  assert.equal(calculateProjectCostLineTotalMinor(0.000001, 499999), 0);
  assert.throws(
    () => calculateProjectCostLineTotalMinor(1.0000001, 100),
    /en fazla 6 anlamlı ondalık basamak/
  );
});

test("revizyon snapshot satır toplamı miktar ve birim fiyatla uyuşmuyorsa aggregate toplamlar eşleşse bile reddedilir", () => {
  const pricingSnapshot = createSnapshot();
  const costSummary = pricingSnapshot.quoteSummary.costSummary;
  const line = costSummary.lines[0];
  line.lineTotalMinor += 1;
  costSummary.categoryTotalsMinor[line.category] += 1;
  costSummary.grandTotalMinor += 1;

  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot }));

  assert.equal(result.status, "blocked");
  assert.equal(result.revision, null);
  assert.match(result.diagnostics[0], /miktar ve birim fiyat/);
});

test("revizyon snapshot altı basamaktan fazla anlamlı miktar hassasiyetini kabul etmez", () => {
  const pricingSnapshot = createSnapshot();
  pricingSnapshot.quoteSummary.costSummary.lines[0].quantity = 1.0000001;

  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot }));

  assert.equal(result.status, "blocked");
  assert.equal(result.revision, null);
  assert.match(result.diagnostics[0], /en fazla 6 anlamlı ondalık basamak/);
});


function createSnapshotWithMaterialPriceDelta(deltaMinor, currencyCode = "TRY") {
  const snapshot = createSnapshot();
  const quoteSummary = snapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  const materialLine = costSummary.lines.find((line) => line.category === "material");
  assert.ok(materialLine);

  const previousLineTotal = materialLine.lineTotalMinor;
  materialLine.unitPriceMinor += deltaMinor;
  materialLine.lineTotalMinor = calculateProjectCostLineTotalMinor(
    materialLine.quantity,
    materialLine.unitPriceMinor
  );
  const lineDelta = materialLine.lineTotalMinor - previousLineTotal;
  costSummary.categoryTotalsMinor.material += lineDelta;
  costSummary.grandTotalMinor += lineDelta;

  if (currencyCode !== quoteSummary.currencyCode) {
    quoteSummary.currencyCode = currencyCode;
    costSummary.currencyCode = currencyCode;
    for (const line of costSummary.lines) line.currencyCode = currencyCode;
  }
  return snapshot;
}

test("revizyon karşılaştırması yön, birim, miktar, fiyat ve kaynak değişimlerini tam satır olarak ayırır", () => {
  const fromSnapshot = createSnapshotWithQuoteLines([
    createEdgeQuoteLine({
      id: "edge-top-r1",
      edge: "üst",
      quantity: 0.42,
      unit: "m",
      unitPriceMinor: 25,
      sourceReference: "edge-band-catalog:meter:v1",
      sourceId: "edge-top",
      sourcePartIds: ["part-top"]
    }),
    createEdgeQuoteLine({
      id: "edge-side-r1",
      edge: "sağ",
      quantity: 420,
      unit: "mm",
      unitPriceMinor: 2,
      sourceReference: "edge-band-catalog:mm:v1",
      sourceId: "edge-side",
      sourcePartIds: ["part-side"]
    }),
    createEdgeQuoteLine({
      id: "edge-bottom-r1",
      edge: "alt",
      quantity: 0.35,
      unit: "m",
      unitPriceMinor: 22,
      sourceReference: "edge-band-catalog:meter:v1",
      sourceId: "edge-bottom",
      sourcePartIds: ["part-bottom"]
    }),
    createEdgeQuoteLine({
      id: "edge-front-r1",
      edge: "ön",
      quantity: 300,
      unit: "mm",
      unitPriceMinor: 1,
      sourceReference: "edge-band-catalog:front",
      sourceId: "edge-front",
      sourcePartIds: ["part-front"]
    })
  ]);
  const toSnapshot = createSnapshotWithQuoteLines([
    createEdgeQuoteLine({
      id: "edge-top-r2",
      edge: "üst",
      quantity: 0.5,
      unit: "m",
      unitPriceMinor: 30,
      sourceReference: "edge-band-catalog:meter:v2",
      sourceId: "edge-top",
      sourcePartIds: ["part-top"]
    }),
    createEdgeQuoteLine({
      id: "edge-side-r2",
      edge: "sol",
      quantity: 420,
      unit: "mm",
      unitPriceMinor: 2,
      sourceReference: "edge-band-catalog:mm:v1",
      sourceId: "edge-side",
      sourcePartIds: ["part-side"]
    }),
    createEdgeQuoteLine({
      id: "edge-bottom-r2",
      edge: "alt",
      quantity: 0.35,
      unit: "m",
      unitPriceMinor: 22,
      sourceReference: "edge-band-catalog:meter:v1",
      sourceId: "edge-bottom",
      sourcePartIds: ["part-bottom-2"]
    }),
    createEdgeQuoteLine({
      id: "edge-front-r2",
      edge: "ön",
      quantity: 300,
      unit: "m",
      unitPriceMinor: 1,
      sourceReference: "edge-band-catalog:front",
      sourceId: "edge-front",
      sourcePartIds: ["part-front"]
    })
  ]);
  const history = createHistoryWithSnapshots(fromSnapshot, toSnapshot);

  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r2");

  assert.equal(result.status, "ready");
  const changes = result.comparison.lineChanges;
  assert.equal(changes.length, 7);
  assert.deepEqual(
    changes.reduce((counts, change) => {
      counts[change.type] += 1;
      return counts;
    }, { added: 0, removed: 0, changed: 0 }),
    { added: 3, removed: 3, changed: 1 }
  );

  const topChange = changes.find(
    (change) => change.type === "changed" && change.from.description === "Kenar bandı pvc-directional (üst kenar)"
  );
  assert.ok(topChange);
  assert.equal(topChange.from.quantity, 0.42);
  assert.equal(topChange.to.quantity, 0.5);
  assert.equal(topChange.from.unitPriceMinor, 25);
  assert.equal(topChange.to.unitPriceMinor, 30);
  assert.equal(topChange.from.sourceReference, "edge-band-catalog:meter:v1");
  assert.equal(topChange.to.sourceReference, "edge-band-catalog:meter:v2");
  assert.equal(
    topChange.from.lineTotalMinor,
    calculateProjectCostLineTotalMinor(0.42, 25)
  );
  assert.equal(
    topChange.to.lineTotalMinor,
    calculateProjectCostLineTotalMinor(0.5, 30)
  );

  const directionRemoved = changes.find(
    (change) => change.type === "removed" && change.from.description === "Kenar bandı pvc-directional (sağ kenar)"
  );
  const directionAdded = changes.find(
    (change) => change.type === "added" && change.to.description === "Kenar bandı pvc-directional (sol kenar)"
  );
  assert.ok(directionRemoved);
  assert.ok(directionAdded);
  assert.equal(directionRemoved.from.unit, "mm");
  assert.equal(directionAdded.to.unit, "mm");

  const unitRemoved = changes.find(
    (change) => change.type === "removed" &&
      change.from.description === "Kenar bandı pvc-directional (ön kenar)" &&
      change.from.unit === "mm"
  );
  const unitAdded = changes.find(
    (change) => change.type === "added" &&
      change.to.description === "Kenar bandı pvc-directional (ön kenar)" &&
      change.to.unit === "m"
  );
  assert.ok(unitRemoved);
  assert.ok(unitAdded);
  assert.equal(unitRemoved.from.quantity, 300);
  assert.equal(unitAdded.to.quantity, 300);

  const sourceRemoved = changes.find(
    (change) => change.type === "removed" && change.from.description === "Kenar bandı pvc-directional (alt kenar)"
  );
  const sourceAdded = changes.find(
    (change) => change.type === "added" && change.to.description === "Kenar bandı pvc-directional (alt kenar)"
  );
  assert.ok(sourceRemoved);
  assert.ok(sourceAdded);
  assert.deepEqual(sourceRemoved.from.sourcePartIds, ["part-bottom"]);
  assert.deepEqual(sourceAdded.to.sourcePartIds, ["part-bottom-2"]);
  assert.equal(Object.isFrozen(changes), true);
  assert.equal(Object.isFrozen(topChange.from), true);
  assert.equal(Object.isFrozen(topChange.to), true);
});

test("teklif revizyonları aynı para biriminde kategori ve genel toplam farkını verir", () => {
  const history = createTwoRevisionHistory({
    pricingSnapshot: createSnapshotWithMaterialPriceDelta(250)
  });
  const before = history.revisions[0].pricingSnapshot.quoteSummary.costSummary;
  const after = history.revisions[1].pricingSnapshot.quoteSummary.costSummary;
  const expectedMaterialDelta =
    after.categoryTotalsMinor.material - before.categoryTotalsMinor.material;

  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r2");

  assert.equal(result.status, "ready");
  assert.equal(result.comparison?.projectId, "project-42");
  assert.equal(result.comparison?.currencyCode, "TRY");
  assert.equal(result.comparison?.fromRevisionNumber, 1);
  assert.equal(result.comparison?.toRevisionNumber, 2);
  assert.equal(result.comparison?.grandTotalDeltaMinor, expectedMaterialDelta);
  assert.equal(result.comparison?.categoryDeltasMinor.material, expectedMaterialDelta);
  assert.deepEqual(result.comparison?.categoryDeltasMinor, {
    material: expectedMaterialDelta,
    hardware: 0,
    labor: 0,
    operation: 0,
    waste: 0,
    profit: 0
  });
  assert.equal(Object.isFrozen(result.comparison), true);
  assert.equal(Object.isFrozen(result.comparison?.categoryDeltasMinor), true);
});

test("daha eski, aynı veya geçmişte bulunmayan revizyon hedefi karşılaştırılamaz", () => {
  const history = createTwoRevisionHistory();
  const reversed = compareProjectQuoteRevisions(history, "quote-r2", "quote-r1");
  const same = compareProjectQuoteRevisions(history, "quote-r1", "quote-r1");
  const missing = compareProjectQuoteRevisions(history, "quote-r0", "quote-r2");

  assert.equal(reversed.status, "blocked");
  assert.match(reversed.diagnostics[0], /daha yeni olmalıdır/);
  assert.equal(same.status, "blocked");
  assert.match(same.diagnostics[0], /daha yeni olmalıdır/);
  assert.equal(missing.status, "blocked");
  assert.match(missing.diagnostics[0], /geçmişte bulunmalıdır/);
  assert.equal(missing.comparison, null);
});

test("farklı para birimli revizyonlar kur varsaymadan karşılaştırılmaz", () => {
  const history = createTwoRevisionHistory({
    pricingSnapshot: createSnapshotWithMaterialPriceDelta(0, "USD")
  });
  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r2");

  assert.equal(result.status, "blocked");
  assert.equal(result.comparison, null);
  assert.match(result.diagnostics[0], /Farklı para birimlerindeki/);
});

test("bozuk veya boş revizyon geçmişi karşılaştırma üretmez", () => {
  const brokenHistory = createTwoRevisionHistory({ previousRevisionId: "missing-link" });
  const broken = compareProjectQuoteRevisions(brokenHistory, "quote-r1", "quote-r2");
  const empty = compareProjectQuoteRevisions(
    { projectId: "project-42", revisions: [] },
    "quote-r1",
    "quote-r2"
  );

  assert.equal(broken.status, "blocked");
  assert.equal(broken.comparison, null);
  assert.match(broken.diagnostics[0], /previousRevisionId/);
  assert.equal(empty.status, "blocked");
  assert.equal(empty.comparison, null);
  assert.match(empty.diagnostics[0], /Boş teklif geçmişinde/);
});


test("teklif revizyon geçmişi v1 JSON dosyası legacy geçmişi kayıpsız biçimde round-trip eder", () => {
  const history = createTwoRevisionHistory();
  const original = JSON.stringify(history);
  const serialized = serializeProjectQuoteRevisionHistoryFile(history);
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  assert.equal(JSON.stringify(history), original);
  const envelope = JSON.parse(serialized.json);
  assert.equal(envelope.fileType, PROJECT_QUOTE_REVISION_FILE_TYPE);
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.history.schemaVersion, 1);
  const parsed = parseProjectQuoteRevisionHistoryFile(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.history?.revisions.map((revision) => ({
    revisionId: revision.revisionId,
    revisionNumber: revision.revisionNumber,
    previousRevisionId: revision.previousRevisionId,
    grandTotalMinor: revision.pricingSnapshot.quoteSummary.costSummary?.grandTotalMinor
  })), [
    { revisionId: "quote-r1", revisionNumber: 1, previousRevisionId: null, grandTotalMinor: history.revisions[0].pricingSnapshot.quoteSummary.costSummary.grandTotalMinor },
    { revisionId: "quote-r2", revisionNumber: 2, previousRevisionId: "quote-r1", grandTotalMinor: history.revisions[1].pricingSnapshot.quoteSummary.costSummary.grandTotalMinor }
  ]);
  assert.equal(Object.isFrozen(parsed.history), true);
  assert.equal(Object.isFrozen(parsed.history?.revisions[0].pricingSnapshot), true);
});

test("boş teklif revizyon geçmişi JSON dosyasında empty durumunu korur", () => {
  const serialized = serializeProjectQuoteRevisionHistoryFile({ projectId: "project-42", revisions: [] });
  assert.equal(serialized.status, "empty");
  assert.ok(serialized.json);
  const parsed = parseProjectQuoteRevisionHistoryFile(serialized.json);
  assert.equal(parsed.status, "empty");
  assert.deepEqual(parsed.history?.revisions, []);
});

test("geçersiz revizyon geçmişi serializer ve parser tarafından kısmi dosya üretmeden reddedilir", () => {
  const brokenHistory = createTwoRevisionHistory({ previousRevisionId: "missing-link" });
  const serialized = serializeProjectQuoteRevisionHistoryFile(brokenHistory);
  assert.equal(serialized.status, "blocked");
  assert.equal(serialized.json, null);
  const parsed = parseProjectQuoteRevisionHistoryFile(JSON.stringify({
    fileType: PROJECT_QUOTE_REVISION_FILE_TYPE, schemaVersion: 1, history: brokenHistory
  }));
  assert.equal(parsed.status, "blocked");
  assert.equal(parsed.history, null);
});

test("bozuk JSON, yanlış dosya türü, bilinmeyen alan ve desteklenmeyen sürüm reddedilir", () => {
  const validEnvelope = {
    fileType: PROJECT_QUOTE_REVISION_FILE_TYPE,
    schemaVersion: 1,
    history: { projectId: "project-42", revisions: [] }
  };
  const malformed = parseProjectQuoteRevisionHistoryFile("{");
  const wrongType = parseProjectQuoteRevisionHistoryFile(JSON.stringify({ ...validEnvelope, fileType: "other-file" }));
  const unknownField = parseProjectQuoteRevisionHistoryFile(JSON.stringify({ ...validEnvelope, extra: true }));
  const unsupportedVersion = parseProjectQuoteRevisionHistoryFile(JSON.stringify({ ...validEnvelope, schemaVersion: 2 }));
  const nonText = parseProjectQuoteRevisionHistoryFile({});
  assert.equal(malformed.status, "blocked");
  assert.match(malformed.diagnostics[0], /geçerli JSON/);
  assert.equal(wrongType.status, "blocked");
  assert.equal(unknownField.status, "blocked");
  assert.match(unknownField.diagnostics[0], /desteklenmeyen alan/);
  assert.equal(unsupportedVersion.status, "blocked");
  assert.match(unsupportedVersion.diagnostics[0], /sürümü/);
  assert.equal(nonText.status, "blocked");
});


test("DOM-060 yeni revizyonlarda kaynak satır eşlemesi eksik veya yinelenen olamaz", () => {
  const missingLineMapping = createSnapshot();
  missingLineMapping.quoteSummary.lineSources.pop();
  const missingMappingResult = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: missingLineMapping
  }));
  assert.equal(missingMappingResult.status, "blocked");
  assert.match(missingMappingResult.diagnostics[0], /kaynak eşlemesi satır sayısı/);

  const duplicateSourceSnapshot = createSnapshot();
  const duplicateSummary = duplicateSourceSnapshot.quoteSummary;
  const duplicateCost = duplicateSummary.costSummary;
  assert.ok(duplicateCost);
  const materialIndex = duplicateCost.lines.findIndex((line) => line.category === "material");
  assert.ok(materialIndex >= 0);
  const materialLine = duplicateCost.lines[materialIndex];
  const materialSource = duplicateSummary.lineSources[materialIndex];
  const duplicateLine = { ...materialLine, id: "duplicate-material-source-line" };
  duplicateCost.lines.push(duplicateLine);
  duplicateSummary.lineSources.push({
    ...materialSource,
    costLineId: duplicateLine.id,
    ...(materialSource.sourcePartIds === undefined ? {} : { sourcePartIds: [...materialSource.sourcePartIds] })
  });
  duplicateCost.lineCount += 1;
  duplicateCost.categoryTotalsMinor[duplicateLine.category] += duplicateLine.lineTotalMinor;
  duplicateCost.grandTotalMinor += duplicateLine.lineTotalMinor;
  duplicateSummary.requiredLineCount += 1;
  duplicateSummary.pricedLineCount += 1;
  const duplicateSourceResult = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: duplicateSourceSnapshot
  }));
  assert.equal(duplicateSourceResult.status, "blocked");
  assert.match(duplicateSourceResult.diagnostics[0], /kaynak satırı eşlemesi yinelenemez/);

  const duplicateCostLineMapping = structuredClone(duplicateSourceSnapshot);
  duplicateCostLineMapping.quoteSummary.lineSources[1].costLineId =
    duplicateCostLineMapping.quoteSummary.lineSources[0].costLineId;
  const duplicateCostLineResult = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: duplicateCostLineMapping
  }));
  assert.equal(duplicateCostLineResult.status, "blocked");
  assert.match(duplicateCostLineResult.diagnostics[0], /kaynak eşlemesi maliyet satırı kimliğiyle uyuşmuyor/);
});

test("DOM-060 yeni material tüketim satırları Part provenance olmadan revizyona alınmaz", () => {
  const snapshot = createSnapshot();
  const materialIndex = snapshot.quoteSummary.costSummary.lines.findIndex((line) => line.category === "material");
  assert.ok(materialIndex >= 0);
  delete snapshot.quoteSummary.lineSources[materialIndex].sourcePartIds;
  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: snapshot }));
  assert.equal(result.status, "blocked");
  assert.equal(result.revision, null);
  assert.match(result.diagnostics[0], /kaynak Part kimlikleriyle eşleşmelidir/);
});

test("DOM-060 yeni revizyonlarda kaynak türü ve maliyet kategorisi uyumsuzluğu fail-closed", () => {
  const snapshot = createSnapshot();
  const materialIndex = snapshot.quoteSummary.costSummary.lines.findIndex((line) => line.category === "material");
  assert.ok(materialIndex >= 0);
  const cost = snapshot.quoteSummary.costSummary;
  const line = cost.lines[materialIndex];
  const materialSource = snapshot.quoteSummary.lineSources[materialIndex];
  delete materialSource.resourceType;
  delete materialSource.resourceId;
  delete materialSource.unit;
  cost.categoryTotalsMinor.material -= line.lineTotalMinor;
  cost.categoryTotalsMinor.labor += line.lineTotalMinor;
  line.category = "labor";
  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: snapshot }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics[0], /kaynak türü maliyet kategorisiyle uyuşmuyor/);
});

test("DOM-060 legacy revision v1 provenance marker olmadan uyumlu kalır; strict marker eksik Part ID'leri engeller", () => {
  const history = createTwoRevisionHistory();
  for (const revision of history.revisions) {
    const quote = revision.pricingSnapshot.quoteSummary;
    const cost = quote.costSummary;
    for (let index = 0; index < cost.lines.length; index += 1) {
      if (cost.lines[index].category === "material") {
        delete quote.lineSources[index].sourcePartIds;
      }
    }
  }
  const legacyResult = validateProjectQuoteRevisionHistory(history);
  assert.equal(legacyResult.status, "ready");

  const strictHistory = structuredClone(history);
  strictHistory.revisions[1].sourceIntegrityVersion = 1;
  const strictResult = validateProjectQuoteRevisionHistory(strictHistory);
  assert.equal(strictResult.status, "blocked");
  assert.equal(strictResult.history, null);
  assert.match(strictResult.diagnostics[0], /kaynak Part kimlikleriyle eşleşmelidir/);
});


test("DOM-061 structured edge directions compare independently of display descriptions", () => {
  const topSnapshot = createSnapshotWithQuoteLines([createEdgeQuoteLine({
    id: "edge-direction-top-r1", edge: "üst", edgeDirection: "top", description: "Kenar bandı",
    quantity: 0.42, unit: "m", unitPriceMinor: 25, sourceReference: "edge-band-catalog:v1",
    sourceId: "edge-direction-source", sourcePartIds: ["part-direction"]
  })]);
  const rightSnapshot = createSnapshotWithQuoteLines([createEdgeQuoteLine({
    id: "edge-direction-right-r2", edge: "sağ", edgeDirection: "right", description: "Kenar bandı",
    quantity: 0.42, unit: "m", unitPriceMinor: 25, sourceReference: "edge-band-catalog:v1",
    sourceId: "edge-direction-source", sourcePartIds: ["part-direction"]
  })]);
  const comparison = compareProjectQuoteRevisions(
    createHistoryWithSnapshots(topSnapshot, rightSnapshot), "quote-r1", "quote-r2"
  );
  assert.equal(comparison.status, "ready");
  assert.equal(comparison.comparison.lineChanges.length, 2);
  const removed = comparison.comparison.lineChanges.find((change) => change.type === "removed");
  const added = comparison.comparison.lineChanges.find((change) => change.type === "added");
  assert.equal(removed?.from.edgeDirection, "top");
  assert.equal(added?.to.edgeDirection, "right");
  assert.equal(removed?.from.description, "Kenar bandı");
  assert.equal(added?.to.description, "Kenar bandı");
});

test("DOM-061 structured edge direction rejects unknown values and non-material quote lines", () => {
  const invalidDirectionSnapshot = createSnapshotWithQuoteLines([createEdgeQuoteLine({
    id: "edge-invalid-direction", edge: "ön", edgeDirection: "front", description: "Kenar bandı",
    quantity: 1, unit: "m", unitPriceMinor: 25, sourceReference: "edge-band-catalog:v1",
    sourceId: "edge-invalid-source", sourcePartIds: ["part-invalid"]
  })]);
  const invalidDirection = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: invalidDirectionSnapshot }));
  assert.equal(invalidDirection.status, "blocked");
  assert.match(invalidDirection.diagnostics[0], /top, bottom, left veya right/);

  const nonMaterialSnapshot = createSnapshot();
  const laborLine = nonMaterialSnapshot.quoteSummary.costSummary.lines.find((line) => line.category === "labor");
  assert.ok(laborLine);
  laborLine.edgeDirection = "top";
  const nonMaterial = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: nonMaterialSnapshot }));
  assert.equal(nonMaterial.status, "blocked");
  assert.match(nonMaterial.diagnostics[0], /yalnızca material maliyet satırlarında/);
});


test("DOM-065 revision comparison preserves waste/profit added, removed and changed source provenance and reconciles deltas", () => {
  const fromSnapshot = createSnapshotWithQuoteAdjustmentLines([
    { id: "waste-change", category: "waste", description: "Fire", sourceId: "waste-change", sourceReference: "fire:v1", unitPriceMinor: 100 },
    { id: "waste-remove", category: "waste", description: "Eski fire", sourceId: "waste-remove", sourceReference: "fire:remove:v1", unitPriceMinor: 25 },
    { id: "profit-change", category: "profit", description: "Kâr", sourceId: "profit-change", sourceReference: "profit:v1", unitPriceMinor: 300 },
    { id: "profit-remove", category: "profit", description: "Eski kâr", sourceId: "profit-remove", sourceReference: "profit:remove:v1", unitPriceMinor: 50 }
  ]);
  const toSnapshot = createSnapshotWithQuoteAdjustmentLines([
    { id: "waste-change", category: "waste", description: "Fire", sourceId: "waste-change", sourceReference: "fire:v2", unitPriceMinor: 150 },
    { id: "waste-add", category: "waste", description: "Yeni fire", sourceId: "waste-add", sourceReference: "fire:add:v1", unitPriceMinor: 100 },
    { id: "profit-change", category: "profit", description: "Kâr", sourceId: "profit-change", sourceReference: "profit:v2", unitPriceMinor: 350 },
    { id: "profit-add", category: "profit", description: "Yeni kâr", sourceId: "profit-add", sourceReference: "profit:add:v1", unitPriceMinor: 200 }
  ]);
  const comparison = compareProjectQuoteRevisions(createHistoryWithSnapshots(fromSnapshot, toSnapshot), "quote-r1", "quote-r2");
  assert.equal(comparison.status, "ready");
  assert.equal(comparison.comparison.lineChanges.length, 6);
  assert.deepEqual(
    comparison.comparison.lineChanges.reduce((counts, change) => { counts[change.type] += 1; return counts; }, { added: 0, removed: 0, changed: 0 }),
    { added: 2, removed: 2, changed: 2 }
  );
  assert.deepEqual(comparison.comparison.categoryDeltasMinor, {
    material: 0, hardware: 0, labor: 0, operation: 0, waste: 125, profit: 200
  });
  assert.equal(comparison.comparison.grandTotalDeltaMinor, 325);
  const find = sourceId => comparison.comparison.lineChanges.find(change => (change.from ?? change.to)?.sourceId === sourceId);
  const wasteChanged = find("waste-change");
  assert.equal(wasteChanged.type, "changed");
  assert.equal(wasteChanged.from.sourceReference, "fire:v1");
  assert.equal(wasteChanged.to.sourceReference, "fire:v2");
  assert.equal(wasteChanged.from.lineTotalMinor, 100);
  assert.equal(wasteChanged.to.lineTotalMinor, 150);
  const wasteAdded = find("waste-add");
  assert.equal(wasteAdded.type, "added");
  assert.equal(wasteAdded.to.sourceReference, "fire:add:v1");
  const wasteRemoved = find("waste-remove");
  assert.equal(wasteRemoved.type, "removed");
  assert.equal(wasteRemoved.from.sourceReference, "fire:remove:v1");
  const profitChanged = find("profit-change");
  assert.equal(profitChanged.type, "changed");
  assert.equal(profitChanged.from.sourceReference, "profit:v1");
  assert.equal(profitChanged.to.sourceReference, "profit:v2");
  const profitAdded = find("profit-add");
  assert.equal(profitAdded.type, "added");
  assert.equal(profitAdded.to.sourceReference, "profit:add:v1");
  const profitRemoved = find("profit-remove");
  assert.equal(profitRemoved.type, "removed");
  assert.equal(profitRemoved.from.sourceReference, "profit:remove:v1");
});
test("DOM-078B material catalog identity changes are separate comparison lines", () => {
  const fromSnapshot = createSnapshot();
  const toSnapshot = createSnapshot();
  const fromMaterialLine = fromSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  const toMaterialLine = toSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  assert.ok(fromMaterialLine);
  assert.ok(toMaterialLine);
  const fromSource = fromSnapshot.quoteSummary.lineSources.find(source => source.costLineId === fromMaterialLine.id);
  const toSource = toSnapshot.quoteSummary.lineSources.find(source => source.costLineId === toMaterialLine.id);
  assert.ok(fromSource);
  assert.ok(toSource);
  assert.equal(fromSource.resourceType, "material");
  assert.equal(fromSource.resourceId, "mdf-18");
  assert.equal(fromSource.unit, "m2");
  toSource.resourceId = "mdf-18-alternate";

  const result = compareProjectQuoteRevisions(createHistoryWithSnapshots(fromSnapshot, toSnapshot), "quote-r1", "quote-r2");
  assert.equal(result.status, "ready");
  const materialChanges = result.comparison.lineChanges.filter(change => (change.from ?? change.to)?.category === "material");
  assert.equal(materialChanges.length, 2);
  assert.deepEqual(materialChanges.reduce((counts, change) => { counts[change.type] += 1; return counts; }, { added: 0, removed: 0, changed: 0 }),
    { added: 1, removed: 1, changed: 0 });
  assert.equal(materialChanges.find(change => change.type === "removed").from.sourceId, fromSource.sourceId);
  assert.equal(materialChanges.find(change => change.type === "added").to.sourceId, toSource.sourceId);
});

test("DOM-084 catalog resource identity changes stay added/removed and survive comparison JSON v2 and CSV v4", () => {
  const fromSnapshot = createSnapshot();
  const toSnapshot = createSnapshot();
  const fromLine = fromSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  const toLine = toSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  assert.ok(fromLine);
  assert.ok(toLine);
  const fromSource = fromSnapshot.quoteSummary.lineSources.find(source => source.costLineId === fromLine.id);
  const toSource = toSnapshot.quoteSummary.lineSources.find(source => source.costLineId === toLine.id);
  assert.ok(fromSource);
  assert.ok(toSource);
  assert.equal(fromSource.resourceType, "material");
  assert.equal(fromSource.resourceId, "mdf-18");
  assert.equal(fromSource.unit, "m2");

  // Keep source/Part identity stable while the actual catalog resource and unit change.
  toSource.sourceId = fromSource.sourceId;
  toSource.resourceType = "edge-banding";
  toSource.resourceId = "pvc-1";
  toSource.unit = "m";
  toLine.quantity = 0.3;
  toLine.unit = "m";
  toLine.unitPriceMinor = 1000;
  toLine.lineTotalMinor = calculateProjectCostLineTotalMinor(toLine.quantity, toLine.unitPriceMinor);
  const materialDeltaMinor = toLine.lineTotalMinor - fromLine.lineTotalMinor;
  toSnapshot.quoteSummary.costSummary.categoryTotalsMinor.material += materialDeltaMinor;
  toSnapshot.quoteSummary.costSummary.grandTotalMinor += materialDeltaMinor;

  const result = compareProjectQuoteRevisions(
    createHistoryWithSnapshots(fromSnapshot, toSnapshot),
    "quote-r1",
    "quote-r2"
  );
  assert.equal(result.status, "ready");
  assert.ok(result.comparison);
  const changes = result.comparison.lineChanges.filter(change => (change.from ?? change.to)?.sourceId === fromSource.sourceId);
  assert.equal(changes.length, 2);
  assert.deepEqual(changes.map(change => change.type).sort(), ["added", "removed"]);
  const removed = changes.find(change => change.type === "removed");
  const added = changes.find(change => change.type === "added");
  assert.ok(removed);
  assert.ok(added);
  assert.equal(removed.from.resourceType, "material");
  assert.equal(removed.from.resourceId, "mdf-18");
  assert.equal(removed.from.resourceUnit, "m2");
  assert.deepEqual(removed.from.sourcePartIds, fromSource.sourcePartIds);
  assert.equal(added.to.resourceType, "edge-banding");
  assert.equal(added.to.resourceId, "pvc-1");
  assert.equal(added.to.resourceUnit, "m");
  assert.equal(added.to.unit, "m");
  assert.deepEqual(added.to.sourcePartIds, fromSource.sourcePartIds);
  assert.equal(result.comparison.categoryDeltasMinor.material, materialDeltaMinor);
  assert.equal(result.comparison.grandTotalDeltaMinor, materialDeltaMinor);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});


test("DOM-085 price source reference changes remain value changes with unchanged catalog and Part provenance", () => {
  const fromSnapshot = createSnapshot();
  const toSnapshot = createSnapshot();
  const fromLine = fromSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  const toLine = toSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  assert.ok(fromLine);
  assert.ok(toLine);
  const fromSource = fromSnapshot.quoteSummary.lineSources.find(source => source.costLineId === fromLine.id);
  const toSource = toSnapshot.quoteSummary.lineSources.find(source => source.costLineId === toLine.id);
  assert.ok(fromSource);
  assert.ok(toSource);

  // Only the price-list/source reference changes; catalog resource and Part identity stay fixed.
  toSource.sourceType = fromSource.sourceType;
  toSource.sourceId = fromSource.sourceId;
  toSource.resourceType = fromSource.resourceType;
  toSource.resourceId = fromSource.resourceId;
  toSource.unit = fromSource.unit;
  toSource.sourcePartIds = [...fromSource.sourcePartIds];
  toLine.sourceReference = fromLine.sourceReference + ":price-source-v2";
  assert.deepEqual(
    { type: fromSource.resourceType, id: fromSource.resourceId, unit: fromSource.unit, partIds: fromSource.sourcePartIds },
    { type: toSource.resourceType, id: toSource.resourceId, unit: toSource.unit, partIds: toSource.sourcePartIds }
  );

  const result = compareProjectQuoteRevisions(createHistoryWithSnapshots(fromSnapshot, toSnapshot), "quote-r1", "quote-r2");
  assert.equal(result.status, "ready");
  assert.ok(result.comparison);
  const changes = result.comparison.lineChanges.filter(change => (change.from ?? change.to)?.sourceId === fromSource.sourceId);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].type, "changed");
  assert.equal(changes[0].from.sourceReference, fromLine.sourceReference);
  assert.equal(changes[0].to.sourceReference, toLine.sourceReference);
  assert.deepEqual(changes[0].from.sourcePartIds, fromSource.sourcePartIds);
  assert.deepEqual(changes[0].to.sourcePartIds, toSource.sourcePartIds);
  assert.equal(result.comparison.categoryDeltasMinor.material, 0);
  assert.equal(result.comparison.grandTotalDeltaMinor, 0);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});

test("DOM-086 Part provenance-only changes split into removed and added quote lines", () => {
  const fromSnapshot = createSnapshot();
  const toSnapshot = createSnapshot();
  const fromLine = fromSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  const toLine = toSnapshot.quoteSummary.costSummary.lines.find(line => line.category === "material");
  assert.ok(fromLine);
  assert.ok(toLine);
  const fromSource = fromSnapshot.quoteSummary.lineSources.find(source => source.costLineId === fromLine.id);
  const toSource = toSnapshot.quoteSummary.lineSources.find(source => source.costLineId === toLine.id);
  assert.ok(fromSource);
  assert.ok(toSource);
  assert.ok(fromSource.sourcePartIds.length > 0);

  // Keep catalog/source identity and pricing stable; only the responsible Part IDs change.
  toSource.sourceType = fromSource.sourceType;
  toSource.sourceId = fromSource.sourceId;
  toSource.resourceType = fromSource.resourceType;
  toSource.resourceId = fromSource.resourceId;
  toSource.unit = fromSource.unit;
  toSource.sourcePartIds = fromSource.sourcePartIds.map(partId => partId + "-v2");
  assert.notDeepEqual(toSource.sourcePartIds, fromSource.sourcePartIds);
  assert.deepEqual(
    { type: fromSource.resourceType, id: fromSource.resourceId, unit: fromSource.unit, sourceId: fromSource.sourceId },
    { type: toSource.resourceType, id: toSource.resourceId, unit: toSource.unit, sourceId: toSource.sourceId }
  );

  const result = compareProjectQuoteRevisions(createHistoryWithSnapshots(fromSnapshot, toSnapshot), "quote-r1", "quote-r2");
  assert.equal(result.status, "ready");
  assert.ok(result.comparison);
  const changes = result.comparison.lineChanges.filter(change => (change.from ?? change.to)?.sourceId === fromSource.sourceId);
  assert.equal(changes.length, 2);
  const removed = changes.find(change => change.type === "removed");
  const added = changes.find(change => change.type === "added");
  assert.ok(removed);
  assert.ok(added);
  assert.equal(removed.to, null);
  assert.equal(added.from, null);
  assert.deepEqual(removed.from.sourcePartIds, fromSource.sourcePartIds);
  assert.deepEqual(added.to.sourcePartIds, toSource.sourcePartIds);
  assert.deepEqual(
    { type: removed.from.resourceType, id: removed.from.resourceId, unit: removed.from.resourceUnit },
    { type: added.to.resourceType, id: added.to.resourceId, unit: added.to.resourceUnit }
  );
  assert.equal(removed.from.quantity, added.to.quantity);
  assert.equal(removed.from.unit, added.to.unit);
  assert.equal(removed.from.unitPriceMinor, added.to.unitPriceMinor);
  assert.equal(removed.from.lineTotalMinor, added.to.lineTotalMinor);
  assert.equal(result.comparison.categoryDeltasMinor.material, 0);
  assert.equal(result.comparison.grandTotalDeltaMinor, 0);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});

test("roll purchase lines retain source metadata in immutable quote revisions", () => {
  const result = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: createRollSnapshot()
  }));

  assert.equal(result.status, "ready");
  assert.ok(result.revision);
  const summary = result.revision.pricingSnapshot.quoteSummary;
  const rollLine = summary.costSummary.lines.find(line => line.unit === "rulo");
  const rollSource = summary.lineSources.find(source => source.unit === "rulo");
  assert.ok(rollLine);
  assert.ok(rollSource);
  assert.equal(rollLine.quantity, 2);
  assert.equal(rollSource.rollCount, 2);
  assert.equal(rollSource.rollLengthMm, 100000);
  assert.equal(rollSource.purchasedLengthMm, 200000);
  assert.deepEqual(rollSource.sourcePartIds, ["part-a", "part-b"]);
  assert.deepEqual(rollSource.furnitureIds, ["cabinet-a"]);
  assert.equal(rollSource.planSourceReference, "roll-spec:v1");
  assert.equal(rollSource.priceSourceReference, "roll-prices:v1");
});

test("roll count and purchased length must reconcile with the roll cost line", () => {
  const countSnapshot = createRollSnapshot();
  const countSource = countSnapshot.quoteSummary.lineSources.find(item => item.unit === "rulo");
  assert.ok(countSource);
  countSource.rollCount = 1;
  const countResult = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: countSnapshot }));
  assert.equal(countResult.status, "blocked");
  assert.match(countResult.diagnostics.join(" "), /rulo adedi.*quantity/);

  const lengthSnapshot = createRollSnapshot();
  const lengthSource = lengthSnapshot.quoteSummary.lineSources.find(item => item.unit === "rulo");
  assert.ok(lengthSource);
  lengthSource.purchasedLengthMm = 100000;
  const lengthResult = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: lengthSnapshot }));
  assert.equal(lengthResult.status, "blocked");
  assert.match(lengthResult.diagnostics.join(" "), /satın alınan uzunluğu rulo adedi ve rulo uzunluğuyla uyuşmuyor/);
});

test("rulo unit without edge-band source metadata is rejected", () => {
  const snapshot = createSnapshotWithQuoteLines([
    createEdgeQuoteLine({
      id: "edge-roll-untracked",
      edge: "rulo",
      quantity: 1,
      unit: "rulo",
      unitPriceMinor: 1,
      sourceReference: "roll-price:v1",
      sourceId: "edge-roll-untracked",
      sourcePartIds: ["part-a"],
      description: "Untracked roll line"
    })
  ]);
  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: snapshot }));
  assert.equal(result.status, "blocked");
  assert.match(result.diagnostics.join(" "), /Rulo birimi yalnızca edge-banding/);
});
test("DOM-087 multi-line Part provenance isolates changes to the affected material line", () => {
  const materialLines = (partA) => [
    {
      line: {
        id: "quote-material-part-a",
        category: "material",
        description: "MDF panel A",
        quantity: 1.25,
        unit: "m2",
        unitPriceMinor: 1250,
        currencyCode: "TRY",
        sourceReference: "material-price-list:2026-11"
      },
      source: {
        costLineId: "quote-material-part-a",
        sourceType: "production-consumption",
        sourceId: "material-source-part-a",
        resourceType: "material",
        resourceId: "mdf-18",
        unit: "m2",
        sourcePartIds: partA
      }
    },
    {
      line: {
        id: "quote-material-part-b",
        category: "material",
        description: "MDF panel B",
        quantity: 2,
        unit: "m2",
        unitPriceMinor: 1250,
        currencyCode: "TRY",
        sourceReference: "material-price-list:2026-11"
      },
      source: {
        costLineId: "quote-material-part-b",
        sourceType: "production-consumption",
        sourceId: "material-source-part-b",
        resourceType: "material",
        resourceId: "mdf-18",
        unit: "m2",
        sourcePartIds: ["part-b"]
      }
    }
  ];
  const fromSnapshot = createSnapshotWithQuoteLines(materialLines(["part-a"]));
  const toSnapshot = createSnapshotWithQuoteLines(materialLines(["part-a-v2"]));
  const result = compareProjectQuoteRevisions(
    createHistoryWithSnapshots(fromSnapshot, toSnapshot),
    "quote-r1",
    "quote-r2"
  );
  assert.equal(result.status, "ready");
  assert.ok(result.comparison);
  assert.equal(result.comparison.lineChanges.length, 2);

  const changedSourceId = "material-source-part-a";
  const changedLines = result.comparison.lineChanges.filter(
    change => (change.from ?? change.to)?.sourceId === changedSourceId
  );
  assert.equal(changedLines.length, 2);
  const removed = changedLines.find(change => change.type === "removed");
  const added = changedLines.find(change => change.type === "added");
  assert.ok(removed);
  assert.ok(added);
  assert.equal(removed.to, null);
  assert.equal(added.from, null);
  assert.deepEqual(removed.from.sourcePartIds, ["part-a"]);
  assert.deepEqual(added.to.sourcePartIds, ["part-a-v2"]);
  assert.equal(removed.from.lineTotalMinor, added.to.lineTotalMinor);

  const unchangedSourceId = "material-source-part-b";
  const unchangedLines = result.comparison.lineChanges.filter(
    change => (change.from ?? change.to)?.sourceId === unchangedSourceId
  );
  assert.equal(unchangedLines.length, 0);
  assert.equal(result.comparison.categoryDeltasMinor.material, 0);
  assert.equal(result.comparison.grandTotalDeltaMinor, 0);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});



test("DOM-088 revision comparison and JSON/CSV exports are deterministic when quote lines and source mappings are reordered", () => {
  const materialLine = (id, description, sourceId, partId, quantity, unitPriceMinor) => ({
    line: {
      id, category: "material", description, quantity, unit: "m2",
      unitPriceMinor, currencyCode: "TRY", sourceReference: "materials:2026-11"
    },
    source: {
      costLineId: id, sourceType: "production-consumption", sourceId,
      resourceType: "material", resourceId: "mdf-18", unit: "m2",
      sourcePartIds: [partId]
    }
  });
  const fromEntries = [
    materialLine("quote-material-a", "MDF panel A", "material-source-a", "part-a", 1, 1000),
    materialLine("quote-material-b", "MDF panel B", "material-source-b", "part-b", 2, 1200)
  ];
  const toEntries = [
    materialLine("quote-material-b", "MDF panel B", "material-source-b", "part-b", 2.5, 1200),
    materialLine("quote-material-a", "MDF panel A", "material-source-a", "part-a", 1, 1000),
    materialLine("quote-material-c", "MDF panel C", "material-source-c", "part-c", 0.5, 1200)
  ];

  const reorderSnapshot = (snapshot, reorder) => {
    const lines = snapshot.quoteSummary.costSummary.lines;
    const sources = snapshot.quoteSummary.lineSources;
    const paired = lines.map((line, index) => ({ line, source: sources[index] }));
    const reordered = reorder(paired);
    lines.splice(0, lines.length, ...reordered.map(item => item.line));
    sources.splice(0, sources.length, ...reordered.map(item => item.source));
  };
  const compare = (reorderInputs) => {
    const fromSnapshot = createSnapshotWithQuoteLines(fromEntries);
    const toSnapshot = createSnapshotWithQuoteLines(toEntries);
    if (reorderInputs) {
      reorderSnapshot(fromSnapshot, pairs => pairs.reverse());
      reorderSnapshot(toSnapshot, pairs => pairs.slice(1).concat(pairs.slice(0, 1)));
    }
    const result = compareProjectQuoteRevisions(
      createHistoryWithSnapshots(fromSnapshot, toSnapshot), "quote-r1", "quote-r2"
    );
    assert.equal(result.status, "ready", result.diagnostics.join("; "));
    assert.ok(result.comparison);
    assert.deepEqual(result.comparison.lineChanges.map(change => ({
      type: change.type, sourceId: (change.from ?? change.to).sourceId
    })), [
      { type: "changed", sourceId: "material-source-b" },
      { type: "added", sourceId: "material-source-c" }
    ]);
    return result;
  };

  const ordered = compare(false);
  const reordered = compare(true);
  assert.deepEqual(reordered.comparison, ordered.comparison);

  const orderedJson = serializeProjectQuoteRevisionComparisonFile(ordered);
  const reorderedJson = serializeProjectQuoteRevisionComparisonFile(reordered);
  assert.equal(orderedJson.status, "ready", orderedJson.diagnostics.join("; "));
  assert.equal(reorderedJson.status, "ready", reorderedJson.diagnostics.join("; "));
  assert.equal(reorderedJson.json, orderedJson.json);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(reorderedJson.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, ordered.comparison);

  const orderedCsv = serializeProjectQuoteRevisionComparisonCsv(ordered);
  const reorderedCsv = serializeProjectQuoteRevisionComparisonCsv(reordered);
  assert.equal(orderedCsv.status, "ready", orderedCsv.diagnostics.join("; "));
  assert.equal(reorderedCsv.status, "ready", reorderedCsv.diagnostics.join("; "));
  assert.equal(reorderedCsv.csv, orderedCsv.csv);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(reorderedCsv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, ordered.comparison);
});

test("DOM-089 quote revision rejects source mappings reordered independently from cost lines", () => {
  const entries = [
    {
      line: {
        id: "dom-089-cost-line-a",
        category: "material",
        description: "DOM-089 MDF panel A",
        quantity: 1.25,
        unit: "m2",
        unitPriceMinor: 1250,
        currencyCode: "TRY",
        sourceReference: "materials:dom-089"
      },
      source: {
        costLineId: "dom-089-cost-line-a",
        sourceType: "production-consumption",
        sourceId: "dom-089-source-a",
        resourceType: "material",
        resourceId: "mdf-18",
        unit: "m2",
        sourcePartIds: ["dom-089-part-a"]
      }
    },
    {
      line: {
        id: "dom-089-cost-line-b",
        category: "material",
        description: "DOM-089 MDF panel B",
        quantity: 2.5,
        unit: "m2",
        unitPriceMinor: 1500,
        currencyCode: "TRY",
        sourceReference: "materials:dom-089"
      },
      source: {
        costLineId: "dom-089-cost-line-b",
        sourceType: "production-consumption",
        sourceId: "dom-089-source-b",
        resourceType: "material",
        resourceId: "mdf-18",
        unit: "m2",
        sourcePartIds: ["dom-089-part-b"]
      }
    }
  ];
  const snapshot = createSnapshotWithQuoteLines(entries);
  const costSummary = snapshot.quoteSummary.costSummary;
  assert.ok(costSummary);

  const lineAIndex = costSummary.lines.findIndex(line => line.id === "dom-089-cost-line-a");
  const lineBIndex = costSummary.lines.findIndex(line => line.id === "dom-089-cost-line-b");
  const sourceAIndex = snapshot.quoteSummary.lineSources.findIndex(source => source.costLineId === "dom-089-cost-line-a");
  const sourceBIndex = snapshot.quoteSummary.lineSources.findIndex(source => source.costLineId === "dom-089-cost-line-b");
  assert.ok(lineAIndex >= 0 && lineBIndex >= 0 && sourceAIndex >= 0 && sourceBIndex >= 0);
  assert.notEqual(lineAIndex, lineBIndex);
  assert.notEqual(sourceAIndex, sourceBIndex);

  const sourceA = snapshot.quoteSummary.lineSources[sourceAIndex];
  snapshot.quoteSummary.lineSources[sourceAIndex] = snapshot.quoteSummary.lineSources[sourceBIndex];
  snapshot.quoteSummary.lineSources[sourceBIndex] = sourceA;

  const result = createProjectQuoteRevision(createFirstRevision({ pricingSnapshot: snapshot }));
  assert.equal(result.status, "blocked");
  assert.equal(result.revision, null);
  assert.match(
    result.diagnostics[0],
    /Teklif kaynak eşlemesi maliyet satırı kimliğiyle uyuşmuyor/
  );
});



test("DOM-090 three-revision r1-to-r3 comparison preserves Part provenance, totals and fail-closed selection", () => {
  const materialLine = (id, description, sourceId, partId, quantity, unitPriceMinor) => ({
    line: {
      id,
      category: "material",
      description,
      quantity,
      unit: "m2",
      unitPriceMinor,
      currencyCode: "TRY",
      sourceReference: "materials:dom-090"
    },
    source: {
      costLineId: id,
      sourceType: "production-consumption",
      sourceId,
      resourceType: "material",
      resourceId: "mdf-18",
      unit: "m2",
      sourcePartIds: [partId]
    }
  });
  const revisionOneSnapshot = createSnapshotWithQuoteLines([
    materialLine("dom-090-line-a", "DOM-090 panel A", "dom-090-source-a", "dom-090-part-a", 1, 1000),
    materialLine("dom-090-line-b", "DOM-090 panel B", "dom-090-source-b", "dom-090-part-b", 1, 500)
  ]);
  const revisionTwoSnapshot = createSnapshotWithQuoteLines([
    materialLine("dom-090-line-a", "DOM-090 panel A", "dom-090-source-a", "dom-090-part-a", 1.5, 1000),
    materialLine("dom-090-line-b", "DOM-090 panel B", "dom-090-source-b", "dom-090-part-b", 1, 500)
  ]);
  const revisionThreeSnapshot = createSnapshotWithQuoteLines([
    materialLine("dom-090-line-a", "DOM-090 panel A", "dom-090-source-a", "dom-090-part-a", 2, 1000),
    materialLine("dom-090-line-c", "DOM-090 panel C", "dom-090-source-c", "dom-090-part-c", 1, 300)
  ]);
  const history = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ pricingSnapshot: revisionOneSnapshot }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: revisionTwoSnapshot
      }),
      createHistoryRevision({
        revisionId: "quote-r3",
        revisionNumber: 3,
        createdAt: "2026-11-17T12:00:00Z",
        previousRevisionId: "quote-r2",
        pricingSnapshot: revisionThreeSnapshot
      })
    ]
  };

  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r3");
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.comparison);
  assert.equal(result.comparison.fromRevisionNumber, 1);
  assert.equal(result.comparison.toRevisionNumber, 3);
  assert.equal(result.comparison.currencyCode, "TRY");
  assert.equal(result.comparison.categoryDeltasMinor.material, 800);
  assert.equal(result.comparison.grandTotalDeltaMinor, 800);

  const changes = result.comparison.lineChanges.filter(change =>
    ["dom-090-source-a", "dom-090-source-b", "dom-090-source-c"].includes((change.from ?? change.to)?.sourceId)
  );
  assert.equal(changes.length, 3);
  const changedA = changes.find(change => (change.from ?? change.to)?.sourceId === "dom-090-source-a");
  assert.equal(changedA?.type, "changed");
  assert.equal(changedA.from.quantity, 1);
  assert.equal(changedA.to.quantity, 2);
  assert.equal(changedA.from.lineTotalMinor, 1000);
  assert.equal(changedA.to.lineTotalMinor, 2000);
  assert.deepEqual(changedA.from.sourcePartIds, ["dom-090-part-a"]);
  assert.deepEqual(changedA.to.sourcePartIds, ["dom-090-part-a"]);

  const removedB = changes.find(change => (change.from ?? change.to)?.sourceId === "dom-090-source-b");
  assert.equal(removedB?.type, "removed");
  assert.equal(removedB.to, null);
  assert.deepEqual(removedB.from.sourcePartIds, ["dom-090-part-b"]);
  assert.equal(removedB.from.lineTotalMinor, 500);

  const addedC = changes.find(change => (change.from ?? change.to)?.sourceId === "dom-090-source-c");
  assert.equal(addedC?.type, "added");
  assert.equal(addedC.from, null);
  assert.deepEqual(addedC.to.sourcePartIds, ["dom-090-part-c"]);
  assert.equal(addedC.to.lineTotalMinor, 300);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);

  const reversed = compareProjectQuoteRevisions(history, "quote-r3", "quote-r1");
  assert.equal(reversed.status, "blocked");
  assert.equal(reversed.comparison, null);
  assert.match(reversed.diagnostics[0], /Hedef revizyon başlangıç revizyonundan daha yeni olmalıdır/);

  const unknown = compareProjectQuoteRevisions(history, "quote-r1", "quote-r9");
  assert.equal(unknown.status, "blocked");
  assert.equal(unknown.comparison, null);
  assert.match(unknown.diagnostics[0], /doğrulanmış geçmişte bulunmalıdır/);
});

test("DOM-091 repeated source-line comparison across three revisions deterministically preserves Part provenance and exports", () => {
  const materialLine = (id, quantity, sourceId, partId) => ({
    line: {
      id,
      category: "material",
      description: "DOM-091 repeated MDF panel",
      quantity,
      unit: "m2",
      unitPriceMinor: 1000,
      currencyCode: "TRY",
      sourceReference: "materials:dom-091"
    },
    source: {
      costLineId: id,
      sourceType: "production-consumption",
      sourceId,
      resourceType: "material",
      resourceId: "mdf-18",
      unit: "m2",
      sourcePartIds: [partId]
    }
  });
  const revisionEntries = (revision, quantities) => [
    ...quantities.map((quantity, index) => materialLine(
      "dom-091-" + revision + "-repeat-" + (index + 1),
      quantity,
      "dom-091-repeated-source",
      "dom-091-part-a"
    )),
    materialLine(
      "dom-091-" + revision + "-stable",
      2,
      "dom-091-stable-source",
      "dom-091-part-b"
    )
  ];
  const reorderSnapshot = (snapshot, reorder) => {
    const lines = snapshot.quoteSummary.costSummary.lines;
    const sources = snapshot.quoteSummary.lineSources;
    const paired = lines.map((line, index) => ({ line, source: sources[index] }));
    const reordered = reorder(paired);
    lines.splice(0, lines.length, ...reordered.map(item => item.line));
    sources.splice(0, sources.length, ...reordered.map(item => item.source));
  };
  const compare = (reorderInputs) => {
    const revisionOneSnapshot = createSnapshotWithQuoteLines(revisionEntries("r1", [1, 1]));
    const revisionTwoSnapshot = createSnapshotWithQuoteLines(revisionEntries("r2", [1, 2]));
    const revisionThreeSnapshot = createSnapshotWithQuoteLines(revisionEntries("r3", [1, 2.5, 3]));
    if (reorderInputs) {
      reorderSnapshot(revisionOneSnapshot, pairs => pairs.reverse());
      reorderSnapshot(revisionTwoSnapshot, pairs => pairs.slice(1).concat(pairs.slice(0, 1)));
      reorderSnapshot(revisionThreeSnapshot, pairs => pairs.reverse());
    }
    const history = {
      projectId: "project-42",
      revisions: [
        createHistoryRevision({ pricingSnapshot: revisionOneSnapshot }),
        createHistoryRevision({
          revisionId: "quote-r2",
          revisionNumber: 2,
          createdAt: "2026-11-17T11:00:00Z",
          previousRevisionId: "quote-r1",
          pricingSnapshot: revisionTwoSnapshot
        }),
        createHistoryRevision({
          revisionId: "quote-r3",
          revisionNumber: 3,
          createdAt: "2026-11-17T12:00:00Z",
          previousRevisionId: "quote-r2",
          pricingSnapshot: revisionThreeSnapshot
        })
      ]
    };
    const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r3");
    assert.equal(result.status, "ready", result.diagnostics.join("; "));
    assert.ok(result.comparison);
    assert.equal(result.comparison.categoryDeltasMinor.material, 4500);
    assert.equal(result.comparison.grandTotalDeltaMinor, 4500);
    assert.deepEqual(result.comparison.lineChanges.map(change => ({
      type: change.type,
      fromQuantity: change.from?.quantity ?? null,
      toQuantity: change.to?.quantity ?? null,
      fromParts: change.from?.sourcePartIds ?? null,
      toParts: change.to?.sourcePartIds ?? null
    })), [
      {
        type: "changed",
        fromQuantity: 1,
        toQuantity: 2.5,
        fromParts: ["dom-091-part-a"],
        toParts: ["dom-091-part-a"]
      },
      {
        type: "added",
        fromQuantity: null,
        toQuantity: 3,
        fromParts: null,
        toParts: ["dom-091-part-a"]
      }
    ]);
    return result;
  };

  const ordered = compare(false);
  const reordered = compare(true);
  assert.deepEqual(reordered.comparison, ordered.comparison);

  const orderedJson = serializeProjectQuoteRevisionComparisonFile(ordered);
  const reorderedJson = serializeProjectQuoteRevisionComparisonFile(reordered);
  assert.equal(orderedJson.status, "ready", orderedJson.diagnostics.join("; "));
  assert.equal(reorderedJson.status, "ready", reorderedJson.diagnostics.join("; "));
  assert.equal(JSON.parse(orderedJson.json).schemaVersion, 2);
  assert.equal(reorderedJson.json, orderedJson.json);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(reorderedJson.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, ordered.comparison);

  const orderedCsv = serializeProjectQuoteRevisionComparisonCsv(ordered);
  const reorderedCsv = serializeProjectQuoteRevisionComparisonCsv(reordered);
  assert.equal(orderedCsv.status, "ready", orderedCsv.diagnostics.join("; "));
  assert.equal(reorderedCsv.status, "ready", reorderedCsv.diagnostics.join("; "));
  assert.equal(reorderedCsv.csv, orderedCsv.csv);
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(reorderedCsv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, ordered.comparison);
});

test("DOM-092 strict revisions reject duplicate source identities while legacy histories remain comparable", () => {
  const repeatedMaterialLines = (revision, quantities) => quantities.map((quantity, index) => {
    const id = "dom-092-" + revision + "-material-" + (index + 1);
    return {
      line: {
        id,
        category: "material",
        description: "DOM-092 repeated material source",
        quantity,
        unit: "m2",
        unitPriceMinor: 1000,
        currencyCode: "TRY",
        sourceReference: "materials:dom-092"
      },
      source: {
        costLineId: id,
        sourceType: "production-consumption",
        sourceId: "dom-092-duplicate-source",
        resourceType: "material",
        resourceId: "mdf-18",
        unit: "m2",
        sourcePartIds: ["dom-092-part-a"]
      }
    };
  });

  const strictSnapshot = createSnapshotWithQuoteLines(repeatedMaterialLines("strict", [1, 2]));
  const strictResult = createProjectQuoteRevision(createFirstRevision({
    pricingSnapshot: strictSnapshot
  }));
  assert.equal(strictResult.status, "blocked");
  assert.equal(strictResult.revision, null);
  assert.match(strictResult.diagnostics[0], /kaynak satırı eşlemesi yinelenemez/);

  const legacyHistory = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({
        pricingSnapshot: createSnapshotWithQuoteLines(repeatedMaterialLines("r1", [1, 2]))
      }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: createSnapshotWithQuoteLines(repeatedMaterialLines("r2", [2, 1]))
      })
    ]
  };
  const legacyValidation = validateProjectQuoteRevisionHistory(legacyHistory);
  assert.equal(legacyValidation.status, "ready", legacyValidation.diagnostics.join("; "));
  assert.equal(legacyValidation.history?.revisions.length, 2);

  const comparison = compareProjectQuoteRevisions(legacyValidation.history, "quote-r1", "quote-r2");
  assert.equal(comparison.status, "ready", comparison.diagnostics.join("; "));
  assert.ok(comparison.comparison);
  assert.deepEqual(comparison.comparison.lineChanges, []);
});



test("DOM-093 three-revision comparison isolates a single Part-provenance change and preserves zero-total exports", () => {
  const materialLine = (id, sourceId, sourcePartIds, quantity, unitPriceMinor) => ({
    line: {
      id,
      category: "material",
      description: "DOM-093 MDF panel",
      quantity,
      unit: "m2",
      unitPriceMinor,
      currencyCode: "TRY",
      sourceReference: "materials:dom-093"
    },
    source: {
      costLineId: id,
      sourceType: "production-consumption",
      sourceId,
      resourceType: "material",
      resourceId: "mdf-18",
      unit: "m2",
      sourcePartIds
    }
  });
  const revisionSnapshot = (revision, partA, quantityA) => createSnapshotWithQuoteLines([
    materialLine("dom-093-" + revision + "-part-a", "dom-093-source-a", [partA], quantityA, 1000),
    materialLine("dom-093-" + revision + "-part-b", "dom-093-source-b", ["dom-093-part-b"], 2, 500)
  ]);
  const revisionOneSnapshot = revisionSnapshot("r1", "dom-093-part-a", 1);
  const revisionTwoSnapshot = revisionSnapshot("r2", "dom-093-part-a", 1.5);
  const revisionThreeSnapshot = revisionSnapshot("r3", "dom-093-part-a-replaced", 1);
  const history = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ pricingSnapshot: revisionOneSnapshot }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: revisionTwoSnapshot
      }),
      createHistoryRevision({
        revisionId: "quote-r3",
        revisionNumber: 3,
        createdAt: "2026-11-17T12:00:00Z",
        previousRevisionId: "quote-r2",
        pricingSnapshot: revisionThreeSnapshot
      })
    ]
  };

  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r3");
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.comparison);
  assert.equal(result.comparison.fromRevisionNumber, 1);
  assert.equal(result.comparison.toRevisionNumber, 3);
  assert.equal(result.comparison.categoryDeltasMinor.material, 0);
  assert.equal(result.comparison.grandTotalDeltaMinor, 0);
  assert.equal(result.comparison.lineChanges.length, 2);

  const changedPartLines = result.comparison.lineChanges.filter(
    change => (change.from ?? change.to)?.sourceId === "dom-093-source-a"
  );
  assert.equal(changedPartLines.length, 2);
  const removed = changedPartLines.find(change => change.type === "removed");
  const added = changedPartLines.find(change => change.type === "added");
  assert.ok(removed);
  assert.ok(added);
  assert.equal(removed.to, null);
  assert.equal(added.from, null);
  assert.deepEqual(removed.from.sourcePartIds, ["dom-093-part-a"]);
  assert.deepEqual(added.to.sourcePartIds, ["dom-093-part-a-replaced"]);
  assert.equal(removed.from.lineTotalMinor, added.to.lineTotalMinor);

  const unchangedPartLines = result.comparison.lineChanges.filter(
    change => (change.from ?? change.to)?.sourceId === "dom-093-source-b"
  );
  assert.equal(unchangedPartLines.length, 0);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});

test("DOM-094 three-revision comparison reconciles fractional quantity rounding after a material price reduction", () => {
  const materialLine = (revision, sourceId, partId, quantity, unitPriceMinor, description) => {
    const id = "dom-094-" + revision + "-" + sourceId;
    return {
      line: {
        id,
        category: "material",
        description,
        quantity,
        unit: "m2",
        unitPriceMinor,
        currencyCode: "TRY",
        sourceReference: "materials:dom-094"
      },
      source: {
        costLineId: id,
        sourceType: "production-consumption",
        sourceId,
        resourceType: "material",
        resourceId: "mdf-18",
        unit: "m2",
        sourcePartIds: [partId]
      }
    };
  };
  const revisionSnapshot = (revision, panelQuantity, panelPriceMinor, roundingQuantity) =>
    createSnapshotWithQuoteLines([
      materialLine(revision, "panel", "dom-094-part-panel", panelQuantity, panelPriceMinor, "DOM-094 MDF panel"),
      materialLine(revision, "rounding", "dom-094-part-rounding", roundingQuantity, 1, "DOM-094 half-minor-unit rounding")
    ]);
  const revisions = [
    createHistoryRevision({
      pricingSnapshot: revisionSnapshot("r1", 0.375, 101, 0.5)
    }),
    createHistoryRevision({
      revisionId: "quote-r2",
      revisionNumber: 2,
      createdAt: "2026-11-17T11:00:00Z",
      previousRevisionId: "quote-r1",
      pricingSnapshot: revisionSnapshot("r2", 0.625, 90, 0.4)
    }),
    createHistoryRevision({
      revisionId: "quote-r3",
      revisionNumber: 3,
      createdAt: "2026-11-17T12:00:00Z",
      previousRevisionId: "quote-r2",
      pricingSnapshot: revisionSnapshot("r3", 0.375, 80, 0.5)
    })
  ];
  const history = { projectId: "project-42", revisions };
  const firstCost = revisions[0].pricingSnapshot.quoteSummary.costSummary;
  const middleCost = revisions[1].pricingSnapshot.quoteSummary.costSummary;
  const lastCost = revisions[2].pricingSnapshot.quoteSummary.costSummary;
  assert.ok(firstCost);
  assert.ok(middleCost);
  assert.ok(lastCost);
  const panelLine = cost => cost.lines.find(line => line.description === "DOM-094 MDF panel");
  const roundingLine = cost => cost.lines.find(line => line.description === "DOM-094 half-minor-unit rounding");
  assert.equal(panelLine(firstCost).lineTotalMinor, 38); // 0.375 * 101 = 37.875, half-up to 38
  assert.equal(panelLine(middleCost).lineTotalMinor, 56); // 0.625 * 90 = 56.25, half-up to 56
  assert.equal(panelLine(lastCost).lineTotalMinor, 30); // 0.375 * 80 = 30
  assert.equal(roundingLine(firstCost).lineTotalMinor, 1); // 0.5 * 1 rounds up
  assert.equal(roundingLine(middleCost).lineTotalMinor, 0); // 0.4 * 1 rounds down
  assert.equal(roundingLine(lastCost).lineTotalMinor, 1);

  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r3");
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.comparison);
  assert.equal(result.comparison.fromRevisionNumber, 1);
  assert.equal(result.comparison.toRevisionNumber, 3);
  assert.deepEqual(result.comparison.categoryDeltasMinor, {
    material: -8, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0
  });
  assert.equal(result.comparison.grandTotalDeltaMinor, -8);
  assert.equal(result.comparison.lineChanges.length, 1);
  const changed = result.comparison.lineChanges[0];
  assert.equal(changed.type, "changed");
  assert.equal(changed.from.sourceId, "panel");
  assert.equal(changed.to.sourceId, "panel");
  assert.equal(changed.from.quantity, 0.375);
  assert.equal(changed.to.quantity, 0.375);
  assert.equal(changed.from.unitPriceMinor, 101);
  assert.equal(changed.to.unitPriceMinor, 80);
  assert.equal(changed.from.lineTotalMinor, 38);
  assert.equal(changed.to.lineTotalMinor, 30);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});



test("DOM-095 three-revision mixed-category comparison reconciles changes, removals and additions", () => {
  const lineEntry = (id, category, description, quantity, unit, unitPriceMinor, source, sourceReference) => ({
    line: {
      id, category, description, quantity, unit, unitPriceMinor, currencyCode: "TRY",
      ...(sourceReference === undefined ? {} : { sourceReference })
    },
    source: { costLineId: id, ...source }
  });
  const revisionSnapshot = (entries) => {
    const snapshot = createSnapshot();
    const quoteSummary = snapshot.quoteSummary;
    const costSummary = quoteSummary.costSummary;
    assert.ok(costSummary);
    for (const entry of entries) {
      const lineTotalMinor = calculateProjectCostLineTotalMinor(entry.line.quantity, entry.line.unitPriceMinor);
      costSummary.lines.push({ ...entry.line, lineTotalMinor });
      quoteSummary.lineSources.push({
        ...entry.source,
        ...(entry.source.sourcePartIds === undefined ? {} : { sourcePartIds: [...entry.source.sourcePartIds] })
      });
      costSummary.categoryTotalsMinor[entry.line.category] += lineTotalMinor;
      costSummary.grandTotalMinor += lineTotalMinor;
    }
    costSummary.lineCount = costSummary.lines.length;
    quoteSummary.requiredLineCount += entries.length;
    quoteSummary.pricedLineCount += entries.length;
    return snapshot;
  };
  const material = (id, sourceId, partId, quantity, price) => lineEntry(
    id, "material", "DOM-095 material", quantity, "m2", price,
    { sourceType: "production-consumption", sourceId, resourceType: "material", resourceId: "mdf-18", unit: "m2", sourcePartIds: [partId] },
    "materials:dom-095"
  );
  const hardware = (price) => lineEntry(
    "dom-095-hardware", "hardware", "DOM-095 hardware", 2, "adet", price,
    { sourceType: "production-consumption", sourceId: "dom-095-hardware", sourcePartIds: ["dom-095-hardware-part"] },
    "hardware:dom-095"
  );
  const labor = (price) => lineEntry(
    "dom-095-labor", "labor", "DOM-095 labor", 1, "h", price,
    { sourceType: "labor-operation", sourceId: "dom-095-labor", tariffId: "dom-095-labor-tariff" },
    "labor:dom-095"
  );
  const operation = (price) => lineEntry(
    "dom-095-operation", "operation", "DOM-095 operation", 1, "op", price,
    { sourceType: "labor-operation", sourceId: "dom-095-operation", tariffId: "dom-095-operation-tariff" },
    "operation:dom-095"
  );
  const waste = (price) => lineEntry(
    "dom-095-waste", "waste", "DOM-095 waste", 1, "kalem", price,
    { sourceType: "quote-adjustment", sourceId: "dom-095-waste" },
    "waste:dom-095"
  );
  const profit = (price) => lineEntry(
    "dom-095-profit", "profit", "DOM-095 profit", 1, "kalem", price,
    { sourceType: "quote-adjustment", sourceId: "dom-095-profit" },
    "profit:dom-095"
  );

  const fromSnapshot = revisionSnapshot([
    material("dom-095-panel", "dom-095-panel-source", "dom-095-panel-part", 1.25, 1000),
    hardware(250),
    labor(200),
    operation(400),
    waste(300),
    profit(150)
  ]);
  const toSnapshot = revisionSnapshot([
    material("dom-095-panel", "dom-095-panel-source", "dom-095-panel-part", 1.25, 800),
    material("dom-095-extra-material", "dom-095-extra-source", "dom-095-extra-part", 0.5, 600),
    hardware(300),
    labor(250),
    waste(100),
    profit(150)
  ]);
  const middleSnapshot = revisionSnapshot([
    operation(9999)
  ]);
  const history = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ pricingSnapshot: fromSnapshot }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: middleSnapshot
      }),
      createHistoryRevision({
        revisionId: "quote-r3",
        revisionNumber: 3,
        createdAt: "2026-11-17T12:00:00Z",
        previousRevisionId: "quote-r2",
        pricingSnapshot: toSnapshot
      })
    ]
  };

  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r3");
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.comparison);
  assert.deepEqual(result.comparison.categoryDeltasMinor, {
    material: 50, hardware: 100, labor: 50, operation: -400, waste: -200, profit: 0
  });
  assert.equal(result.comparison.grandTotalDeltaMinor, -400);
  assert.equal(
    Object.values(result.comparison.categoryDeltasMinor).reduce((sum, delta) => sum + delta, 0),
    result.comparison.grandTotalDeltaMinor
  );
  assert.deepEqual(
    result.comparison.lineChanges.reduce((counts, change) => {
      counts[change.type] += 1;
      return counts;
    }, { added: 0, removed: 0, changed: 0 }),
    { added: 1, removed: 1, changed: 4 }
  );
  const findChanges = sourceId => result.comparison.lineChanges.filter(
    change => (change.from ?? change.to)?.sourceId === sourceId
  );
  const panelChange = findChanges("dom-095-panel-source");
  assert.equal(panelChange.length, 1);
  assert.equal(panelChange[0].type, "changed");
  assert.equal(panelChange[0].from.lineTotalMinor, 1250);
  assert.equal(panelChange[0].to.lineTotalMinor, 1000);
  assert.equal(panelChange[0].from.unitPriceMinor, 1000);
  assert.equal(panelChange[0].to.unitPriceMinor, 800);
  assert.deepEqual(panelChange[0].from.sourcePartIds, ["dom-095-panel-part"]);
  assert.deepEqual(panelChange[0].to.sourcePartIds, ["dom-095-panel-part"]);
  const addedMaterial = findChanges("dom-095-extra-source");
  assert.equal(addedMaterial.length, 1);
  assert.equal(addedMaterial[0].type, "added");
  assert.equal(addedMaterial[0].from, null);
  assert.equal(addedMaterial[0].to.lineTotalMinor, 300);
  assert.deepEqual(addedMaterial[0].to.sourcePartIds, ["dom-095-extra-part"]);
  assert.equal(findChanges("dom-095-hardware")[0].to.lineTotalMinor, 600);
  assert.equal(findChanges("dom-095-labor")[0].to.lineTotalMinor, 250);
  assert.equal(findChanges("dom-095-operation")[0].type, "removed");
  assert.equal(findChanges("dom-095-operation")[0].from.lineTotalMinor, 400);
  assert.equal(findChanges("dom-095-waste")[0].to.lineTotalMinor, 100);
  assert.equal(findChanges("dom-095-profit").length, 0);
  assert.equal(findChanges("dom-095-middle-only").length, 0);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);
  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});

function createDom097Snapshot({ hardwareQuantity, hardwarePrice, laborQuantity, laborPrice, operationQuantity, operationPrice }) {
  const snapshot = createSnapshot();
  const quoteSummary = snapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  assert.ok(costSummary);
  const laborLine = costSummary.lines.find(line => line.category === "labor");
  assert.ok(laborLine);
  const previousLaborTotal = laborLine.lineTotalMinor;
  laborLine.quantity = laborQuantity;
  laborLine.unitPriceMinor = laborPrice;
  laborLine.lineTotalMinor = calculateProjectCostLineTotalMinor(laborQuantity, laborPrice);
  const laborDelta = laborLine.lineTotalMinor - previousLaborTotal;
  costSummary.categoryTotalsMinor.labor += laborDelta;
  costSummary.grandTotalMinor += laborDelta;

  const addLine = (line, source) => {
    const lineTotalMinor = calculateProjectCostLineTotalMinor(line.quantity, line.unitPriceMinor);
    costSummary.lines.push({ ...line, lineTotalMinor });
    quoteSummary.lineSources.push({ ...source });
    costSummary.categoryTotalsMinor[line.category] += lineTotalMinor;
    costSummary.grandTotalMinor += lineTotalMinor;
    costSummary.lineCount += 1;
    quoteSummary.requiredLineCount += 1;
    quoteSummary.pricedLineCount += 1;
  };
  addLine({
    id: "dom-097-hardware",
    category: "hardware",
    description: "DOM-097 fractional hardware BOM",
    quantity: hardwareQuantity,
    unit: "adet",
    unitPriceMinor: hardwarePrice,
    currencyCode: "TRY",
    sourceReference: "hardware-prices:dom-097"
  }, {
    costLineId: "dom-097-hardware",
    sourceType: "production-consumption",
    sourceId: "dom-097-hardware"
  });
  addLine({
    id: "dom-097-operation",
    category: "operation",
    description: "DOM-097 workshop operation",
    quantity: operationQuantity,
    unit: "h",
    unitPriceMinor: operationPrice,
    currencyCode: "TRY",
    sourceReference: "operation-tariffs:dom-097"
  }, {
    costLineId: "dom-097-operation",
    sourceType: "labor-operation",
    sourceId: "dom-097-operation",
    tariffId: "dom-097-operation-hourly"
  });
  return snapshot;
}

test("DOM-097 three-revision fractional hardware and labor/operation changes reconcile rounded line and category totals", () => {
  const revisionOneSnapshot = createDom097Snapshot({
    hardwareQuantity: 1.25, hardwarePrice: 400,
    laborQuantity: 1.5, laborPrice: 2400,
    operationQuantity: 0.125, operationPrice: 1010
  });
  const revisionTwoSnapshot = createDom097Snapshot({
    hardwareQuantity: 1.75, hardwarePrice: 500,
    laborQuantity: 1.25, laborPrice: 2500,
    operationQuantity: 0.375, operationPrice: 1010
  });
  const revisionThreeSnapshot = createDom097Snapshot({
    hardwareQuantity: 2.5, hardwarePrice: 600,
    laborQuantity: 1.75, laborPrice: 2800,
    operationQuantity: 0.5, operationPrice: 1020
  });
  const history = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ pricingSnapshot: revisionOneSnapshot }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: revisionTwoSnapshot
      }),
      createHistoryRevision({
        revisionId: "quote-r3",
        revisionNumber: 3,
        createdAt: "2026-11-17T12:00:00Z",
        previousRevisionId: "quote-r2",
        pricingSnapshot: revisionThreeSnapshot
      })
    ]
  };

  const result = compareProjectQuoteRevisions(history, "quote-r1", "quote-r3");
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.comparison);
  assert.equal(result.comparison.lineChanges.length, 3);
  assert.deepEqual(result.comparison.categoryDeltasMinor, {
    material: 0,
    hardware: 1000,
    labor: 1300,
    operation: 384,
    waste: 0,
    profit: 0
  });
  assert.equal(result.comparison.grandTotalDeltaMinor, 2684);
  assert.equal(
    Object.values(result.comparison.categoryDeltasMinor).reduce((sum, delta) => sum + delta, 0),
    result.comparison.grandTotalDeltaMinor
  );

  const hardware = result.comparison.lineChanges.find(change => (change.from ?? change.to)?.sourceId === "dom-097-hardware");
  assert.equal(hardware?.type, "changed");
  assert.equal(hardware.from.quantity, 1.25);
  assert.equal(hardware.to.quantity, 2.5);
  assert.equal(hardware.from.lineTotalMinor, 500);
  assert.equal(hardware.to.lineTotalMinor, 1500);

  const labor = result.comparison.lineChanges.find(change => (change.from ?? change.to)?.sourceId === "assembly-labor");
  assert.equal(labor?.type, "changed");
  assert.equal(labor.from.quantity, 1.5);
  assert.equal(labor.to.quantity, 1.75);
  assert.equal(labor.from.lineTotalMinor, 3600);
  assert.equal(labor.to.lineTotalMinor, 4900);

  const operation = result.comparison.lineChanges.find(change => (change.from ?? change.to)?.sourceId === "dom-097-operation");
  assert.equal(operation?.type, "changed");
  assert.equal(operation.from.lineTotalMinor, 126);
  assert.equal(operation.to.lineTotalMinor, 510);
  assert.equal(operation.to.quantity, 0.5);

  const json = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(json.status, "ready", json.diagnostics.join("; "));
  assert.equal(JSON.parse(json.json).schemaVersion, 2);
  const parsedJson = parseProjectQuoteRevisionComparisonFile(json.json);
  assert.equal(parsedJson.status, "ready", parsedJson.diagnostics.join("; "));
  assert.deepEqual(parsedJson.comparison, result.comparison);

  const csv = serializeProjectQuoteRevisionComparisonCsv(result);
  assert.equal(csv.status, "ready", csv.diagnostics.join("; "));
  assert.equal(PROJECT_QUOTE_REVISION_COMPARISON_CSV_VERSION, 4);
  const parsedCsv = parseProjectQuoteRevisionComparisonCsv(csv.csv);
  assert.equal(parsedCsv.status, "ready", parsedCsv.diagnostics.join("; "));
  assert.deepEqual(parsedCsv.comparison, result.comparison);
});


function createDom131AuditSnapshot() {
  const snapshot = createSnapshot();
  const quoteSummary = snapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  assert.ok(costSummary);
  const materialSource = quoteSummary.lineSources.find(
    source => source.sourceType === "production-consumption" && source.sourcePartIds !== undefined
  );
  assert.ok(materialSource?.sourcePartIds);
  const sourcePartIds = [...materialSource.sourcePartIds];

  const hardwareLineTotalMinor = calculateProjectCostLineTotalMinor(2, 500);
  costSummary.lines.push({
    id: "dom-131-hardware",
    category: "hardware",
    description: "Menteşe BOM satırı",
    quantity: 2,
    unit: "adet",
    unitPriceMinor: 500,
    lineTotalMinor: hardwareLineTotalMinor,
    currencyCode: costSummary.currencyCode,
    sourceReference: "price-list:hinge-110"
  });
  quoteSummary.lineSources.push({
    costLineId: "dom-131-hardware",
    sourceType: "production-consumption",
    sourceId: "bom-hinge-1",
    sourcePartIds,
    hardwareId: "hinge-110",
    hardwareUnit: "adet",
    hardwareFurnitureIds: ["revision-cabinet-1"],
    hardwareSourceReferences: ["bom-source-a", "bom-source-b"]
  });
  costSummary.categoryTotalsMinor.hardware += hardwareLineTotalMinor;
  costSummary.grandTotalMinor += hardwareLineTotalMinor;

  const profitLineTotalMinor = calculateProjectCostLineTotalMinor(1, 250);
  costSummary.lines.push({
    id: "dom-131-profit",
    category: "profit",
    description: "Kullanıcı girdili kâr",
    quantity: 1,
    unit: "kalem",
    unitPriceMinor: 250,
    lineTotalMinor: profitLineTotalMinor,
    currencyCode: costSummary.currencyCode,
    sourceReference: "quote-adjustment:profit-1"
  });
  quoteSummary.lineSources.push({
    costLineId: "dom-131-profit",
    sourceType: "quote-adjustment",
    sourceId: "profit-1"
  });
  costSummary.categoryTotalsMinor.profit += profitLineTotalMinor;
  costSummary.grandTotalMinor += profitLineTotalMinor;
  costSummary.lineCount = costSummary.lines.length;
  quoteSummary.requiredLineCount += 2;
  quoteSummary.pricedLineCount += 2;
  return snapshot;
}

test("DOM-131 immutable quote source-map audit preserves per-revision trace counts and exact provenance", () => {
  const secondSnapshot = createDom131AuditSnapshot();
  const history = createTwoRevisionHistory({ pricingSnapshot: secondSnapshot });
  const originalHistoryJson = JSON.stringify(history);
  const result = calculateProjectQuoteRevisionSourceMapAudit(history);
  assert.equal(result.status, "ready");
  assert.ok(result.audit);
  assert.equal(result.audit.projectId, "project-42");
  assert.equal(result.audit.revisionCount, 2);
  assert.equal(result.audit.revisions.length, 2);
  assert.equal(result.audit.revisions[0].sourceIntegrityVersion, null);
  assert.equal(result.audit.revisions[1].sourceIntegrityVersion, null);
  assert.equal(result.audit.revisions[0].counts.lineCount, snapshotResult.snapshot.quoteSummary.costSummary.lines.length);
  assert.equal(result.audit.revisions[1].counts.lineCount, secondSnapshot.quoteSummary.costSummary.lines.length);
  assert.deepEqual(result.audit.revisions[1].counts.sourceTypeCounts, {
    "production-consumption": 2,
    "labor-operation": 1,
    "quote-adjustment": 1
  });
  assert.deepEqual(result.audit.revisions[1].counts.categoryCounts, {
    material: 1, hardware: 1, labor: 1, operation: 0, waste: 0, profit: 1
  });
  assert.equal(result.audit.revisions[1].counts.hardwareLineCount, 1);
  assert.equal(result.audit.revisions[1].counts.hardwareFurnitureReferenceCount, 1);
  assert.equal(result.audit.revisions[1].counts.uniqueHardwareFurnitureIdCount, 1);
  assert.equal(result.audit.revisions[1].counts.hardwareBomReferenceCount, 2);
  assert.equal(result.audit.revisions[1].counts.uniqueHardwareBomReferenceCount, 2);
  assert.equal(result.audit.revisions[1].counts.partReferenceCount, secondSnapshot.quoteSummary.lineSources.reduce(
    (count, source) => count + (source.sourcePartIds?.length ?? 0), 0
  ));
  const hardwareSource = result.audit.revisions[1].lines.find(line => line.costLineId === "dom-131-hardware");
  assert.ok(hardwareSource);
  assert.equal(hardwareSource.sourceReference, "price-list:hinge-110");
  assert.deepEqual(hardwareSource.hardwareSourceReferences, ["bom-source-a", "bom-source-b"]);
  assert.deepEqual(hardwareSource.hardwareFurnitureIds, ["revision-cabinet-1"]);
  assert.deepEqual(hardwareSource.sourcePartIds, secondSnapshot.quoteSummary.lineSources.find(
    source => source.sourceId === "bom-hinge-1"
  )?.sourcePartIds);
  assert.equal(result.audit.totals.lineCount, result.audit.revisions.reduce((sum, revision) => sum + revision.counts.lineCount, 0));
  assert.equal(result.audit.totals.uniquePartIdCount, new Set(result.audit.revisions.flatMap(
    revision => revision.lines.flatMap(line => line.sourcePartIds ?? [])
  )).size);
  assert.equal(JSON.stringify(history), originalHistoryJson);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.audit));
  assert.ok(Object.isFrozen(result.audit.revisions));
  assert.ok(Object.isFrozen(result.audit.revisions[1].lines));
  assert.ok(Object.isFrozen(hardwareSource.hardwareSourceReferences));
  assert.deepEqual(result.audit, calculateProjectQuoteRevisionSourceMapAudit(history).audit);
});

test("DOM-132 legacy quote audit surfaces duplicate source identities with stable line references", () => {
  const secondSnapshot = createSnapshot();
  const quoteSummary = secondSnapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  assert.ok(costSummary);
  const materialSource = quoteSummary.lineSources.find(
    source => source.sourceType === "production-consumption" && source.resourceType === "material"
  );
  assert.ok(materialSource);
  const sourceIdentityCount = quoteSummary.lineSources.filter(
    source => source.sourceType === materialSource.sourceType && source.sourceId === materialSource.sourceId
  ).length;
  assert.equal(sourceIdentityCount, 1);
  const originalCostLine = costSummary.lines.find(line => line.id === materialSource.costLineId);
  assert.ok(originalCostLine);

  const duplicateLineIds = ["dom-132-duplicate-a", "dom-132-duplicate-b"];
  for (const duplicateLineId of duplicateLineIds) {
    const duplicateCostLine = { ...originalCostLine, id: duplicateLineId };
    const duplicateSource = structuredClone(materialSource);
    duplicateSource.costLineId = duplicateLineId;
    costSummary.lines.push(duplicateCostLine);
    quoteSummary.lineSources.push(duplicateSource);
    costSummary.categoryTotalsMinor[duplicateCostLine.category] += duplicateCostLine.lineTotalMinor;
    costSummary.grandTotalMinor += duplicateCostLine.lineTotalMinor;
    costSummary.lineCount += 1;
    quoteSummary.requiredLineCount += 1;
    quoteSummary.pricedLineCount += 1;
  }

  const history = createTwoRevisionHistory({ pricingSnapshot: secondSnapshot });
  assert.equal(validateProjectQuoteRevisionHistory(history).status, "ready");
  assert.equal(history.revisions[1].sourceIntegrityVersion, undefined);
  const originalHistoryJson = JSON.stringify(history);
  const result = calculateProjectQuoteRevisionSourceMapAudit(history);
  assert.equal(result.status, "ready");
  assert.ok(result.audit);

  const expectedIdentity = {
    sourceType: materialSource.sourceType,
    sourceId: materialSource.sourceId,
    costLineIds: [materialSource.costLineId, ...duplicateLineIds].sort()
  };
  assert.deepEqual(result.audit.revisions[0].duplicateSourceIdentities, []);
  assert.equal(result.audit.revisions[0].counts.duplicateSourceIdentityCount, 0);
  assert.equal(result.audit.revisions[0].counts.duplicateSourceIdentityLineReferenceCount, 0);
  assert.deepEqual(result.audit.revisions[1].duplicateSourceIdentities, [expectedIdentity]);
  assert.equal(result.audit.revisions[1].counts.duplicateSourceIdentityCount, 1);
  assert.equal(result.audit.revisions[1].counts.duplicateSourceIdentityLineReferenceCount, 3);
  assert.equal(result.audit.totals.duplicateSourceIdentityCount, 1);
  assert.equal(result.audit.totals.duplicateSourceIdentityLineReferenceCount, 3);
  assert.equal(JSON.stringify(history), originalHistoryJson);

  const reorderedHistory = structuredClone(history);
  const reorderedQuote = reorderedHistory.revisions[1].pricingSnapshot.quoteSummary;
  reorderedQuote.lineSources.reverse();
  reorderedQuote.costSummary.lines.reverse();
  const reorderedAudit = calculateProjectQuoteRevisionSourceMapAudit(reorderedHistory);
  assert.equal(reorderedAudit.status, "ready");
  assert.deepEqual(reorderedAudit.audit?.revisions[1].duplicateSourceIdentities, [expectedIdentity]);

  const strictHistory = structuredClone(history);
  strictHistory.revisions[1].sourceIntegrityVersion = 1;
  const strictResult = validateProjectQuoteRevisionHistory(strictHistory);
  assert.equal(strictResult.status, "blocked");
  assert.match(strictResult.diagnostics[0], /yinelenemez/);
});

test("DOM-131 source-map audit returns empty for valid empty histories and blocked without partial audit for invalid histories", () => {
  const empty = calculateProjectQuoteRevisionSourceMapAudit({ projectId: "project-42", revisions: [] });
  assert.equal(empty.status, "empty");
  assert.ok(empty.audit);
  assert.equal(empty.audit.revisionCount, 0);
  assert.deepEqual(empty.audit.revisions, []);
  assert.equal(empty.audit.totals.lineCount, 0);
  assert.deepEqual(empty.audit.totals.sourceTypeCounts, {
    "production-consumption": 0, "labor-operation": 0, "quote-adjustment": 0
  });

  const invalidHistory = createTwoRevisionHistory();
  invalidHistory.revisions[0].pricingSnapshot.quoteSummary.lineSources[0].sourceId = "";
  const blocked = calculateProjectQuoteRevisionSourceMapAudit(invalidHistory);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.audit, null);
  assert.ok(blocked.diagnostics.length > 0);
});


test("DOM-133 source-map provenance comparison isolates metadata changes from monetary deltas", () => {
  const fromSnapshot = createSnapshot();
  const toSnapshot = createSnapshot();
  const materialSource = fromSnapshot.quoteSummary.lineSources.find(source => source.resourceType === "material");
  assert.ok(materialSource);
  const toMaterialSource = toSnapshot.quoteSummary.lineSources.find(source => source.costLineId === materialSource.costLineId);
  const toMaterialLine = toSnapshot.quoteSummary.costSummary.lines.find(line => line.id === materialSource.costLineId);
  assert.ok(toMaterialSource);
  assert.ok(toMaterialLine);
  toMaterialSource.sourceId = "dom-133-reassigned-source";
  toMaterialSource.sourcePartIds = ["dom-133-reassigned-part"];
  toMaterialLine.sourceReference = "material-catalog:dom-133-revised";

  const history = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ pricingSnapshot: fromSnapshot }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: toSnapshot
      })
    ]
  };
  const originalHistoryJson = JSON.stringify(history);
  const result = compareProjectQuoteRevisionSourceMaps(history, "quote-r1", "quote-r2");
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.comparison);
  assert.deepEqual(result.comparison.counts, {
    addedLineCount: 0,
    removedLineCount: 0,
    changedLineCount: 1,
    unchangedLineCount: result.comparison.fromLineCount - 1
  });
  assert.equal(result.comparison.fromLineCount, result.comparison.toLineCount);
  assert.equal(result.comparison.changes.length, 1);
  const changed = result.comparison.changes[0];
  assert.equal(changed.type, "changed");
  assert.equal(changed.costLineId, materialSource.costLineId);
  assert.equal(changed.from.sourceId, materialSource.sourceId);
  assert.equal(changed.to.sourceId, "dom-133-reassigned-source");
  assert.deepEqual(changed.from.sourcePartIds, materialSource.sourcePartIds);
  assert.deepEqual(changed.to.sourcePartIds, ["dom-133-reassigned-part"]);
  assert.equal(changed.to.sourceReference, "material-catalog:dom-133-revised");
  assert.equal(changed.to.unitPriceMinor, undefined);
  assert.equal(changed.to.lineTotalMinor, undefined);

  const monetary = compareProjectQuoteRevisions(history, "quote-r1", "quote-r2");
  assert.equal(monetary.status, "ready", monetary.diagnostics.join("; "));
  assert.equal(monetary.comparison?.grandTotalDeltaMinor, 0);
  assert.deepEqual(monetary.comparison?.categoryDeltasMinor, {
    material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0
  });

  const reorderedHistory = structuredClone(history);
  for (const revision of reorderedHistory.revisions) {
    revision.pricingSnapshot.quoteSummary.lineSources.reverse();
    revision.pricingSnapshot.quoteSummary.costSummary.lines.reverse();
  }
  const reordered = compareProjectQuoteRevisionSourceMaps(reorderedHistory, "quote-r1", "quote-r2");
  assert.equal(reordered.status, "ready", reordered.diagnostics.join("; "));
  assert.deepEqual(reordered.comparison, result.comparison);
  assert.equal(JSON.stringify(history), originalHistoryJson);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.comparison));
  assert.ok(Object.isFrozen(result.comparison?.changes));
});

test("DOM-133 source-map provenance comparison reconciles added, removed and unchanged line IDs", () => {
  const fromSnapshot = createSnapshot();
  const toSnapshot = createSnapshotWithQuoteLines([{
    line: {
      id: "dom-133-added-material",
      category: "material",
      description: "DOM-133 added source",
      quantity: 1,
      unit: "m2",
      unitPriceMinor: 500,
      currencyCode: "TRY",
      sourceReference: "material-catalog:dom-133-added"
    },
    source: {
      costLineId: "dom-133-added-material",
      sourceType: "production-consumption",
      sourceId: "dom-133-added-source",
      resourceType: "material",
      resourceId: "mdf-18",
      unit: "m2",
      sourcePartIds: ["dom-133-added-part"]
    }
  }]);
  const laborIndex = toSnapshot.quoteSummary.lineSources.findIndex(source => source.sourceType === "labor-operation");
  assert.notEqual(laborIndex, -1);
  const removedLabor = toSnapshot.quoteSummary.costSummary.lines[laborIndex];
  toSnapshot.quoteSummary.costSummary.lines.splice(laborIndex, 1);
  toSnapshot.quoteSummary.lineSources.splice(laborIndex, 1);
  toSnapshot.quoteSummary.costSummary.categoryTotalsMinor[removedLabor.category] -= removedLabor.lineTotalMinor;
  toSnapshot.quoteSummary.costSummary.grandTotalMinor -= removedLabor.lineTotalMinor;
  toSnapshot.quoteSummary.costSummary.lineCount -= 1;
  toSnapshot.quoteSummary.requiredLineCount -= 1;
  toSnapshot.quoteSummary.pricedLineCount -= 1;

  const history = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision({ pricingSnapshot: fromSnapshot }),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        pricingSnapshot: toSnapshot
      })
    ]
  };
  const result = compareProjectQuoteRevisionSourceMaps(history, "quote-r1", "quote-r2");
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.comparison);
  assert.deepEqual(result.comparison.counts, {
    addedLineCount: 1,
    removedLineCount: 1,
    changedLineCount: 0,
    unchangedLineCount: 1
  });
  assert.equal(result.comparison.fromLineCount, 2);
  assert.equal(result.comparison.toLineCount, 2);
  assert.deepEqual(result.comparison.changes.map(change => ({ type: change.type, id: change.costLineId })), [
    { type: "added", id: "dom-133-added-material" },
    { type: "removed", id: removedLabor.id }
  ]);
  const blockedMissingRevision = compareProjectQuoteRevisionSourceMaps(history, "quote-r1", "missing-revision");
  assert.equal(blockedMissingRevision.status, "blocked");
  assert.equal(blockedMissingRevision.comparison, null);
  assert.ok(blockedMissingRevision.diagnostics.length > 0);
  const invalidHistory = structuredClone(history);
  invalidHistory.revisions[1].pricingSnapshot.quoteSummary.lineSources[0].sourceId = "";
  const blockedInvalid = compareProjectQuoteRevisionSourceMaps(invalidHistory, "quote-r1", "quote-r2");
  assert.equal(blockedInvalid.status, "blocked");
  assert.equal(blockedInvalid.comparison, null);
});


test("DOM-135 source-map comparison explicitly discloses strict and legacy integrity markers", () => {
  const history = {
    projectId: "project-42",
    revisions: [
      createHistoryRevision(),
      createHistoryRevision({
        revisionId: "quote-r2",
        revisionNumber: 2,
        createdAt: "2026-11-17T11:00:00Z",
        previousRevisionId: "quote-r1",
        sourceIntegrityVersion: 1
      }),
      createHistoryRevision({
        revisionId: "quote-r3",
        revisionNumber: 3,
        createdAt: "2026-11-17T12:00:00Z",
        previousRevisionId: "quote-r2"
      })
    ]
  };
  const originalHistoryJson = JSON.stringify(history);
  assert.equal(history.revisions[0].sourceIntegrityVersion, undefined);
  assert.equal(history.revisions[2].sourceIntegrityVersion, undefined);

  const validated = validateProjectQuoteRevisionHistory(history);
  assert.equal(validated.status, "ready", validated.diagnostics.join("; "));
  const audit = calculateProjectQuoteRevisionSourceMapAudit(history);
  assert.equal(audit.status, "ready", audit.diagnostics.join("; "));
  assert.deepEqual(audit.audit?.revisions.map(revision => revision.sourceIntegrityVersion), [null, 1, null]);

  const legacyToStrict = compareProjectQuoteRevisionSourceMaps(history, "quote-r1", "quote-r2");
  assert.equal(legacyToStrict.status, "ready", legacyToStrict.diagnostics.join("; "));
  assert.ok(legacyToStrict.comparison);
  assert.equal(legacyToStrict.comparison.fromSourceIntegrityVersion, null);
  assert.equal(legacyToStrict.comparison.toSourceIntegrityVersion, 1);
  assert.deepEqual(legacyToStrict.comparison.counts, {
    addedLineCount: 0,
    removedLineCount: 0,
    changedLineCount: 0,
    unchangedLineCount: legacyToStrict.comparison.fromLineCount
  });
  assert.deepEqual(legacyToStrict.comparison.changes, []);

  const strictToLegacy = compareProjectQuoteRevisionSourceMaps(history, "quote-r2", "quote-r3");
  assert.equal(strictToLegacy.status, "ready", strictToLegacy.diagnostics.join("; "));
  assert.ok(strictToLegacy.comparison);
  assert.equal(strictToLegacy.comparison.fromSourceIntegrityVersion, 1);
  assert.equal(strictToLegacy.comparison.toSourceIntegrityVersion, null);
  assert.deepEqual(strictToLegacy.comparison.changes, []);
  assert.equal(JSON.stringify(history), originalHistoryJson);
  assert.ok(Object.isFrozen(legacyToStrict.comparison));
  assert.ok(Object.isFrozen(strictToLegacy.comparison));
});

test("DOM-134 three-revision source-map audit reconciles duplicate groups and project-wide unique identities", () => {
  const fixtures = [1, 2, 3].map(revisionNumber => {
    const snapshot = createDom131AuditSnapshot();
    const quoteSummary = snapshot.quoteSummary;
    const costSummary = quoteSummary.costSummary;
    assert.ok(costSummary);

    const materialSource = quoteSummary.lineSources.find(
      source => source.sourceType === "production-consumption" && source.resourceType === "material"
    );
    assert.ok(materialSource);
    const materialLine = costSummary.lines.find(line => line.id === materialSource.costLineId);
    assert.ok(materialLine);
    materialSource.sourceId = "dom-134-shared-material-source";
    materialSource.sourcePartIds = [
      "dom-134-part-shared",
      "dom-134-part-r" + revisionNumber
    ].sort();

    const profitSource = quoteSummary.lineSources.find(source => source.sourceType === "quote-adjustment");
    assert.ok(profitSource);
    const profitLine = costSummary.lines.find(line => line.id === profitSource.costLineId);
    assert.ok(profitLine);

    const addDuplicate = (originalLine, originalSource, duplicateLineId) => {
      const duplicateLine = { ...originalLine, id: duplicateLineId };
      const duplicateSource = structuredClone(originalSource);
      duplicateSource.costLineId = duplicateLineId;
      costSummary.lines.push(duplicateLine);
      quoteSummary.lineSources.push(duplicateSource);
      costSummary.categoryTotalsMinor[duplicateLine.category] += duplicateLine.lineTotalMinor;
      costSummary.grandTotalMinor += duplicateLine.lineTotalMinor;
      costSummary.lineCount += 1;
      quoteSummary.requiredLineCount += 1;
      quoteSummary.pricedLineCount += 1;
    };

    const materialDuplicateIds = [
      "dom-134-material-b-r" + revisionNumber,
      "dom-134-material-a-r" + revisionNumber
    ];
    for (const duplicateId of materialDuplicateIds) {
      addDuplicate(materialLine, materialSource, duplicateId);
    }
    const profitDuplicateId = "dom-134-profit-copy-r" + revisionNumber;
    addDuplicate(profitLine, profitSource, profitDuplicateId);

    return {
      snapshot,
      materialGroup: {
        sourceType: materialSource.sourceType,
        sourceId: materialSource.sourceId,
        costLineIds: [materialSource.costLineId, ...materialDuplicateIds].sort()
      },
      profitGroup: {
        sourceType: profitSource.sourceType,
        sourceId: profitSource.sourceId,
        costLineIds: [profitSource.costLineId, profitDuplicateId].sort()
      }
    };
  });

  const history = {
    projectId: "project-42",
    revisions: fixtures.map((fixture, index) => createHistoryRevision({
      revisionId: "quote-r" + (index + 1),
      revisionNumber: index + 1,
      createdAt: "2026-11-17T" + (10 + index) + ":00:00Z",
      previousRevisionId: index === 0 ? null : "quote-r" + index,
      pricingSnapshot: fixture.snapshot
    }))
  };
  assert.equal(validateProjectQuoteRevisionHistory(history).status, "ready");
  const originalHistoryJson = JSON.stringify(history);
  const result = calculateProjectQuoteRevisionSourceMapAudit(history);
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.ok(result.audit);
  const audit = result.audit;
  assert.equal(audit.revisionCount, 3);
  assert.deepEqual(audit.revisions.map(revision => revision.revisionId), ["quote-r1", "quote-r2", "quote-r3"]);

  const expectedGroupsByRevision = fixtures.map(fixture => [
    fixture.materialGroup,
    fixture.profitGroup
  ].sort((left, right) => {
    if (left.sourceType !== right.sourceType) return left.sourceType < right.sourceType ? -1 : 1;
    if (left.sourceId === right.sourceId) return 0;
    return left.sourceId < right.sourceId ? -1 : 1;
  }));
  for (let index = 0; index < audit.revisions.length; index += 1) {
    const revisionAudit = audit.revisions[index];
    const fixtureSources = fixtures[index].snapshot.quoteSummary.lineSources;
    const expectedRevisionPartIds = new Set(fixtureSources.flatMap(source => source.sourcePartIds ?? []));
    const expectedRevisionFurnitureIds = new Set(fixtureSources.flatMap(source => source.hardwareFurnitureIds ?? []));
    const expectedRevisionBomReferences = new Set(fixtureSources.flatMap(source => source.hardwareSourceReferences ?? []));
    assert.equal(revisionAudit.counts.lineCount, fixtures[index].snapshot.quoteSummary.costSummary.lines.length);
    assert.deepEqual(revisionAudit.duplicateSourceIdentities, expectedGroupsByRevision[index]);
    assert.equal(revisionAudit.counts.duplicateSourceIdentityCount, 2);
    assert.equal(revisionAudit.counts.duplicateSourceIdentityLineReferenceCount, 5);
    assert.equal(revisionAudit.counts.uniquePartIdCount, expectedRevisionPartIds.size);
    assert.equal(revisionAudit.counts.uniqueHardwareFurnitureIdCount, expectedRevisionFurnitureIds.size);
    assert.equal(revisionAudit.counts.uniqueHardwareBomReferenceCount, expectedRevisionBomReferences.size);
  }

  const additiveCountKeys = [
    "lineCount", "sourceReferenceLineCount", "partLinkedLineCount", "partReferenceCount",
    "resourceLineCount", "hardwareLineCount", "hardwareFurnitureReferenceCount",
    "hardwareBomReferenceCount", "laborOperationLineCount", "quoteAdjustmentLineCount",
    "duplicateSourceIdentityCount", "duplicateSourceIdentityLineReferenceCount"
  ];
  for (const key of additiveCountKeys) {
    assert.equal(audit.totals[key], audit.revisions.reduce((sum, revision) => sum + revision.counts[key], 0), key);
  }
  for (const sourceType of ["production-consumption", "labor-operation", "quote-adjustment"]) {
    assert.equal(audit.totals.sourceTypeCounts[sourceType], audit.revisions.reduce(
      (sum, revision) => sum + revision.counts.sourceTypeCounts[sourceType], 0
    ), sourceType);
  }
  for (const category of ["material", "hardware", "labor", "operation", "waste", "profit"]) {
    assert.equal(audit.totals.categoryCounts[category], audit.revisions.reduce(
      (sum, revision) => sum + revision.counts.categoryCounts[category], 0
    ), category);
  }
  assert.equal(audit.totals.lineCount, fixtures.reduce(
    (sum, fixture) => sum + fixture.snapshot.quoteSummary.costSummary.lines.length, 0
  ));
  assert.equal(audit.totals.duplicateSourceIdentityCount, 6);
  assert.equal(audit.totals.duplicateSourceIdentityLineReferenceCount, 15);
  assert.equal(audit.totals.hardwareFurnitureReferenceCount, 3);
  assert.equal(audit.totals.hardwareBomReferenceCount, 6);

  const expectedProjectPartIds = new Set(fixtures.flatMap(
    fixture => fixture.snapshot.quoteSummary.lineSources.flatMap(source => source.sourcePartIds ?? [])
  ));
  const expectedProjectFurnitureIds = new Set(fixtures.flatMap(
    fixture => fixture.snapshot.quoteSummary.lineSources.flatMap(source => source.hardwareFurnitureIds ?? [])
  ));
  const expectedProjectBomReferences = new Set(fixtures.flatMap(
    fixture => fixture.snapshot.quoteSummary.lineSources.flatMap(source => source.hardwareSourceReferences ?? [])
  ));
  const actualProjectPartIds = new Set(audit.revisions.flatMap(
    revision => revision.lines.flatMap(line => line.sourcePartIds ?? [])
  ));
  assert.deepEqual(actualProjectPartIds, expectedProjectPartIds);
  assert.equal(audit.totals.uniquePartIdCount, expectedProjectPartIds.size);
  assert.equal(audit.totals.uniqueHardwareFurnitureIdCount, expectedProjectFurnitureIds.size);
  assert.equal(audit.totals.uniqueHardwareBomReferenceCount, expectedProjectBomReferences.size);
  assert.equal(expectedProjectPartIds.has("dom-134-part-shared"), true);
  for (const revisionNumber of [1, 2, 3]) {
    assert.equal(expectedProjectPartIds.has("dom-134-part-r" + revisionNumber), true);
  }

  const reorderedHistory = structuredClone(history);
  for (const revision of reorderedHistory.revisions) {
    revision.pricingSnapshot.quoteSummary.lineSources.reverse();
    revision.pricingSnapshot.quoteSummary.costSummary.lines.reverse();
  }
  const reorderedResult = calculateProjectQuoteRevisionSourceMapAudit(reorderedHistory);
  assert.equal(reorderedResult.status, "ready", reorderedResult.diagnostics.join("; "));
  const summarize = value => ({
    revisionCount: value.revisionCount,
    totals: value.totals,
    revisions: value.revisions.map(revision => ({
      revisionId: revision.revisionId,
      revisionNumber: revision.revisionNumber,
      counts: revision.counts,
      duplicateSourceIdentities: revision.duplicateSourceIdentities
    }))
  });
  assert.deepEqual(summarize(reorderedResult.audit), summarize(audit));
  assert.deepEqual(JSON.stringify(history), originalHistoryJson);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(audit));
  assert.ok(Object.isFrozen(audit.revisions[0].duplicateSourceIdentities));
  assert.ok(Object.isFrozen(audit.revisions[0].duplicateSourceIdentities[0].costLineIds));
});
