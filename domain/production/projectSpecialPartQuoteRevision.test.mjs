import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
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

function price(resourceType, resourceId, unit, unitPriceMinor, sourceReference, thicknessMm) {
  return {
    resourceType,
    resourceId,
    unit,
    unitPriceMinor,
    currencyCode: "TRY",
    sourceReference,
    ...(thicknessMm === undefined ? {} : { thicknessMm })
  };
}

function createPriceTable(version, price18, price8) {
  return [
    price("material", "mdf-18", "m2", price18, "atolye-malzeme:" + version + ":mdf-18", 18),
    price("material", "mdf-8", "m2", price8, "atolye-malzeme:" + version + ":mdf-8", 8),
    price("edge-banding", "pvc-white-1", "m", 18, "atolye-kenar-bandi:" + version)
  ];
}

function createPricingSnapshot(productionReport, version, price18, price8) {
  return createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-19",
    productionReport,
    consumptionPriceTable: createPriceTable(version, price18, price8),
    workItems: [],
    tariffTable: [],
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
    projectId: "project-special-quote-1",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: []
  };
}

function findMaterialLine(snapshot, materialId) {
  const line = snapshot.quoteSummary.costSummary.lines.find((candidate) =>
    candidate.category === "material" && candidate.description.includes(materialId)
  );
  assert.ok(line, materialId + " teklif maliyet satırı bulunmalıdır.");
  return line;
}

function assertMaterialProvenance(snapshot, version, price18, price8) {
  const line18 = findMaterialLine(snapshot, "mdf-18");
  const line8 = findMaterialLine(snapshot, "mdf-8");
  assert.match(line18.description, /18 mm/);
  assert.match(line8.description, /8 mm/);
  assert.equal(line18.unitPriceMinor, price18);
  assert.equal(line8.unitPriceMinor, price8);
  assert.equal(line18.sourceReference, "atolye-malzeme:" + version + ":mdf-18");
  assert.equal(line8.sourceReference, "atolye-malzeme:" + version + ":mdf-8");

  for (const line of [line18, line8]) {
    const source = snapshot.quoteSummary.lineSources.find((candidate) =>
      candidate.costLineId === line.id
    );
    assert.ok(source, line.id + " quote lineSources kaydı bulunmalıdır.");
    assert.equal(source.sourceType, "production-consumption");
    assert.ok(source.sourceId);
    assert.equal(source.tariffId, undefined);
  }
}

test("özel gardırop/TV Part fiyat snapshot ve iki revizyon JSON round-trip kaynak izini korur", () => {
  const productionReport = createProductionReport();
  assert.equal(productionReport.status, "ready", productionReport.firstError ?? "Proje üretimi hazır olmalı.");
  assert.ok(productionReport.result);
  const partsById = new Map(productionReport.result.parts.map((part) => [part.id, part]));
  for (const partId of specialPartIds) {
    const part = partsById.get(partId);
    assert.ok(part, partId + " gerçek proje Part listesinde bulunmalıdır.");
    assert.ok(part.materialId);
    assert.ok(part.thickness > 0);
  }
  assert.equal(partsById.get("wardrobe-1-shelf-lower").materialId, "mdf-18");
  assert.equal(partsById.get("tv-1-shelf-middle").materialId, "mdf-8");
  assert.equal(partsById.get("tv-1-shelf-middle").thickness, 8);

  const firstResult = createPricingSnapshot(productionReport, "2026-11-r1", 1250, 900);
  const secondResult = createPricingSnapshot(productionReport, "2026-11-r2", 1325, 975);
  assert.equal(firstResult.status, "ready", firstResult.diagnostics.join(" "));
  assert.equal(secondResult.status, "ready", secondResult.diagnostics.join(" "));
  assert.ok(firstResult.snapshot);
  assert.ok(secondResult.snapshot);
  assertMaterialProvenance(firstResult.snapshot, "2026-11-r1", 1250, 900);
  assertMaterialProvenance(secondResult.snapshot, "2026-11-r2", 1325, 975);

  const firstAppend = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
    revisionId: "quote-r1",
    createdAt: "2026-11-19T01:00:00+03:00",
    pricingSnapshot: firstResult.snapshot
  });
  assert.equal(firstAppend.status, "ready", firstAppend.diagnostics.join(" "));
  assert.ok(firstAppend.project);

  const secondAppend = appendProjectQuoteRevisionToProjectFile(firstAppend.project, {
    revisionId: "quote-r2",
    createdAt: "2026-11-19T02:00:00+03:00",
    pricingSnapshot: secondResult.snapshot
  });
  assert.equal(secondAppend.status, "ready", secondAppend.diagnostics.join(" "));
  assert.ok(secondAppend.project);

  const projectRead = readProjectQuoteRevisionHistoryFromProjectFile(secondAppend.project);
  assert.equal(projectRead.status, "ready", projectRead.diagnostics.join(" "));
  assert.ok(projectRead.history);
  assert.equal(projectRead.history.revisions.length, 2);

  const file = serializeProjectQuoteRevisionHistoryFile(projectRead.history);
  assert.equal(file.status, "ready", file.diagnostics.join(" "));
  assert.ok(file.json);
  const parsed = parseProjectQuoteRevisionHistoryFile(file.json);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join(" "));
  assert.ok(parsed.history);
  assert.equal(parsed.history.revisions.length, 2);

  const firstSnapshot = parsed.history.revisions[0].pricingSnapshot;
  const secondSnapshot = parsed.history.revisions[1].pricingSnapshot;
  assert.equal(parsed.history.revisions[0].previousRevisionId, null);
  assert.equal(parsed.history.revisions[1].previousRevisionId, "quote-r1");
  assert.equal(firstSnapshot.consumptionPriceList?.version, "2026-11-r1");
  assert.equal(secondSnapshot.consumptionPriceList?.version, "2026-11-r2");
  assert.deepEqual(firstSnapshot.quoteSummary.lineSources, firstResult.snapshot.quoteSummary.lineSources);
  assert.deepEqual(secondSnapshot.quoteSummary.lineSources, secondResult.snapshot.quoteSummary.lineSources);
  assertMaterialProvenance(firstSnapshot, "2026-11-r1", 1250, 900);
  assertMaterialProvenance(secondSnapshot, "2026-11-r2", 1325, 975);
});

