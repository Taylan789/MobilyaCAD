import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import { calculateProjectCostLineTotalMinor } from "./projectCostSummary.ts";
import {
  appendProjectQuoteRevision,
  compareProjectQuoteRevisions,
  createProjectQuoteRevision,
  validateProjectQuoteRevisionHistory
} from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  PROJECT_QUOTE_REVISION_FILE_TYPE,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";

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

function createEdgeQuoteLine({
  id,
  edge,
  quantity,
  unit,
  unitPriceMinor,
  sourceReference,
  sourceId,
  sourcePartIds
}) {
  return {
    line: {
      id,
      category: "material",
      description: "Kenar bandı pvc-directional (" + edge + " kenar)",
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
