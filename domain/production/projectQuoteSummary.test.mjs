import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectLaborOperationPricingSummary } from "./projectLaborOperationPricing.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";
import { calculateProjectQuoteSummary } from "./projectQuoteSummary.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createReport(options = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  const materialId = options.materialId ?? "mdf-18";
  const material = options.material ?? "MDF Lam 18";
  const request = {
    schemaVersion: 1,
    furniture: {
      id: "quote-cabinet-1",
      widthMm: options.widthMm ?? 800,
      heightMm: 720,
      depthMm: 560,
      material,
      materialId
    },
    profile: {
      panelThicknessMm: options.panelThicknessMm ?? 18,
      ...(options.panelThicknessMmByGroup === undefined
        ? {}
        : { panelThicknessMmByGroup: options.panelThicknessMmByGroup }),
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials: options.materials ?? [
      {
        id: materialId,
        name: material,
        category: "panel",
        thicknessesMm: options.materialThicknessesMm ?? [18],
        unit: "mm"
      }
    ],
    ...(options.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: options.panelMaterialOverrides })
  };

  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: options.empty === true ? [] : [request]
  });
}

function price(resourceType, resourceId, unit, unitPriceMinor, currencyCode = "TRY", thicknessMm) {
  return {
    resourceType, resourceId, unit, unitPriceMinor, currencyCode,
    ...(thicknessMm === undefined ? {} : { thicknessMm })
  };
}

const usage = (overrides = {}) => ({
  id: "material-0001",
  category: "labor",
  description: "Dolap montaj işçiliği",
  duration: 1.5,
  unit: "h",
  tariffId: "labor-hourly",
  ...overrides
});

const tariff = (overrides = {}) => ({
  tariffId: "labor-hourly",
  category: "labor",
  unit: "h",
  unitPriceMinor: 2400,
  currencyCode: "TRY",
  sourceReference: "atolye-tarife:v1",
  ...overrides
});

const consumptionPrices = [
  price("material", "mdf-18", "m2", 1250)
];

test("malzeme tüketimi ile işçilik/operasyon satırlarını tek para biriminde birleştirir", () => {
  const report = createReport();
  const workItems = [
    usage(),
    usage({
      id: "edge-trimming",
      category: "operation",
      description: "Kenar işleme operasyonu",
      duration: 15,
      unit: "min",
      tariffId: "edge-operation-minute"
    })
  ];
  const tariffs = [
    tariff(),
    tariff({
      tariffId: "edge-operation-minute",
      category: "operation",
      unit: "min",
      unitPriceMinor: 30,
      sourceReference: "makine-tarife:2026-11"
    })
  ];

  const consumption = calculateProjectPricedConsumptionSummary(report, consumptionPrices);
  const labor = calculateProjectLaborOperationPricingSummary(workItems, tariffs);
  const quote = calculateProjectQuoteSummary(report, consumptionPrices, workItems, tariffs);

  assert.equal(quote.status, "ready");
  assert.equal(quote.currencyCode, "TRY");
  assert.equal(quote.requiredLineCount, consumption.requiredLineCount + labor.requiredLineCount);
  assert.equal(quote.pricedLineCount, quote.requiredLineCount);
  assert.equal(
    quote.costSummary.grandTotalMinor,
    consumption.costSummary.grandTotalMinor + labor.costSummary.grandTotalMinor
  );
  assert.equal(quote.costSummary.categoryTotalsMinor.material, consumption.costSummary.categoryTotalsMinor.material);
  assert.equal(quote.costSummary.categoryTotalsMinor.labor, labor.costSummary.categoryTotalsMinor.labor);
  assert.equal(quote.costSummary.categoryTotalsMinor.operation, labor.costSummary.categoryTotalsMinor.operation);
  assert.deepEqual(quote.costSummary.lines.map((line) => line.id), [
    "consumption-0001", "work-0001", "work-0002"
  ]);
  assert.deepEqual(quote.lineSources, [
    {
      costLineId: "consumption-0001",
      sourceType: "production-consumption",
      sourceId: consumption.costSummary.lines[0].id
    },
    {
      costLineId: "work-0001",
      sourceType: "labor-operation",
      sourceId: "material-0001",
      tariffId: "labor-hourly"
    },
    {
      costLineId: "work-0002",
      sourceType: "labor-operation",
      sourceId: "edge-trimming",
      tariffId: "edge-operation-minute"
    }
  ]);
  assert.deepEqual(quote.missingPrices, []);
  assert.deepEqual(quote.missingTariffs, []);
});

