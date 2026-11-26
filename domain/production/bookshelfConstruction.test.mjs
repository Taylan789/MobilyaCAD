import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOKSHELF_PANEL_GROUPS,
  calculateBookshelfConstruction
} from "./bookshelfConstruction.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "ply-18", name: "Kontrplak 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-25", name: "MDF Lam 25", category: "panel", thicknessesMm: [25], unit: "mm" },
  { id: "ply-16", name: "Kontrplak 16", category: "panel", thicknessesMm: [16], unit: "mm" },
  { id: "mdf-6", name: "MDF Lam 6", category: "panel", thicknessesMm: [6], unit: "mm" }
];

function createRequest(overrides = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BOOKSHELF_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  edgeBandingByGroup.shelf = { ...noBanding, top: true };

  return {
    schemaVersion: 1,
    family: "bookshelf",
    furniture: {
      id: "book-1",
      widthMm: 800,
      heightMm: 2000,
      depthMm: 300,
      material: "MDF Lam 18",
      materialId: "mdf-18",
      ...overrides.furniture
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 3,
      edgeBandingByGroup,
      ...overrides.profile
    },
    materials: overrides.materials ?? materials,
    ...(overrides.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: overrides.panelMaterialOverrides }),
    ...(overrides.verticalDividers === undefined
      ? {}
      : { verticalDividers: overrides.verticalDividers }),
    ...(overrides.shelves === undefined
      ? {}
      : { shelves: overrides.shelves })
  };
}

function createDivider(overrides = {}) {
  return {
    id: "left",
    offsetFromInnerLeftMm: 300,
    thicknessMm: 18,
    materialId: "mdf-18",
    edgeBanding: { ...noBanding, left: true },
    grainDirection: "length",
    ...overrides
  };
}

function createShelf(overrides = {}) {
  return {
    id: "lower",
    leftOffsetMm: 0,
    rightOffsetMm: 764,
    heightFromInnerBottomMm: 500,
    frontOffsetMm: 0,
    depthMm: 282,
    thicknessMm: 18,
    materialId: "mdf-18",
    edgeBanding: { ...noBanding, top: true },
    grainDirection: "length",
    ...overrides
  };
}

test("açık kitaplık ortak gövde ölçülerini kullanır ve raf adedini korur", () => {
  const result = calculateBookshelfConstruction(createRequest());

  assert.equal(result.family, "bookshelf");
  assert.deepEqual(result.innerDimensionsMm, {
    width: 764,
    height: 2000,
    depth: 282
  });
  assert.deepEqual(result.parts.map((part) => part.id), [
    "book-1-left-side",
    "book-1-right-side",
    "book-1-top",
    "book-1-bottom",
    "book-1-shelf"
  ]);
  assert.equal(result.parts.find((part) => part.id === "book-1-shelf")?.quantity, 3);
  assert.equal(result.parts.some((part) => part.id.includes("-door")), false);
  assert.equal(result.parts.every((part) => part.furnitureId === "book-1"), true);
  assert.equal(result.parts.every((part) => part.thickness === 18), true);
});

test("eski ortak kalınlık, yalnız override verilen panel gruplarında değişir", () => {
  const result = calculateBookshelfConstruction(createRequest({
    profile: { panelThicknessMmByGroup: { top: 25, shelf: 16 } },
    panelMaterialOverrides: { top: "mdf-25", shelf: "ply-16" }
  }));
  const part = (id) => result.parts.find((item) => item.id === id);

  assert.equal(part("book-1-left-side")?.thickness, 18);
  assert.equal(part("book-1-right-side")?.thickness, 18);
  assert.equal(part("book-1-top")?.thickness, 25);
  assert.equal(part("book-1-bottom")?.thickness, 18);
  assert.equal(part("book-1-shelf")?.thickness, 16);
  assert.equal(part("book-1-top")?.materialId, "mdf-25");
  assert.equal(part("book-1-shelf")?.materialId, "ply-16");
  assert.equal(part("book-1-shelf")?.quantity, 3);
});

