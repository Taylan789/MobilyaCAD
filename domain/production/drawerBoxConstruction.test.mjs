import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDrawerBoxConstruction,
  validateDrawerBoxConstructionRequest
} from "./drawerBoxConstruction.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-16", name: "MDF Lam 16", category: "panel", thicknessesMm: [16], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "ply-18", name: "Kontrplak 18", category: "panel", thicknessesMm: [18], unit: "mm" }
];

const groups = ["sidePanels", "frontBackPanels", "bottomPanel", "visibleFrontPanel"];
const noBanding = { top: false, bottom: false, left: false, right: false };
const edgeBanding = Object.fromEntries(groups.map((group) => [group, { ...noBanding }]));
edgeBanding.sidePanels = { ...noBanding, top: true };
const grainDirection = Object.fromEntries(groups.map((group) => [group, "length"]));

function createRequest(overrides = {}) {
  return {
    schemaVersion: 1,
    furniture: { id: "cab-1", ...overrides.furniture },
    drawerGroup: { id: "drawer-1", ...overrides.drawerGroup },
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
      bottomFit: "between-sides-and-front-back",
      edgeBanding,
      grainDirection,
      ...overrides.spec
    },
    materials: overrides.materials ?? materials,
    ...overrides.root
  };
}

test("dört çekmece panel grubunu açık mm geometrisi ve adetlerle üretir", () => {
  const request = createRequest();
  const result = calculateDrawerBoxConstruction(request);

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.innerWidthMm, 468);
  assert.equal(result.bottomLengthMm, 418);
  assert.deepEqual(result.parts.map((part) => part.id), [
    "cab-1-drawer-1-side-panels",
    "cab-1-drawer-1-front-back-panels",
    "cab-1-drawer-1-bottom-panel",
    "cab-1-drawer-1-visible-front-panel"
  ]);
  assert.deepEqual(result.parts.map((part) => [part.width, part.length, part.thickness, part.quantity]), [
    [140, 450, 16, 4],
    [468, 140, 16, 4],
    [468, 418, 8, 2],
    [520, 180, 18, 2]
  ]);
  assert.equal(result.parts[0].grainDirection, "length");
  assert.equal(result.parts[0].edgeBanding.top, true);
  assert.equal(result.parts[1].edgeBanding.top, false);
  assert.equal(result.parts[0].furnitureId, "cab-1");
  assert.equal(result.parts[0].drawerGroupId, "drawer-1");
});

test("panel grubu malzeme override'ı kendi katalog kalınlığını kullanır", () => {
  const result = calculateDrawerBoxConstruction(createRequest({
    spec: {
      materialId: "mdf-18",
      frontBackThickness: 18,
      panelMaterialIds: { bottomPanel: "mdf-8", sidePanels: "mdf-16" }
    }
  }));

  assert.deepEqual(result.parts.map((part) => [part.materialId, part.material]), [
    ["mdf-16", "MDF Lam 16"],
    ["mdf-18", "MDF Lam 18"],
    ["mdf-8", "MDF Lam 8"],
    ["mdf-18", "MDF Lam 18"]
  ]);
});

test("katalog kimliği olmayan eski serbest metin malzeme korunur", () => {
  const result = calculateDrawerBoxConstruction(createRequest());
  assert.equal(result.parts.every((part) => part.material === "Legacy MDF"), true);
  assert.equal(result.parts.every((part) => !("materialId" in part)), true);
});

test("geçerli katalog kimliği ve kalınlık eşleşmesi her panel grubu için doğrulanır", () => {
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: { materialId: "missing-panel" }
    })),
    /katalogda bulunamadı/
  );
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: { materialId: "mdf-8" }
    })),
    /16 mm kalınlık katalogda tanımlı değil/
  );
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: { panelMaterialIds: { bottomPanel: "mdf-18" } }
    })),
    /8 mm kalınlık katalogda tanımlı değil/
  );
});

