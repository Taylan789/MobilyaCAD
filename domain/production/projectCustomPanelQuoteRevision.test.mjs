import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";
import {
  appendProjectQuoteRevisionToProjectFile,
  readProjectQuoteRevisionHistoryFromProjectFile
} from "./projectQuoteRevisionProjectFile.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
  serializeProjectQuoteRevisionHistoryFile
} from "./projectQuoteRevisionFile.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createPanelReport(options = {}) {
  const materialId = options.materialId ?? "worktop-38-a";
  const materialName = options.materialName ?? "Kompakt Tezgâh";
  const thicknessMm = options.thicknessMm ?? 38.04;
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [{
      schemaVersion: 1,
      family: "panel",
      furniture: {
        id: "custom-worktop",
        name: "Özel tezgâh",
        widthMm: options.widthMm ?? 2000.04,
        lengthMm: options.lengthMm ?? 600.04,
        thicknessMm,
        quantity: options.quantity ?? 2,
        material: materialName,
        materialId
      },
      profile: {
        edgeBanding: { ...noBanding },
        grainDirection: "length"
      },
      materials: [{
        id: materialId,
        name: materialName,
        category: "panel",
        thicknessesMm: [Math.round(thicknessMm * 10) / 10],
        unit: "mm"
      }]
    }],
    ...(options.panelCutouts === undefined ? {} : { panelCutouts: options.panelCutouts })
  });
}

function price(resourceId, unitPriceMinor, sourceReference, thicknessMm = 38) {
  return {
    resourceType: "material",
    resourceId,
    unit: "m2",
    unitPriceMinor,
    currencyCode: "TRY",
    sourceReference,
    thicknessMm
  };
}

function createPricingSnapshot(productionReport, version, materialId, unitPriceMinor, priceThicknessMm = 38) {
  return createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-27",
    productionReport,
    consumptionPriceTable: [
      price(
        materialId,
        unitPriceMinor,
        "workshop-materials:" + version + ":" + materialId,
        priceThicknessMm
      )
    ],
    workItems: [],
    tariffTable: [],
    materialCostBasis: { basis: "net-consumption" },
    consumptionPriceList: {
      catalogId: "workshop-materials",
      version,
      effectiveFrom: "2026-11-01",
      effectiveTo: "2026-11-30"
    },
    laborOperationTariffList: null
  });
}

function createV2Project() {
  return {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "project-custom-panel-quote-1",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: []
  };
}

function assertPanelQuote(snapshot, expected) {
  assert.equal(snapshot.schemaVersion, 2);
  assert.equal(snapshot.quoteSummary.status, "ready");
  assert.equal(snapshot.quoteSummary.currencyCode, "TRY");
  assert.equal(snapshot.quoteSummary.requiredLineCount, 1);
  assert.equal(snapshot.quoteSummary.pricedLineCount, 1);

  const line = snapshot.quoteSummary.costSummary.lines[0];
  assert.equal(line.category, "material");
  assert.equal(line.unit, "m2");
  assert.equal(line.quantity, expected.areaM2);
  assert.equal(line.unitPriceMinor, expected.unitPriceMinor);
  assert.equal(line.lineTotalMinor, expected.totalMinor);
  assert.equal(line.sourceReference, expected.sourceReference);
  assert.equal(snapshot.quoteSummary.costSummary.grandTotalMinor, expected.totalMinor);

  const source = snapshot.quoteSummary.lineSources.find(candidate => candidate.costLineId === line.id);
  assert.ok(source);
  assert.equal(source.sourceType, "production-consumption");
  assert.equal(source.resourceType, "material");
  assert.equal(source.resourceId, expected.materialId);
  assert.equal(source.unit, "m2");
  assert.deepEqual(source.sourcePartIds, ["custom-worktop-panel"]);

  assert.equal(snapshot.materialCostBasis.basis, "net-consumption");
  assert.equal(snapshot.materialCostBasis.panelMaterialCostMinor, expected.totalMinor);
  assert.equal(snapshot.materialCostBasis.materialCategoryTotalMinor, expected.totalMinor);
  assert.equal(snapshot.materialCostBasis.materialSourceCount, 1);
}

