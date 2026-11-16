import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProduction } from "./projectProduction.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-18", name: "MDF Lam", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-multi", name: "MDF Lam", category: "panel", thicknessesMm: [8, 18], unit: "mm" },
  { id: "mdf-alt", name: "MDF Lam", category: "panel", thicknessesMm: [18], unit: "mm" }
];

function createEdgeBanding(overrides = {}) {
  return Object.fromEntries(BODY_PANEL_GROUPS.map((group) => [
    group,
    { ...noBanding, ...(overrides[group] ?? {}) }
  ]));
}

function createRequest(id, options = {}) {
  const {
    panelThicknessMm = 18,
    materialId = "mdf-18",
    material = "MDF Lam",
    shelfCount = 0,
    edgeBanding = {}
  } = options;

  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material,
      materialId
    },
    profile: {
      panelThicknessMm,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: createEdgeBanding(edgeBanding)
    },
    materials
  };
}

function createProject(requests) {
  return calculateCabinetProjectProduction({
    schemaVersion: 1,
    furniture: requests
  });
}

test("proje agregatörünün Part listesinde quantity ağırlıklı alan, hacim ve bantlama hesaplanır", () => {
  const production = createProject([
    createRequest("cab-1", {
      edgeBanding: { leftSide: { top: true } }
    }),
    createRequest("cab-2", {
      shelfCount: 2,
      edgeBanding: {
        leftSide: { top: true },
        shelf: { left: true }
      }
    })
  ]);

  const summaries = calculateProjectMaterialConsumptionSummary(production);

  assert.deepEqual(summaries, [{
    material: "MDF Lam",
    materialId: "mdf-18",
    thicknessMm: 18,
    partLineCount: 9,
    totalQuantity: 10,
    panelAreaM2: 4.097328,
    volumeM3: 0.073751904,
    edgeBanding: {
      widthEdgesLengthMm: 1120,
      lengthEdgesLengthMm: 1084,
      totalLengthMm: 2204,
      edgeCount: 4
    }
  }]);
});

test("aynı malzeme adı farklı katalog kimliği veya kalınlıkta ayrı gruplanır", () => {
  const production = createProject([
    createRequest("cab-18", { materialId: "mdf-multi", panelThicknessMm: 18 }),
    createRequest("cab-8", { materialId: "mdf-multi", panelThicknessMm: 8 }),
    createRequest("cab-alt", { materialId: "mdf-alt", panelThicknessMm: 18 })
  ]);

  const summaries = calculateProjectMaterialConsumptionSummary(production);

  assert.deepEqual(
    summaries.map((summary) => [summary.materialId, summary.thicknessMm]),
    [["mdf-alt", 18], ["mdf-multi", 8], ["mdf-multi", 18]]
  );
  assert.equal(summaries.length, 3);
});

test("boş proje üretim sonucu boş malzeme özeti döndürür", () => {
  const production = createProject([]);
  assert.deepEqual(calculateProjectMaterialConsumptionSummary(production), []);
});

test("şema, proje ilişkisi, parça kimliği, adet ve kenar bayrakları doğrulanır", () => {
  const production = createProject([createRequest("cab-1")]);
  const firstPart = production.parts[0];

  assert.throws(
    () => calculateProjectMaterialConsumptionSummary({ ...production, schemaVersion: 2 }),
    /şema sürümü/
  );
  assert.throws(
    () => calculateProjectMaterialConsumptionSummary({
      ...production,
      parts: [{ ...firstPart, furnitureId: "missing-furniture" }]
    }),
    /proje sonuçlarında bulunamadı/
  );
  assert.throws(
    () => calculateProjectMaterialConsumptionSummary({
      ...production,
      parts: [firstPart, { ...production.parts[1], id: firstPart.id }]
    }),
    /yinelenen parça kimliği/
  );
  assert.throws(
    () => calculateProjectMaterialConsumptionSummary({
      ...production,
      parts: [{ ...firstPart, quantity: 0 }]
    }),
    /pozitif güvenli tam sayı/
  );
  assert.throws(
    () => calculateProjectMaterialConsumptionSummary({
      ...production,
      parts: [{
        ...firstPart,
        edgeBanding: { ...noBanding, top: "yes" }
      }]
    }),
    /boolean olmalıdır/
  );
});

test("taşan alan ve adet toplamları reddedilir", () => {
  const production = createProject([createRequest("cab-1")]);
  const firstPart = production.parts[0];

  assert.throws(
    () => calculateProjectMaterialConsumptionSummary({
      ...production,
      parts: [{ ...firstPart, width: 1e308, length: 1e308 }]
    }),
    /güvenli aralık/
  );
  assert.throws(
    () => calculateProjectMaterialConsumptionSummary({
      ...production,
      parts: [
        { ...firstPart, quantity: Number.MAX_SAFE_INTEGER },
        { ...production.parts[1], quantity: Number.MAX_SAFE_INTEGER }
      ]
    }),
    /güvenli aralık/
  );
});
