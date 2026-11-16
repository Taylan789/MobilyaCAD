import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { calculateWardrobeConstruction, validateWardrobeConstructionRequest } from "./wardrobeConstruction.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];
function createEdgeBanding() {
  return Object.fromEntries(BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }]));
}
function createDivider(overrides = {}) {
  return {
    id: "center",
    offsetFromInnerLeftMm: 500,
    thicknessMm: 18,
    materialId: "mdf-18",
    edgeBanding: { ...noBanding, left: true, right: true },
    grainDirection: "length",
    ...overrides
  };
}
function createWardrobeRequest(overrides = {}) {
  const { furniture = {}, profile = {}, verticalDividers = [createDivider()], materials: materialCatalog = materials, panelMaterialOverrides } = overrides;
  return {
    schemaVersion: 1,
    family: "wardrobe",
    furniture: {
      id: "wardrobe-1", widthMm: 1800, heightMm: 2200, depthMm: 600,
      material: "MDF Lam 18", materialId: "mdf-18", ...furniture
    },
    profile: {
      panelThicknessMm: 18, carcassStyle: "between-sides", backPanel: { enabled: false },
      shelfCount: 0, doors: { enabled: false, count: 0 }, edgeBandingByGroup: createEdgeBanding(), ...profile
    },
    materials: materialCatalog,
    verticalDividers,
    ...(panelMaterialOverrides === undefined ? {} : { panelMaterialOverrides })
  };
}

test("gardırop gövdesine açık konumlu, katalog doğrulamalı dikey bölücü ekler", () => {
  const result = calculateWardrobeConstruction(createWardrobeRequest());
  const divider = result.parts.find((part) => part.id === "wardrobe-1-vertical-divider-center");
  assert.equal(result.family, "wardrobe");
  assert.deepEqual(result.innerDimensionsMm, { width: 1764, height: 2200, depth: 582 });
  assert.deepEqual(result.parts.map((part) => part.id), [
    "wardrobe-1-left-side", "wardrobe-1-right-side", "wardrobe-1-top",
    "wardrobe-1-bottom", "wardrobe-1-vertical-divider-center"
  ]);
  assert.deepEqual({
    width: divider.width, length: divider.length, thickness: divider.thickness,
    quantity: divider.quantity, material: divider.material, materialId: divider.materialId,
    offsetFromInnerLeftMm: divider.offsetFromInnerLeftMm, grainDirection: divider.grainDirection,
    edgeBanding: divider.edgeBanding
  }, {
    width: 582, length: 2200, thickness: 18, quantity: 1,
    material: "MDF Lam 18", materialId: "mdf-18", offsetFromInnerLeftMm: 500,
    grainDirection: "length", edgeBanding: { top: false, bottom: false, left: true, right: true }
  });
});

test("gardırop dikey bölücü listesi açıkça boşsa yalnız gövde parçaları üretilir", () => {
  const result = calculateWardrobeConstruction(createWardrobeRequest({ verticalDividers: [] }));
  assert.equal(result.parts.length, 4);
  assert.equal(result.family, "wardrobe");
});

test("gardırop bölücülerini proje agregatörüne ve malzeme özetine taşır", () => {
  const report = calculateCabinetProjectProductionWithDiagnostics({ schemaVersion: 1, furniture: [createWardrobeRequest()] });
  assert.equal(report.status, "ready");
  assert.equal(report.canExport, true);
  assert.deepEqual(report.supportedFurniture, [{ furnitureId: "wardrobe-1", family: "wardrobe" }]);
  assert.equal(report.result.furniture[0].family, "wardrobe");
  assert.equal(report.result.parts.length, 5);
  const summary = calculateProjectMaterialConsumptionSummary(report.result);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].materialId, "mdf-18");
  assert.equal(summary[0].totalQuantity, 5);
  assert.equal(summary[0].panelAreaM2, 5.973696);
  assert.equal(summary[0].volumeM3, 0.107526528);
  assert.equal(summary[0].edgeBanding.edgeCount, 2);
  assert.equal(summary[0].edgeBanding.totalLengthMm, 4400);
});

test("gardırop bölücüsü iç genişlik sınırını aşarsa proje dışa aktarıma kapatılır", () => {
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createWardrobeRequest({ verticalDividers: [createDivider({ offsetFromInnerLeftMm: 1750 })] })]
  });
  assert.equal(report.status, "blocked");
  assert.equal(report.canExport, false);
  assert.equal(report.result, null);
  assert.equal(report.blockedFurniture[0].code, "invalid-construction");
  assert.match(report.blockedFurniture[0].message, /iç genişlik sınırını/);
});

test("gardırop bölücüleri birbiriyle çakışamaz ve kimlikleri benzersiz olmalıdır", () => {
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [
      createDivider({ id: "left", offsetFromInnerLeftMm: 500 }),
      createDivider({ id: "right", offsetFromInnerLeftMm: 510 })
    ]
  })), /birbiriyle çakışamaz/);
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [
      createDivider({ id: "same", offsetFromInnerLeftMm: 200 }),
      createDivider({ id: "same", offsetFromInnerLeftMm: 600 })
    ]
  })), /yinelenen dikey bölücü kimliği/);
});

test("gardırop bölücüsü için katalogda gerçek kalınlık ve malzeme kimliği gerekir", () => {
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [createDivider({ materialId: "mdf-8", thicknessMm: 18 })]
  })), /18 mm kalınlık katalogda tanımlı değil/);
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [createDivider({ materialId: "missing-panel" })]
  })), /malzemesi katalogda bulunamadı/);
});

test("bölücülü gardıropta tam genişlik rafları desteklenmediği için reddedilir", () => {
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    profile: { shelfCount: 1 }
  })), /bölme bazlı raflar tanımlanana kadar raf adedi sıfır olmalıdır/);
});

test("gardırop bölücüsü kenar, damar ve alan sözleşmesini doğrular", () => {
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [createDivider({ grainDirection: "vertical" })]
  })), /damar yönü/);
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [createDivider({ edgeBanding: { ...noBanding, top: "yes" } })]
  })), /boolean olmalıdır/);
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [createDivider({ unsupported: true })]
  })), /desteklenmeyen alan/);
  assert.throws(() => validateWardrobeConstructionRequest({
    ...createWardrobeRequest(), verticalDividers: undefined
  }), /açıkça bir liste olmalıdır/);
});
