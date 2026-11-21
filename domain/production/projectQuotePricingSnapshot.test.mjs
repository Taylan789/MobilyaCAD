import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createReport(options = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  const request = {
    schemaVersion: 1,
    furniture: {
      id: "snapshot-cabinet-1",
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "MDF Lam 18",
      materialId: "mdf-18"
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
  };

  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: options.empty === true ? [] : [request]
  });
}

const consumptionPrices = [
  {
    resourceType: "material",
    resourceId: "mdf-18",
    unit: "m2",
    unitPriceMinor: 1250,
    currencyCode: "TRY",
    sourceReference: "atolye-malzeme-fiyat-listesi"
  }
];
const workItems = [{
  id: "assembly-labor",
  category: "labor",
  description: "Dolap montaj işçiliği",
  duration: 1.5,
  unit: "h",
  tariffId: "labor-hourly"
}];
const tariffs = [{
  tariffId: "labor-hourly",
  category: "labor",
  unit: "h",
  unitPriceMinor: 2400,
  currencyCode: "TRY",
  sourceReference: "atolye-iscilik-tarifesi"
}];
const consumptionPriceList = {
  catalogId: "workshop-materials",
  version: "2026-11",
  effectiveFrom: "2026-11-01",
  effectiveTo: "2026-11-30"
};
const laborOperationTariffList = {
  catalogId: "workshop-labor",
  version: "tariff-2026-11",
  effectiveFrom: "2026-11-01"
};


function createEdgeBandingReport() {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  edgeBandingByGroup.leftSide = { ...noBanding, top: true };
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [{
      schemaVersion: 1,
      furniture: {
        id: "snapshot-cabinet-1",
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
    }],
    edgeBandingAssignments: [{
      partId: "snapshot-cabinet-1-left-side",
      edgeBandingId: "pvc-a",
      unit: "mm"
    }]
  });
}

function createInput(overrides = {}) {
  return {
    quotedOn: "2026-11-30",
    productionReport: createReport(),
    consumptionPriceTable: consumptionPrices,
    workItems,
    tariffTable: tariffs,
    consumptionPriceList,
    laborOperationTariffList,
    ...overrides
  };
}

test("ready teklifin kullandığı fiyat ve tarife sürümlerini tarihli snapshot olarak saklar", () => {
  const result = createProjectQuotePricingSnapshot(createInput());

  assert.equal(result.status, "ready");
  assert.equal(result.snapshot?.schemaVersion, 1);
  assert.equal(result.snapshot?.quotedOn, "2026-11-30");
  assert.deepEqual(result.snapshot?.consumptionPriceList, consumptionPriceList);
  assert.deepEqual(result.snapshot?.laborOperationTariffList, laborOperationTariffList);
  assert.equal(
    result.snapshot?.quoteSummary.costSummary?.grandTotalMinor,
    result.quoteSummary?.costSummary?.grandTotalMinor
  );
  assert.equal(result.snapshot?.quoteSummary.lineSources.length, 2);
  assert.deepEqual(result.diagnostics, []);
});

test("üretim tüketimi varsa fiyat listesi sürüm bilgisi olmadan snapshot oluşturmaz", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    consumptionPriceList: null
  }));

  assert.equal(result.status, "blocked");
  assert.equal(result.snapshot, null);
  assert.equal(result.quoteSummary, null);
  assert.match(result.diagnostics[0], /fiyat listesi kimliği/);
});

test("işçilik veya operasyon varsa tarife sürüm bilgisi zorunludur", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    laborOperationTariffList: undefined
  }));

  assert.equal(result.status, "blocked");
  assert.equal(result.snapshot, null);
  assert.match(result.diagnostics[0], /tarife listesi kimliği/);
});

test("teklif tarihi fiyat listesinin geçerlilik aralığının dışında kalırsa snapshot bloklanır", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    quotedOn: "2026-12-01"
  }));

  assert.equal(result.status, "blocked");
  assert.equal(result.snapshot, null);
  assert.match(result.diagnostics[0], /teklif tarihinde geçerli değildir/);
});

test("geçerli başlangıç ve bitiş tarihleri dahil kabul edilir", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    quotedOn: "2026-11-01"
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.snapshot?.consumptionPriceList?.effectiveFrom, "2026-11-01");
});

test("imkânsız takvim tarihi ve desteklenmeyen katalog alanı reddedilir", () => {
  const invalidDate = createProjectQuotePricingSnapshot(createInput({
    quotedOn: "2026-02-30"
  }));
  const unknownField = createProjectQuotePricingSnapshot(createInput({
    consumptionPriceList: { ...consumptionPriceList, currency: "TRY" }
  }));

  assert.equal(invalidDate.status, "blocked");
  assert.equal(invalidDate.snapshot, null);
  assert.equal(unknownField.status, "blocked");
  assert.match(unknownField.diagnostics[0], /desteklenmeyen alan/);
});

