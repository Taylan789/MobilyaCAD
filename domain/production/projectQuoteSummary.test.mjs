import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectLaborOperationPricingSummary } from "./projectLaborOperationPricing.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";
import {
  calculateProjectEdgeBandingConsumptionSummary,
  calculateProjectHardwareConsumptionSummary,
  calculateProjectMaterialConsumptionSummary
} from "./projectMaterialSummary.ts";
import { calculateProjectEdgeBandingRollPlan } from "./projectEdgeBandingRollPlan.ts";
import { calculateProjectEdgeBandingRollCostSummary } from "./projectEdgeBandingRollCostSummary.ts";
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
    furniture: options.empty === true ? [] : [
      request,
      ...(options.additionalFurnitureIds ?? []).map((id) => ({ ...request, furniture: { ...request.furniture, id } }))
    ]
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
      sourceId: consumption.costSummary.lines[0].id,
      sourcePartIds: calculateProjectMaterialConsumptionSummary(report.result)[0].partIds,
      resourceType: "material",
      resourceId: "mdf-18",
      unit: "m2"
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
  assert.deepEqual(quote.lineSources.map((source) => [source.resourceType, source.resourceId, source.unit]), [
    ["material", "mdf-shared", "m2"],
    ["material", "mdf-shared", "m2"]
  ]);
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

test("roll mode replaces length-based edge-band lines and preserves explicit roll provenance", () => {
  const report = createReport();
  const part = report.result.parts[0];
  part.edgeBanding = { top: true, bottom: false, left: false, right: false };
  part.edgeBandingMaterialId = "pvc-a";
  part.edgeBandingUnit = "mm";
  const rollSpecs = [{ edgeBandingId: "pvc-a", rollLengthMm: 100000, sourceReference: "roll-spec:v1" }];
  const rollPrices = [{ edgeBandingId: "pvc-a", unit: "rulo", unitPriceMinor: 15000, currencyCode: "TRY", sourceReference: "roll-prices:v1" }];
  const rollPlan = calculateProjectEdgeBandingRollPlan(calculateProjectEdgeBandingConsumptionSummary(report.result), rollSpecs);
  const rollCost = calculateProjectEdgeBandingRollCostSummary(rollPlan, rollPrices);
  const baseConsumption = calculateProjectPricedConsumptionSummary(report, consumptionPrices, { edgeBandingPricingMode: "roll" });
  const quote = calculateProjectQuoteSummary(report, consumptionPrices, [], [], [], { edgeBandingPricingMode: "roll", edgeBandingRollSpecs: rollSpecs, edgeBandingRollPriceTable: rollPrices });
  assert.equal(rollCost.status, "ready");
  assert.equal(baseConsumption.status, "ready");
  assert.equal(quote.status, "ready");
  assert.equal(quote.requiredLineCount, baseConsumption.requiredLineCount + rollCost.requiredLineCount);
  assert.equal(quote.pricedLineCount, quote.requiredLineCount);
  assert.equal(quote.costSummary.lines.filter(line => line.unit === "rulo").length, 1);
  assert.equal(quote.costSummary.lines.some(line => line.unit === "mm" || line.unit === "m"), false);
  assert.equal(quote.costSummary.grandTotalMinor, baseConsumption.costSummary.grandTotalMinor + rollCost.costSummary.grandTotalMinor);
  const rollSource = quote.lineSources.find(source => source.unit === "rulo");
  assert.ok(rollSource);
  assert.equal(rollSource.resourceType, "edge-banding");
  assert.equal(rollSource.resourceId, "pvc-a");
  assert.equal(rollSource.rollCount, quote.costSummary.lines.find(line => line.unit === "rulo").quantity);
  assert.equal(rollSource.rollLengthMm, rollCost.lineSources[0].rollLengthMm);
  assert.equal(rollSource.purchasedLengthMm, rollCost.lineSources[0].purchasedLengthMm);
  assert.deepEqual(rollSource.sourcePartIds, rollCost.lineSources[0].partIds);
  assert.deepEqual(rollSource.furnitureIds, rollCost.lineSources[0].furnitureIds);
  assert.equal(rollSource.planSourceReference, "roll-spec:v1");
  assert.equal(rollSource.priceSourceReference, "roll-prices:v1");
});

