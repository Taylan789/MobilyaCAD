import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProduction } from "./projectProduction.ts";

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
      material: "Legacy MDF"
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
