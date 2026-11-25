import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import { setProjectEdgeBandingRollPricingInProjectFile } from "./projectEdgeBandingRollPricingProjectFile.ts";
import { calculateProjectSheetCutPlanAreaSummary } from "./projectSheetCutPlanAreaSummary.ts";
import { calculateProjectSheetNestingStockCostSummary } from "./projectSheetNestingStockCostSummary.ts";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

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

function createProjectFileWithRollPricing() {
  const saved = setProjectEdgeBandingRollPricingInProjectFile({
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "quote-project-42",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: []
  }, {
    schemaVersion: 1,
    rollSpecs: [{
      edgeBandingId: "pvc-a",
      rollLengthMm: 100000,
      sourceReference: "roll-spec:v1"
    }],
    rollPriceTable: [{
      edgeBandingId: "pvc-a",
      unit: "rulo",
      unitPriceMinor: 15000,
      currencyCode: "TRY",
      sourceReference: "roll-prices:v1"
    }]
  });
  assert.equal(saved.status, "ready", saved.diagnostics.join("; "));
  return saved.project;
}

function createStockSheetPurchaseReport(productionReport) {
  const parts = productionReport.result.parts.map(part => ({
    id: part.id,
    materialId: part.materialId,
    widthMm: part.width,
    lengthMm: part.length,
    thicknessMm: part.thickness,
    quantity: part.quantity,
    grainDirection: "none",
    geometry: "rectangular"
  }));
  const areaRequest = {
    schemaVersion: 1,
    sourcePartIds: parts.map(part => part.id),
    groups: [{
      materialId: "mdf-18",
      thicknessMm: 18,
      sourcePartIds: parts.map(part => part.id),
      cutPlanReport: (() => {
        const batchReport = validateSheetNestingInput({
          schemaVersion: 1,
          sheet: { materialId: "mdf-18", widthMm: 3000, lengthMm: 2000, thicknessMm: 18, grainDirection: "none" },
          kerfMm: 3,
          parts
        });
        assert.equal(batchReport.status, "ready", batchReport.diagnostics.join("; "));
        const layout = calculateSheetNestingLayout(batchReport.result);
        return createSheetCutPlan({ schemaVersion: 1, batch: batchReport.result, layout });
      })()
    }]
  };
  const areaReport = calculateProjectSheetCutPlanAreaSummary(areaRequest);
  assert.equal(areaReport.status, "ready", areaReport.diagnostics.join("; "));
  const sheetPrices = areaReport.result.groups.map(group => ({
    groupId: group.groupId,
    materialId: group.materialId,
    thicknessMm: group.thicknessMm,
    pricePerSheetMinor: 12500,
    currencyCode: "TRY",
    sourceReference: "stock-sheet-price:v1"
  }));
  return calculateProjectSheetNestingStockCostSummary({
    schemaVersion: 1,
    areaSummaryRequest: areaRequest,
    sheetPrices
  });
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


test("JSON v2 project-file roll inputs feed quote snapshots with Part and price provenance", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    productionReport: createEdgeBandingReport(),
    workItems: [],
    tariffTable: [],
    laborOperationTariffList: null,
    edgeBandingPricingMode: "roll",
    projectFile: createProjectFileWithRollPricing()
  }));

  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  const rollLine = result.snapshot?.quoteSummary.costSummary?.lines.find(line => line.unit === "rulo");
  const rollSource = result.snapshot?.quoteSummary.lineSources.find(source => source.unit === "rulo");
  assert.ok(rollLine);
  assert.ok(rollSource);
  assert.equal(rollLine.quantity, 1);
  assert.equal(rollLine.unitPriceMinor, 15000);
  assert.equal(rollLine.lineTotalMinor, 15000);
  assert.deepEqual(rollSource.sourcePartIds, ["snapshot-cabinet-1-left-side"]);
  assert.equal(rollSource.planSourceReference, "roll-spec:v1");
  assert.equal(rollSource.priceSourceReference, "roll-prices:v1");
  assert.equal(result.snapshot?.quoteSummary.costSummary?.lines.some(line => line.unit === "mm" || line.unit === "m"), false);
});