test("gövde panel fiyatları aynı katalog kimliğinde gerçek mm kalınlığa göre ayrı teklif satırlarıdır", () => {
  const report = createReport({
    materialId: "mdf-shared",
    material: "MDF Lam",
    materialThicknessMmByGroup: undefined,
    materialThicknessesMm: [8, 18],
    panelMaterialOverrides: { top: "mdf-shared" },
    panelThicknessMmByGroup: { top: 8 }
  });
  const quote = calculateProjectQuoteSummary(report, [
    price("material", "mdf-shared", "m2", 2000, "TRY", 8),
    price("material", "mdf-shared", "m2", 1000, "TRY", 18)
  ], [], []);

  assert.equal(report.status, "ready");
  assert.equal(quote.status, "ready");
  assert.equal(quote.requiredLineCount, 2);
  assert.equal(quote.pricedLineCount, 2);
  assert.deepEqual(
    quote.costSummary.lines.map((line) => [line.description, line.unitPriceMinor]),
    [
      ["MDF Lam (8 mm; mdf-shared)", 2000],
      ["MDF Lam (18 mm; mdf-shared)", 1000]
    ]
  );
  assert.deepEqual(
    quote.lineSources.map((source) => [source.costLineId, source.sourceType]),
    [
      ["consumption-0001", "production-consumption"],
      ["consumption-0002", "production-consumption"]
    ]
  );
});

test("gövde panel kalınlıklarından birinin fiyatı eksikse birleşik teklif toplamı hazır olmaz", () => {
  const report = createReport({
    materialId: "mdf-shared",
    material: "MDF Lam",
    materialThicknessesMm: [8, 18],
    panelMaterialOverrides: { top: "mdf-shared" },
    panelThicknessMmByGroup: { top: 8 }
  });
  const quote = calculateProjectQuoteSummary(report, [
    price("material", "mdf-shared", "m2", 1000, "TRY", 18)
  ], [], []);

  assert.equal(quote.status, "incomplete");
  assert.equal(quote.costSummary, null);
  assert.equal(quote.currencyCode, null);
  assert.equal(quote.requiredLineCount, 2);
  assert.equal(quote.pricedLineCount, 1);
  assert.deepEqual(quote.missingPrices.map((issue) => issue.thicknessMm), [8]);
});

test("tüketim fiyatı eksikse işçilik fiyatlı olsa bile birleşik toplamı gizler", () => {
  const quote = calculateProjectQuoteSummary(
    createReport(),
    [],
    [usage()],
    [tariff()]
  );

  assert.equal(quote.status, "incomplete");
  assert.equal(quote.costSummary, null);
  assert.equal(quote.currencyCode, null);
  assert.equal(quote.missingPrices.length, 1);
  assert.equal(quote.pricedLineCount, 1);
  assert.deepEqual(quote.lineSources, []);
});

test("işçilik tarifesi eksikse tüketim fiyatlı olsa bile birleşik toplamı gizler", () => {
  const quote = calculateProjectQuoteSummary(
    createReport(),
    consumptionPrices,
    [usage()],
    []
  );

  assert.equal(quote.status, "incomplete");
  assert.equal(quote.costSummary, null);
  assert.equal(quote.missingTariffs.length, 1);
  assert.equal(quote.requiredLineCount, 2);
  assert.equal(quote.pricedLineCount, 1);
});

test("üretim raporu blocked ise fiyatlı işçilik kısmi teklif oluşturamaz", () => {
  const quote = calculateProjectQuoteSummary(
    createReport({ widthMm: 0 }),
    consumptionPrices,
    [usage()],
    [tariff()]
  );

  assert.equal(quote.status, "blocked");
  assert.equal(quote.costSummary, null);
  assert.ok(quote.diagnostics.some((message) => message.includes("Üretim tüketimi:")));
});

test("alt hesaplar ayrı ayrı hazır olsa bile farklı para birimleri birleşik toplamı bloklar", () => {
  const quote = calculateProjectQuoteSummary(
    createReport(),
    consumptionPrices,
    [usage()],
    [tariff({ currencyCode: "USD" })]
  );

  assert.equal(quote.status, "blocked");
  assert.equal(quote.costSummary, null);
  assert.equal(quote.currencyCode, null);
  assert.match(quote.diagnostics[0], /farklı para birimleri/);
});

test("iki boş kapsam empty döndürür; yalnızca açık işçilik kapsamı ready olabilir", () => {
  const emptyReport = createReport({ empty: true });
  const empty = calculateProjectQuoteSummary(emptyReport, [], [], []);
  const laborOnly = calculateProjectQuoteSummary(emptyReport, [], [usage()], [tariff()]);

  assert.equal(empty.status, "empty");
  assert.equal(empty.costSummary, null);
  assert.equal(empty.requiredLineCount, 0);

  assert.equal(laborOnly.status, "ready");
  assert.equal(laborOnly.costSummary.categoryTotalsMinor.labor, 3600);
  assert.equal(laborOnly.costSummary.grandTotalMinor, 3600);
  assert.equal(laborOnly.lineSources.length, 1);
});

test("işçilik satır kimliği teklif içi kaynak eşlemesinde korunur ve maliyet kimliğiyle çakışmaz", () => {
  const quote = calculateProjectQuoteSummary(
    createReport(),
    consumptionPrices,
    [usage({ id: "material-0001" })],
    [tariff()]
  );

  assert.equal(quote.status, "ready");
  assert.notEqual(quote.costSummary.lines[0].id, quote.costSummary.lines[1].id);
  assert.equal(quote.lineSources[1].sourceId, "material-0001");
});


