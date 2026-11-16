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
    height: 420,
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
