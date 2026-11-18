import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { BOOKSHELF_PANEL_GROUPS } from "./bookshelfConstruction.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { compareProjectPartSnapshots, createProjectPartSnapshot, validateProjectPartSnapshot } from "./projectPartSnapshot.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];
const noBanding = { top: false, bottom: false, left: false, right: false };

function createCarcassRequest(id, options = {}) {
  const {
    family = "cabinet",
    shelfCount = 2,
    panelMaterialOverrides = { top: "mdf-8", shelf: "mdf-8" },
    panelThicknessMmByGroup = { top: 8, shelf: 8 },
    materialId = "mdf-18",
    material = materialId === null ? "Legacy MDF" : "MDF Lam 18"
  } = options;
  const groups = family === "bookshelf" ? BOOKSHELF_PANEL_GROUPS : BODY_PANEL_GROUPS;
  const request = {
    schemaVersion: 1,
    family,
    furniture: {
      id, widthMm: 800, heightMm: 720, depthMm: 560, material,
      ...(materialId === null ? {} : { materialId })
    },
    profile: {
      panelThicknessMm: 18,
      ...(panelThicknessMmByGroup === undefined ? {} : { panelThicknessMmByGroup }),
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount,
      ...(family === "bookshelf" ? {} : { doors: { enabled: false, count: 0 } }),
      edgeBandingByGroup: Object.fromEntries(groups.map(group => [group, { ...noBanding }]))
    },
    materials,
    ...(panelMaterialOverrides === undefined ? {} : { panelMaterialOverrides })
  };
  if (family === "wardrobe") request.verticalDividers = [];
  if (family === "tv-unit") request.mounting = "floor-standing";
  return request;
}

test("gövde panel malzeme/kalınlık override'ları beş dolap ailesinde Part, snapshot ve tüketimde korunur", () => {
  const cabinet = createCarcassRequest("cabinet-override");
  const bookshelf = createCarcassRequest("bookshelf-override", { family: "bookshelf", shelfCount: 3 });
  const wardrobe = createCarcassRequest("wardrobe-override", { family: "wardrobe" });
  const tvUnit = createCarcassRequest("tv-override", { family: "tv-unit" });
  const bathroomVanity = createCarcassRequest("vanity-override", {
    family: "bathroom-vanity", shelfCount: 0,
    panelMaterialOverrides: { top: "mdf-8" }, panelThicknessMmByGroup: { top: 8 }
  });
  const legacyCabinet = createCarcassRequest("legacy-no-material-id", {
    panelMaterialOverrides: undefined, panelThicknessMmByGroup: undefined,
    shelfCount: 0, materialId: null
  });

  const templateReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createCarcassRequest("vanity-geometry-template", {
      shelfCount: 0, panelMaterialOverrides: { top: "mdf-8" }, panelThicknessMmByGroup: { top: 8 }
    })]
  });
  assert.equal(templateReport.status, "ready");
  const templateTop = templateReport.result.parts.find(part => part.id === "vanity-geometry-template-top");
  assert.ok(templateTop);

  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [cabinet, bookshelf, wardrobe, tvUnit, bathroomVanity, legacyCabinet],
    panelCutouts: [{
      partId: "vanity-override-top",
      geometry: {
        schemaVersion: 1, widthMm: templateTop.width, lengthMm: templateTop.length,
        thicknessMm: templateTop.thickness, outerEdgeBanding: templateTop.edgeBanding,
        cutouts: [{
          id: "basin-opening", xMm: 100, yMm: 100, widthMm: 200, lengthMm: 150,
          edgeBanding: { ...noBanding }
        }]
      }
    }]
  });

  assert.equal(report.status, "ready");
  assert.ok(report.result);
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some(message => message.includes("panelGeometry")));

  const expectedFamilies = [
    { id: "cabinet-override", family: "cabinet", shelfQuantity: 2 },
    { id: "bookshelf-override", family: "bookshelf", shelfQuantity: 3 },
    { id: "wardrobe-override", family: "wardrobe", shelfQuantity: 2 },
    { id: "tv-override", family: "tv-unit", shelfQuantity: 2 },
    { id: "vanity-override", family: "bathroom-vanity", shelfQuantity: 0 }
  ];
  assert.deepEqual(
    report.supportedFurniture.slice(0, expectedFamilies.length),
    expectedFamilies.map(({ id, family }) => ({ furnitureId: id, family }))
  );

  for (const item of expectedFamilies) {
    const top = report.result.parts.find(part => part.id === item.id + "-top");
    assert.ok(top, item.id + " üst paneli bulunmalı");
    assert.deepEqual([top.materialId, top.material, top.thickness, top.quantity], ["mdf-8", "MDF Lam 8", 8, 1]);
    const side = report.result.parts.find(part => part.id === item.id + "-left-side");
    assert.ok(side, item.id + " yan paneli bulunmalı");
    assert.deepEqual([side.materialId, side.material, side.thickness], ["mdf-18", "MDF Lam 18", 18]);
    if (item.shelfQuantity > 0) {
      const shelf = report.result.parts.find(part => part.id === item.id + "-shelf");
      assert.ok(shelf, item.id + " rafı bulunmalı");
      assert.deepEqual([shelf.materialId, shelf.material, shelf.thickness, shelf.quantity],
        ["mdf-8", "MDF Lam 8", 8, item.shelfQuantity]);
    }
  }

  const legacyTop = report.result.parts.find(part => part.id === "legacy-no-material-id-top");
  assert.ok(legacyTop);
  assert.equal(legacyTop.material, "Legacy MDF");
  assert.equal("materialId" in legacyTop, false);

  const summary = calculateProjectMaterialConsumptionSummary(report.result);
  const overriddenMaterial = summary.find(item => item.materialId === "mdf-8" && item.thicknessMm === 8);
  assert.ok(overriddenMaterial);
  assert.equal(overriddenMaterial.totalQuantity, 14);
  assert.equal(overriddenMaterial.partLineCount, 9);

  const snapshot = createProjectPartSnapshot(report.result.parts);
  const restoredSnapshot = validateProjectPartSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(compareProjectPartSnapshots(snapshot, restoredSnapshot), { changed: false, diagnostics: [] });
  const snapshotById = new Map(restoredSnapshot.parts.map(entry => [entry.id, JSON.parse(entry.snapshot)]));
  for (const item of expectedFamilies) {
    const top = snapshotById.get(item.id + "-top");
    assert.deepEqual([top.materialId, top.thickness, top.quantity], ["mdf-8", 8, 1]);
    if (item.shelfQuantity > 0) {
      const shelf = snapshotById.get(item.id + "-shelf");
      assert.deepEqual([shelf.materialId, shelf.thickness, shelf.quantity], ["mdf-8", 8, item.shelfQuantity]);
    }
  }
});

test("katalogla uyuşmayan tek aile override'ı tüm proje sonucunu bloklar", () => {
  const invalid = createCarcassRequest("cabinet-invalid-material-thickness", {
    shelfCount: 0, panelMaterialOverrides: { top: "mdf-18" }, panelThicknessMmByGroup: { top: 8 }
  });
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1, furniture: [createCarcassRequest("cabinet-valid"), invalid]
  });
  assert.equal(report.status, "blocked");
  assert.equal(report.canExport, false);
  assert.equal(report.result, null);
  assert.equal(report.blockedFurniture[0].furnitureId, "cabinet-invalid-material-thickness");
  assert.match(report.blockedFurniture[0].message, /8 mm kalınlık katalogda tanımlı değil/);
});
