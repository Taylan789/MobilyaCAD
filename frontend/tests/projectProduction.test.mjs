import test from "node:test";
import assert from "node:assert/strict";

import { calculateMaterialConsumptionSummary } from "../src/engine/materialConsumption.ts";
import {
  calculateProjectProduction,
  mapDomainProductionReport
} from "../src/engine/projectProduction.ts";
import {
  calculateCabinetProjectProductionWithDiagnostics
} from "../../domain/production/projectProduction.ts";
import { createProjectCutListCsv } from "../src/engine/cutListCsv.ts";
import { parseProjectFile, serializeProjectFile } from "../src/engine/projectFile.ts";

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
  assert.equal(result.canExport, false);
  assert.notEqual(result.exportBlockReason, null);
  assert.equal(result.parts.length, 0);
  assert.ok(result.unsupportedFurniture.some((item) => item.furnitureId === "corner-1"));
  assert.ok(result.unsupportedFurniture.some((item) => item.furnitureId === "oven-1"));
  assert.ok(result.unsupportedFurniture.some((item) => item.furnitureId === "wardrobe-1"));
});

test("çekmeceli modülde eksik kutu ölçüleri proje CSV dışa aktarımını engeller", () => {
  const result = calculateProjectProduction([
    createPlacedFurniture("parametric-1-1", "drawer-1")
  ], catalog, rules);

  assert.equal(result.parts.length, 0);
  assert.equal(result.canExport, false);
  assert.equal(result.blockedFurniture.length, 1);
  assert.match(result.exportBlockReason, /çekmece/i);
});

test("geçersiz geometri ve yinelenen mobilya kimliği güvenli dışa aktarımı engeller", () => {
  const invalidGeometry = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "invalid-1", { width: 20 })
  ], catalog, rules);
  assert.equal(invalidGeometry.blockedFurniture.length, 1);
  assert.notEqual(invalidGeometry.exportBlockReason, null);

  const duplicateIds = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "same-id"),
    createPlacedFurniture("wall-cabinet", "same-id")
  ], catalog, rules);
  assert.ok(duplicateIds.errors.some((issue) => /yinelenen mobilya kimliği/i.test(issue.reason)));
  assert.notEqual(duplicateIds.exportBlockReason, null);
});

test("katalog malzeme kimliği gövde parçalarına, tüketim özetine ve CSV'ye taşınır", () => {
  const materials = [{
    id: "mdf-white",
    name: "MDF",
    category: "panel",
    decor: "Mat Beyaz",
    thicknessesMm: [8, 18],
    unit: "mm"
  }];
  const result = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "base-1", { materialId: "mdf-white" })
  ], catalog, rules, materials);

  assert.equal(result.errors.length, 0);
  assert.equal(result.exportBlockReason, null);
  assert.ok(result.parts.length > 0);
  assert.ok(result.parts.every((part) =>
    part.material === "MDF" && part.materialId === "mdf-white"
  ));

  const first18 = result.parts.find((part) => part.thickness === 18);
  assert.ok(first18);
  const summaries = calculateMaterialConsumptionSummary([
    ...result.parts,
    { ...first18, id: first18.id + "-other", materialId: "mdf-oak" }
  ]);
  assert.equal(
    summaries.filter((summary) => summary.material === "MDF" && summary.thickness === 18).length,
    2
  );
  assert.ok(summaries.some((summary) =>
    summary.materialId === "mdf-white" && summary.thickness === 8
  ));

  const csv = createProjectCutListCsv(result.furnitureNames, result.parts);
  assert.ok(csv.includes("Malzeme;Malzeme ID;Bant Üst"));
  assert.ok(csv.includes("MDF;mdf-white;"));
});

