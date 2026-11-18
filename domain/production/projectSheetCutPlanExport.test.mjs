import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { createFreshProjectSheetCutPlanExport } from "./projectSheetCutPlanExport.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

function part(id, overrides = {}) {
  return {
    id,
    furnitureId: "furniture-1",
    name: id,
    width: 500,
    length: 700,
    thickness: 18,
    quantity: 2,
    material: "MDF",
    materialId: "mdf-18",
    grainDirection: "length",
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    ...overrides
  };
}

function productionReport(parts, overrides = {}) {
  return {
    schemaVersion: 1,
    status: "ready",
    canExport: true,
    isEmpty: false,
    supportedFurniture: [{ furnitureId: "furniture-1", family: "cabinet" }],
    unsupportedFurniture: [],
    blockedFurniture: [],
    projectErrors: [],
    exportBlockers: [],
    firstError: null,
    result: { schemaVersion: 1, furniture: [], parts },
    ...overrides
  };
}

function savedPlan(parts, selectedPartIds) {
  const currentReport = productionReport(parts);
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: currentReport,
    partIds: selectedPartIds,
    stockSheets: [{
      sheet: {
        materialId: "mdf-18",
        widthMm: 1200,
        lengthMm: 1000,
        thicknessMm: 18,
        grainDirection: "length"
      },
      kerfMm: 3
    }]
  });
  assert.equal(batches.status, "ready", batches.diagnostics.join(" "));
  assert.ok(batches.result);
  const layouts = batches.result.batches.map((group) => ({
    groupId: JSON.stringify([group.materialId, Math.round(group.thicknessMm * 10)]),
    layoutReport: calculateSheetNestingLayout(group.batch)
  }));
  const plan = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport: batches,
    layoutReports: layouts
  });
  assert.equal(plan.status, "ready", plan.diagnostics.join(" "));
  assert.ok(plan.json);
  return plan.json;
}

function request(json, parts, selectedPartIds, reportOverrides = {}) {
  return {
    schemaVersion: 1,
    freshness: {
      schemaVersion: 1,
      savedPlanJson: json,
      productionReport: productionReport(parts, reportOverrides),
      currentSelectedPartIds: selectedPartIds
    }
  };
}

function assertBlocked(result, freshnessStatus, pattern) {
  assert.equal(result.status, "blocked");
  assert.equal(result.freshnessStatus, freshnessStatus);
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.length > 0);
  if (pattern) assert.match(result.diagnostics.join(" "), pattern);
}

test("fresh JSON v2 ve canExport raporu tam eşleştiğinde tek export kapısı JSON'u korur", () => {
  const parts = [part("part-1")];
  const json = savedPlan(parts, ["part-1"]);
  const result = createFreshProjectSheetCutPlanExport(request(json, parts, ["part-1"]));

  assert.equal(result.status, "ready");
  assert.equal(result.freshnessStatus, "fresh");
  assert.equal(result.json, json);
  assert.deepEqual(result.sourcePartIds, ["part-1"]);
  assert.equal(result.result.projectPartSnapshot?.parts.length, 1);
  assert.deepEqual(result.diagnostics, []);
});

test("fresh JSON v3 kullanıcı girdili levha kaynağı provenance bilgisini export boyunca korur", () => {
  const parts = [part("part-1")];
  const envelope = JSON.parse(savedPlan(parts, ["part-1"]));
  const stockSheetSource = {
    sourceId: "atelier-stock-sheet-18",
    revision: "revision-2026-11-18-b"
  };
  envelope.formatVersion = 3;
  envelope.result.groups[0].stockSheetSource = stockSheetSource;
  const json = JSON.stringify(envelope);
  const result = createFreshProjectSheetCutPlanExport(request(json, parts, ["part-1"]));
  assert.equal(result.status, "ready");
  assert.equal(result.freshnessStatus, "fresh");
  assert.equal(result.json, json);
  assert.deepEqual(result.result.groups[0]?.stockSheetSource, stockSheetSource);
});

test("seçilmemiş Part alanı değiştiğinde export stale olur ve JSON üretmez", () => {
  const original = [
    part("part-1"),
    part("excluded-part", { materialId: "plywood-8", material: "Kontrplak", thickness: 8, grainDirection: "width" })
  ];
  const json = savedPlan(original, ["part-1"]);
  const changed = [
    original[0],
    { ...original[1], name: "Güncellenmiş hariç parça" }
  ];
  const result = createFreshProjectSheetCutPlanExport(request(json, changed, ["part-1"]));

  assertBlocked(result, "stale", /snapshot.*değişmiş/);
});

test("güncel seçim kapsamı değiştiğinde export stale olur", () => {
  const parts = [part("part-1")];
  const json = savedPlan(parts, ["part-1"]);
  const result = createFreshProjectSheetCutPlanExport(
    request(json, parts, ["part-1", "new-selection"])
  );

  assertBlocked(result, "stale", /seçim kapsamı/);
});

