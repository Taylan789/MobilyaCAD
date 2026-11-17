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
  const request = {
    schemaVersion: 1,
    furniture: {
      id: "quote-cabinet-1",
      widthMm: options.widthMm ?? 800,
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

function price(resourceType, resourceId, unit, unitPriceMinor, currencyCode = "TRY") {
  return { resourceType, resourceId, unit, unitPriceMinor, currencyCode };
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
