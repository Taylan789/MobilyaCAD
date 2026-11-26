import assert from "node:assert/strict";
import test from "node:test";

import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];

function createPanelRequest({
  id,
  name,
  widthMm,
  lengthMm,
  thicknessMm,
  quantity,
  material,
  materialId,
  grainDirection,
  edgeBanding
}) {
  return {
    schemaVersion: 1,
    family: "panel",
    furniture: {
      id,
      name,
      widthMm,
      lengthMm,
      thicknessMm,
      quantity,
      material,
      materialId
    },
    profile: { edgeBanding, grainDirection },
    materials
  };
}

function snapshotPart(snapshot, id) {
  const entry = snapshot.parts.find((part) => part.id === id);
  assert.ok(entry, id + " proje Part snapshot'ında bulunmalıdır.");
  return JSON.parse(entry.snapshot);
}

test("özel panel Part kimliği, mm ölçüsü, adet, malzeme, damar ve bant verisi snapshot ile nesting batch arasında korunur", () => {
  const productionReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [
      createPanelRequest({
        id: "custom-counter",
        name: "Mutfak tezgâhı",
        widthMm: 1200,
        lengthMm: 620,
        thicknessMm: 18,
        quantity: 3,
        material: "MDF Lam 18",
        materialId: "mdf-18",
        grainDirection: "length",
        edgeBanding: { top: true, bottom: false, left: true, right: false }
      }),
      createPanelRequest({
        id: "custom-shelf",
        name: "Ek raf",
        widthMm: 900,
        lengthMm: 400,
        thicknessMm: 8,
        quantity: 2,
        material: "MDF Lam 8",
        materialId: "mdf-8",
        grainDirection: "width",
        edgeBanding: { top: false, bottom: true, left: false, right: true }
      })
    ]
  });

  assert.equal(productionReport.status, "ready", productionReport.firstError ?? "");
  assert.equal(productionReport.canExport, true);
  assert.ok(productionReport.result);
  const productionParts = productionReport.result.parts;
  assert.deepEqual(productionParts.map((part) => part.id), [
    "custom-counter-panel",
    "custom-shelf-panel"
  ]);
  const sourceBefore = JSON.stringify(productionParts);

  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport,
    partIds: ["custom-counter-panel"],
    stockSheets: [{
      sheet: {
        materialId: "mdf-18",
        widthMm: 2800,
        lengthMm: 2070,
        thicknessMm: 18,
        grainDirection: "length"
      },
      kerfMm: 3.2
    }]
  });

  assert.equal(batches.status, "ready", batches.diagnostics.join(" "));
  assert.ok(batches.result);
  assert.ok(batches.projectPartSnapshot);
  assert.deepEqual(batches.sourcePartIds, ["custom-counter-panel"]);
  assert.deepEqual(batches.excludedPartIds, ["custom-shelf-panel"]);
  assert.deepEqual(batches.result.batches.map((group) => group.sourcePartIds), [
    ["custom-counter-panel"]
  ]);

  const nestedPart = batches.result.batches[0].batch.parts[0];
  assert.deepEqual({
    id: nestedPart.id,
    materialId: nestedPart.materialId,
    widthMm: nestedPart.widthMm,
    lengthMm: nestedPart.lengthMm,
    thicknessMm: nestedPart.thicknessMm,
    quantity: nestedPart.quantity,
    grainDirection: nestedPart.grainDirection,
    geometry: nestedPart.geometry
  }, {
    id: "custom-counter-panel",
    materialId: "mdf-18",
    widthMm: 1200,
    lengthMm: 620,
    thicknessMm: 18,
    quantity: 3,
    grainDirection: "length",
    geometry: "rectangular"
  });
  assert.ok(nestedPart.allowedRotationsDeg.includes(0));
  assert.equal(batches.result.batches[0].batch.totalPieceCount, 3);

  const selectedSnapshot = snapshotPart(batches.projectPartSnapshot, "custom-counter-panel");
  assert.deepEqual({
    id: selectedSnapshot.id,
    furnitureId: selectedSnapshot.furnitureId,
    width: selectedSnapshot.width,
    length: selectedSnapshot.length,
    thickness: selectedSnapshot.thickness,
    quantity: selectedSnapshot.quantity,
    material: selectedSnapshot.material,
    materialId: selectedSnapshot.materialId,
    grainDirection: selectedSnapshot.grainDirection,
    edgeBanding: selectedSnapshot.edgeBanding
  }, {
    id: "custom-counter-panel",
    furnitureId: "custom-counter",
    width: 1200,
    length: 620,
    thickness: 18,
    quantity: 3,
    material: "MDF Lam 18",
    materialId: "mdf-18",
    grainDirection: "length",
    edgeBanding: { top: true, bottom: false, left: true, right: false }
  });

  const excludedSnapshot = snapshotPart(batches.projectPartSnapshot, "custom-shelf-panel");
  assert.deepEqual({
    id: excludedSnapshot.id,
    furnitureId: excludedSnapshot.furnitureId,
    width: excludedSnapshot.width,
    length: excludedSnapshot.length,
    thickness: excludedSnapshot.thickness,
    quantity: excludedSnapshot.quantity,
    materialId: excludedSnapshot.materialId,
    grainDirection: excludedSnapshot.grainDirection,
    edgeBanding: excludedSnapshot.edgeBanding
  }, {
    id: "custom-shelf-panel",
    furnitureId: "custom-shelf",
    width: 900,
    length: 400,
    thickness: 8,
    quantity: 2,
    materialId: "mdf-8",
    grainDirection: "width",
    edgeBanding: { top: false, bottom: true, left: false, right: true }
  });

  assert.equal(batches.projectPartSnapshot.parts.length, productionParts.length);
  assert.equal(JSON.stringify(productionReport.result.parts), sourceBefore);
});