test("roll mode fails closed when roll specifications or prices are incomplete", () => {
  const report = createReport();
  const part = report.result.parts[0];
  part.edgeBanding = { top: true, bottom: false, left: false, right: false };
  part.edgeBandingMaterialId = "pvc-a";
  part.edgeBandingUnit = "mm";
  const specs = [{ edgeBandingId: "pvc-a", rollLengthMm: 100000 }];
  const missingSpec = calculateProjectQuoteSummary(report, consumptionPrices, [], [], [], { edgeBandingPricingMode: "roll", edgeBandingRollSpecs: [], edgeBandingRollPriceTable: [{ edgeBandingId: "pvc-a", unit: "rulo", unitPriceMinor: 15000, currencyCode: "TRY" }] });
  const missingPrice = calculateProjectQuoteSummary(report, consumptionPrices, [], [], [], { edgeBandingPricingMode: "roll", edgeBandingRollSpecs: specs, edgeBandingRollPriceTable: [] });
  assert.equal(missingSpec.status, "incomplete");
  assert.equal(missingSpec.costSummary, null);
  assert.match(missingSpec.diagnostics.join(" "), /pvc-a/);
  assert.equal(missingPrice.status, "incomplete");
  assert.equal(missingPrice.costSummary, null);
  assert.match(missingPrice.diagnostics.join(" "), /pvc-a/);
});

test("roll and board prices in different currencies block the full quote", () => {
  const report = createReport();
  const part = report.result.parts[0];
  part.edgeBanding = { top: true, bottom: false, left: false, right: false };
  part.edgeBandingMaterialId = "pvc-a";
  part.edgeBandingUnit = "mm";
  const quote = calculateProjectQuoteSummary(report, consumptionPrices, [], [], [], { edgeBandingPricingMode: "roll", edgeBandingRollSpecs: [{ edgeBandingId: "pvc-a", rollLengthMm: 100000 }], edgeBandingRollPriceTable: [{ edgeBandingId: "pvc-a", unit: "rulo", unitPriceMinor: 15000, currencyCode: "USD" }] });
  assert.equal(quote.status, "blocked");
  assert.equal(quote.costSummary, null);
  assert.match(quote.diagnostics.at(-1), /farklı para birimleri/);
});

test("roll mode options must be explicit and length mode cannot receive roll inputs", () => {
  const report = createReport();
  const missing = calculateProjectQuoteSummary(report, consumptionPrices, [], [], [], { edgeBandingPricingMode: "roll" });
  const mixed = calculateProjectQuoteSummary(report, consumptionPrices, [], [], [], { edgeBandingPricingMode: "length", edgeBandingRollSpecs: [], edgeBandingRollPriceTable: [] });
  assert.equal(missing.status, "blocked");
  assert.match(missing.diagnostics[0], /listelerini gerektirir/);
  assert.equal(mixed.status, "blocked");
  assert.match(mixed.diagnostics[0], /yalnızca roll/);
});


