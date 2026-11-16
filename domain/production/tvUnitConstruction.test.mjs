import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateTvUnitConstruction } from "./tvUnitConstruction.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createRequest(overrides = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  return {
    schemaVersion: 1,
    family: "tv-unit",
    mounting: "floor-standing",
    furniture: {
      id: "tv-1",
      widthMm: 1800,
      heightMm: 420,
      depthMm: 450,
      material: "Legacy MDF"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 2,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials: [],
    ...overrides
  };
}

test("floor-standing TV ünitesi açık gövde parametrelerinden ortak Part satırlarını üretir", () => {
  const result = calculateTvUnitConstruction(createRequest());

  assert.equal(result.family, "tv-unit");
  assert.equal(result.mounting, "floor-standing");
  assert.deepEqual(result.innerDimensionsMm, {
    width: 1764,
    height: 384,
    depth: 432
  });
  assert.deepEqual(result.parts.map((part) => part.id), [
    "tv-1-left-side",
    "tv-1-right-side",
    "tv-1-top",
    "tv-1-bottom",
    "tv-1-shelf"
  ]);
  assert.deepEqual(result.parts.map((part) => part.quantity), [1, 1, 1, 1, 2]);
});

test("duvara monte TV ünitesi doğrulanmış montaj standardı olmadan reddedilir", () => {
  assert.throws(
    () => calculateTvUnitConstruction(createRequest({ mounting: "wall-mounted" })),
    /duvar montajı için doğrulanmış bağlantı standardı/
  );
});

test("TV ünitesi isteği bilinmeyen kök alanlarını reddeder", () => {
  assert.throws(
    () => calculateTvUnitConstruction(createRequest({ mountingRule: "guess" })),
    /desteklenmeyen alan/
  );
});

test("TV ünitesi aile etiketi ve montaj biçimi açıkça belirtilmelidir", () => {
  assert.throws(
    () => calculateTvUnitConstruction(createRequest({ family: "cabinet" })),
    /family alanı tv-unit/
  );
});


function createShelf(overrides = {}) {
  return {
    id: "middle",
    leftOffsetMm: 10,
    rightOffsetMm: 1754,
    heightFromInnerBottomMm: 100,
    frontOffsetMm: 5,
    depthMm: 420,
    thicknessMm: 8,
    materialId: "mdf-8",
    edgeBanding: { top: true, bottom: false, left: true, right: false },
    grainDirection: "width",
    ...overrides
  };
}

const shelfMaterials = [
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" }
];

function createDivider(overrides = {}) {
  return {
    id: "center",
    leftOffsetMm: 500,
    bottomOffsetMm: 0,
    heightMm: 384,
    frontOffsetMm: 0,
    depthMm: 432,
    thicknessMm: 18,
    materialId: "mdf-18",
    edgeBanding: { ...noBanding, left: true, right: true },
    grainDirection: "length",
    ...overrides
  };
}

test("TV ünitesi açık ölçülü rafı katalog malzemesi ve yerleşim bilgisiyle ortak Part listesine ekler", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;
  request.shelves = [createShelf()];

  const result = calculateTvUnitConstruction(request);
  const shelf = result.parts.find((part) => part.id === "tv-1-shelf-middle");

  assert.ok(shelf);
  assert.deepEqual(
    [shelf.width, shelf.length, shelf.thickness, shelf.quantity],
    [420, 1744, 8, 1]
  );
  assert.deepEqual(
    [shelf.materialId, shelf.material, shelf.grainDirection],
    ["mdf-8", "MDF Lam 8", "width"]
  );
  assert.deepEqual(
    [shelf.leftOffsetMm, shelf.rightOffsetMm, shelf.heightFromInnerBottomMm, shelf.frontOffsetMm],
    [10, 1754, 100, 5]
  );
  assert.deepEqual(shelf.edgeBanding, {
    top: true, bottom: false, left: true, right: false
  });
  assert.equal(result.innerDimensionsMm.height, 384);
});

test("TV ünitesi rafları net iç yükseklik, genişlik ve derinlik sınırlarını aşamaz", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;

  assert.throws(
    () => calculateTvUnitConstruction({ ...request, shelves: [createShelf({ rightOffsetMm: 1765 })] }),
    /iç genişlik sınırını/
  );
  assert.throws(
    () => calculateTvUnitConstruction({ ...request, shelves: [createShelf({ heightFromInnerBottomMm: 377 })] }),
    /net iç yüksekliğini/
  );
  assert.throws(
    () => calculateTvUnitConstruction({ ...request, shelves: [createShelf({ frontOffsetMm: 13 })] }),
    /iç derinlik sınırını/
  );
});

test("TV ünitesi rafları hacimsel çakışamaz ve tam genişlik raf adediyle birleştirilemez", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;

  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      shelves: [
        createShelf({ id: "lower" }),
        createShelf({ id: "overlap", heightFromInnerBottomMm: 105 })
      ]
    }),
    /rafıyla çakışamaz/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      profile: { ...request.profile, shelfCount: 1 },
      shelves: [createShelf()]
    }),
    /tam genişlik raf adedi sıfır olmalıdır/
  );
  const touching = calculateTvUnitConstruction({
    ...request,
    shelves: [
      createShelf({ id: "lower" }),
      createShelf({ id: "upper", heightFromInnerBottomMm: 108 })
    ]
  });
  assert.equal(touching.parts.filter((part) => part.id.includes("-shelf-")).length, 2);
});

