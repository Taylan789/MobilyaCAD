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
function createShelf(overrides = {}) {
  return {
    id: "lower",
    leftOffsetMm: 0,
    rightOffsetMm: 1764,
    heightFromInnerBottomMm: 500,
    frontOffsetMm: 0,
    depthMm: 582,
    thicknessMm: 18,
    materialId: "mdf-18",
    edgeBanding: { ...noBanding, top: true },
    grainDirection: "length",
    ...overrides
  };
}
function createWardrobeRequest(overrides = {}) {
  const { furniture = {}, profile = {}, verticalDividers = [createDivider()], shelves, materials: materialCatalog = materials, panelMaterialOverrides } = overrides;
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
    ...(shelves === undefined ? {} : { shelves }),
    ...(panelMaterialOverrides === undefined ? {} : { panelMaterialOverrides })
  };
}

test("gardırop gövdesine açık konumlu, katalog doğrulamalı dikey bölücü ekler", () => {
  const result = calculateWardrobeConstruction(createWardrobeRequest());
  const divider = result.parts.find((part) => part.id === "wardrobe-1-vertical-divider-center");
  assert.equal(result.family, "wardrobe");
  assert.deepEqual(result.innerDimensionsMm, { width: 1764, height: 2164, depth: 582 });
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
    width: 582, length: 2164, thickness: 18, quantity: 1,
    material: "MDF Lam 18", materialId: "mdf-18", offsetFromInnerLeftMm: 500,
    grainDirection: "length", edgeBanding: { top: false, bottom: false, left: true, right: true }
  });
});

test("gardırop rafını açık mm koordinatları ve katalog kalınlığıyla üretir", () => {
  const request = createWardrobeRequest({ verticalDividers: [], shelves: [createShelf()] });
  const result = calculateWardrobeConstruction(request);
  const shelf = result.parts.find((part) => part.id === "wardrobe-1-shelf-lower");

  assert.equal(result.innerDimensionsMm.height, 2164);
  assert.equal(result.parts.length, 5);
  assert.deepEqual({
    width: shelf.width, length: shelf.length, thickness: shelf.thickness,
    quantity: shelf.quantity, materialId: shelf.materialId,
    leftOffsetMm: shelf.leftOffsetMm, rightOffsetMm: shelf.rightOffsetMm,
    heightFromInnerBottomMm: shelf.heightFromInnerBottomMm,
    frontOffsetMm: shelf.frontOffsetMm, grainDirection: shelf.grainDirection,
    edgeBanding: shelf.edgeBanding
  }, {
    width: 582, length: 1764, thickness: 18, quantity: 1, materialId: "mdf-18",
    leftOffsetMm: 0, rightOffsetMm: 1764, heightFromInnerBottomMm: 500,
    frontOffsetMm: 0, grainDirection: "length",
    edgeBanding: { top: true, bottom: false, left: false, right: false }
  });
});

test("gardırop bölme rafları dikey bölücülerin iki yanında kendi açıklıklarına sığar", () => {
  const result = calculateWardrobeConstruction(createWardrobeRequest({
    shelves: [
      createShelf({ id: "left", rightOffsetMm: 500 }),
      createShelf({ id: "right", leftOffsetMm: 518 })
    ]
  }));
  const shelves = result.parts.filter((part) => part.id.includes("-shelf-"));
  assert.deepEqual(shelves.map((part) => [part.leftOffsetMm, part.rightOffsetMm]), [
    [0, 500], [518, 1764]
  ]);
});

test("gardırop rafı dikey bölücü alanına giremez", () => {
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    shelves: [createShelf({ rightOffsetMm: 600 })]
  })), /dikey bölücü alanına giremez/);
});

test("gardırop rafı iç genişlik, net yükseklik ve derinlik sınırlarını aşamaz", () => {
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ rightOffsetMm: 1765 })]
  })), /iç genişlik sınırını/);
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ heightFromInnerBottomMm: 2147 })]
  })), /net iç yüksekliğini/);
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ frontOffsetMm: 1 })]
  })), /iç derinlik sınırını/);
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ depthMm: 0.01 })]
  })), /0.1 mm hassasiyetinde pozitif kalmalıdır/);
});

test("gardırop rafları hacimsel olarak çakışamaz ancak yüz yüze temas edebilir", () => {
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [], shelves: [
      createShelf({ id: "lower" }),
      createShelf({ id: "overlap", heightFromInnerBottomMm: 510 })
    ]
  })), /rafıyla çakışamaz/);

  const touching = calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [], shelves: [
      createShelf({ id: "lower" }),
      createShelf({ id: "upper", heightFromInnerBottomMm: 518 })
    ]
  }));
  assert.equal(touching.parts.filter((part) => part.id.includes("-shelf-")).length, 2);
});

test("gardırop rafı kimliği, malzemesi, damar yönü ve kenar bayrakları doğrulanır", () => {
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [], shelves: [
      createShelf({ id: "same" }), createShelf({ id: "same", heightFromInnerBottomMm: 700 })
    ]
  })), /yinelenen raf kimliği/);
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ materialId: "mdf-8", thicknessMm: 18 })]
  })), /18 mm kalınlık katalogda tanımlı değil/);
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ grainDirection: "vertical" })]
  })), /damar yönü/);
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ edgeBanding: { ...noBanding, top: "yes" } })]
  })), /boolean olmalıdır/);
  assert.throws(() => validateWardrobeConstructionRequest(createWardrobeRequest({
    verticalDividers: [], shelves: [createShelf({ unsupported: true })]
  })), /desteklenmeyen alan/);
});

test("özel gardırop rafları aynı istekte tam genişlik raf adediyle birleştirilemez", () => {
  assert.throws(() => calculateWardrobeConstruction(createWardrobeRequest({
    verticalDividers: [],
    profile: { shelfCount: 1 },
    shelves: [createShelf()]
  })), /tam genişlik raf adedi sıfır olmalıdır/);
});

test("gardırop rafları proje agregatörü ve malzeme tüketim özetinde korunur", () => {
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createWardrobeRequest({ verticalDividers: [], shelves: [createShelf()] })]
  });
  assert.equal(report.status, "ready");
  assert.equal(report.canExport, true);
  assert.equal(report.result.parts.length, 5);
  const summary = calculateProjectMaterialConsumptionSummary(report.result);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].materialId, "mdf-18");
  assert.equal(summary[0].totalQuantity, 5);
  assert.equal(summary[0].partLineCount, 5);
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
  assert.equal(summary[0].panelAreaM2, 5.952744);
  assert.equal(summary[0].volumeM3, 0.107149392);
  assert.equal(summary[0].edgeBanding.edgeCount, 2);
  assert.equal(summary[0].edgeBanding.totalLengthMm, 4328);
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