test("DOM-122 quote totals reconcile independently with priced consumption, labor/operation and explicit adjustments", () => {
  const report = createReport();
  const hardwareItems = [
    { id: "bom-hinge-a", furnitureId: "quote-cabinet-1", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.25, unit: "adet", sourceReference: "bom-hardware:v1" },
    { id: "bom-hinge-b", furnitureId: "quote-cabinet-1", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.75, unit: "adet", sourceReference: "bom-hardware:v1" }
  ];
  report.result.hardwareItems = hardwareItems;
  const part = report.result.parts[0];
  part.edgeBanding = { top: true, bottom: false, left: false, right: false };
  part.edgeBandingMaterialId = "pvc-1";
  part.edgeBandingUnit = "mm";

  const materialGroups = calculateProjectMaterialConsumptionSummary(report.result);
  const hardwareGroups = calculateProjectHardwareConsumptionSummary(report.result);
  const edgeGroups = calculateProjectEdgeBandingConsumptionSummary(report.result);
  assert.equal(materialGroups.length, 1);
  assert.equal(hardwareGroups.length, 1);
  assert.equal(edgeGroups.length, 1);
  const panelAreaM2 = report.result.parts.reduce((sum, row) => sum + row.width * row.length * row.quantity, 0) / 1_000_000;
  const hardwareQuantity = hardwareItems.reduce((sum, row) => sum + row.quantity, 0);
  const edgeQuantityMm = part.width * part.quantity;
  assert.equal(materialGroups[0].panelAreaM2, panelAreaM2);
  assert.equal(hardwareGroups[0].totalQuantity, hardwareQuantity);
  assert.deepEqual(hardwareGroups[0].sourceReferences, ["bom-hardware:v1"]);
  assert.equal(edgeGroups[0].totalQuantity, edgeQuantityMm);
  assert.equal(edgeGroups[0].unit, "mm");

  const prices = [
    { resourceType: "material", resourceId: "mdf-18", unit: "m2", unitPriceMinor: 1250, currencyCode: "TRY", sourceReference: "panel-price:v1" },
    { resourceType: "hardware", resourceId: "hinge-110", unit: "adet", unitPriceMinor: 2000, currencyCode: "TRY", sourceReference: "hardware-price:v1" },
    { resourceType: "edge-banding", resourceId: "pvc-1", unit: "mm", unitPriceMinor: 1, currencyCode: "TRY", sourceReference: "edge-price:v1" }
  ];
  const workItems = [
    usage({ id: "labor-usage-1", duration: 1.25 }),
    usage({ id: "operation-usage-1", category: "operation", description: "Kenar işleme", duration: 10, unit: "min", tariffId: "operation-minute" })
  ];
  const tariffs = [
    tariff({ unitPriceMinor: 2000, sourceReference: "labor-tariff:v1" }),
    tariff({ tariffId: "operation-minute", category: "operation", unit: "min", unitPriceMinor: 45, sourceReference: "operation-tariff:v1" })
  ];
  const adjustments = [
    { id: "waste-0001", category: "waste", description: "Açık fire", quantity: 2, unit: "adet", unitPriceMinor: 300, currencyCode: "TRY", sourceReference: "waste-entry:v1" },
    { id: "profit-0001", category: "profit", description: "Açık kâr", quantity: 1, unit: "adet", unitPriceMinor: 1500, currencyCode: "TRY", sourceReference: "profit-entry:v1" }
  ];
  const consumption = calculateProjectPricedConsumptionSummary(report, prices);
  const labor = calculateProjectLaborOperationPricingSummary(workItems, tariffs);
  const quote = calculateProjectQuoteSummary(report, prices, workItems, tariffs, adjustments);
  assert.equal(consumption.status, "ready");
  assert.equal(labor.status, "ready");
  assert.equal(quote.status, "ready");
  assert.equal(quote.currencyCode, "TRY");
  assert.equal(quote.requiredLineCount, 7);
  assert.equal(quote.pricedLineCount, 7);
  assert.equal(quote.costSummary.lineCount, 7);
  assert.deepEqual(quote.missingPrices, []);
  assert.deepEqual(quote.missingTariffs, []);
  assert.deepEqual(quote.diagnostics, []);

  const minor = (quantity, price) => {
    const micros = BigInt(Math.round(quantity * 1_000_000));
    return Number((micros * BigInt(price) + 500_000n) / 1_000_000n);
  };
  const expectedTotals = {
    panel: minor(panelAreaM2, 1250), hardware: minor(hardwareQuantity, 2000),
    edge: minor(edgeQuantityMm, 1), labor: minor(1.25, 2000),
    operation: minor(10, 45), waste: minor(2, 300), profit: minor(1, 1500)
  };
  const expectedConsumption = [
    ["material-0001", "material", panelAreaM2, "m2", 1250, "TRY", "panel-price:v1", expectedTotals.panel],
    ["hardware-0001", "hardware", hardwareQuantity, "adet", 2000, "TRY", "hardware-price:v1", expectedTotals.hardware],
    ["edge-banding-0001", "material", edgeQuantityMm, "mm", 1, "TRY", "edge-price:v1", expectedTotals.edge]
  ];
  const rows = summary => summary.lines.map(line => [
    line.id, line.category, line.quantity, line.unit, line.unitPriceMinor, line.currencyCode, line.sourceReference ?? null, line.lineTotalMinor
  ]);
  assert.deepEqual(rows(consumption.costSummary), expectedConsumption);

  const expectedLabor = [
    ["labor-usage-1", "labor", 1.25, "h", 2000, "TRY", "labor-tariff:v1", expectedTotals.labor],
    ["operation-usage-1", "operation", 10, "min", 45, "TRY", "operation-tariff:v1", expectedTotals.operation]
  ];
  assert.deepEqual(rows(labor.costSummary), expectedLabor);

  const expectedQuote = [
    ["consumption-0001", "material", panelAreaM2, "m2", 1250, "TRY", "panel-price:v1", expectedTotals.panel],
    ["consumption-0002", "hardware", hardwareQuantity, "adet", 2000, "TRY", "hardware-price:v1", expectedTotals.hardware],
    ["consumption-0003", "material", edgeQuantityMm, "mm", 1, "TRY", "edge-price:v1", expectedTotals.edge],
    ["work-0001", "labor", 1.25, "h", 2000, "TRY", "labor-tariff:v1", expectedTotals.labor],
    ["work-0002", "operation", 10, "min", 45, "TRY", "operation-tariff:v1", expectedTotals.operation],
    ["adjustment-0001", "waste", 2, "adet", 300, "TRY", "waste-entry:v1", expectedTotals.waste],
    ["adjustment-0002", "profit", 1, "adet", 1500, "TRY", "profit-entry:v1", expectedTotals.profit]
  ];
  assert.deepEqual(rows(quote.costSummary), expectedQuote);
  assert.deepEqual(quote.lineSources.map(source => [source.costLineId, source.sourceType, source.sourceId, source.tariffId ?? null]), [
    ["consumption-0001", "production-consumption", "material-0001", null],
    ["consumption-0002", "production-consumption", "hardware-0001", null],
    ["consumption-0003", "production-consumption", "edge-banding-0001", null],
    ["work-0001", "labor-operation", "labor-usage-1", "labor-hourly"],
    ["work-0002", "labor-operation", "operation-usage-1", "operation-minute"],
    ["adjustment-0001", "quote-adjustment", "waste-0001", null],
    ["adjustment-0002", "quote-adjustment", "profit-0001", null]
  ]);
  assert.deepEqual(quote.lineSources.map(source => source.sourcePartIds ?? null), [
    materialGroups[0].partIds, null, edgeGroups[0].partIds, null, null, null, null
  ]);
  assert.deepEqual(quote.lineSources.slice(0, 3).map(source => [source.resourceType ?? null, source.resourceId ?? null, source.unit ?? null]), [
    ["material", "mdf-18", "m2"], [null, null, null], ["edge-banding", "pvc-1", "mm"]
  ]);
  assert.deepEqual(quote.costSummary.categoryTotalsMinor, {
    material: expectedTotals.panel + expectedTotals.edge, hardware: expectedTotals.hardware,
    labor: expectedTotals.labor, operation: expectedTotals.operation, waste: expectedTotals.waste, profit: expectedTotals.profit
  });
  assert.equal(quote.costSummary.grandTotalMinor, expectedQuote.reduce((sum, row) => sum + row[7], 0));
});


