import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProduction } from "./projectProduction.ts";
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
