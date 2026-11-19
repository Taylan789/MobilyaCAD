import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createPart({ id, furnitureId, width, length, quantity, edgeBanding, edgeBandingMaterialId, edgeBandingUnit }) {
  return {
    id, furnitureId, name: id, width, length, thickness: 18, quantity, material: "MDF", edgeBanding,
    ...(edgeBandingMaterialId === undefined ? {} : { edgeBandingMaterialId }),
    ...(edgeBandingUnit === undefined ? {} : { edgeBandingUnit })
  };
}

test("mixed-family edge-band summary preserves Part/furniture sources, quantity, and mm/m units", () => {
  const production = {
    schemaVersion: 1,
    furniture: [
      { furnitureId: "cabinet-a", family: "cabinet" },
      { furnitureId: "bookshelf-a", family: "bookshelf" },
      { furnitureId: "table-a", family: "table" }
    ],
    parts: [
      createPart({
        id: "cab-side-a", furnitureId: "cabinet-a", width: 600, length: 400, quantity: 2,
        edgeBanding: { top: true, bottom: true, left: true, right: false },
        edgeBandingMaterialId: "pvc-18", edgeBandingUnit: "mm"
      }),
      createPart({
        id: "book-shelf-a", furnitureId: "bookshelf-a", width: 300, length: 250, quantity: 3,
        edgeBanding: { top: true, bottom: false, left: false, right: true },
        edgeBandingMaterialId: "pvc-18", edgeBandingUnit: "m"
      }),
      createPart({
        id: "table-top-a", furnitureId: "table-a", width: 1000, length: 700, quantity: 1,
        edgeBanding: { top: true, bottom: true, left: true, right: true },
        edgeBandingMaterialId: "pvc-18", edgeBandingUnit: "mm"
      }),
      createPart({
        id: "legacy-panel-a", furnitureId: "cabinet-a", width: 500, length: 200, quantity: 2,
        edgeBanding: { top: true, bottom: true, left: false, right: false }
      }),
      createPart({
        id: "plain-panel-a", furnitureId: "cabinet-a", width: 900, length: 400, quantity: 5,
        edgeBanding: noBanding
      })
    ]
  };

  assert.deepEqual(calculateProjectEdgeBandingConsumptionSummary(production), [
    {
      edgeBandingId: null, unit: "mm", partLineCount: 1, totalQuantity: 2000, totalLengthMm: 2000,
      edgeCount: 4, partIds: ["legacy-panel-a"], furnitureIds: ["cabinet-a"]
    },
    {
      edgeBandingId: "pvc-18", unit: "m", partLineCount: 1, totalQuantity: 1.65, totalLengthMm: 1650,
      edgeCount: 6, partIds: ["book-shelf-a"], furnitureIds: ["bookshelf-a"]
    },
    {
      edgeBandingId: "pvc-18", unit: "mm", partLineCount: 2, totalQuantity: 6600, totalLengthMm: 6600,
      edgeCount: 10, partIds: ["cab-side-a", "table-top-a"], furnitureIds: ["cabinet-a", "table-a"]
    }
  ]);
});

test("unbanded Parts produce no consumption rows; duplicate Part IDs are rejected", () => {
  const plainPart = createPart({
    id: "plain-only", furnitureId: "cabinet-empty", width: 900, length: 400, quantity: 5, edgeBanding: noBanding
  });
  const production = {
    schemaVersion: 1, furniture: [{ furnitureId: "cabinet-empty", family: "cabinet" }], parts: [plainPart]
  };

  assert.deepEqual(calculateProjectEdgeBandingConsumptionSummary(production), []);
  assert.throws(() => calculateProjectEdgeBandingConsumptionSummary({
    ...production, parts: [plainPart, { ...plainPart }]
  }), /yinelenen parça kimliği/);
});
