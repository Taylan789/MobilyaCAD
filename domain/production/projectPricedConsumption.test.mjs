import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createReport(options = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  if (options.banded === true) {
    edgeBandingByGroup.leftSide = { ...noBanding, top: true };
  }

  const request = {
    schemaVersion: 1,
    furniture: {
      id: "cab-cost-1",
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
    furniture: options.empty === true ? [] : [request],
    ...(options.hardwareItems === undefined ? {} : { hardwareItems: options.hardwareItems })
  });
}

function price(resourceType, resourceId, unit, unitPriceMinor, currencyCode = "TRY", sourceReference) {
  return {
    resourceType,
    resourceId,
    unit,
    unitPriceMinor,
    currencyCode,
    ...(sourceReference === undefined ? {} : { sourceReference })
  };
}

function hardwareItems() {
  return [
    { id: "bom-hinge-a", furnitureId: "cab-cost-1", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.1, unit: "adet" },
    { id: "bom-hinge-b", furnitureId: "cab-cost-1", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.2, unit: "adet" },
    { id: "bom-slide", furnitureId: "cab-cost-1", hardwareId: "slide-set", name: "Ray takımı", quantity: 1.5, unit: "takım" }
  ];
}

test("malzeme m2 ve donanım özgün birimi fiyatlarıyla tek para biriminde maliyet üretir", () => {
  const report = createReport({ hardwareItems: hardwareItems() });
  assert.equal(report.status, "ready");
  assert.equal(report.canExport, false);

  const material = calculateProjectMaterialConsumptionSummary(report.result)[0];
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250, "TRY", "material-list:v1"),
    price("hardware", "hinge-110", "adet", 50, "TRY", "hardware-list:v2"),
    price("hardware", "slide-set", "takım", 250, "TRY", "hardware-list:v2")
  ]);

  assert.equal(summary.status, "ready");
  assert.equal(summary.currencyCode, "TRY");
  assert.equal(summary.requiredLineCount, 3);
  assert.equal(summary.pricedLineCount, 3);
  assert.equal(summary.costSummary.lineCount, 3);
  assert.deepEqual(summary.costSummary.lines.map((line) => line.category), [
    "material", "hardware", "hardware"
  ]);
  assert.equal(summary.costSummary.lines[0].quantity, material.panelAreaM2);
  assert.equal(summary.costSummary.lines[0].unit, "m2");
  assert.equal(summary.costSummary.lines[0].sourceReference, "material-list:v1");
  assert.equal(summary.costSummary.lines[1].quantity, 0.3);
  assert.equal(summary.costSummary.lines[1].unit, "adet");
  assert.equal(summary.costSummary.lines[2].quantity, 1.5);
  assert.equal(summary.costSummary.lines[2].unit, "takım");
  assert.equal(
    summary.costSummary.grandTotalMinor,
    summary.costSummary.lines.reduce((total, line) => total + line.lineTotalMinor, 0)
  );
  assert.deepEqual(summary.missingPrices, []);
});

test("eksik bir donanım fiyatı toplamı hazır göstermez ve kısmi toplam döndürmez", () => {
  const report = createReport({ hardwareItems: hardwareItems() });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250),
    price("hardware", "hinge-110", "adet", 50)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.currencyCode, null);
  assert.equal(summary.requiredLineCount, 3);
  assert.equal(summary.pricedLineCount, 2);
  assert.deepEqual(summary.missingPrices.map((issue) => [
    issue.code, issue.resourceType, issue.resourceId, issue.requiredUnit
  ]), [["missing-price", "hardware", "slide-set", "takım"]]);
});

test("aynı donanım kimliği için farklı birim fiyatı eşleşme sayılmaz", () => {
  const report = createReport({ hardwareItems: [hardwareItems()[0]] });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250),
    price("hardware", "hinge-110", "paket", 400)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.missingPrices[0].code, "unit-mismatch");
  assert.deepEqual(summary.missingPrices[0].availableUnits, ["paket"]);
  assert.equal(summary.missingPrices[0].requiredUnit, "adet");
});