test("açık fire ve kâr satırları kullanıcı miktarı, birimi, fiyatı ve kaynak referansıyla teklife eklenir", () => {
  const report = createReport();
  const base = calculateProjectQuoteSummary(report, consumptionPrices, [], []);
  const quote = calculateProjectQuoteSummary(report, consumptionPrices, [], [], [
    {
      id: "waste-board-cut",
      category: "waste",
      description: "Kullanıcı tarafından girilen fire levha payı",
      quantity: 0.25,
      unit: "m2",
      unitPriceMinor: 1250,
      currencyCode: "TRY",
      sourceReference: "atolye-fire-hesabi:v1"
    },
    {
      id: "profit-service",
      category: "profit",
      description: "Kullanıcı tarafından girilen kâr kalemi",
      quantity: 1,
      unit: "adet",
      unitPriceMinor: 5000,
      currencyCode: "TRY",
      sourceReference: "teklif-kalemleri:rev1"
    }
  ]);

  assert.equal(base.status, "ready");
  assert.equal(quote.status, "ready");
  assert.equal(quote.requiredLineCount, base.requiredLineCount + 2);
  assert.equal(quote.pricedLineCount, quote.requiredLineCount);
  assert.equal(quote.costSummary.categoryTotalsMinor.waste, 313);
  assert.equal(quote.costSummary.categoryTotalsMinor.profit, 5000);
  assert.equal(quote.costSummary.grandTotalMinor, base.costSummary.grandTotalMinor + 5313);
  assert.deepEqual(quote.lineSources.slice(-2), [
    { costLineId: "adjustment-0001", sourceType: "quote-adjustment", sourceId: "waste-board-cut" },
    { costLineId: "adjustment-0002", sourceType: "quote-adjustment", sourceId: "profit-service" }
  ]);
  assert.equal(quote.costSummary.lines.at(-2).sourceReference, "atolye-fire-hesabi:v1");
  assert.equal(quote.costSummary.lines.at(-1).sourceReference, "teklif-kalemleri:rev1");
});

test("yalnızca fire veya kâr kategorisi ve açık kaynak referansı kabul edilir", () => {
  const invalidCategory = calculateProjectQuoteSummary(createReport(), consumptionPrices, [], [], [{
    id: "extra-material", category: "material", description: "Başka bir malzeme",
    quantity: 1, unit: "m2", unitPriceMinor: 100, currencyCode: "TRY", sourceReference: "user-entry"
  }]);
  const missingSource = calculateProjectQuoteSummary(createReport(), consumptionPrices, [], [], [{
    id: "waste-no-source", category: "waste", description: "Kaynak referansı olmayan fire",
    quantity: 1, unit: "m2", unitPriceMinor: 100, currencyCode: "TRY"
  }]);
  const percentage = calculateProjectQuoteSummary(createReport(), consumptionPrices, [], [], [{
    id: "profit-percentage", category: "profit", description: "Varsayılan yüzde kabul edilmemeli",
    quantity: 1, unit: "adet", unitPriceMinor: 100, currencyCode: "TRY",
    sourceReference: "user-entry", percentage: 10
  }]);

  assert.equal(invalidCategory.status, "blocked");
  assert.equal(invalidCategory.costSummary, null);
  assert.match(invalidCategory.diagnostics[0], /yalnızca waste veya profit/);
  assert.equal(missingSource.status, "blocked");
  assert.equal(missingSource.costSummary, null);
  assert.match(missingSource.diagnostics[0], /kaynak referansı zorunludur/);
  assert.equal(percentage.status, "blocked");
  assert.equal(percentage.costSummary, null);
  assert.match(percentage.diagnostics[0], /desteklenmeyen alan/);
});

test("fire ve kâr satırlarında para birimi uyuşmazlığı genel toplamı bloklar", () => {
  const quote = calculateProjectQuoteSummary(createReport(), consumptionPrices, [], [], [{
    id: "profit-usd", category: "profit", description: "Kullanıcı girdili kâr",
    quantity: 1, unit: "adet", unitPriceMinor: 100, currencyCode: "USD",
    sourceReference: "teklif-kalemleri:rev1"
  }]);

  assert.equal(quote.status, "blocked");
  assert.equal(quote.costSummary, null);
  assert.equal(quote.currencyCode, null);
  assert.match(quote.diagnostics.at(-1), /farklı para birimleri/);
});

test("üretim ve işçilik kapsamı boş olsa da açık fire/kâr satırları tek başına teklif oluşturabilir", () => {
  const quote = calculateProjectQuoteSummary(createReport({ empty: true }), [], [], [], [{
    id: "profit-only", category: "profit", description: "Açık kâr satırı",
    quantity: 1, unit: "adet", unitPriceMinor: 2500, currencyCode: "TRY",
    sourceReference: "teklif-kalemleri:rev1"
  }]);

  assert.equal(quote.status, "ready");
  assert.equal(quote.requiredLineCount, 1);
  assert.equal(quote.costSummary.categoryTotalsMinor.profit, 2500);
  assert.equal(quote.costSummary.grandTotalMinor, 2500);
});
