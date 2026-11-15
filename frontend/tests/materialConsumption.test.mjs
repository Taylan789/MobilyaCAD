import test from "node:test";
import assert from "node:assert/strict";

import { calculateMaterialConsumptionSummary } from "../src/engine/materialConsumption.ts";

const noBanding = {
  top: false,
  bottom: false,
  left: false,
  right: false
};

function createPart(overrides = {}) {
  return {
    id: "part-1",
    furnitureId: "furniture-1",
    name: "Test Panel",
    width: 600,
    length: 720,
    thickness: 18,
    quantity: 1,
    edgeBanding: { ...noBanding },
    material: "MDF",
    cncOperations: [],
    grainDirection: "none",
    ...overrides
  };
}

test("malzeme ve kalınlık grupları adet, alan, hacim ve bantlamayı ayrı hesaplar", () => {
  const summaries = calculateMaterialConsumptionSummary([
    createPart({
      id: "mdf-18-a",
      material: " MDF ",
      quantity: 2,
      edgeBanding: { ...noBanding, top: true }
    }),
    createPart({
      id: "mdf-18-b",
      material: "MDF",
      width: 400,
      length: 500,
      edgeBanding: { ...noBanding, left: true }
    }),
    createPart({
      id: "mdf-8",
      material: "MDF",
      thickness: 8,
      edgeBanding: { ...noBanding, bottom: true }
    }),
    createPart({
      id: "suntalam-18",
      material: "Suntalam",
      quantity: 3
    })
  ]);

  assert.deepEqual(summaries, [
    {
      material: "MDF",
      thickness: 8,
      partLineCount: 1,
      totalQuantity: 1,
      panelAreaM2: 0.432,
      volumeM3: 0.003456,
      edgeBanding: {
        widthEdgesLength: 600,
        lengthEdgesLength: 0,
        totalLength: 600,
        edgeCount: 1
      }
    },
    {
      material: "MDF",
      thickness: 18,
      partLineCount: 2,
      totalQuantity: 3,
      panelAreaM2: 1.064,
      volumeM3: 0.019152,
      edgeBanding: {
        widthEdgesLength: 1200,
        lengthEdgesLength: 500,
        totalLength: 1700,
        edgeCount: 3
      }
    },
    {
      material: "Suntalam",
      thickness: 18,
      partLineCount: 1,
      totalQuantity: 3,
      panelAreaM2: 1.296,
      volumeM3: 0.023328,
      edgeBanding: {
        widthEdgesLength: 0,
        lengthEdgesLength: 0,
        totalLength: 0,
        edgeCount: 0
      }
    }
  ]);
});

test("boş parça listesi boş malzeme özeti döndürür", () => {
  assert.deepEqual(calculateMaterialConsumptionSummary([]), []);
});

test("malzeme adı, ölçü, adet ve kenar bayrakları doğrulanır", () => {
  assert.throws(
    () => calculateMaterialConsumptionSummary([createPart({ material: " " })]),
    /malzemesi belirtilmelidir/
  );
  assert.throws(
    () => calculateMaterialConsumptionSummary([createPart({ width: 0 })]),
    /genişliği/
  );
  assert.throws(
    () => calculateMaterialConsumptionSummary([createPart({ quantity: 1.5 })]),
    /pozitif güvenli tam sayı/
  );
  assert.throws(
    () => calculateMaterialConsumptionSummary([
      createPart({ edgeBanding: { ...noBanding, top: "yes" } })
    ]),
    /kenar bantlama bilgisi geçersiz/
  );
});

test("sonlu ölçülerden taşan alan veya hacim toplamı reddedilir", () => {
  assert.throws(
    () => calculateMaterialConsumptionSummary([
      createPart({ width: 1e308, length: 1e308 })
    ]),
    /güvenli aralıkta/
  );
});

test("malzeme adı başındaki ve sonundaki boşluklar aynı grupta birleştirilir", () => {
  const summaries = calculateMaterialConsumptionSummary([
    createPart({ material: " MDF " }),
    createPart({ id: "part-2", material: "MDF" })
  ]);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].material, "MDF");
  assert.equal(summaries[0].partLineCount, 2);
  assert.equal(summaries[0].totalQuantity, 2);
});
