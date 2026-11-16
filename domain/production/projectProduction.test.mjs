import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import {
  calculateCabinetProjectProduction,
  calculateCabinetProjectProductionWithDiagnostics
} from "./projectProduction.ts";
import { BOOKSHELF_PANEL_GROUPS } from "./bookshelfConstruction.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];
const noBanding = { top: false, bottom: false, left: false, right: false };

function createRequest(id, overrides = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "Legacy MDF",
      ...overrides.furniture
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup,
      ...overrides.profile
    },
    materials
  };
}

test("birden fazla mobilyanın parçalarını kimlik ve quantity kaybetmeden birleştirir", () => {
  const first = createRequest("cab-1", { profile: { shelfCount: 2 } });
  const second = createRequest("cab-2", { profile: { shelfCount: 1 } });
  const before = JSON.stringify([first, second]);

  const result = calculateCabinetProjectProduction({
    schemaVersion: 1,
    furniture: [first, second]
  });

  assert.equal(result.schemaVersion, 1);
  assert.deepEqual(result.furniture.map((item) => item.furnitureId), ["cab-1", "cab-2"]);
  assert.deepEqual(result.furniture[0].innerDimensionsMm, {
    width: 764,
    height: 720,
    depth: 542
  });
  assert.deepEqual(result.parts.map((part) => part.id), [
    "cab-1-left-side",
    "cab-1-right-side",
    "cab-1-top",
    "cab-1-bottom",
    "cab-1-shelf",
    "cab-2-left-side",
    "cab-2-right-side",
    "cab-2-top",
    "cab-2-bottom",
    "cab-2-shelf"
  ]);
  assert.deepEqual(result.parts.map((part) => part.furnitureId), [
    "cab-1", "cab-1", "cab-1", "cab-1", "cab-1",
    "cab-2", "cab-2", "cab-2", "cab-2", "cab-2"
  ]);
  assert.equal(result.parts.find((part) => part.id === "cab-1-shelf")?.quantity, 2);
  assert.equal(result.parts.find((part) => part.id === "cab-2-shelf")?.quantity, 1);
  assert.equal(result.parts[0].material, "Legacy MDF");
  assert.equal(JSON.stringify([first, second]), before);
});

test("boş proje geçerli boş üretim sonucu döndürür", () => {
  assert.deepEqual(
    calculateCabinetProjectProduction({ schemaVersion: 1, furniture: [] }),
    { schemaVersion: 1, furniture: [], parts: [] }
  );
});

test("yinelenen mobilya kimliği parça kimlikleri çakışmadan önce reddedilir", () => {
  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [createRequest("cab-1"), createRequest("cab-1")]
    }),
    /yinelenen mobilya kimliği/
  );
});

test("desteklenmeyen şema ve mobilya listesi olmayan istek reddedilir", () => {
  assert.throws(
    () => calculateCabinetProjectProduction({ schemaVersion: 2, furniture: [] }),
    /şema sürümü/
  );
  assert.throws(
    () => calculateCabinetProjectProduction({ schemaVersion: 1, furniture: {} }),
    /bir liste olmalıdır/
  );
});

test("bozuk mobilya kimliği ve geçersiz konstrüksiyon girdisi reddedilir", () => {
  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [{ schemaVersion: 1, furniture: { id: " " } }]
    }),
    /mobilya kimliği geçersiz/
  );
  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [createRequest("cab-invalid", { furniture: { widthMm: 0 } })]
    }),
    /Dolap genişliği/
  );
});