test("arkalık montajı ve panel grubu malzeme override'ı gerçek parça kalınlığıyla çözülür", () => {
  const result = calculateBookshelfConstruction(createRequest({
    profile: {
      backPanel: { enabled: true, thicknessMm: 8, installation: "overlay" }
    },
    panelMaterialOverrides: {
      shelf: "ply-18",
      back: "mdf-8"
    }
  }));

  const shelf = result.parts.find((part) => part.id === "book-1-shelf");
  const back = result.parts.find((part) => part.id === "book-1-back");

  assert.equal(shelf?.materialId, "ply-18");
  assert.equal(shelf?.material, "Kontrplak 18");
  assert.equal(back?.width, 800);
  assert.equal(back?.length, 2000);
  assert.equal(back?.thickness, 8);
  assert.equal(back?.materialId, "mdf-8");
  assert.equal(back?.material, "MDF Lam 8");
});

test("panel grubu kalınlıkları ölçüleri, gerçek parça kalınlıklarını ve katalog atamalarını korur", () => {
  const result = calculateBookshelfConstruction(createRequest({
    profile: {
      carcassStyle: "over-sides",
      panelThicknessMmByGroup: {
        leftSide: 18,
        rightSide: 25,
        top: 25,
        bottom: 18,
        shelf: 16,
        back: 6
      },
      backPanel: { enabled: true, thicknessMm: 8, installation: "inset", insetMm: 5 }
    },
    panelMaterialOverrides: {
      rightSide: "mdf-25",
      top: "mdf-25",
      shelf: "ply-16",
      back: "mdf-6"
    }
  }));
  const part = (id) => result.parts.find((item) => item.id === id);

  assert.deepEqual(result.innerDimensionsMm, { width: 757, height: 1957, depth: 271 });
  assert.equal(part("book-1-left-side")?.thickness, 18);
  assert.equal(part("book-1-right-side")?.thickness, 25);
  assert.equal(part("book-1-right-side")?.materialId, "mdf-25");
  assert.equal(part("book-1-top")?.thickness, 25);
  assert.equal(part("book-1-bottom")?.thickness, 18);
  assert.equal(part("book-1-shelf")?.thickness, 16);
  assert.equal(part("book-1-shelf")?.materialId, "ply-16");
  assert.equal(part("book-1-back")?.thickness, 6);
  assert.equal(part("book-1-back")?.materialId, "mdf-6");
  assert.equal(part("book-1-back")?.width, 757);
  assert.equal(part("book-1-back")?.length, 1957);
});

test("panel grubu kalınlığı katalogda bulunmayan veya malzeme kimliği olmayan ayarda reddedilir", () => {
  assert.throws(
    () => calculateBookshelfConstruction(createRequest({
      profile: { panelThicknessMmByGroup: { top: 25 } }
    })),
    /25 mm kalınlık katalogda tanımlı değil/
  );
  assert.throws(
    () => calculateBookshelfConstruction(createRequest({
      furniture: { materialId: undefined },
      profile: { panelThicknessMmByGroup: { top: 25 } }
    })),
    /katalog malzeme kimliği gereklidir/
  );
  assert.throws(
    () => calculateBookshelfConstruction(createRequest({
      profile: { panelThicknessMmByGroup: { door: 18 } }
    })),
    /desteklenmeyen panel kalınlık grubu/
  );
  assert.throws(
    () => calculateBookshelfConstruction(createRequest({
      profile: { panelThicknessMmByGroup: { shelf: 16 }, shelfCount: 0 }
    })),
    /Raf adedi sıfırken shelf panel kalınlığı/
  );
});

test("kitaplıkta olmayan kapak grubu veya kapak profili reddedilir", () => {
  const withDoorGroup = createRequest();
  withDoorGroup.profile.edgeBandingByGroup.door = { ...noBanding };
  assert.throws(
    () => calculateBookshelfConstruction(withDoorGroup),
    /desteklenmeyen panel grubu/
  );

  assert.throws(
    () => calculateBookshelfConstruction(createRequest({
      profile: { doors: { enabled: false, count: 0 } }
    })),
    /desteklenmeyen alan/
  );

  assert.throws(
    () => calculateBookshelfConstruction(createRequest({
      panelMaterialOverrides: { door: "mdf-18" }
    })),
    /kapak malzeme override/
  );
});

