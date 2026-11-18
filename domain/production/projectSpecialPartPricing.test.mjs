import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";
import { calculateProjectQuoteSummary } from "./projectQuoteSummary.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];
const specialPartIds = [
  "wardrobe-1-shelf-lower",
  "wardrobe-1-vertical-divider-center",
  "tv-1-shelf-middle",
  "tv-1-vertical-divider-center"
];

function createEdgeBandingByGroup() {
  return Object.fromEntries(BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }]));
}

function createWardrobeRequest() {
  return {
    schemaVersion: 1,
    family: "wardrobe",
    furniture: {
      id: "wardrobe-1",
      widthMm: 1800,
      heightMm: 2200,
      depthMm: 600,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: createEdgeBandingByGroup()
    },
    materials,
    verticalDividers: [{
      id: "center",
      offsetFromInnerLeftMm: 500,
      thicknessMm: 18,
      materialId: "mdf-18",
      edgeBanding: { ...noBanding, left: true, right: true },
      grainDirection: "length"
    }],
    shelves: [{
      id: "lower",
      leftOffsetMm: 0,
      rightOffsetMm: 500,
      heightFromInnerBottomMm: 500,
      frontOffsetMm: 0,
      depthMm: 582,
      thicknessMm: 18,
      materialId: "mdf-18",
      edgeBanding: { ...noBanding, top: true },
      grainDirection: "length"
    }]
  };
}

function createTvUnitRequest() {
  return {
    schemaVersion: 1,
    family: "tv-unit",
    mounting: "floor-standing",
    furniture: {
      id: "tv-1",
      widthMm: 1800,
      heightMm: 420,
      depthMm: 450,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: createEdgeBandingByGroup()
    },
    materials,
    verticalDividers: [{
      id: "center",
      leftOffsetMm: 500,
      bottomOffsetMm: 0,
      heightMm: 384,
      frontOffsetMm: 0,
      depthMm: 432,
      thicknessMm: 18,
      materialId: "mdf-18",
      edgeBanding: { ...noBanding, left: true, right: true },
      grainDirection: "length"
    }],
    shelves: [{
      id: "middle",
      leftOffsetMm: 0,
      rightOffsetMm: 500,
      heightFromInnerBottomMm: 100,
      frontOffsetMm: 0,
      depthMm: 420,
      thicknessMm: 8,
      materialId: "mdf-8",
      edgeBanding: { ...noBanding, top: true, left: true },
      grainDirection: "length"
    }]
  };
}

function createProductionReport() {
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createWardrobeRequest(), createTvUnitRequest()],
    edgeBandingAssignments: specialPartIds.map((partId) => ({
      partId,
      edgeBandingId: "pvc-white-1",
      unit: "m"
    }))
  });
}

function price(resourceType, resourceId, unit, unitPriceMinor, thicknessMm) {
  return {
    resourceType,
    resourceId,
    unit,
    unitPriceMinor,
    currencyCode: "TRY",
    ...(thicknessMm === undefined ? {} : { thicknessMm })
  };
}

function completePriceTable() {
  return [
    price("material", "mdf-18", "m2", 1250, 18),
    price("material", "mdf-8", "m2", 900, 8),
    price("edge-banding", "pvc-white-1", "m", 18)
  ];
}

function roundedAreaM2(areaMm2) {
  return Math.round(areaMm2 / 1_000_000 * 1_000_000 + Number.EPSILON) / 1_000_000;
}