test("canExport false veya export blocker varsa fresh plan JSON'u dışa aktarılmaz", () => {
  const parts = [part("part-1")];
  const json = savedPlan(parts, ["part-1"]);
  const blockedByAdapter = createFreshProjectSheetCutPlanExport(request(
    json,
    parts,
    ["part-1"],
    {
      canExport: false,
      exportBlockers: ["Kesitli panel geometrisi dışa aktarım adapter'ında desteklenmiyor."]
    }
  ));
  assertBlocked(blockedByAdapter, "blocked", /Kesitli panel geometrisi/);

  const blockedByFlag = createFreshProjectSheetCutPlanExport(request(
    json,
    parts,
    ["part-1"],
    { canExport: false }
  ));
  assertBlocked(blockedByFlag, "blocked", /canExport=true/);
});

test("v1 dosyası okunabilir kalsa da v2 freshness export kapısından geçemez", () => {
  const parts = [part("part-1")];
  const v2 = JSON.parse(savedPlan(parts, ["part-1"]));
  delete v2.result.projectPartSnapshot;
  v2.formatVersion = 1;
  const v1Json = JSON.stringify(v2);
  const result = createFreshProjectSheetCutPlanExport(request(v1Json, parts, ["part-1"]));

  assertBlocked(result, "blocked", /formatVersion 2/);
});

test("freshness girdisi veya v2 için güncel seçim listesi eksikse export blocked olur", () => {
  const parts = [part("part-1")];
  const json = savedPlan(parts, ["part-1"]);
  const missingFreshness = createFreshProjectSheetCutPlanExport({ schemaVersion: 1 });
  assertBlocked(missingFreshness, "blocked", /güncellik doğrulaması girdisi zorunludur/);

  const freshness = request(json, parts, ["part-1"]).freshness;
  delete freshness.currentSelectedPartIds;
  const missingSelection = createFreshProjectSheetCutPlanExport({
    schemaVersion: 1,
    freshness
  });
  assertBlocked(missingSelection, "blocked", /currentSelectedPartIds/);
});


function cabinetRequest(id) {
  const noBanding = { top: false, bottom: false, left: false, right: false };
  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "MDF"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: Object.fromEntries(
        BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
      )
    },
    materials: [{
      id: "mdf-18",
      name: "MDF",
      category: "panel",
      thicknessesMm: [18],
      unit: "mm"
    }]
  };
}

function projectReportWithCutout({ invalid = false } = {}) {
  const furniture = cabinetRequest("cutout-cabinet");
  const base = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [furniture]
  });
  assert.equal(base.status, "ready", base.firstError ?? "");
  assert.ok(base.result);
  const top = base.result.parts.find((item) => item.id === "cutout-cabinet-top");
  assert.ok(top);

  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [furniture],
    panelCutouts: [{
      partId: top.id,
      geometry: {
        schemaVersion: 1,
        widthMm: top.width,
        lengthMm: top.length,
        thicknessMm: top.thickness,
        outerEdgeBanding: top.edgeBanding,
        cutouts: [{
          id: "opening-1",
          xMm: invalid ? 0 : 10,
          yMm: 10,
          widthMm: 50,
          lengthMm: 50,
          edgeBanding: { top: false, bottom: false, left: false, right: false }
        }]
      }
    }]
  });
}

test("unsupported family diagnostics reach the export gate with source context and no partial JSON", () => {
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [{
      schemaVersion: 1,
      furniture: { id: "custom-furniture" },
      family: "custom-family"
    }]
  });
  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);

  const parts = [part("part-1")];
  const json = savedPlan(parts, ["part-1"]);
  const result = createFreshProjectSheetCutPlanExport(
    request(json, parts, ["part-1"], report)
  );

  assertBlocked(result, "blocked", /custom-furniture.*custom-family.*unsupported-family/);
  assert.deepEqual(result.productionDiagnostics, [{
    source: "unsupportedFurniture",
    furnitureId: "custom-furniture",
    family: "custom-family",
    code: "unsupported-family",
    message: report.unsupportedFurniture[0].message
  }]);
});

test("invalid panel cutout diagnostics reach the export gate without a partial JSON", () => {
  const report = projectReportWithCutout({ invalid: true });
  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
  assert.equal(report.blockedFurniture[0]?.code, "invalid-panel-geometry");

  const parts = [part("part-1")];
  const json = savedPlan(parts, ["part-1"]);
  const result = createFreshProjectSheetCutPlanExport(
    request(json, parts, ["part-1"], report)
  );

  assertBlocked(result, "blocked", /cutout-cabinet.*cabinet.*invalid-panel-geometry/);
  assert.deepEqual(result.productionDiagnostics, [{
    source: "blockedFurniture",
    furnitureId: "cutout-cabinet",
    family: "cabinet",
    code: "invalid-panel-geometry",
    message: report.blockedFurniture[0].message
  }]);
});

test("valid cutout geometry remains an explicit export blocker with its original message", () => {
  const report = projectReportWithCutout();
  assert.equal(report.status, "ready");
  assert.equal(report.canExport, false);
  assert.equal(report.exportBlockers.length, 1);

  const parts = [part("part-1")];
  const json = savedPlan(parts, ["part-1"]);
  const result = createFreshProjectSheetCutPlanExport(
    request(json, parts, ["part-1"], report)
  );

  assertBlocked(result, "blocked", /Kesitli panel geometrisi/);
  assert.deepEqual(result.productionDiagnostics, [{
    source: "exportBlockers",
    furnitureId: null,
    family: null,
    code: null,
    message: report.exportBlockers[0]
  }]);
});
