import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectEdgeBandingConsumptionSummary, calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { createProjectPartSnapshot, validateProjectPartSnapshot } from "./projectPartSnapshot.ts";

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

test("directional assignments split consumption by edge while legacy fallback stays aggregated", () => {
  const part = createPart({
    id: "cab-edge-split", furnitureId: "cab-edge-split", width: 600, length: 400, quantity: 2,
    edgeBanding: { top: true, bottom: true, left: true, right: true },
    edgeBandingMaterialId: "pvc-default", edgeBandingUnit: "mm"
  });
  part.edgeBandingByEdge = {
    top: { edgeBandingId: "pvc-top", unit: "m" },
    right: { edgeBandingId: "pvc-right", unit: "m" }
  };
  const production = { schemaVersion: 1, furniture: [{ furnitureId: "cab-edge-split" }], parts: [part] };
  assert.deepEqual(calculateProjectEdgeBandingConsumptionSummary(production), [
    {
      edgeBandingId: "pvc-default", unit: "mm", partLineCount: 1, totalQuantity: 2000,
      totalLengthMm: 2000, edgeCount: 4, partIds: ["cab-edge-split"], furnitureIds: ["cab-edge-split"]
    },
    {
      edgeBandingId: "pvc-right", unit: "m", edge: "right", partLineCount: 1, totalQuantity: 0.8,
      totalLengthMm: 800, edgeCount: 2, partIds: ["cab-edge-split"], furnitureIds: ["cab-edge-split"]
    },
    {
      edgeBandingId: "pvc-top", unit: "m", edge: "top", partLineCount: 1, totalQuantity: 1.2,
      totalLengthMm: 1200, edgeCount: 2, partIds: ["cab-edge-split"], furnitureIds: ["cab-edge-split"]
    }
  ]);
});

test("directional edge-band consumption includes cutout edges and rejects malformed overrides", () => {
  const part = createPart({
    id: "panel-cutout", furnitureId: "panel-cutout", width: 1000, length: 600, quantity: 1,
    edgeBanding: { ...noBanding }
  });
  part.panelGeometry = {
    schemaVersion: 1, widthMm: 1000, lengthMm: 600, thicknessMm: 18, outerEdgeBanding: { ...noBanding },
    cutouts: [{
      id: "opening", xMm: 100, yMm: 100, widthMm: 400, lengthMm: 300,
      edgeBanding: { top: true, bottom: false, left: true, right: false }
    }]
  };
  part.edgeBandingByEdge = {
    top: { edgeBandingId: "pvc-opening-top", unit: "mm" },
    left: { edgeBandingId: "pvc-opening-left", unit: "m" }
  };
  const production = { schemaVersion: 1, furniture: [{ furnitureId: "panel-cutout" }], parts: [part] };
  assert.deepEqual(
    calculateProjectEdgeBandingConsumptionSummary(production).map(({ edgeBandingId, unit, edge, totalLengthMm, edgeCount, totalQuantity }) =>
      [edgeBandingId, unit, edge, totalLengthMm, edgeCount, totalQuantity]
    ),
    [
      ["pvc-opening-left", "m", "left", 300, 1, 0.3],
      ["pvc-opening-top", "mm", "top", 400, 1, 400]
    ]
  );

  for (const edgeBandingByEdge of [
    { front: { edgeBandingId: "pvc-x", unit: "mm" } },
    { top: { edgeBandingId: "PVC White", unit: "mm" } },
    { top: { edgeBandingId: "pvc-x", unit: "cm" } },
    { top: { edgeBandingId: "pvc-x", unit: "mm", thicknessMm: 1 } },
    { right: { edgeBandingId: "pvc-x", unit: "mm" } }
  ]) {
    assert.throws(() => calculateProjectEdgeBandingConsumptionSummary({
      ...production, parts: [{ ...part, edgeBandingByEdge }]
    }));
  }
});