test("saved project roll pricing requires explicit roll mode and rejects legacy, malformed or duplicate sources", () => {
  const projectFile = createProjectFileWithRollPricing();
  const missingMode = createProjectQuotePricingSnapshot(createInput({ projectFile }));
  assert.equal(missingMode.status, "blocked");
  assert.equal(missingMode.snapshot, null);
  assert.match(missingMode.diagnostics[0], /açıkça roll/);

  const lengthMode = createProjectQuotePricingSnapshot(createInput({
    projectFile,
    edgeBandingPricingMode: "length"
  }));
  assert.equal(lengthMode.status, "blocked");
  assert.match(lengthMode.diagnostics[0], /açıkça roll/);

  const duplicateSources = createProjectQuotePricingSnapshot(createInput({
    projectFile,
    edgeBandingPricingMode: "roll",
    edgeBandingRollSpecs: [],
    edgeBandingRollPriceTable: []
  }));
  assert.equal(duplicateSources.status, "blocked");
  assert.match(duplicateSources.diagnostics[0], /tek kaynak/);

  const legacyProject = {
    format: "MobilyaCAD",
    formatVersion: 1,
    furniture: []
  };
  const legacy = createProjectQuotePricingSnapshot(createInput({
    projectFile: legacyProject,
    edgeBandingPricingMode: "roll"
  }));
  assert.equal(legacy.status, "blocked");
  assert.match(legacy.diagnostics[0], /JSON v2/);

  const malformedProject = {
    ...projectFile,
    edgeBandingRollPricing: {
      ...projectFile.edgeBandingRollPricing,
      unexpected: true
    }
  };
  const malformed = createProjectQuotePricingSnapshot(createInput({
    projectFile: malformedProject,
    edgeBandingPricingMode: "roll"
  }));
  assert.equal(malformed.status, "blocked");
  assert.equal(malformed.snapshot, null);
  assert.match(malformed.diagnostics[0], /desteklenmeyen alan/);
});

test("stock-sheet panel basis creates immutable quote snapshot v2 with group and Part provenance even without other quote lines", () => {
  const productionReport = createReport();
  const stockSheetPurchaseReport = createStockSheetPurchaseReport(productionReport);
  const result = createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-30",
    productionReport,
    consumptionPriceTable: [],
    workItems: [],
    tariffTable: [],
    consumptionPriceList: null,
    laborOperationTariffList: null,
    materialCostBasis: { basis: "stock-sheet-purchase", stockSheetPurchaseReport }
  });

  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.equal(result.quoteSummary?.status, "empty");
  assert.equal(result.snapshot?.schemaVersion, 2);
  assert.equal(result.snapshot?.materialCostBasis?.basis, "stock-sheet-purchase");
  assert.equal(
    result.snapshot?.materialCostBasis?.panelMaterialCostMinor,
    stockSheetPurchaseReport.result.totals.stockSheetPurchaseCostMinor
  );
  assert.equal(result.snapshot?.materialCostBasis?.stockSheetGroups.length, stockSheetPurchaseReport.result.groupCount);
  assert.deepEqual(
    result.snapshot?.materialCostBasis?.stockSheetGroups[0].sourcePartIds,
    productionReport.result.parts.map(part => part.id).sort()
  );
  assert.equal(result.snapshot?.materialCostBasis?.stockSheetGroups[0].sourceReference, "stock-sheet-price:v1");
  assert.ok(Object.isFrozen(result.snapshot?.materialCostBasis?.stockSheetGroups[0].sourcePartIds));
});

test("net-consumption quote snapshot v2 stores the selected basis without stock groups", () => {
  const result = createProjectQuotePricingSnapshot(createInput({
    materialCostBasis: { basis: "net-consumption" }
  }));

  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.equal(result.snapshot?.schemaVersion, 2);
  assert.equal(result.snapshot?.materialCostBasis?.basis, "net-consumption");
  assert.deepEqual(result.snapshot?.materialCostBasis?.stockSheetGroups, []);
  assert.equal(
    result.snapshot?.materialCostBasis?.grandTotalMinor,
    result.snapshot?.quoteSummary.costSummary?.grandTotalMinor
  );
});