test("eksik panel grubu, bilinmeyen aile ve geçersiz raf adedi reddedilir", () => {
  const missingGroup = createRequest();
  delete missingGroup.profile.edgeBandingByGroup.back;
  assert.throws(
    () => calculateBookshelfConstruction(missingGroup),
    /kenar bantlama ayarı eksik/
  );

  assert.throws(
    () => calculateBookshelfConstruction({ ...createRequest(), family: "cabinet" }),
    /açıkça bookshelf/
  );

  assert.throws(
    () => calculateBookshelfConstruction(createRequest({
      profile: { shelfCount: 1.5 }
    })),
    /Raf adedi/
  );
});

test("sıfır raf açıkça tanımlanır ve raf satırı üretmez", () => {
  const result = calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }
  }));

  assert.equal(result.parts.some((part) => part.id === "book-1-shelf"), false);
  assert.equal(result.parts.length, 4);
});


test("kitaplık dikey bölücüleri açık iç ölçü, katalog malzemesi ve konumla parça listesine eklenir", () => {
  const result = calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [
      createDivider({ id: "left", offsetFromInnerLeftMm: 300 }),
      createDivider({ id: "right", offsetFromInnerLeftMm: 500, materialId: "ply-18", grainDirection: "width" })
    ]
  }));

  assert.deepEqual(result.parts.slice(-2).map((part) => part.id), [
    "book-1-vertical-divider-left",
    "book-1-vertical-divider-right"
  ]);
  assert.deepEqual(result.parts.slice(-2).map((part) => [
    part.width, part.length, part.thickness, part.quantity, part.materialId
  ]), [
    [282, 2000, 18, 1, "mdf-18"],
    [282, 2000, 18, 1, "ply-18"]
  ]);
  assert.deepEqual(result.parts.slice(-2).map((part) => part.offsetFromInnerLeftMm), [300, 500]);
  assert.equal(result.parts.at(-2).grainDirection, "length");
  assert.equal(result.parts.at(-2).edgeBanding.left, true);
  assert.equal(result.parts.at(-1).grainDirection, "width");
  assert.equal(result.parts.at(-1).material, "Kontrplak 18");
  assert.equal(result.parts.filter((part) => part.id === "book-1-shelf").length, 0);
});

test("kitaplık dikey bölücüleri yinelenen kimlik, çakışma ve iç genişlik taşmasını reddeder", () => {
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [createDivider(), createDivider({ offsetFromInnerLeftMm: 500 })]
  })), /yinelenen dikey bölücü kimliği/);

  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [
      createDivider({ id: "left", offsetFromInnerLeftMm: 300 }),
      createDivider({ id: "right", offsetFromInnerLeftMm: 310 })
    ]
  })), /birbiriyle çakışamaz/);

  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [createDivider({ offsetFromInnerLeftMm: 750 })]
  })), /iç genişlik sınırını aşıyor/);
});

test("kitaplık dikey bölücüleri gerçek katalog kalınlığı, yön ve kenar bayrakları ister", () => {
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [createDivider({ thicknessMm: 16 })]
  })), /16 mm kalınlık katalogda tanımlı değil/);

  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [createDivider({ materialId: "missing-panel" })]
  })), /malzemesi katalogda bulunamadı/);

  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [createDivider({ grainDirection: "vertical" })]
  })), /damar yönü/);

  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [createDivider({ edgeBanding: { ...noBanding, top: "yes" } })]
  })), /boolean olmalıdır/);
});

test("kitaplık dikey bölücülerinde tam genişlik rafı reddeder; eski istekler değişmeden kalır", () => {
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    verticalDividers: [createDivider()]
  })), /tam genişlik raf adedi sıfır olmalıdır/);

  const withoutField = calculateBookshelfConstruction(createRequest({ profile: { shelfCount: 0 } }));
  const explicitEmpty = calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: []
  }));
  assert.deepEqual(explicitEmpty, withoutField);
});