test("katalogda olmayan malzeme veya kullanılmayan kalınlık üretim dışa aktarımını engeller", () => {
  const materials = [{
    id: "mdf-white",
    name: "MDF",
    category: "panel",
    thicknessesMm: [8, 18],
    unit: "mm"
  }];
  const missingMaterial = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "missing-1", { materialId: "missing-material" })
  ], catalog, rules, materials);
  assert.equal(missingMaterial.parts.length, 0);
  assert.match(missingMaterial.exportBlockReason, /malzeme kimliği katalogda bulunamadı/i);

  const missingBackThickness = calculateProjectProduction([
    createPlacedFurniture("base-cabinet", "thin-1", { materialId: "mdf-white" })
  ], catalog, rules, [{
    ...materials[0],
    thicknessesMm: [18]
  }]);
  assert.equal(missingBackThickness.parts.length, 0);
  assert.match(missingBackThickness.exportBlockReason, /8 mm kalınlık katalogda tanımlı değil/);
});

test("çekmece grubu katalog malzemesi üretim parçalarına ve tüketim kimliğine taşınır", () => {
  const drawerMaterial = { id: "drawer-mdf", name: "Çekmece MDF", category: "panel", thicknessesMm: [6, 15, 18], unit: "mm" };
  const furniture = createPlacedFurniture("parametric-1-1", "drawer-1", {
    drawerBoxSpecs: [{ ...drawerConfig, spec: { ...drawerConfig.spec, materialId: "drawer-mdf" } }]
  });
  const result = calculateProjectProduction([furniture], catalog, rules, [drawerMaterial]);
  const drawerParts = result.parts.filter((part) => part.name.startsWith("Çekmece "));
  assert.equal(result.errors.length, 0);
  assert.equal(result.exportBlockReason, null);
  assert.equal(drawerParts.length, 4);
  assert.ok(drawerParts.every((part) => part.material === "Çekmece MDF" && part.materialId === "drawer-mdf"));
  const summaries = calculateMaterialConsumptionSummary(drawerParts);
  assert.ok(summaries.every((summary) => summary.materialId === "drawer-mdf" && summary.material === "Çekmece MDF"));
});

