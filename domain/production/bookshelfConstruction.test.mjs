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
  { id: "ply-18", name: "Kontrplak 18", category: "panel", thicknessesMm: [18], unit: "mm" }
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
      materialId: "mdf-18"
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
