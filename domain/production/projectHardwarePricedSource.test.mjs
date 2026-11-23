import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [{ id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" }];

function createRequest(id) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  return {
    schemaVersion: 1,
    furniture: { id, widthMm: 800, heightMm: 720, depthMm: 560, material: "MDF Lam 18", materialId: "mdf-18" },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials
  };
}

function createReport(hardwareItems, furnitureIds = ["cab-a", "cab-b"]) {
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: furnitureIds.map(createRequest),
    hardwareItems
  });
}

const hardwareItems = [
  { id: "bom-hinge-z", furnitureId: "cab-a", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.25, unit: "adet", sourceReference: "bom:catalog-z" },
  { id: "bom-hinge-a", furnitureId: "cab-b", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.75, unit: "adet", sourceReference: "bom:catalog-a" },
  { id: "bom-hinge-kit", furnitureId: "cab-a", hardwareId: "hinge-110", name: "Menteşe", quantity: 1, unit: "takım", sourceReference: "bom:kit" },
  { id: "bom-slide", furnitureId: "cab-b", hardwareId: "slide-set", name: "Ray takımı", quantity: 1.5, unit: "takım" }
];
const prices = [
  { resourceType: "material", resourceId: "mdf-18", unit: "m2", unitPriceMinor: 1250, currencyCode: "TRY", sourceReference: "material-price:v1" },
  { resourceType: "hardware", resourceId: "hinge-110", unit: "adet", unitPriceMinor: 500, currencyCode: "TRY", sourceReference: "hardware-price:v1" },
  { resourceType: "hardware", resourceId: "hinge-110", unit: "takım", unitPriceMinor: 2500, currencyCode: "TRY", sourceReference: "hardware-price:v1" },
  { resourceType: "hardware", resourceId: "slide-set", unit: "takım", unitPriceMinor: 1000, currencyCode: "TRY", sourceReference: "hardware-price:v1" }
];

test("priced hardware lines preserve sorted furniture and BOM-source provenance without inventing Part IDs", () => {
  const report = createReport(hardwareItems);
  assert.equal(report.status, "ready", report.firstError ?? "Üretim raporu hazır olmalıdır.");
  assert.ok(report.result);
  const inputBefore = JSON.stringify(report.result.hardwareItems);

  const summary = calculateProjectPricedConsumptionSummary(report, prices);
  assert.equal(summary.status, "ready");
  assert.equal(summary.requiredLineCount, 4);
  assert.equal(summary.pricedLineCount, 4);
  assert.deepEqual(summary.lineHardwareSources, [
    {
      costLineId: "hardware-0001",
      hardwareId: "hinge-110",
      unit: "adet",
      furnitureIds: ["cab-a", "cab-b"],
      sourceReferences: ["bom:catalog-a", "bom:catalog-z"]
    },
    {
      costLineId: "hardware-0002",
      hardwareId: "hinge-110",
      unit: "takım",
      furnitureIds: ["cab-a"],
      sourceReferences: ["bom:kit"]
    },
    {
      costLineId: "hardware-0003",
      hardwareId: "slide-set",
      unit: "takım",
      furnitureIds: ["cab-b"]
    }
  ]);

  assert.deepEqual(summary.linePartSources.map(source => source.resourceType), ["material"]);
  assert.ok(summary.linePartSources.every(source => source.sourcePartIds.length > 0));
  assert.ok(summary.lineHardwareSources.every(source => !("sourcePartIds" in source)));
  assert.deepEqual(
    summary.costSummary.lines.filter(line => line.category === "hardware").map(line =>
      [line.id, line.quantity, line.unit, line.unitPriceMinor, line.sourceReference]
    ),
    [
      ["hardware-0001", 1, "adet", 500, "hardware-price:v1"],
      ["hardware-0002", 1, "takım", 2500, "hardware-price:v1"],
      ["hardware-0003", 1.5, "takım", 1000, "hardware-price:v1"]
    ]
  );
  assert.equal(JSON.stringify(report.result.hardwareItems), inputBefore);

  const reversedReport = createReport([...hardwareItems].reverse(), ["cab-b", "cab-a"]);
  assert.equal(reversedReport.status, "ready");
  const reversedSummary = calculateProjectPricedConsumptionSummary(reversedReport, prices);
  assert.equal(reversedSummary.status, "ready");
  assert.deepEqual(reversedSummary.lineHardwareSources, summary.lineHardwareSources);
});

test("incomplete hardware pricing exposes no partial BOM-source mapping", () => {
  const report = createReport(hardwareItems);
  const incompletePrices = prices.filter(price => !(price.resourceType === "hardware" && price.resourceId === "slide-set"));
  const summary = calculateProjectPricedConsumptionSummary(report, incompletePrices);
  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.deepEqual(summary.lineHardwareSources, []);
});