test("yalnızca işçilik içeren teklif fiyat listesi olmadan tarife snapshot'ı oluşturabilir", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    productionReport: createReport({ empty: true }),
    consumptionPriceTable: [],
    consumptionPriceList: null
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.snapshot?.consumptionPriceList, null);
  assert.deepEqual(result.snapshot?.laborOperationTariffList, laborOperationTariffList);
  assert.equal(result.snapshot?.quoteSummary.costSummary?.grandTotalMinor, 3600);
});

test("boş teklif katalog sürümü uydurmaz ve snapshot üretmez", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    productionReport: createReport({ empty: true }),
    consumptionPriceTable: [],
    workItems: [],
    tariffTable: [],
    consumptionPriceList: null,
    laborOperationTariffList: null
  }));

  assert.equal(result.status, "empty");
  assert.equal(result.snapshot, null);
  assert.equal(result.quoteSummary?.costSummary, null);
});

test("snapshot kaynak metadata'sını girdiden ayırır ve maliyet ağacını değiştirilemez yapar", () => {
  const source = { ...consumptionPriceList };
  const result = createProjectQuotePricingSnapshot(createInput({
    consumptionPriceList: source
  }));
  source.version = "changed-after-quote";

  assert.equal(result.status, "ready");
  assert.equal(result.snapshot?.consumptionPriceList?.version, "2026-11");
  assert.ok(Object.isFrozen(result.snapshot));
  assert.ok(Object.isFrozen(result.snapshot?.consumptionPriceList));
  assert.ok(Object.isFrozen(result.snapshot?.quoteSummary.costSummary?.lines));
});


test("açık fire/kâr satırları teklif fiyat snapshot'ında maliyet ve kaynak iziyle korunur", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    workItems: [],
    tariffTable: [],
    laborOperationTariffList: null,
    quoteAdjustments: [{
      id: "waste-board-cut", category: "waste", description: "Kullanıcı tarafından girilen fire",
      quantity: 0.5, unit: "m2", unitPriceMinor: 1000, currencyCode: "TRY",
      sourceReference: "atolye-fire-hesabi:v1"
    }]
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.snapshot?.quoteSummary.costSummary?.categoryTotalsMinor.waste, 500);
  assert.equal(result.snapshot?.quoteSummary.lineSources.at(-1).sourceType, "quote-adjustment");
  assert.equal(result.snapshot?.quoteSummary.lineSources.at(-1).sourceId, "waste-board-cut");
  assert.equal(result.snapshot?.quoteSummary.costSummary?.lines.at(-1).sourceReference, "atolye-fire-hesabi:v1");
  assert.ok(Object.isFrozen(result.snapshot?.quoteSummary.costSummary?.lines.at(-1)));
});
test("roll pricing options are included in the immutable quote snapshot with provenance", () => {
  const result = createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-30",
    productionReport: createEdgeBandingReport(),
    consumptionPriceTable: [{
      resourceType: "material",
      resourceId: "mdf-18",
      unit: "m2",
      unitPriceMinor: 1250,
      currencyCode: "TRY",
      sourceReference: "material-list:v1"
    }],
    workItems: [],
    tariffTable: [],
    consumptionPriceList,
    laborOperationTariffList: null,
    edgeBandingPricingMode: "roll",
    edgeBandingRollSpecs: [{
      edgeBandingId: "pvc-a",
      rollLengthMm: 100000,
      sourceReference: "roll-spec:v1"
    }],
    edgeBandingRollPriceTable: [{
      edgeBandingId: "pvc-a",
      unit: "rulo",
      unitPriceMinor: 15000,
      currencyCode: "TRY",
      sourceReference: "roll-prices:v1"
    }]
  });

  assert.equal(result.status, "ready");
  assert.ok(result.snapshot);
  const rollLine = result.snapshot.quoteSummary.costSummary.lines.find(line => line.unit === "rulo");
  const rollSource = result.snapshot.quoteSummary.lineSources.find(source => source.unit === "rulo");
  assert.ok(rollLine);
  assert.ok(rollSource);
  assert.equal(rollLine.quantity, rollSource.rollCount);
  assert.equal(rollSource.resourceId, "pvc-a");
  assert.equal(rollSource.rollLengthMm, 100000);
  assert.equal(rollSource.purchasedLengthMm, rollSource.rollCount * 100000);
  assert.deepEqual(rollSource.sourcePartIds, ["snapshot-cabinet-1-left-side"]);
  assert.deepEqual(rollSource.furnitureIds, ["snapshot-cabinet-1"]);
  assert.equal(rollSource.planSourceReference, "roll-spec:v1");
  assert.equal(rollSource.priceSourceReference, "roll-prices:v1");
  assert.equal(result.snapshot.quoteSummary.costSummary.lines.some(line => line.unit === "mm" || line.unit === "m"), false);
});