test("bilinmeyen panel grubu ve geçersiz override kimliği reddedilir", () => {
  assert.throws(
    () => validateDrawerBoxConstructionRequest(createRequest({
      spec: { panelMaterialIds: { carcass: "mdf-18" } }
    })),
    /Desteklenmeyen çekmece panel malzeme grubu/
  );
  assert.throws(
    () => validateDrawerBoxConstructionRequest(createRequest({
      spec: { panelMaterialIds: { bottomPanel: " Mdf-8" } }
    })),
    /geçerli bir katalog malzeme kimliği/
  );
});

test("ölçü hesapları 0.1 mm hassasiyetinde yuvarlanır", () => {
  const result = calculateDrawerBoxConstruction(createRequest({
    spec: { outerWidth: 500.26, sideThickness: 16.03, outerDepth: 450.25, frontBackThickness: 16.025 }
  }));
  assert.equal(result.innerWidthMm, 468.2);
  assert.equal(result.bottomLengthMm, 418.2);
  assert.equal(result.parts[1].width, 468.2);
  assert.equal(result.parts[2].length, 418.2);
});

test("iç genişlik veya taban uzunluğu pozitif kalmıyorsa hesaplama reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: { outerWidth: 32, sideThickness: 16 }
    })),
    /Çekmece iç genişliği/
  );
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: { outerDepth: 32, frontBackThickness: 16 }
    })),
    /Çekmece taban uzunluğu/
  );
});

test("sıfır, negatif, kesirli veya güvenli sınırı aşan adet reddedilir", () => {
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(
      () => calculateDrawerBoxConstruction(createRequest({ spec: { quantity } })),
      /Çekmece adedi|parça adedi güvenli/
    );
  }
});

test("geçersiz veya eksik ölçüler ve boş kimlikler reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({ spec: { outerDepth: 0 } })),
    /Çekmece kutusu dış derinliği/
  );
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({ furniture: { id: " " } })),
    /Mobilya kimliği/
  );
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({ drawerGroup: { id: " " } })),
    /Çekmece grubu kimliği/
  );
});

test("kenar bantlama bayrakları dört kenar için boolean olmalıdır", () => {
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: {
        edgeBanding: {
          ...edgeBanding,
          bottomPanel: { ...noBanding, left: "yes" }
        }
      }
    })),
    /left kenar bantlama değeri boolean/
  );
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: {
        edgeBanding: {
          ...edgeBanding,
          unknownPanel: { ...noBanding }
        }
      }
    })),
    /Desteklenmeyen çekmece panel grubu/
  );
});

test("damar yönleri açıkça length, width veya none olmalıdır", () => {
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: {
        grainDirection: { ...grainDirection, bottomPanel: "automatic" }
      }
    })),
    /bottomPanel panel grubu damar yönü geçersiz/
  );
});

test("desteklenmeyen şema ve taban konstrüksiyonu reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({ root: { schemaVersion: 2 } })),
    /şema sürümü/
  );
  assert.throws(
    () => calculateDrawerBoxConstruction(createRequest({
      spec: { bottomFit: "on-top" }
    })),
    /Desteklenmeyen çekmece taban konstrüksiyonu/
  );
});

test("malzeme kataloğunda yinelenen kimlik veya kalınlık reddedilir", () => {
  assert.throws(
    () => validateDrawerBoxConstructionRequest(createRequest({
      materials: [...materials, materials[0]]
    })),
    /Yinelenen panel malzeme kimliği/
  );
  assert.throws(
    () => validateDrawerBoxConstructionRequest(createRequest({
      materials: [{ ...materials[0], thicknessesMm: [18, 18] }]
    })),
    /yinelenen panel kalınlığı/
  );
});

test("istek ve nested kenar ayarları hesaplama sırasında değiştirilmez", () => {
  const request = createRequest();
  const before = JSON.stringify(request);
  calculateDrawerBoxConstruction(request);
  assert.equal(JSON.stringify(request), before);
  assert.notEqual(
    calculateDrawerBoxConstruction(request).parts[0].edgeBanding,
    request.spec.edgeBanding.sidePanels
  );
});

test("bilinmeyen alanlar sessizce kabul edilmez", () => {
  assert.throws(
    () => validateDrawerBoxConstructionRequest(createRequest({
      spec: { guessedRunnerClearanceMm: 12 }
    })),
    /desteklenmeyen alan/
  );
});