test("özel panelin kullanıcı fiyatlı net m2 tüketimi iki immutable teklif revizyonunda Part kaynağını korur", () => {
  const firstReport = createPanelReport();
  assert.equal(firstReport.status, "ready", firstReport.firstError ?? "Özel panel üretimi hazır olmalı.");
  assert.equal(firstReport.result.parts[0].id, "custom-worktop-panel");
  assert.deepEqual(
    [
      firstReport.result.parts[0].width,
      firstReport.result.parts[0].length,
      firstReport.result.parts[0].thickness,
      firstReport.result.parts[0].quantity
    ],
    [2000, 600, 38, 2]
  );

  const firstResult = createPricingSnapshot(
    firstReport,
    "workshop-v1",
    "worktop-38-a",
    1250
  );
  assert.equal(firstResult.status, "ready", firstResult.diagnostics.join(" "));
  assert.ok(firstResult.snapshot);
  assertPanelQuote(firstResult.snapshot, {
    materialId: "worktop-38-a",
    areaM2: 2.4,
    unitPriceMinor: 1250,
    totalMinor: 3000,
    sourceReference: "workshop-materials:workshop-v1:worktop-38-a"
  });
  assert.ok(Object.isFrozen(firstResult.snapshot));
  assert.ok(Object.isFrozen(firstResult.snapshot.quoteSummary.costSummary.lines[0]));
  const firstSnapshotBeforeEdit = structuredClone(firstResult.snapshot);

  const editedReport = createPanelReport({
    widthMm: 2100.04,
    lengthMm: 600.04,
    thicknessMm: 38,
    quantity: 3,
    materialId: "worktop-38-b",
    materialName: "Kompakt Tezgâh Plus"
  });
  assert.equal(editedReport.status, "ready", editedReport.firstError ?? "Düzenlenen özel panel üretimi hazır olmalı.");
  assert.equal(editedReport.result.parts[0].id, "custom-worktop-panel");

  const secondResult = createPricingSnapshot(
    editedReport,
    "workshop-v2",
    "worktop-38-b",
    1400
  );
  assert.equal(secondResult.status, "ready", secondResult.diagnostics.join(" "));
  assert.ok(secondResult.snapshot);
  assertPanelQuote(secondResult.snapshot, {
    materialId: "worktop-38-b",
    areaM2: 3.78,
    unitPriceMinor: 1400,
    totalMinor: 5292,
    sourceReference: "workshop-materials:workshop-v2:worktop-38-b"
  });
  assert.deepEqual(firstResult.snapshot, firstSnapshotBeforeEdit);

  const firstAppend = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
    revisionId: "quote-r1",
    createdAt: "2026-11-27T01:10:00+03:00",
    pricingSnapshot: firstResult.snapshot
  });
  assert.equal(firstAppend.status, "ready", firstAppend.diagnostics.join(" "));
  assert.ok(firstAppend.project);

  const secondAppend = appendProjectQuoteRevisionToProjectFile(firstAppend.project, {
    revisionId: "quote-r2",
    createdAt: "2026-11-27T01:20:00+03:00",
    pricingSnapshot: secondResult.snapshot
  });
  assert.equal(secondAppend.status, "ready", secondAppend.diagnostics.join(" "));
  assert.ok(secondAppend.project);

  const projectRead = readProjectQuoteRevisionHistoryFromProjectFile(secondAppend.project);
  assert.equal(projectRead.status, "ready", projectRead.diagnostics.join(" "));
  assert.ok(projectRead.history);
  assert.equal(projectRead.history.revisions.length, 2);

  const serialized = serializeProjectQuoteRevisionHistoryFile(projectRead.history);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join(" "));
  assert.ok(serialized.json);
  const parsed = parseProjectQuoteRevisionHistoryFile(serialized.json);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join(" "));
  assert.ok(parsed.history);
  assert.equal(parsed.history.revisions.length, 2);

  const [firstRevision, secondRevision] = parsed.history.revisions;
  assert.equal(firstRevision.revisionNumber, 1);
  assert.equal(firstRevision.previousRevisionId, null);
  assert.equal(secondRevision.revisionNumber, 2);
  assert.equal(secondRevision.previousRevisionId, "quote-r1");
  assert.equal(firstRevision.pricingSnapshot.consumptionPriceList.version, "workshop-v1");
  assert.equal(secondRevision.pricingSnapshot.consumptionPriceList.version, "workshop-v2");
  assertPanelQuote(firstRevision.pricingSnapshot, {
    materialId: "worktop-38-a",
    areaM2: 2.4,
    unitPriceMinor: 1250,
    totalMinor: 3000,
    sourceReference: "workshop-materials:workshop-v1:worktop-38-a"
  });
  assertPanelQuote(secondRevision.pricingSnapshot, {
    materialId: "worktop-38-b",
    areaM2: 3.78,
    unitPriceMinor: 1400,
    totalMinor: 5292,
    sourceReference: "workshop-materials:workshop-v2:worktop-38-b"
  });
});