test("gardırop ve TV özel raf/bölücüler malzeme tüketimi ve kalınlık duyarlı teklife katılır", () => {
  const report = createProductionReport();
  assert.equal(report.status, "ready", report.firstError ?? "Proje üretimi hazır olmalı.");
  assert.ok(report.result);
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some((message) => /edgeBandingMaterialId/.test(message)));

  const partsById = new Map(report.result.parts.map((part) => [part.id, part]));
  for (const partId of specialPartIds) {
    const part = partsById.get(partId);
    assert.ok(part, partId + " gerçek proje üretim Part listesinde bulunmalıdır.");
    assert.equal(part.quantity, 1);
    assert.ok(part.materialId);
    assert.ok(part.thickness > 0);
  }

  const expectedByMaterial = new Map();
  for (const part of report.result.parts) {
    const key = JSON.stringify([part.materialId ?? null, part.material, part.thickness]);
    const group = expectedByMaterial.get(key) ?? {
      partLineCount: 0,
      totalQuantity: 0,
      areaMm2: 0
    };
    group.partLineCount += 1;
    group.totalQuantity += part.quantity;
    group.areaMm2 += part.width * part.length * part.quantity;
    expectedByMaterial.set(key, group);
  }

  const materialSummaries = calculateProjectMaterialConsumptionSummary(report.result);
  const actualByMaterial = new Map(materialSummaries.map((group) => [
    JSON.stringify([group.materialId ?? null, group.material, group.thicknessMm]),
    group
  ]));
  assert.deepEqual(
    [...actualByMaterial.keys()].sort(),
    [...expectedByMaterial.keys()].sort()
  );
  for (const [key, expected] of expectedByMaterial) {
    const actual = actualByMaterial.get(key);
    assert.ok(actual, "Her üretim Part grubu tüketim özetinde bulunmalıdır.");
    assert.equal(actual.partLineCount, expected.partLineCount);
    assert.equal(actual.totalQuantity, expected.totalQuantity);
    assert.equal(actual.panelAreaM2, roundedAreaM2(expected.areaMm2));
  }

  const wardrobeShelf = partsById.get("wardrobe-1-shelf-lower");
  const wardrobeDivider = partsById.get("wardrobe-1-vertical-divider-center");
  const tvShelf = partsById.get("tv-1-shelf-middle");
  const tvDivider = partsById.get("tv-1-vertical-divider-center");
  assert.equal(wardrobeShelf.materialId, "mdf-18");
  assert.equal(wardrobeShelf.thickness, 18);
  assert.equal(wardrobeDivider.materialId, "mdf-18");
  assert.equal(wardrobeDivider.thickness, 18);
  assert.equal(tvShelf.materialId, "mdf-8");
  assert.equal(tvShelf.thickness, 8);
  assert.equal(tvDivider.materialId, "mdf-18");
  assert.equal(tvDivider.thickness, 18);

  const prices = completePriceTable();
  const priced = calculateProjectPricedConsumptionSummary(report, prices);
  assert.equal(priced.status, "ready", priced.diagnostics.join(" "));
  assert.equal(priced.requiredLineCount, 3);
  assert.equal(priced.pricedLineCount, 3);
  assert.ok(priced.costSummary);
  assert.equal(priced.costSummary.lineCount, 3);

  for (const group of materialSummaries) {
    const line = priced.costSummary.lines.find((entry) =>
      entry.description === group.material + " (" + group.thicknessMm + " mm; " + group.materialId + ")"
    );
    assert.ok(line, group.materialId + " " + group.thicknessMm + " mm fiyat satırı bulunmalıdır.");
    assert.equal(line.unit, "m2");
    assert.equal(line.quantity, group.panelAreaM2);
    assert.equal(line.unitPriceMinor, group.materialId === "mdf-8" ? 900 : 1250);
  }

  const quote = calculateProjectQuoteSummary(report, prices, [], []);
  assert.equal(quote.status, "ready", quote.diagnostics.join(" "));
  assert.equal(quote.requiredLineCount, 3);
  assert.equal(quote.pricedLineCount, 3);
  assert.equal(quote.costSummary?.lineCount, 3);
  assert.equal(quote.lineSources.length, 3);
  assert.ok(quote.lineSources.every((source) => source.sourceType === "production-consumption"));
});

test("özel 8 mm raf fiyatı eksikse kalınlık duyarlı teklif kısmi toplam vermez", () => {
  const report = createProductionReport();
  assert.equal(report.status, "ready", report.firstError ?? "Proje üretimi hazır olmalı.");

  const prices = completePriceTable().filter((entry) =>
    !(entry.resourceType === "material" && entry.resourceId === "mdf-8")
  );
  const priced = calculateProjectPricedConsumptionSummary(report, prices);
  assert.equal(priced.status, "incomplete");
  assert.equal(priced.requiredLineCount, 3);
  assert.equal(priced.pricedLineCount, 2);
  assert.equal(priced.costSummary, null);
  assert.ok(priced.missingPrices.some((issue) =>
    issue.resourceType === "material" &&
    issue.resourceId === "mdf-8" &&
    issue.requiredUnit === "m2" &&
    issue.thicknessMm === 8 &&
    issue.quantity > 0
  ));

  const quote = calculateProjectQuoteSummary(report, prices, [], []);
  assert.equal(quote.status, "incomplete");
  assert.equal(quote.costSummary, null);
  assert.ok(quote.missingPrices.some((issue) =>
    issue.resourceId === "mdf-8" && issue.thicknessMm === 8
  ));
});