test("kitaplık bölme rafları doğrulanmış dikey bölücü aralıklarına göre ölçülü Part üretir", () => {
  const result = calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 },
    verticalDividers: [createDivider({ id: "center", offsetFromInnerLeftMm: 300 })],
    shelves: [
      createShelf({ id: "left", leftOffsetMm: 0.04, rightOffsetMm: 300.04 }),
      createShelf({
        id: "right", leftOffsetMm: 318, rightOffsetMm: 764, thicknessMm: 16,
        materialId: "ply-16", grainDirection: "width",
        edgeBanding: { ...noBanding, left: true }
      })
    ]
  }));
  const shelves = result.parts.filter((part) => part.id.includes("-shelf-"));
  assert.deepEqual(shelves.map((part) => [
    part.id, part.width, part.length, part.thickness, part.quantity, part.materialId,
    part.leftOffsetMm, part.rightOffsetMm, part.heightFromInnerBottomMm,
    part.frontOffsetMm, part.grainDirection
  ]), [
    ["book-1-shelf-left", 282, 300, 18, 1, "mdf-18", 0, 300, 500, 0, "length"],
    ["book-1-shelf-right", 282, 446, 16, 1, "ply-16", 318, 764, 500, 0, "width"]
  ]);
  assert.deepEqual(shelves.map((part) => part.edgeBanding), [
    { top: true, bottom: false, left: false, right: false },
    { top: false, bottom: false, left: true, right: false }
  ]);
  assert.equal(shelves[1].material, "Kontrplak 16");
});

test("kitaplık bölme rafları dikey bölücüye giremez ve açık ölçü sınırlarını aşamaz", () => {
  const divider = createDivider({ id: "center", offsetFromInnerLeftMm: 300 });
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [divider],
    shelves: [createShelf({ rightOffsetMm: 301 })]
  })), /dikey bölücü alanına giremez/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ rightOffsetMm: 765 })]
  })), /iç genişlik sınırını/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ heightFromInnerBottomMm: 1983 })]
  })), /net iç yüksekliğini/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ frontOffsetMm: 1 })]
  })), /iç derinlik sınırını/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ depthMm: 0.01 })]
  })), /0.1 mm hassasiyetinde pozitif kalmalıdır/);
});

test("kitaplık bölme rafları çakışma, kimlik, katalog ve profil kurallarını uygular", () => {
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [],
    shelves: [createShelf({ id: "same" }), createShelf({ id: "same", heightFromInnerBottomMm: 800 })]
  })), /yinelenen raf kimliği/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [],
    shelves: [createShelf({ id: "lower" }), createShelf({ id: "overlap", heightFromInnerBottomMm: 510 })]
  })), /rafıyla çakışamaz/);
  const touching = calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [],
    shelves: [createShelf({ id: "lower" }), createShelf({ id: "upper", heightFromInnerBottomMm: 518 })]
  }));
  assert.equal(touching.parts.filter((part) => part.id.includes("-shelf-")).length, 2);
  assert.throws(() => calculateBookshelfConstruction(createRequest({ shelves: [createShelf()] })),
    /tam genişlik raf adedi sıfır olmalıdır/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ materialId: "missing-panel" })]
  })), /malzemesi katalogda bulunamadı/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ materialId: "mdf-8", thicknessMm: 18 })]
  })), /18 mm kalınlık katalogda tanımlı değil/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ grainDirection: "vertical" })]
  })), /damar yönü/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ edgeBanding: { ...noBanding, top: "yes" } })]
  })), /boolean olmalıdır/);
  assert.throws(() => calculateBookshelfConstruction(createRequest({
    profile: { shelfCount: 0 }, verticalDividers: [], shelves: [createShelf({ unsupported: true })]
  })), /desteklenmeyen alan/);
});

test("kitaplıkta shelves alanı boş bırakıldığında mevcut raf ve proje davranışı değişmez", () => {
  const legacy = calculateBookshelfConstruction(createRequest({ profile: { shelfCount: 0 } }));
  const explicitEmpty = calculateBookshelfConstruction(createRequest({ profile: { shelfCount: 0 }, shelves: [] }));
  assert.deepEqual(explicitEmpty, legacy);
});