test("çekmece katalog malzemesinde bulunmayan kalınlık üretim dışa aktarımını engeller", () => {
  const furniture = createPlacedFurniture("parametric-1-1", "drawer-1", {
    drawerBoxSpecs: [{ ...drawerConfig, spec: { ...drawerConfig.spec, materialId: "drawer-mdf" } }]
  });
  const result = calculateProjectProduction([furniture], catalog, rules, [{
    id: "drawer-mdf", name: "Çekmece MDF", category: "panel", thicknessesMm: [6, 15], unit: "mm"
  }]);
  assert.equal(result.parts.some((part) => part.name.startsWith("Çekmece ")), false);
  assert.match(result.exportBlockReason, /18 mm kalınlık katalogda tanımlı değil/);
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


test("çekmece panel override malzemeleri parça, tüketim ve CSV kimliklerinde korunur", () => {
  const materials = [
    { id: "drawer-default", name: "Varsayılan MDF", category: "panel", thicknessesMm: [6, 15, 18], unit: "mm" },
    { id: "drawer-side", name: "Yan Suntalam", category: "panel", thicknessesMm: [15], unit: "mm" },
    { id: "drawer-bottom", name: "Taban MDF", category: "panel", thicknessesMm: [6], unit: "mm" }
  ];
  const furniture = createPlacedFurniture("parametric-1-1", "drawer-override-1", {
    drawerBoxSpecs: [{
      ...drawerConfig,
      spec: {
        ...drawerConfig.spec,
        materialId: "drawer-default",
        panelMaterialIds: { sidePanels: "drawer-side", bottomPanel: "drawer-bottom" }
      }
    }]
  });
  const result = calculateProjectProduction([furniture], catalog, rules, materials);
  const drawerParts = result.parts.filter((part) => part.name.startsWith("Çekmece "));
  const side = drawerParts.find((part) => part.name === "Çekmece Yan Paneli");
  const frontBack = drawerParts.find((part) => part.name === "Çekmece Ön/Arka Paneli");
  const bottom = drawerParts.find((part) => part.name === "Çekmece Tabanı");
  const visibleFront = drawerParts.find((part) => part.name === "Çekmece Ön Paneli");

  assert.equal(result.errors.length, 0);
  assert.equal(result.exportBlockReason, null);
  assert.equal(side.materialId, "drawer-side");
  assert.equal(side.material, "Yan Suntalam");
  assert.equal(frontBack.materialId, "drawer-default");
  assert.equal(bottom.materialId, "drawer-bottom");
  assert.equal(bottom.material, "Taban MDF");
  assert.equal(visibleFront.materialId, "drawer-default");

  const summaries = calculateMaterialConsumptionSummary(drawerParts);
  assert.ok(summaries.some((summary) => summary.materialId === "drawer-side" && summary.material === "Yan Suntalam"));
  assert.ok(summaries.some((summary) => summary.materialId === "drawer-bottom" && summary.thickness === 6));

  const csv = createProjectCutListCsv(result.furnitureNames, drawerParts);
  assert.ok(csv.includes("Yan Suntalam;drawer-side;"));
  assert.ok(csv.includes("Taban MDF;drawer-bottom;"));
  assert.ok(csv.includes("Varsayılan MDF;drawer-default;"));
});

test("çekmece panel override malzemesi bulunmaz veya kalınlığı tanımlı değilse CSV engellenir", () => {
  const furniture = createPlacedFurniture("parametric-1-1", "drawer-override-invalid", {
    drawerBoxSpecs: [{
      ...drawerConfig,
      spec: {
        ...drawerConfig.spec,
        materialId: "drawer-default",
        panelMaterialIds: { sidePanels: "drawer-side" }
      }
    }]
  });
  const materials = [
    { id: "drawer-default", name: "Varsayılan MDF", category: "panel", thicknessesMm: [6, 15, 18], unit: "mm" }
  ];

  const missing = calculateProjectProduction([furniture], catalog, rules, materials);
  assert.equal(missing.parts.some((part) => part.name.startsWith("Çekmece ")), false);
  assert.match(missing.exportBlockReason, /sidePanels panel grubu.*drawer-side/);

  const wrongThickness = calculateProjectProduction([furniture], catalog, rules, [
    ...materials,
    { id: "drawer-side", name: "Yan Suntalam", category: "panel", thicknessesMm: [18], unit: "mm" }
  ]);
  assert.equal(wrongThickness.parts.some((part) => part.name === "Çekmece Yan Paneli"), false);
  assert.match(wrongThickness.exportBlockReason, /15 mm kalınlık katalogda tanımlı değil/);
});

test("çekmece panel override değerleri proje JSON v1 içinde korunur ve doğrulanır", () => {
  const materials = [
    { id: "drawer-default", name: "Varsayılan MDF", category: "panel", thicknessesMm: [6, 15, 18], unit: "mm" },
    { id: "drawer-side", name: "Yan Suntalam", category: "panel", thicknessesMm: [15], unit: "mm" },
    { id: "drawer-bottom", name: "Taban MDF", category: "panel", thicknessesMm: [6], unit: "mm" }
  ];
  const furniture = createPlacedFurniture("parametric-1-1", "drawer-json-1", {
    drawerBoxSpecs: [{
      ...drawerConfig,
      spec: {
        ...drawerConfig.spec,
        materialId: "drawer-default",
        panelMaterialIds: { sidePanels: "drawer-side", bottomPanel: "drawer-bottom" }
      }
    }]
  });
  const room = { width: 4000, length: 5000, height: 2800 };
  const savedAt = "2026-11-16T00:00:00.000Z";
  const parsed = parseProjectFile(
    serializeProjectFile(room, [furniture], savedAt, materials)
  );

  assert.deepEqual(
    parsed.furniture[0].drawerBoxSpecs[0].spec.panelMaterialIds,
    { sidePanels: "drawer-side", bottomPanel: "drawer-bottom" }
  );

  const invalidReference = JSON.parse(
    serializeProjectFile(room, [furniture], savedAt, materials)
  );
  invalidReference.furniture[0].drawerBoxSpecs[0].spec.panelMaterialIds.sidePanels = "missing-side";
  assert.throws(
    () => parseProjectFile(JSON.stringify(invalidReference)),
    /malzeme referansı geçersiz/
  );

  const invalidGroup = JSON.parse(
    serializeProjectFile(room, [furniture], savedAt, materials)
  );
  invalidGroup.furniture[0].drawerBoxSpecs[0].spec.panelMaterialIds.unknownPanel = "drawer-side";
  assert.throws(
    () => parseProjectFile(JSON.stringify(invalidGroup)),
    /MobilyaCAD proje formatıyla uyumlu değil/
  );
});


test("domain cutout and hardware blockers disable CSV while preserving validated panel geometry", () => {
  const noBanding = () => ({ top: false, bottom: false, left: false, right: false });
  const request = {
    schemaVersion: 1,
    furniture: [{
      schemaVersion: 1,
      furniture: {
        id: "base-1",
        widthMm: 600,
        heightMm: 850,
        depthMm: 560,
        material: "MDF"
      },
      profile: {
        panelThicknessMm: 18,
        carcassStyle: "between-sides",
        backPanel: { enabled: true, thicknessMm: 8, installation: "overlay" },
        shelfCount: 1,
        doors: { enabled: true, count: 2, style: "full-overlay", gapMm: 2 },
        edgeBandingByGroup: {
          leftSide: noBanding(),
          rightSide: noBanding(),
          top: noBanding(),
          bottom: noBanding(),
          shelf: { top: true, bottom: false, left: false, right: false },
          back: noBanding(),
          door: { top: true, bottom: true, left: true, right: true }
        }
      },
      materials: []
    }],
    hardwareItems: [{
      id: "hinge-row-1",
      furnitureId: "base-1",
      hardwareId: "hinge",
      name: "Menteşe",
      quantity: 2,
      unit: "adet"
    }]
  };
  const initial = calculateCabinetProjectProductionWithDiagnostics(request);
  assert.ok(initial.result);
  const top = initial.result.parts.find((part) => part.id === "base-1-top");
  assert.ok(top);

  const report = calculateCabinetProjectProductionWithDiagnostics({
    ...request,
    panelCutouts: [{
      partId: top.id,
      geometry: {
        schemaVersion: 1,
        widthMm: top.width,
        lengthMm: top.length,
        thicknessMm: top.thickness,
        outerEdgeBanding: top.edgeBanding,
        cutouts: [{
          id: "service-opening",
          xMm: 10,
          yMm: 10,
          widthMm: 100,
          lengthMm: 100,
          edgeBanding: noBanding()
        }]
      }
    }]
  });

  const mapped = mapDomainProductionReport(
    report,
    new Map([["base-1", "Alt Mutfak Dolabı"]])
  );
  const mappedTop = mapped.parts.find((part) => part.id === top.id);

  assert.equal(report.canExport, false);
  assert.equal(mapped.canExport, false);
  assert.ok(mapped.parts.length > 0, "tam hesaplanmış parçalar incelenebilir kalmalı");
  assert.ok(mappedTop?.panelGeometry, "kesit geometrisi UI modeline kayıpsız taşınmalı");
  assert.equal(mapped.exportBlockers.length, 2);
  assert.match(mapped.exportBlockReason, /Kesitli panel geometrisi/i);
  assert.ok(mapped.exportBlockers.some((reason) => /hardwareItems/i.test(reason)));
});

test("JSON v1 proje round-trip sonrasında üretim raporu aynı mobilya girdilerinden yeniden hesaplanır", () => {
  const furniture = createPlacedFurniture("base-cabinet", "json-roundtrip-1");
  const room = { width: 4000, length: 5000, height: 2800 };
  const savedAt = "2026-11-18T00:00:00.000Z";
  const saved = serializeProjectFile(room, [furniture], savedAt, []);
  const parsed = parseProjectFile(saved);
  const result = calculateProjectProduction(
    parsed.furniture,
    catalog,
    rules,
    parsed.materials ?? []
  );

  assert.equal(parsed.formatVersion, 1);
  assert.equal(parsed.room.unit, "mm");
  assert.equal(result.status, "ready");
  assert.equal(result.canExport, true);
  assert.ok(result.parts.some((part) => part.furnitureId === "json-roundtrip-1"));
});