test("mixed-family material and edge-band summary provenance reconciles to canonical Part snapshot and is order-independent", () => {
  const production = {
    schemaVersion: 1,
    furniture: [
      { furnitureId: "cabinet-a", family: "cabinet" },
      { furnitureId: "bookshelf-a", family: "bookshelf" },
      { furnitureId: "table-a", family: "table" }
    ],
    parts: [
      {
        ...createPart({
          id: "cab-side-a", furnitureId: "cabinet-a", width: 600, length: 400, quantity: 2,
          edgeBanding: { top: true, bottom: true, left: true, right: false },
          edgeBandingMaterialId: "pvc-default", edgeBandingUnit: "mm"
        }),
        materialId: "mdf-18",
        edgeBandingByEdge: { top: { edgeBandingId: "pvc-top", unit: "m" } }
      },
      {
        ...createPart({
          id: "book-shelf-a", furnitureId: "bookshelf-a", width: 300, length: 250, quantity: 3,
          edgeBanding: { top: true, bottom: false, left: false, right: true },
          edgeBandingMaterialId: "pvc-default", edgeBandingUnit: "mm"
        }),
        materialId: "mdf-18",
        edgeBandingByEdge: { right: { edgeBandingId: "pvc-right", unit: "mm" } }
      },
      {
        ...createPart({
          id: "table-top-a", furnitureId: "table-a", width: 1000, length: 700, quantity: 1,
          edgeBanding: { top: true, bottom: true, left: true, right: true },
          edgeBandingMaterialId: "pvc-default", edgeBandingUnit: "mm"
        }),
        materialId: "mdf-18"
      },
      {
        ...createPart({
          id: "legacy-panel-a", furnitureId: "cabinet-a", width: 500, length: 200, quantity: 2,
          edgeBanding: { top: true, bottom: true, left: false, right: false }
        }),
        materialId: "mdf-18"
      },
      {
        ...createPart({
          id: "plain-panel-a", furnitureId: "cabinet-a", width: 900, length: 400, quantity: 5,
          edgeBanding: noBanding
        }),
        materialId: "mdf-18"
      }
    ]
  };
  const canonicalSnapshot = validateProjectPartSnapshot(createProjectPartSnapshot(production.parts));
  const canonicalParts = canonicalSnapshot.parts.map((entry) => JSON.parse(entry.snapshot));

  const materialSummaries = calculateProjectMaterialConsumptionSummary(production);
  assert.equal(materialSummaries.length, 1);
  const materialSummary = materialSummaries[0];
  const expectedMaterialParts = canonicalParts.filter((part) =>
    part.materialId === materialSummary.materialId &&
    part.material === materialSummary.material &&
    part.thickness === materialSummary.thicknessMm
  );
  assert.deepEqual(materialSummary.partIds, expectedMaterialParts.map((part) => part.id).sort());
  assert.deepEqual(
    materialSummary.furnitureIds,
    [...new Set(expectedMaterialParts.map((part) => part.furnitureId))].sort()
  );
  assert.equal(materialSummary.partLineCount, expectedMaterialParts.length);
  assert.equal(materialSummary.totalQuantity, expectedMaterialParts.reduce((sum, part) => sum + part.quantity, 0));

  const edgeKeys = ["top", "bottom", "left", "right"];
  const expectedEdgeGroups = new Map();
  const addExpectedEdge = (part, edge, override, lengthMm, edgeCount) => {
    const edgeBandingId = override?.edgeBandingId ?? part.edgeBandingMaterialId ?? null;
    const unit = override?.unit ?? part.edgeBandingUnit ?? "mm";
    const key = JSON.stringify([edgeBandingId, unit, edge ?? null]);
    let group = expectedEdgeGroups.get(key);
    if (group === undefined) {
      group = { totalLengthMm: 0, edgeCount: 0, partIds: new Set(), furnitureIds: new Set() };
      expectedEdgeGroups.set(key, group);
    }
    group.totalLengthMm += lengthMm;
    group.edgeCount += edgeCount;
    group.partIds.add(part.id);
    group.furnitureIds.add(part.furnitureId);
  };
  for (const part of canonicalParts) {
    const bandedEdges = edgeKeys.filter((edge) => part.edgeBanding[edge]);
    if (bandedEdges.length === 0) continue;
    if (part.edgeBandingByEdge === undefined) {
      const widthEdgeCount = Number(part.edgeBanding.top) + Number(part.edgeBanding.bottom);
      const lengthEdgeCount = Number(part.edgeBanding.left) + Number(part.edgeBanding.right);
      addExpectedEdge(
        part,
        undefined,
        undefined,
        (part.width * widthEdgeCount + part.length * lengthEdgeCount) * part.quantity,
        (widthEdgeCount + lengthEdgeCount) * part.quantity
      );
      continue;
    }
    for (const edge of bandedEdges) {
      const override = part.edgeBandingByEdge[edge];
      addExpectedEdge(
        part,
        override === undefined ? undefined : edge,
        override,
        (edge === "top" || edge === "bottom" ? part.width : part.length) * part.quantity,
        part.quantity
      );
    }
  }

  const edgeSummaries = calculateProjectEdgeBandingConsumptionSummary(production);
  assert.equal(edgeSummaries.length, expectedEdgeGroups.size);
  for (const summary of edgeSummaries) {
    const key = JSON.stringify([summary.edgeBandingId, summary.unit, summary.edge ?? null]);
    const expected = expectedEdgeGroups.get(key);
    assert.ok(expected, "unexpected edge-band group " + key);
    assert.deepEqual(summary.partIds, [...expected.partIds].sort((a, b) => a.localeCompare(b)));
    assert.deepEqual(summary.furnitureIds, [...expected.furnitureIds].sort((a, b) => a.localeCompare(b)));
    assert.equal(summary.partLineCount, expected.partIds.size);
    assert.equal(summary.edgeCount, expected.edgeCount);
    assert.equal(summary.totalLengthMm, Math.round(expected.totalLengthMm * 10) / 10);
    assert.equal(
      summary.totalQuantity,
      summary.unit === "mm"
        ? Math.round(expected.totalLengthMm * 10) / 10
        : Math.round(expected.totalLengthMm / 1000 * 10000) / 10000
    );
  }

  const reorderedProduction = {
    ...production,
    furniture: [...production.furniture].reverse(),
    parts: [...production.parts].reverse()
  };
  assert.deepEqual(calculateProjectMaterialConsumptionSummary(reorderedProduction), materialSummaries);
  assert.deepEqual(calculateProjectEdgeBandingConsumptionSummary(reorderedProduction), edgeSummaries);
});
