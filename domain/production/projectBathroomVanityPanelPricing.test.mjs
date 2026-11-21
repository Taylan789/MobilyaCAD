import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";
import { calculateProjectQuoteSummary } from "./projectQuoteSummary.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-multi", name: "MDF Multi", category: "panel", thicknessesMm: [8, 18], unit: "mm" }
];

function createVanityRequest(family = "bathroom-vanity") {
  return {
    schemaVersion: 1,
    family,
    furniture: {
      id: "bathroom-vanity-1",
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "MDF Multi",
      materialId: "mdf-multi"
    },
    profile: {
      panelThicknessMm: 18,
      panelThicknessMmByGroup: { top: 8 },
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: Object.fromEntries(
        BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
      )
    },
    materials,
    panelMaterialOverrides: { top: "mdf-multi" }
  };
}

function createProductionReport() {
  const templateReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createVanityRequest("cabinet")]
  });
  assert.equal(templateReport.status, "ready", templateReport.firstError ?? "Üst panel şablonu hazır olmalı.");
  const templateTop = templateReport.result.parts.find((part) => part.id === "bathroom-vanity-1-top");
  assert.ok(templateTop);

  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createVanityRequest()],
    panelCutouts: [{
      partId: "bathroom-vanity-1-top",
      geometry: {
        schemaVersion: 1,
        widthMm: templateTop.width,
        lengthMm: templateTop.length,
        thicknessMm: templateTop.thickness,
        outerEdgeBanding: { ...templateTop.edgeBanding },
        cutouts: [{
          id: "basin-opening",
          xMm: 100,
          yMm: 100,
          widthMm: 200,
          lengthMm: 150,
          edgeBanding: { ...noBanding }
        }]
      }
    }]
  });
}

function price(thicknessMm, unitPriceMinor) {
  return {
    resourceType: "material",
    resourceId: "mdf-multi",
    unit: "m2",
    unitPriceMinor,
    currencyCode: "TRY",
    thicknessMm
  };
}

function roundTo(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor + Number.EPSILON * factor) / factor;
}

test("banyo üst paneli açıklık net alan/hacmini tüketim ve exact kalınlık fiyatına taşır", () => {
  const report = createProductionReport();
  assert.equal(report.status, "ready", report.firstError ?? "Banyo dolabı üretim raporu hazır olmalı.");
  assert.ok(report.result);
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some((message) => message.includes("panelGeometry")));

  const top = report.result.parts.find((part) => part.id === "bathroom-vanity-1-top");
  assert.ok(top?.panelGeometry);
  assert.deepEqual([top.materialId, top.thickness, top.quantity], ["mdf-multi", 8, 1]);

  const expectedNetAreaMm2 = top.width * top.length - 200 * 150;
  const expectedNetVolumeMm3 = expectedNetAreaMm2 * top.thickness;
  assert.equal(top.panelGeometry.netFaceAreaMm2, expectedNetAreaMm2);
  assert.equal(top.panelGeometry.netVolumeMm3, expectedNetVolumeMm3);

  const materialSummaries = calculateProjectMaterialConsumptionSummary(report.result);
  const topMaterial = materialSummaries.find((item) =>
    item.materialId === "mdf-multi" && item.thicknessMm === 8
  );
  assert.ok(topMaterial);
  assert.equal(topMaterial.partLineCount, 1);
  assert.equal(topMaterial.totalQuantity, 1);
  assert.equal(topMaterial.panelAreaM2, roundTo(expectedNetAreaMm2 / 1_000_000, 6));
  assert.equal(topMaterial.volumeM3, roundTo(expectedNetVolumeMm3 / 1_000_000_000, 9));

  const prices = [price(8, 900), price(18, 1250)];
  const priced = calculateProjectPricedConsumptionSummary(report, prices);
  assert.equal(priced.status, "ready", priced.diagnostics.join(" "));
  assert.equal(priced.requiredLineCount, 2);
  assert.equal(priced.pricedLineCount, 2);
  assert.ok(priced.costSummary);
  const topLine = priced.costSummary.lines.find((line) =>
    line.description === "MDF Multi (8 mm; mdf-multi)"
  );
  assert.ok(topLine);
  assert.equal(topLine.unit, "m2");
  assert.equal(topLine.quantity, topMaterial.panelAreaM2);
  assert.equal(topLine.unitPriceMinor, 900);

  const quote = calculateProjectQuoteSummary(report, prices, [], []);
  assert.equal(quote.status, "ready", quote.diagnostics.join(" "));
  assert.equal(quote.requiredLineCount, 2);
  assert.equal(quote.pricedLineCount, 2);
  assert.equal(quote.costSummary?.lineCount, 2);
});

test("aynı malzeme kimliğinin 8 mm fiyatı eksikse 18 mm fiyatı net alanı karşılamaz ve toplam gizlenir", () => {
  const report = createProductionReport();
  assert.equal(report.status, "ready", report.firstError ?? "Banyo dolabı üretim raporu hazır olmalı.");
  assert.ok(report.result);

  const top = report.result.parts.find((part) => part.id === "bathroom-vanity-1-top");
  assert.ok(top?.panelGeometry);
  const topMaterial = calculateProjectMaterialConsumptionSummary(report.result).find((item) =>
    item.materialId === "mdf-multi" && item.thicknessMm === 8
  );
  assert.ok(topMaterial);

  const prices = [price(18, 1250)];
  const priced = calculateProjectPricedConsumptionSummary(report, prices);
  assert.equal(priced.status, "incomplete");
  assert.equal(priced.requiredLineCount, 2);
  assert.equal(priced.pricedLineCount, 1);
  assert.equal(priced.costSummary, null);
  assert.ok(priced.missingPrices.some((issue) =>
    issue.resourceType === "material" &&
    issue.resourceId === "mdf-multi" &&
    issue.requiredUnit === "m2" &&
    issue.thicknessMm === 8 &&
    issue.quantity === topMaterial.panelAreaM2 &&
    issue.availableThicknessesMm?.includes(18)
  ));

  const quote = calculateProjectQuoteSummary(report, prices, [], []);
  assert.equal(quote.status, "incomplete");
  assert.equal(quote.costSummary, null);
  assert.deepEqual(quote.lineSources, []);
});