const drawerPanelGroups = ["sidePanels", "frontBackPanels", "bottomPanel", "visibleFrontPanel"];
const drawerMaterials = [
  { id: "mdf-16", name: "MDF Lam 16", category: "panel", thicknessesMm: [16], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" }
];

function createDrawerRequest(furnitureId, drawerGroupId, overrides = {}) {
  const edgeBanding = Object.fromEntries(
    drawerPanelGroups.map((group) => [group, { ...noBanding }])
  );
  edgeBanding.sidePanels = { ...noBanding, top: true };

  const grainDirection = {
    sidePanels: "length",
    frontBackPanels: "width",
    bottomPanel: "none",
    visibleFrontPanel: "length"
  };

  return {
    schemaVersion: 1,
    furniture: { id: furnitureId },
    drawerGroup: { id: drawerGroupId },
    spec: {
      outerWidth: 500,
      sideHeight: 140,
      outerDepth: 450,
      sideThickness: 16,
      frontBackThickness: 16,
      bottomThickness: 8,
      visibleFrontWidth: 520,
      visibleFrontHeight: 180,
      visibleFrontThickness: 18,
      quantity: 2,
      material: "Legacy MDF",
      panelMaterialIds: {
        sidePanels: "mdf-16",
        frontBackPanels: "mdf-16",
        bottomPanel: "mdf-8",
        visibleFrontPanel: "mdf-18"
      },
      bottomFit: "between-sides-and-front-back",
      edgeBanding,
      grainDirection,
      ...overrides.spec
    },
    materials: overrides.materials ?? drawerMaterials,
    ...overrides.root
  };
}

test("gövde ve çekmece kutusu parçalarını tek proje listesinde izlenebilir biçimde birleştirir", () => {
  const cabinet = createRequest("cab-1");
  const drawer = createDrawerRequest("cab-1", "drawer-1");
  const before = JSON.stringify({ cabinet, drawer });

  const result = calculateCabinetProjectProduction({
    schemaVersion: 1,
    furniture: [cabinet],
    drawerBoxes: [drawer]
  });

  assert.equal(result.furniture.length, 1);
  assert.deepEqual(result.drawerGroups, [{
    furnitureId: "cab-1",
    drawerGroupId: "drawer-1",
    innerWidthMm: 468,
    bottomLengthMm: 418
  }]);
  assert.equal(result.parts.length, 8);
  assert.deepEqual(result.parts.slice(-4).map((part) => part.id), [
    "cab-1-drawer-1-side-panels",
    "cab-1-drawer-1-front-back-panels",
    "cab-1-drawer-1-bottom-panel",
    "cab-1-drawer-1-visible-front-panel"
  ]);
  assert.deepEqual(result.parts.slice(-4).map((part) => part.quantity), [4, 4, 2, 2]);
  assert.deepEqual(result.parts.slice(-4).map((part) => part.materialId), [
    "mdf-16", "mdf-16", "mdf-8", "mdf-18"
  ]);
  assert.equal(result.parts[4].drawerGroupId, "drawer-1");
  assert.equal(result.parts[4].grainDirection, "length");
  assert.equal(result.parts[5].grainDirection, "width");
  assert.equal(result.parts[6].grainDirection, "none");
  assert.equal(result.parts[4].edgeBanding.top, true);
  assert.equal(JSON.stringify({ cabinet, drawer }), before);

  const summary = calculateProjectMaterialConsumptionSummary(result);
  const mdf16 = summary.find((entry) => entry.materialId === "mdf-16");
  assert.ok(mdf16);
  assert.equal(mdf16.totalQuantity, 8);
  assert.equal(mdf16.panelAreaM2, 0.51408);
  assert.equal(mdf16.edgeBanding.totalLengthMm, 560);
});

test("çekmece grubu yalnızca proje içindeki bir mobilyaya bağlanabilir", () => {
  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [createRequest("cab-1")],
      drawerBoxes: [createDrawerRequest("cab-missing", "drawer-1")]
    }),
    /proje mobilya listesinde bulunamadı/
  );
});

test("aynı mobilyada yinelenen çekmece grubu kimliği reddedilir", () => {
  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [createRequest("cab-1")],
      drawerBoxes: [
        createDrawerRequest("cab-1", "drawer-1"),
        createDrawerRequest("cab-1", "drawer-1")
      ]
    }),
    /yinelenen çekmece grubu kimliği/
  );
});

test("boş drawerBoxes alanı eski proje sonucu şeklini değiştirmez", () => {
  const furniture = [createRequest("cab-1")];
  const legacy = calculateCabinetProjectProduction({ schemaVersion: 1, furniture });
  const withEmptyDrawerBoxes = calculateCabinetProjectProduction({
    schemaVersion: 1,
    furniture,
    drawerBoxes: []
  });

  assert.deepEqual(withEmptyDrawerBoxes, legacy);
  assert.equal("drawerGroups" in withEmptyDrawerBoxes, false);
});

test("drawerBoxes listesi olmayan veya geçersiz bir değerle verilirse reddedilir", () => {
  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [],
      drawerBoxes: {}
    }),
    /çekmece kutusu konstrüksiyon istekleri bir liste olmalıdır/
  );
});


function createBookshelfRequest(id) {
  const edgeBandingByGroup = Object.fromEntries(
    BOOKSHELF_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );

  return {
    schemaVersion: 1,
    family: "bookshelf",
    furniture: {
      id,
      widthMm: 800,
      heightMm: 2000,
      depthMm: 300,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 3,
      edgeBandingByGroup
    },
    materials
  };
}