test("özel 8 mm Part fiyatı eksikse snapshot ve revizyon engellenir; kısmi toplam oluşmaz", () => {
  const productionReport = createProductionReport();
  assert.equal(productionReport.status, "ready", productionReport.firstError ?? "Proje üretimi hazır olmalı.");
  const prices = createPriceTable("2026-11-r1", 1250, 900).filter((entry) =>
    !(entry.resourceType === "material" && entry.resourceId === "mdf-8")
  );
  const incomplete = createProjectQuotePricingSnapshot({
    quotedOn: "2026-11-19",
    productionReport,
    consumptionPriceTable: prices,
    workItems: [],
    tariffTable: [],
    consumptionPriceList: {
      catalogId: "workshop-materials",
      version: "2026-11-r1",
      effectiveFrom: "2026-11-01",
      effectiveTo: "2026-11-30"
    },
    laborOperationTariffList: null
  });

  assert.equal(incomplete.status, "incomplete");
  assert.equal(incomplete.snapshot, null);
  assert.equal(incomplete.quoteSummary?.costSummary, null);
  assert.ok(incomplete.quoteSummary?.missingPrices.some((issue) =>
    issue.resourceId === "mdf-8" && issue.thicknessMm === 8
  ));

  const append = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
    revisionId: "quote-incomplete",
    createdAt: "2026-11-19T03:00:00+03:00",
    pricingSnapshot: incomplete.snapshot
  });
  assert.equal(append.status, "blocked");
  assert.equal(append.project, null);
  assert.equal(append.history, null);
});

test("bozuk quote lineSources eşlemesi revizyon append ve JSON serialization işlemlerini bloklar", () => {
  const productionReport = createProductionReport();
  const ready = createPricingSnapshot(productionReport, "2026-11-r1", 1250, 900);
  assert.equal(ready.status, "ready", ready.diagnostics.join(" "));
  assert.ok(ready.snapshot);

  const corruptedSnapshot = structuredClone(ready.snapshot);
  corruptedSnapshot.quoteSummary.lineSources[0].costLineId = "missing-cost-line";
  const append = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
    revisionId: "quote-corrupt",
    createdAt: "2026-11-19T04:00:00+03:00",
    pricingSnapshot: corruptedSnapshot
  });
  assert.equal(append.status, "blocked");
  assert.equal(append.project, null);
  assert.match(append.diagnostics[0], /maliyet satırı kimliğiyle uyuşmuyor/);

  const validAppend = appendProjectQuoteRevisionToProjectFile(createV2Project(), {
    revisionId: "quote-valid",
    createdAt: "2026-11-19T04:00:00+03:00",
    pricingSnapshot: ready.snapshot
  });
  assert.equal(validAppend.status, "ready");
  assert.ok(validAppend.history);
  const corruptedHistory = structuredClone(validAppend.history);
  corruptedHistory.revisions[0].pricingSnapshot.quoteSummary.lineSources[0].costLineId = "missing-cost-line";
  const serialized = serializeProjectQuoteRevisionHistoryFile(corruptedHistory);
  assert.equal(serialized.status, "blocked");
  assert.equal(serialized.json, null);
});