test("stock-sheet snapshot rejects Part coverage drift instead of persisting foreign provenance", () => {
  const productionReport = createReport();
  const stockSheetPurchaseReport = structuredClone(createStockSheetPurchaseReport(productionReport));
  stockSheetPurchaseReport.result.groups[0].sourcePartIds[0] = "foreign-part";
  const result = createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-30",
    productionReport,
    consumptionPriceTable: [],
    workItems: [],
    tariffTable: [],
    consumptionPriceList: null,
    laborOperationTariffList: null,
    materialCostBasis: { basis: "stock-sheet-purchase", stockSheetPurchaseReport }
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.snapshot, null);
  assert.match(result.diagnostics[0], /proje dışı Part|Part kaynakları/);
});

test("quote snapshot request rejects own accessors without invoking their getters", () => {
  const input = createInput();
  let getterCalls = 0;
  Object.defineProperty(input, "quotedOn", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return "2026-11-30";
    }
  });

  const result = createProjectQuotePricingSnapshot(input);
  assert.equal(getterCalls, 0);
  assert.equal(result.status, "blocked");
  assert.equal(result.quoteSummary, null);
  assert.equal(result.snapshot, null);
});

test("an Object.prototype optional pricing getter cannot supply a missing quote mode", () => {
  const original = Object.getOwnPropertyDescriptor(Object.prototype, "edgeBandingPricingMode");
  assert.equal(original, undefined);
  let getterCalls = 0;
  try {
    Object.defineProperty(Object.prototype, "edgeBandingPricingMode", {
      configurable: true,
      get() {
        getterCalls += 1;
        return "roll";
      }
    });
    const result = createProjectQuotePricingSnapshot(createInput());
    assert.equal(getterCalls, 0);
    assert.equal(result.status, "ready", result.diagnostics.join("; "));
    assert.equal(result.snapshot?.quoteSummary.costSummary?.lines.some(line => line.unit === "rulo"), false);
  } finally {
    Reflect.deleteProperty(Object.prototype, "edgeBandingPricingMode");
  }
});

test("catalog-version own accessors are blocked without invoking getters", () => {
  const catalog = { ...consumptionPriceList };
  let getterCalls = 0;
  Object.defineProperty(catalog, "version", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return "2026-11";
    }
  });

  const result = createProjectQuotePricingSnapshot(createInput({ consumptionPriceList: catalog }));
  assert.equal(getterCalls, 0);
  assert.equal(result.status, "blocked");
  assert.equal(result.snapshot, null);
  assert.match(result.diagnostics[0], /own enumerable data property/);
});

test("material-cost-basis own accessors are blocked before quote calculation", () => {
  const materialCostBasis = {};
  let getterCalls = 0;
  Object.defineProperty(materialCostBasis, "basis", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return "net-consumption";
    }
  });

  const result = createProjectQuotePricingSnapshot(createInput({ materialCostBasis }));
  assert.equal(getterCalls, 0);
  assert.equal(result.status, "blocked");
  assert.equal(result.quoteSummary, null);
  assert.equal(result.snapshot, null);
});

test("request-envelope Proxy reflection failures return blocked instead of escaping", () => {
  const proxies = [
    new Proxy(createInput(), {
      getPrototypeOf() {
        throw new Error("prototype reflection failed");
      }
    }),
    new Proxy(createInput(), {
      ownKeys() {
        throw new Error("ownKeys reflection failed");
      }
    }),
    new Proxy(createInput(), {
      getOwnPropertyDescriptor(target, key) {
        if (key === "quotedOn") throw new Error("descriptor reflection failed");
        return Reflect.getOwnPropertyDescriptor(target, key);
      }
    })
  ];

  for (const proxy of proxies) {
    let result;
    assert.doesNotThrow(() => {
      result = createProjectQuotePricingSnapshot(proxy);
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.quoteSummary, null);
    assert.equal(result.snapshot, null);
  }
});

test("null-prototype quote snapshot request and catalog records remain supported", () => {
  const input = Object.assign(Object.create(null), createInput());
  input.consumptionPriceList = Object.assign(Object.create(null), consumptionPriceList);

  const result = createProjectQuotePricingSnapshot(input);
  assert.equal(result.status, "ready", result.diagnostics.join("; "));
  assert.equal(result.snapshot?.consumptionPriceList?.catalogId, "workshop-materials");
});