test("DOM-124 combined quote line sources carry hardware BOM provenance separately from price references", () => {
  const hardwareItems = [
    { id: "bom-hinge-z", furnitureId: "quote-cabinet-2", hardwareId: "hinge-110", name: "Menteşe", quantity: 2, unit: "adet", sourceReference: "bom:catalog-z" },
    { id: "bom-hinge-a", furnitureId: "quote-cabinet-1", hardwareId: "hinge-110", name: "Menteşe", quantity: 1, unit: "adet", sourceReference: "bom:catalog-a" },
    { id: "bom-hinge-a2", furnitureId: "quote-cabinet-2", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.5, unit: "adet", sourceReference: "bom:catalog-a" }
  ];
  const report = createReport({ additionalFurnitureIds: ["quote-cabinet-2"] });
  assert.equal(report.status, "ready", report.firstError ?? "İki mobilyalı üretim raporu hazır olmalıdır.");
  assert.ok(report.result);
  report.result.hardwareItems = hardwareItems;
  const inputBefore = JSON.stringify(report.result.hardwareItems);
  const prices = [
    price("material", "mdf-18", "m2", 1250),
    { ...price("hardware", "hinge-110", "adet", 700, "TRY"), sourceReference: "hardware-price:v2" }
  ];
  const consumption = calculateProjectPricedConsumptionSummary(report, prices);
  const quote = calculateProjectQuoteSummary(report, prices, [], []);
  assert.equal(consumption.status, "ready");
  assert.equal(quote.status, "ready");
  assert.equal(JSON.stringify(report.result.hardwareItems), inputBefore);

  const hardwareSource = quote.lineSources.find((source) => source.sourceId === "hardware-0001");
  assert.deepEqual(hardwareSource, {
    costLineId: "consumption-0002",
    sourceType: "production-consumption",
    sourceId: "hardware-0001",
    hardwareId: "hinge-110",
    hardwareUnit: "adet",
    hardwareFurnitureIds: ["quote-cabinet-1", "quote-cabinet-2"],
    hardwareSourceReferences: ["bom:catalog-a", "bom:catalog-z"]
  });
  assert.equal(hardwareSource.sourcePartIds, undefined);
  assert.equal(hardwareSource.resourceType, undefined);
  assert.equal(hardwareSource.resourceId, undefined);
  assert.equal(hardwareSource.hardwareUnit, consumption.lineHardwareSources[0].unit);
  assert.deepEqual(hardwareSource.hardwareFurnitureIds, consumption.lineHardwareSources[0].furnitureIds);
  assert.deepEqual(hardwareSource.hardwareSourceReferences, consumption.lineHardwareSources[0].sourceReferences);
  const hardwareCostLine = quote.costSummary.lines.find((line) => line.category === "hardware");
  assert.equal(hardwareCostLine.sourceReference, "hardware-price:v2");
  assert.notDeepEqual(hardwareSource.hardwareSourceReferences, [hardwareCostLine.sourceReference]);

  const reversedReport = createReport({ additionalFurnitureIds: ["quote-cabinet-2"] });
  reversedReport.result.hardwareItems = [...hardwareItems].reverse();
  const reversedQuote = calculateProjectQuoteSummary(reversedReport, prices, [], []);
  assert.equal(reversedQuote.status, "ready");
  assert.deepEqual(
    reversedQuote.lineSources.find((source) => source.sourceId === "hardware-0001"),
    hardwareSource
  );
});
test("quote adjustment accessors are rejected without invoking getters or exposing partial totals", () => {
  const adjustment = {
    id: "safe-waste", category: "waste", description: "Açık fire", quantity: 1,
    unitPriceMinor: 100, currencyCode: "TRY", sourceReference: "waste-entry:v1"
  };
  let getterCalls = 0;
  Object.defineProperty(adjustment, "unitPriceMinor", {
    enumerable: true, configurable: true,
    get() { getterCalls += 1; return 100; }
  });
  const quote = calculateProjectQuoteSummary(createReport(), consumptionPrices, [], [], [adjustment]);
  assert.equal(quote.status, "blocked");
  assert.equal(quote.costSummary, null);
  assert.deepEqual(quote.lineSources, []);
  assert.equal(getterCalls, 0);
});