test("özel panelin exact kalınlık fiyatı eksikse teklif snapshot ve revizyon kısmi toplam üretmeden engellenir", () => {
  const report = createPanelReport();
  assert.equal(report.status, "ready", report.firstError ?? "Özel panel üretimi hazır olmalı.");

  const incomplete = createPricingSnapshot(
    report,
    "workshop-wrong-thickness",
    "worktop-38-a",
    1250,
    36
  );
  assert.equal(incomplete.status, "incomplete");
  assert.equal(incomplete.snapshot, null);
  assert.ok(incomplete.quoteSummary);
  assert.equal(incomplete.quoteSummary.requiredLineCount, 1);
  assert.equal(incomplete.quoteSummary.pricedLineCount, 0);
  assert.equal(incomplete.quoteSummary.currencyCode, null);
  assert.equal(incomplete.quoteSummary.costSummary, null);
  assert.ok(incomplete.quoteSummary.missingPrices.some(issue =>
    issue.resourceId === "worktop-38-a" &&
    issue.thicknessMm === 38 &&
    issue.availableThicknessesMm?.includes(36)
  ));

  const append = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
    revisionId: "quote-unpriced-panel",
    createdAt: "2026-11-27T01:30:00+03:00",
    pricingSnapshot: incomplete.snapshot
  });
  assert.equal(append.status, "blocked");
  assert.equal(append.project, null);
  assert.equal(append.history, null);
});


test("DOM-201 kesitli özel panel teklifi açıklık alanını düşer, quantity ve kaynak Part izini korur; export kilidini kaldırmaz", () => {
  const report = createPanelReport({
    panelCutouts: [{
      partId: "custom-worktop-panel",
      geometry: {
        schemaVersion: 1,
        widthMm: 2000,
        lengthMm: 600,
        thicknessMm: 38,
        outerEdgeBanding: { ...noBanding },
        cutouts: [{
          id: "sink-opening",
          xMm: 100,
          yMm: 100,
          widthMm: 400,
          lengthMm: 300,
          edgeBanding: { ...noBanding }
        }]
      }
    }]
  });

  assert.equal(report.status, "ready", report.firstError ?? "Kesitli özel panel üretimi hazır olmalı.");
  assert.ok(report.result);
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some(message => /panelGeometry/.test(message)));

  const part = report.result.parts[0];
  assert.equal(part.id, "custom-worktop-panel");
  assert.equal(part.quantity, 2);
  assert.equal(part.panelGeometry.outerFaceAreaMm2, 1_200_000);
  assert.equal(part.panelGeometry.cutoutAreaMm2, 120_000);
  assert.equal(part.panelGeometry.netFaceAreaMm2, 1_080_000);

  const priced = createPricingSnapshot(
    report,
    "workshop-cutout-v1",
    "worktop-38-a",
    1250
  );
  assert.equal(priced.status, "ready", priced.diagnostics.join(" "));
  assert.ok(priced.snapshot);
  assertPanelQuote(priced.snapshot, {
    materialId: "worktop-38-a",
    areaM2: 2.16,
    unitPriceMinor: 1250,
    totalMinor: 2700,
    sourceReference: "workshop-materials:workshop-cutout-v1:worktop-38-a"
  });
  assert.equal(priced.snapshot.materialCostBasis.panelMaterialCostMinor, 2700);
  assert.equal(priced.snapshot.quoteSummary.costSummary.grandTotalMinor, 2700);
  assert.equal(report.canExport, false);
});