test("aile ayrımlı proje agregatörü kitaplık parçalarını ortak tüketim listesine ekler", () => {
  const result = calculateCabinetProjectProduction({
    schemaVersion: 1,
    furniture: [createRequest("cab-1"), createBookshelfRequest("book-1")]
  });

  assert.deepEqual(result.furniture[1], {
    furnitureId: "book-1",
    family: "bookshelf",
    innerDimensionsMm: { width: 764, height: 2000, depth: 282 }
  });

  const bookshelfParts = result.parts.filter((part) => part.furnitureId === "book-1");
  assert.deepEqual(bookshelfParts.map((part) => part.id), [
    "book-1-left-side",
    "book-1-right-side",
    "book-1-top",
    "book-1-bottom",
    "book-1-shelf"
  ]);
  assert.equal(bookshelfParts.find((part) => part.id === "book-1-shelf")?.quantity, 3);
  assert.equal(result.parts.some((part) => part.id === "book-1-door"), false);

  const materialSummary = calculateProjectMaterialConsumptionSummary(result);
  const mdf = materialSummary.find((entry) => entry.materialId === "mdf-18");
  assert.ok(mdf);
  assert.equal(mdf.totalQuantity, 7);
  assert.equal(mdf.partLineCount, 5);
  assert.equal(
    materialSummary.reduce((total, entry) => total + entry.totalQuantity, 0),
    11
  );
});

test("proje agregatörü bilinmeyen mobilya ailesini cabinet olarak varsaymaz", () => {
  const invalid = createBookshelfRequest("book-invalid");
  invalid.family = "sofa";

  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [invalid]
    }),
    /mobilya ailesi desteklenmiyor/
  );
});

const tableMaterials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "wood-60", name: "Masif 60", category: "panel", thicknessesMm: [60], unit: "mm" }
];

function createTableRequest(id) {
  const groups = ["top", "legs", "longApron", "shortApron"];
  const edgeBandingByGroup = Object.fromEntries(groups.map((group) => [group, { ...noBanding }]));
  edgeBandingByGroup.top = { ...noBanding, top: true, bottom: true };

  return {
    schemaVersion: 1,
    family: "table",
    furniture: {
      id,
      widthMm: 1200,
      lengthMm: 700,
      heightMm: 750,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    profile: {
      topThicknessMm: 18,
      legWidthMm: 60,
      legDepthMm: 60,
      legCount: 4,
      materialIdByGroup: { legs: "wood-60" },
      aprons: {
        enabled: true,
        heightMm: 100,
        thicknessMm: 18,
        longApronLengthMm: 1000,
        longApronCount: 2,
        shortApronLengthMm: 500,
        shortApronCount: 2
      },
      edgeBandingByGroup,
      grainDirectionByGroup: {
        top: "length",
        legs: "none",
        longApron: "length",
        shortApron: "length"
      }
    },
    materials: tableMaterials
  };
}

test("masa ailesi proje agregatöründe dış ölçü ve parça kimlikleriyle korunur", () => {
  const result = calculateCabinetProjectProduction({
    schemaVersion: 1,
    furniture: [
      createRequest("cab-mixed"),
      createBookshelfRequest("book-mixed"),
      createTableRequest("table-mixed")
    ]
  });

  assert.deepEqual(result.furniture[0], {
    furnitureId: "cab-mixed",
    innerDimensionsMm: { width: 764, height: 720, depth: 542 }
  });
  assert.deepEqual(result.furniture[1], {
    furnitureId: "book-mixed",
    family: "bookshelf",
    innerDimensionsMm: { width: 764, height: 2000, depth: 282 }
  });
  assert.deepEqual(result.furniture[2], {
    furnitureId: "table-mixed",
    family: "table",
    overallDimensionsMm: { width: 1200, length: 700, height: 750 }
  });
  assert.equal("innerDimensionsMm" in result.furniture[2], false);

  const tableParts = result.parts.filter((part) => part.furnitureId === "table-mixed");
  assert.deepEqual(tableParts.map((part) => part.id), [
    "table-mixed-top",
    "table-mixed-legs",
    "table-mixed-long-apron",
    "table-mixed-short-apron"
  ]);
  assert.deepEqual(tableParts.map((part) => part.quantity), [1, 4, 2, 2]);
  assert.deepEqual(tableParts.map((part) => part.materialId), [
    "mdf-18", "wood-60", "mdf-18", "mdf-18"
  ]);

  const summary = calculateProjectMaterialConsumptionSummary(result);
  assert.equal(summary.find((entry) => entry.materialId === "mdf-18")?.totalQuantity, 12);
  assert.equal(summary.find((entry) => entry.materialId === "wood-60")?.totalQuantity, 4);
});

test("masa parçalarının malzeme özeti aynı proje Part listesinden alan, hacim ve bantlama hesaplar", () => {
  const result = calculateCabinetProjectProduction({
    schemaVersion: 1,
    furniture: [createTableRequest("table-summary")]
  });
  const summary = calculateProjectMaterialConsumptionSummary(result);
  const topAndAprons = summary.find((entry) => entry.materialId === "mdf-18");
  const legs = summary.find((entry) => entry.materialId === "wood-60");

  assert.deepEqual(topAndAprons, {
    material: "MDF Lam 18",
    materialId: "mdf-18",
    thicknessMm: 18,
    partLineCount: 3,
    totalQuantity: 5,
    panelAreaM2: 1.14,
    volumeM3: 0.02052,
    edgeBanding: {
      widthEdgesLengthMm: 2400,
      lengthEdgesLengthMm: 0,
      totalLengthMm: 2400,
      edgeCount: 2
    }
  });
  assert.deepEqual(legs, {
    material: "Masif 60",
    materialId: "wood-60",
    thicknessMm: 60,
    partLineCount: 1,
    totalQuantity: 4,
    panelAreaM2: 0.17568,
    volumeM3: 0.0105408,
    edgeBanding: {
      widthEdgesLengthMm: 0,
      lengthEdgesLengthMm: 0,
      totalLengthMm: 0,
      edgeCount: 0
    }
  });
});

test("geçersiz masa konstrüksiyonu proje agregatöründe reddedilir", () => {
  const invalid = createTableRequest("table-invalid");
  invalid.profile.legCount = 0;

  assert.throws(
    () => calculateCabinetProjectProduction({
      schemaVersion: 1,
      furniture: [invalid]
    }),
    /Masa ayağı adedi/
  );
});


test("proje raporu desteklenen aileleri ve desteklenmeyen mobilyaları ayrı tanılar", () => {
  const unsupported = createBookshelfRequest("sofa-unsupported");
  unsupported.family = "sofa";

  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createRequest("cab-supported"), unsupported]
  });

  assert.equal(report.status, "blocked");
  assert.equal(report.canExport, false);
  assert.equal(report.result, null);
  assert.deepEqual(report.supportedFurniture, [
    { furnitureId: "cab-supported", family: "cabinet" }
  ]);
  assert.deepEqual(report.unsupportedFurniture.map((item) => ({
    furnitureId: item.furnitureId,
    family: item.family,
    code: item.code
  })), [{
    furnitureId: "wardrobe-unsupported",
    family: "sofa",
    code: "unsupported-family"
  }]);
  assert.equal(report.firstError?.includes("sofa"), true);
});