test("TV ünitesi raf kimliği, katalog kalınlığı ve alan sözleşmesi doğrulanır", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;

  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      shelves: [createShelf(), createShelf({ id: "middle", heightFromInnerBottomMm: 700 })]
    }),
    /yinelenen raf kimliği/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      shelves: [createShelf({ thicknessMm: 18 })]
    }),
    /18 mm kalınlık katalogda tanımlı değil/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      shelves: [createShelf({ grainDirection: "vertical" })]
    }),
    /damar yönü/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      shelves: [createShelf({ unknown: true })]
    }),
    /desteklenmeyen alan/
  );
});


test("TV ünitesi açık ölçülü dikey bölücüyü katalog doğrulamalı ortak Part satırına ekler", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;
  request.verticalDividers = [createDivider({ leftOffsetMm: 500.04 })];

  const result = calculateTvUnitConstruction(request);
  const divider = result.parts.find((part) => part.id === "tv-1-vertical-divider-center");

  assert.ok(divider);
  assert.deepEqual(
    [divider.width, divider.length, divider.thickness, divider.quantity],
    [432, 384, 18, 1]
  );
  assert.deepEqual(
    [
      divider.leftOffsetMm,
      divider.bottomOffsetMm,
      divider.heightMm,
      divider.frontOffsetMm,
      divider.depthMm,
      divider.grainDirection
    ],
    [500, 0, 420, 0, 432, "length"]
  );
  assert.deepEqual(divider.edgeBanding, {
    top: false, bottom: false, left: true, right: true
  });
});

test("TV ünitesi rafları dikey bölücünün iki yanında yüzeye temas edebilir ancak panel hacmine giremez", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;
  request.verticalDividers = [createDivider()];
  request.shelves = [
    createShelf({
      id: "left",
      leftOffsetMm: 0,
      rightOffsetMm: 500,
      frontOffsetMm: 0,
      depthMm: 432
    }),
    createShelf({
      id: "right",
      leftOffsetMm: 518,
      rightOffsetMm: 1764,
      frontOffsetMm: 0,
      depthMm: 432
    })
  ];

  const result = calculateTvUnitConstruction(request);
  assert.equal(result.parts.filter((part) => part.id.includes("-shelf-")).length, 2);

  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      shelves: [createShelf({
        id: "crossing",
        leftOffsetMm: 490,
        rightOffsetMm: 700,
        frontOffsetMm: 0,
        depthMm: 432
      })]
    }),
    /dikey bölücüsüyle çakışamaz/
  );
});

test("TV ünitesi dikey bölücüleri iç ölçü sınırlarını ve birbirleriyle hacimsel ayrımı korur", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;

  assert.throws(
    () => calculateTvUnitConstruction({ ...request, verticalDividers: [createDivider({ leftOffsetMm: 1750 })] }),
    /iç genişlik sınırını/
  );
  assert.throws(
    () => calculateTvUnitConstruction({ ...request, verticalDividers: [createDivider({ heightMm: 421 })] }),
    /net iç yüksekliğini/
  );
  assert.throws(
    () => calculateTvUnitConstruction({ ...request, verticalDividers: [createDivider({ depthMm: 433 })] }),
    /iç derinlik sınırını/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      verticalDividers: [
        createDivider({ id: "left" }),
        createDivider({ id: "right", leftOffsetMm: 510 })
      ]
    }),
    /hacimsel olarak çakışamaz/
  );
});

test("TV ünitesi dikey bölücü kimliği, katalog kalınlığı, kenar ve alan sözleşmesi doğrulanır", () => {
  const request = createRequest();
  request.profile.shelfCount = 0;
  request.materials = shelfMaterials;

  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      verticalDividers: [createDivider(), createDivider({ id: "center", bottomOffsetMm: 200 })]
    }),
    /yinelenen dikey bölücü kimliği/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      verticalDividers: [createDivider({ materialId: "mdf-8" })]
    }),
    /18 mm kalınlık katalogda tanımlı değil/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      verticalDividers: [createDivider({ materialId: "missing-panel" })]
    }),
    /malzemesi katalogda bulunamadı/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      verticalDividers: [createDivider({ grainDirection: "vertical" })]
    }),
    /damar yönü/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      verticalDividers: [createDivider({ edgeBanding: { ...noBanding, top: "yes" } })]
    }),
    /boolean olmalıdır/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      verticalDividers: [createDivider({ unsupported: true })]
    }),
    /desteklenmeyen alan/
  );
  assert.throws(
    () => calculateTvUnitConstruction({ ...request, verticalDividers: {} }),
    /bir liste olmalıdır/
  );
  assert.throws(
    () => calculateTvUnitConstruction({
      ...request,
      profile: { ...request.profile, shelfCount: 1 },
      verticalDividers: [createDivider()]
    }),
    /tam genişlik raf adedi sıfır olmalıdır/
  );
});

test("açık dikey bölücü listesi boş olan eski TV ünitesi isteği aynı raf adetini korur", () => {
  const request = createRequest({ verticalDividers: [] });
  const result = calculateTvUnitConstruction(request);
  assert.deepEqual(result.parts.map((part) => part.quantity), [1, 1, 1, 1, 2]);
});
