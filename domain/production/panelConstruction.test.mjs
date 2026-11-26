import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePanelConstruction,
  validatePanelConstructionRequest
} from "./panelConstruction.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "ply-12", name: "Kontrplak 12", category: "panel", thicknessesMm: [12], unit: "mm" }
];
const edgeBanding = { top: true, bottom: false, left: true, right: false };

function createRequest(overrides = {}) {
  return {
    schemaVersion: 1,
    family: "panel",
    furniture: {
      id: "custom-panel-1",
      name: "Özel raf",
      widthMm: 900,
      lengthMm: 250,
      thicknessMm: 18,
      quantity: 2,
      material: "Legacy MDF",
      materialId: "mdf-18",
      ...overrides.furniture
    },
    profile: {
      edgeBanding: { ...edgeBanding },
      grainDirection: "length",
      ...overrides.profile
    },
    materials: overrides.materials ?? materials
  };
}

test("özel panel açık ölçü, adet, katalog kimliği, kenar ve damar bilgisini tek Part satırında korur", () => {
  const result = calculatePanelConstruction(createRequest());
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.family, "panel");
  assert.deepEqual(result.overallDimensionsMm, { width: 900, length: 250, thickness: 18 });
  assert.deepEqual(result.parts, [{
    id: "custom-panel-1-panel",
    furnitureId: "custom-panel-1",
    group: "panel",
    name: "Özel raf",
    width: 900,
    length: 250,
    thickness: 18,
    quantity: 2,
    material: "MDF Lam 18",
    materialId: "mdf-18",
    edgeBanding,
    grainDirection: "length"
  }]);
});

test("özel panel ölçülerini 0.1 mm'ye normalize eder ve katalog kalınlığını gerçek Part ile eşleştirir", () => {
  const request = createRequest({
    furniture: { widthMm: 900.26, lengthMm: 250.24, thicknessMm: 18.04 },
    profile: { grainDirection: "width" }
  });
  const normalized = validatePanelConstructionRequest(request);
  assert.deepEqual(
    [normalized.furniture.widthMm, normalized.furniture.lengthMm, normalized.furniture.thicknessMm],
    [900.3, 250.2, 18]
  );
  assert.equal(calculatePanelConstruction(request).parts[0].grainDirection, "width");
});

test("katalog kimliği olmayan legacy malzeme etiketi açıkça korunur", () => {
  const request = createRequest({ materials: [] });
  delete request.furniture.materialId;
  const result = calculatePanelConstruction(request);
  assert.equal(result.parts[0].material, "Legacy MDF");
  assert.equal("materialId" in result.parts[0], false);
});

test("seçilen katalog kimliği bulunamazsa veya gerçek kalınlık katalogda yoksa reddedilir", () => {
  assert.throws(
    () => calculatePanelConstruction(createRequest({ furniture: { materialId: "missing" } })),
    /katalogda bulunamadı/
  );
  assert.throws(
    () => calculatePanelConstruction(createRequest({ furniture: { thicknessMm: 12 } })),
    /12 mm kalınlık katalogda tanımlı değil/
  );
});

test("ölçüler ve adet pozitif, sonlu ve güvenli sınırlar içinde olmalıdır", () => {
  for (const widthMm of [0, -1, 0.04, Number.NaN, Number.POSITIVE_INFINITY, 1e308]) {
    assert.throws(
      () => calculatePanelConstruction(createRequest({ furniture: { widthMm } })),
      /Özel panel genişliği/
    );
  }
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => calculatePanelConstruction(createRequest({ furniture: { quantity } })),
      /adedi/
    );
  }
});

test("malzeme kataloğu yinelenen kimlik ve normalize sonrası yinelenen kalınlığı reddeder", () => {
  assert.throws(
    () => calculatePanelConstruction(createRequest({ materials: [...materials, materials[0]] })),
    /Yinelenen özel panel malzeme kimliği/
  );
  assert.throws(
    () => calculatePanelConstruction(createRequest({
      materials: [{
        id: "near-duplicate",
        name: "Near duplicate",
        category: "panel",
        thicknessesMm: [18.01, 18.04],
        unit: "mm"
      }]
    })),
    /yinelenen panel kalınlığı/
  );
});

test("aile, damar, kenar bayrakları ve bilinmeyen alanlar açıkça doğrulanır", () => {
  assert.throws(
    () => calculatePanelConstruction(createRequest({ profile: { grainDirection: "diagonal" } })),
    /damar yönü/
  );
  assert.throws(
    () => calculatePanelConstruction(createRequest({ profile: { edgeBanding: { ...edgeBanding, front: true } } })),
    /desteklenmeyen alan/
  );
  assert.throws(
    () => calculatePanelConstruction({ ...createRequest(), family: "cabinet" }),
    /açıkça panel/
  );
  assert.throws(
    () => calculatePanelConstruction({ ...createRequest(), guessedJoinery: "dowel" }),
    /desteklenmeyen alan/
  );
});

test("doğrulama ve hesaplama kaynak isteği değiştirmez", () => {
  const request = createRequest();
  const before = JSON.stringify(request);
  validatePanelConstructionRequest(request);
  calculatePanelConstruction(request);
  assert.equal(JSON.stringify(request), before);
});