test("proje raporu geçersiz desteklenen konstrüksiyonu mobilya kimliğiyle engeller", () => {
  const invalid = createRequest("cab-invalid-report", {
    furniture: { widthMm: 0 }
  });
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [invalid]
  });

  assert.equal(report.status, "blocked");
  assert.equal(report.canExport, false);
  assert.equal(report.result, null);
  assert.equal(report.blockedFurniture[0].furnitureId, "cab-invalid-report");
  assert.equal(report.blockedFurniture[0].code, "invalid-construction");
  assert.match(report.blockedFurniture[0].message, /Dolap genişliği/);
});

test("proje raporu bozuk çekmece grubunu kısmi kesim listesi oluşturmadan engeller", () => {
  const drawer = createDrawerRequest("cab-drawer-report", "drawer-invalid");
  drawer.spec.outerWidth = 0;
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createRequest("cab-drawer-report")],
    drawerBoxes: [drawer]
  });

  assert.equal(report.status, "blocked");
  assert.equal(report.canExport, false);
  assert.equal(report.result, null);
  assert.equal(report.blockedFurniture[0].furnitureId, "cab-drawer-report");
  assert.equal(report.blockedFurniture[0].code, "invalid-drawer");
  assert.match(report.blockedFurniture[0].message, /Çekmece kutusu dış genişliği/);
});

test("hazır proje raporu strict agregatörle aynı tam sonucu verir", () => {
  const request = {
    schemaVersion: 1,
    furniture: [
      createRequest("cab-ready-report"),
      createBookshelfRequest("book-ready-report"),
      createTableRequest("table-ready-report")
    ]
  };
  const report = calculateCabinetProjectProductionWithDiagnostics(request);

  assert.equal(report.status, "ready");
  assert.equal(report.canExport, true);
  assert.equal(report.isEmpty, false);
  assert.deepEqual(report.unsupportedFurniture, []);
  assert.deepEqual(report.blockedFurniture, []);
  assert.deepEqual(report.projectErrors, []);
  assert.deepEqual(report.result, calculateCabinetProjectProduction(request));
});

test("boş proje raporu boş durum verir ve boş CSV dışa aktarımına izin vermez", () => {
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: []
  });

  assert.equal(report.status, "empty");
  assert.equal(report.isEmpty, true);
  assert.equal(report.canExport, false);
  assert.deepEqual(report.result, {
    schemaVersion: 1,
    furniture: [],
    parts: []
  });
});

test("geçersiz proje zarfı proje düzeyi hatayla raporlanır", () => {
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 2,
    furniture: []
  });

  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
  assert.match(report.projectErrors[0], /şema sürümü/);
});
