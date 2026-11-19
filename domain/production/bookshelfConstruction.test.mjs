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
      : { panelMaterialOverrides: overrides.panelMaterialOverrides })
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