test("legacy parçada katalog kimliği yoksa malzeme fiyatı tahmin edilmez", () => {
  const report = createReport();
  const result = {
    ...report.result,
    parts: report.result.parts.map((part) => {
      const { materialId, ...legacyPart } = part;
      return legacyPart;
    })
  };
  const legacyReport = { ...report, result };
  const summary = calculateProjectPricedConsumptionSummary(legacyReport, [
    price("material", "mdf-18", "m2", 1250)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.missingPrices[0].code, "missing-resource-id");
  assert.equal(summary.missingPrices[0].resourceId, null);
});

test("kenar bantlama kimliği bulunmadığı için panel fiyatı olsa da toplam tamamlanmaz", () => {
  const report = createReport({ banded: true });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.ok(summary.missingPrices.some((issue) =>
    issue.code === "unpriced-edge-banding" &&
    issue.resourceType === "edge-banding" &&
    issue.resourceId === null &&
    issue.requiredUnit === "mm" &&
    issue.quantity > 0
  ));
});

test("fiyatı bulunan satırlarda farklı para birimleri tek toplamı bloklar", () => {
  const report = createReport({ hardwareItems: [hardwareItems()[0]] });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250, "TRY"),
    price("hardware", "hinge-110", "adet", 50, "USD")
  ]);

  assert.equal(summary.status, "blocked");
  assert.equal(summary.costSummary, null);
  assert.match(summary.diagnostics[0], /farklı para birimleri/);
});

test("yinelenen fiyat anahtarı, geçersiz fiyat ve bilinmeyen alan reddedilir", () => {
  const report = createReport();
  const invalidTables = [
    [
      price("material", "mdf-18", "m2", 100),
      price("material", "mdf-18", "m2", 200)
    ],
    [price("material", "mdf-18", "m2", -1)],
    [price("material", "mdf-18", "m2", 100, "try")],
    [{ ...price("material", "mdf-18", "m2", 100), guessed: true }]
  ];

  for (const table of invalidTables) {
    const summary = calculateProjectPricedConsumptionSummary(report, table);
    assert.equal(summary.status, "blocked");
    assert.equal(summary.costSummary, null);
    assert.equal(summary.diagnostics.length, 1);
  }
});

test("bozuk üretim raporu veya geçersiz üretim sonucu fiyatlandırılmaz", () => {
  const blockedReport = createReport({ widthMm: 0 });
  assert.equal(blockedReport.status, "blocked");

  const blocked = calculateProjectPricedConsumptionSummary(blockedReport, []);
  const malformed = calculateProjectPricedConsumptionSummary({
    schemaVersion: 1,
    status: "ready",
    result: { schemaVersion: 2, furniture: [], parts: [] }
  }, []);

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.costSummary, null);
  assert.equal(malformed.status, "blocked");
  assert.equal(malformed.costSummary, null);
});

test("boş proje boş durum döndürür ve fiyat tablosu olmayan tüketim eksik kalır", () => {
  const empty = calculateProjectPricedConsumptionSummary(createReport({ empty: true }), []);
  const report = createReport();
  const missing = calculateProjectPricedConsumptionSummary(report, []);

  assert.equal(empty.status, "empty");
  assert.equal(empty.costSummary, null);
  assert.equal(missing.status, "incomplete");
  assert.equal(missing.costSummary, null);
  assert.equal(missing.pricedLineCount, 0);
  assert.equal(missing.missingPrices[0].code, "missing-price");
});

test("açık sıfır fiyat geçerli kabul edilir; ücretsiz fiyat varsayılmaz", () => {
  const summary = calculateProjectPricedConsumptionSummary(createReport(), [
    price("material", "mdf-18", "m2", 0, "TRY", "approved-zero-price")
  ]);

  assert.equal(summary.status, "ready");
  assert.equal(summary.costSummary.grandTotalMinor, 0);
  assert.equal(summary.costSummary.lines[0].unitPriceMinor, 0);
  assert.equal(summary.costSummary.lines[0].sourceReference, "approved-zero-price");
});

test("maliyet motorunun altı ondalık miktar sınırını aşan donanım miktarı toplamı bloklar", () => {
  const report = createReport({
    hardwareItems: [{
      id: "bom-fine-quantity",
      furnitureId: "cab-cost-1",
      hardwareId: "micro-part",
      name: "Hassas miktarlı parça",
      quantity: 0.0000001,
      unit: "adet"
    }]
  });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250),
    price("hardware", "micro-part", "adet", 1)
  ]);

  assert.equal(summary.status, "blocked");
  assert.equal(summary.costSummary, null);
  assert.match(summary.diagnostics[0], /en fazla 6/);
});
