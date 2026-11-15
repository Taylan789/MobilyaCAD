import test from "node:test";
import assert from "node:assert/strict";

import { calculateMaterialConsumptionSummary } from "../src/engine/materialConsumption.ts";
import {
  calculateProjectProduction
} from "../src/engine/projectProduction.ts";
import { createProjectCutListCsv } from "../src/engine/cutListCsv.ts";

const catalog = [
  {
    id: "base-cabinet",
    name: "Alt Mutfak Dolabı",
    type: "kitchen",
    width: 600,
    height: 850,
    depth: 560,
    color: "#d9d2c5",
    category: "Mutfak",
    doorCount: 2,
    shelfCount: 1
  },
  {
    id: "wall-cabinet",
    name: "Üst Mutfak Dolabı",
    type: "kitchen",
    width: 800,
    height: 720,
    depth: 350,
    color: "#e5e1d8",
    category: "Mutfak",
    doorCount: 2,
    shelfCount: 1
  },
  {
    id: "parametric-1-1",
    name: "Çekmeceli Alt Dolap - Kompakt",
    type: "kitchen",
    width: 600,
    height: 850,
    depth: 560,
    color: "#c9bda9",
    category: "Mutfak",
    doorCount: 0,
    drawerCount: 2,
    shelfCount: 0
  },
  {
    id: "corner-cabinet",
    name: "Köşe Dolabı",
    type: "kitchen",
    width: 900,
    height: 850,
    depth: 900,
    color: "#c9c1b3",
    category: "Mutfak"
  },
  {
    id: "parametric-3-1",
    name: "Fırın Dolabı - Kompakt",
    type: "kitchen",
    width: 600,
    height: 2100,
    depth: 600,
    color: "#b8aa98",
    category: "Mutfak"
  },
  {
    id: "wardrobe",
    name: "Gardırop",
    type: "wardrobe",
    width: 1200,
    height: 2200,
    depth: 600,
    color: "#a77b55",
    category: "Dolap"
  }
];

const rules = {
  panelThickness: 18,
  backThickness: 8,
  backInstallation: "overlay",
  backInset: 0,
  backGrooveDepth: 8,
  carcassStyle: "between-sides",
  shelfCount: 1,
  shelfStyle: "adjustable",
  edgeBandThickness: 0.8,
  doorStyle: "full-overlay",
  doorGap: 2,
  doorCount: 2
};

const noBanding = () => ({
  top: false,
  bottom: false,
  left: false,
  right: false
});

const drawerConfig = {
  id: "drawer-group-1",
  spec: {
    outerWidth: 500,
    sideHeight: 140,
    outerDepth: 450,
    sideThickness: 15,
    frontBackThickness: 15,
    bottomThickness: 6,
    visibleFrontWidth: 540,
    visibleFrontHeight: 180,
    visibleFrontThickness: 18,
    quantity: 2,
    material: "MDF",
    bottomFit: "between-sides-and-front-back",
    edgeBanding: {
      sidePanels: { ...noBanding(), top: true },
      frontBackPanels: { ...noBanding(), left: true },
      bottomPanel: noBanding(),
      visibleFrontPanel: { top: true, bottom: true, left: true, right: true }
    },
    grainDirection: {
      sidePanels: "length",
      frontBackPanels: "width",
      bottomPanel: "none",
      visibleFrontPanel: "width"
    }
  }
};

function createPlacedFurniture(catalogId, id, overrides = {}) {
  const item = catalog.find((entry) => entry.id === catalogId);
  assert.ok(item, "Test katalog kaydı bulunmalı");

  return {
    id,
    catalogId,
    name: item.name,
    width: item.width,
    height: item.height,
    depth: item.depth,
    position: [0, 0, 0],
    rotation: 0,
    color: item.color,
    doorCount: item.doorCount ?? 2,
    drawerCount: item.drawerCount ?? 0,
    shelfCount: item.shelfCount ?? 2,
    hasBackPanel: true,
    backThickness: 8,
    edgeBanding: true,
    material: "MDF",
    parts: [],
    ...overrides
  };
}