test("DOM-202 bozuk, çakışan veya Part ile uyuşmayan açıklık geometrisi teklif ve revizyonu kısmi toplam olmadan engeller", () => {
  const opening = {
    id: "sink-opening",
    xMm: 100,
    yMm: 100,
    widthMm: 400,
    lengthMm: 300,
    edgeBanding: { ...noBanding }
  };
  const validGeometry = (overrides = {}) => ({
    schemaVersion: 1,
    widthMm: 2000,
    lengthMm: 600,
    thicknessMm: 38,
    outerEdgeBanding: { ...noBanding },
    cutouts: [{ ...opening }],
    ...overrides
  });
  const panelRequest = (partId, geometry) => [{ partId, geometry }];
  const cases = [
    {
      id: "outside",
      label: "panel dışına taşan açıklık",
      panelCutouts: panelRequest("custom-worktop-panel", validGeometry({
        cutouts: [{ ...opening, xMm: 1700 }]
      })),
      diagnostic: /dış sınıra temas etmeden tamamen panel içinde olmalıdır/
    },
    {
      id: "overlap",
      label: "birbiriyle çakışan açıklıklar",
      panelCutouts: panelRequest("custom-worktop-panel", validGeometry({
        cutouts: [
          { ...opening },
          { ...opening, id: "second-opening", xMm: 450, yMm: 150, widthMm: 300, lengthMm: 200 }
        ]
      })),
      diagnostic: /çakışamaz veya birbirine temas edemez/
    },
    {
      id: "dimension-mismatch",
      label: "Part ölçüleriyle uyuşmayan panel geometrisi",
      panelCutouts: panelRequest("custom-worktop-panel", validGeometry({ widthMm: 1999 })),
      diagnostic: /ölçüleri üretim parçasıyla eşleşmelidir/
    },
    {
      id: "missing-part",
      label: "üretim listesinde bulunmayan Part kimliği",
      panelCutouts: panelRequest("missing-panel", validGeometry()),
      diagnostic: /proje üretim listesinde bulunamadı/
    }
  ];

  for (const scenario of cases) {
    const report = createPanelReport({ panelCutouts: scenario.panelCutouts });
    assert.equal(report.status, "blocked", scenario.label);
    assert.equal(report.result, null, scenario.label);
    assert.equal(report.canExport, false, scenario.label);
    assert.ok(report.blockedFurniture.some(item => item.code === "invalid-panel-geometry"), scenario.label);
    assert.match(report.firstError ?? "", scenario.diagnostic, scenario.label);

    const priced = createPricingSnapshot(report, "workshop-invalid-cutout-v1", "worktop-38-a", 1250);
    assert.equal(priced.status, "blocked", scenario.label);
    assert.equal(priced.snapshot, null, scenario.label);
    assert.equal(priced.quoteSummary?.status, "blocked", scenario.label);
    assert.equal(priced.quoteSummary?.currencyCode, null, scenario.label);
    assert.deepEqual(priced.quoteSummary?.lineSources, [], scenario.label);
    assert.equal(priced.quoteSummary?.costSummary, null, scenario.label);

    const append = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
      revisionId: "invalid-cutout-" + scenario.id,
      createdAt: "2026-11-27T03:50:00+03:00",
      pricingSnapshot: priced.snapshot
    });
    assert.equal(append.status, "blocked", scenario.label);
    assert.equal(append.project, null, scenario.label);
    assert.equal(append.history, null, scenario.label);
  }
});