test("quote option accessors and Proxy reflection failures block without invoking getters", () => {
  let getterCalls = 0;
  const accessorOptions = {};
  Object.defineProperty(accessorOptions, "panelMaterialPricingMode", {
    enumerable: true, configurable: true,
    get() { getterCalls += 1; return "excluded"; }
  });
  const accessorQuote = calculateProjectQuoteSummary(
    createReport(), consumptionPrices, [], [], [], accessorOptions
  );
  assert.equal(accessorQuote.status, "blocked");
  assert.equal(accessorQuote.costSummary, null);
  assert.equal(getterCalls, 0);

  const proxyOptions = new Proxy({}, {
    ownKeys() { throw new Error("quote option ownKeys failed"); }
  });
  let proxyQuote;
  assert.doesNotThrow(() => {
    proxyQuote = calculateProjectQuoteSummary(
      createReport(), consumptionPrices, [], [], [], proxyOptions
    );
  });
  assert.equal(proxyQuote.status, "blocked");
  assert.equal(proxyQuote.costSummary, null);
});


test("combined roll quote rejects nested specification and price accessors without invoking getters", () => {
  const report = createReport();
  const part = report.result.parts[0];
  part.edgeBanding = { top: true, bottom: false, left: false, right: false };
  part.edgeBandingMaterialId = "pvc-a";
  part.edgeBandingUnit = "mm";

  let specGetterCalls = 0;
  const unsafeSpec = { edgeBandingId: "pvc-a" };
  Object.defineProperty(unsafeSpec, "rollLengthMm", {
    enumerable: true,
    configurable: true,
    get() { specGetterCalls += 1; return 100000; }
  });
  const blockedSpecQuote = calculateProjectQuoteSummary(
    report, consumptionPrices, [], [], [],
    {
      edgeBandingPricingMode: "roll",
      edgeBandingRollSpecs: [unsafeSpec],
      edgeBandingRollPriceTable: [{ edgeBandingId: "pvc-a", unit: "rulo", unitPriceMinor: 15000, currencyCode: "TRY" }]
    }
  );
  assert.equal(blockedSpecQuote.status, "blocked");
  assert.equal(blockedSpecQuote.costSummary, null);
  assert.deepEqual(blockedSpecQuote.lineSources, []);
  assert.equal(specGetterCalls, 0);

  let priceGetterCalls = 0;
  const unsafePrice = { edgeBandingId: "pvc-a", unit: "rulo", currencyCode: "TRY" };
  Object.defineProperty(unsafePrice, "unitPriceMinor", {
    enumerable: true,
    configurable: true,
    get() { priceGetterCalls += 1; return 15000; }
  });
  const blockedPriceQuote = calculateProjectQuoteSummary(
    report, consumptionPrices, [], [], [],
    {
      edgeBandingPricingMode: "roll",
      edgeBandingRollSpecs: [{ edgeBandingId: "pvc-a", rollLengthMm: 100000 }],
      edgeBandingRollPriceTable: [unsafePrice]
    }
  );
  assert.equal(blockedPriceQuote.status, "blocked");
  assert.equal(blockedPriceQuote.costSummary, null);
  assert.deepEqual(blockedPriceQuote.lineSources, []);
  assert.equal(priceGetterCalls, 0);
});