test("projedeki desteklenen modüller mobilya kimlikleri korunarak tek üretim listesinde birleşir", () => {
  const furniture = [
    createPlacedFurniture("base-cabinet", "base-1", { material: "MDF" }),
    createPlacedFurniture("base-cabinet", "base-2", { material: "MDF" }),
    createPlacedFurniture("wall-cabinet", "wall-1", { material: "Suntalam" }),
    createPlacedFurniture("parametric-1-1", "drawer-1", {
      drawerBoxSpecs: [drawerConfig]
    })
  ];

  const result = calculateProjectProduction(furniture, catalog, rules);

  assert.equal(result.supportedFurnitureCount, 4);
  assert.equal(result.unsupportedFurniture.length, 0);
  assert.equal(result.blockedFurniture.length, 0);
  assert.equal(result.errors.length, 0);
  assert.equal(result.exportBlockReason, null);
  assert.ok(result.parts.some((part) => part.furnitureId === "base-1"));
  assert.ok(result.parts.some((part) => part.furnitureId === "base-2"));
  assert.ok(result.parts.some((part) => part.furnitureId === "wall-1"));
  assert.ok(result.parts.some((part) => part.furnitureId === "drawer-1"));
  assert.equal(new Set(result.parts.map((part) => part.id)).size, result.parts.length);

  const drawerSide = result.parts.find(
    (part) => part.furnitureId === "drawer-1" && part.name === "Çekmece Yan Paneli"
  );
  assert.equal(drawerSide.quantity, 4);

  const summaries = calculateMaterialConsumptionSummary(result.parts);
  assert.deepEqual(
    [...new Set(summaries.map((summary) => summary.material))],
    ["MDF", "Suntalam"]
  );
  assert.ok(summaries.some((summary) => summary.material === "MDF" && summary.thickness === 18));
  assert.ok(summaries.some((summary) => summary.material === "Suntalam" && summary.thickness === 18));
  assert.ok(summaries.length > 2, "Farklı panel kalınlıkları ayrı gruplarda kalmalı.");

  const csv = createProjectCutListCsv(result.furnitureNames, result.parts);
  assert.ok(csv.includes("Mobilya;Mobilya ID;Parça;"));
  assert.ok(csv.includes("Alt Mutfak Dolabı;base-1;Sol Yan Panel;"));
  assert.ok(csv.includes("Alt Mutfak Dolabı;base-2;Sol Yan Panel;"));
  assert.ok(csv.includes("Üst Mutfak Dolabı;wall-1;Sol Yan Panel;"));
  assert.ok(csv.includes("Çekmeceli Alt Dolap - Kompakt;drawer-1;Çekmece Yan Paneli;"));
});

test("özel köşe, cihaz ve diğer mobilya aileleri tahmin edilmeden kapsam dışı bırakılır", () => {
  const result = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "base-1"),
    createPlacedFurniture("corner-cabinet", "corner-1"),
    createPlacedFurniture("parametric-3-1", "oven-1"),
    createPlacedFurniture("wardrobe", "wardrobe-1")
  ], catalog, rules);

  assert.equal(result.supportedFurnitureCount, 1);
  assert.equal(result.unsupportedFurniture.length, 3);
  assert.equal(result.exportBlockReason, null);
  assert.ok(result.unsupportedFurniture.some((item) => item.furnitureId === "corner-1"));
  assert.ok(result.unsupportedFurniture.some((item) => item.furnitureId === "oven-1"));
  assert.ok(result.unsupportedFurniture.some((item) => item.furnitureId === "wardrobe-1"));
  assert.ok(result.parts.every((part) => part.furnitureId === "base-1"));
});

test("çekmeceli modülde eksik kutu ölçüleri proje CSV dışa aktarımını engeller", () => {
  const result = calculateProjectProduction([
    createPlacedFurniture("parametric-1-1", "drawer-1")
  ], catalog, rules);

  assert.equal(result.parts.length > 0, true);
  assert.equal(result.blockedFurniture.length, 1);
  assert.match(result.exportBlockReason, /çekmece/i);
});

test("geçersiz geometri ve yinelenen mobilya kimliği güvenli dışa aktarımı engeller", () => {
  const invalidGeometry = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "invalid-1", { width: 20 })
  ], catalog, rules);
  assert.equal(invalidGeometry.errors.length, 1);
  assert.match(invalidGeometry.exportBlockReason, /iç ölçü/i);

  const duplicateIds = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "same-id"),
    createPlacedFurniture("wall-cabinet", "same-id")
  ], catalog, rules);
  assert.ok(duplicateIds.errors.some((issue) => /yinelenen mobilya kimliği/i.test(issue.reason)));
  assert.notEqual(duplicateIds.exportBlockReason, null);
});

test("CSV proje mobilya adı eşlemesi eksikse satır üretmez", () => {
  const result = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "base-1")
  ], catalog, rules);

  assert.throws(
    () => createProjectCutListCsv(new Map(), result.parts),
    /mobilya adı eşleşmesi/
  );
});
