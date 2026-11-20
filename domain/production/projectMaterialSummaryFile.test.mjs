import assert from "node:assert/strict";
import test from "node:test";

import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import {
  PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_TYPE,
  parseProjectMaterialConsumptionSummaryFile,
  serializeProjectMaterialConsumptionSummaryFile
} from "./projectMaterialSummaryFile.ts";

function createSummary() {
  return calculateProjectMaterialConsumptionSummary({
    schemaVersion: 1,
    furniture: [{ furnitureId: "cab-1" }],
    parts: [
      {
        id: "part-b", furnitureId: "cab-1", name: "Shelf B", width: 500, length: 400,
        thickness: 18, quantity: 2, material: "MDF Lam", materialId: "mdf-18",
        edgeBanding: { top: true, bottom: false, left: true, right: false }
      },
      {
        id: "part-a", furnitureId: "cab-1", name: "Shelf A", width: 300, length: 200,
        thickness: 18, quantity: 1, material: "MDF Lam", materialId: "mdf-18",
        edgeBanding: { top: true, bottom: false, left: false, right: false }
      }
    ]
  });
}

test("material summary JSON v1 round-trips calculated groups, exact units, quantity and Part provenance", () => {
  const materials = createSummary();
  assert.deepEqual(materials, [{
    material: "MDF Lam",
    materialId: "mdf-18",
    thicknessMm: 18,
    partLineCount: 2,
    totalQuantity: 3,
    partIds: ["part-a", "part-b"],
    panelAreaM2: 0.46,
    volumeM3: 0.00828,
    edgeBanding: {
      widthEdgesLengthMm: 1300,
      lengthEdgesLengthMm: 800,
      totalLengthMm: 2100,
      edgeCount: 5
    }
  }]);
  const fileMaterials = materials.map((group) => {
    const copy = { ...group };
    delete copy.furnitureIds;
    return copy;
  });
  const before = JSON.stringify(materials);
  const serialized = serializeProjectMaterialConsumptionSummaryFile(materials);
  assert.equal(serialized.status, "ready");
  assert.equal(serialized.diagnostics.length, 0);
  assert.equal(typeof serialized.json, "string");
  const envelope = JSON.parse(serialized.json);
  assert.equal(envelope.fileType, PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_TYPE);
  assert.equal(envelope.schemaVersion, 1);
  assert.deepEqual(envelope.units, { thicknessMm: "mm", panelAreaM2: "m2", volumeM3: "m3", edgeBandingLengthMm: "mm" });
  assert.deepEqual(envelope.materials, fileMaterials);
  const parsed = parseProjectMaterialConsumptionSummaryFile(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.materials, fileMaterials);
  assert.deepEqual(parsed.file, envelope);
  assert.equal(JSON.stringify(materials), before);
});

test("empty summaries and legacy material groups without catalog IDs remain exportable", () => {
  const empty = serializeProjectMaterialConsumptionSummaryFile([]);
  assert.equal(empty.status, "ready");
  assert.deepEqual(parseProjectMaterialConsumptionSummaryFile(empty.json).materials, []);

  const legacy = [{
    material: "Legacy MDF",
    thicknessMm: 18,
    partLineCount: 1,
    totalQuantity: 1,
    partIds: ["legacy-part"],
    panelAreaM2: 0.5,
    volumeM3: 0.009,
    edgeBanding: { widthEdgesLengthMm: 0, lengthEdgesLengthMm: 0, totalLengthMm: 0, edgeCount: 0 }
  }];
  const serialized = serializeProjectMaterialConsumptionSummaryFile(legacy);
  assert.equal(serialized.status, "ready");
  const parsed = parseProjectMaterialConsumptionSummaryFile(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.materials[0].materialId, undefined);
  assert.deepEqual(parsed.materials, legacy);
});

test("serializer blocks invalid counts, duplicate Part IDs, inconsistent area/volume or edge totals, and unknown fields", () => {
  const valid = createSummary()[0];
  const invalid = [
    { ...valid, partLineCount: 1 },
    { ...valid, partIds: ["part-b", "part-a"] },
    { ...valid, partIds: ["part-a", "part-a"] },
    { ...valid, volumeM3: 0.01 },
    { ...valid, edgeBanding: { ...valid.edgeBanding, totalLengthMm: 999 } },
    { ...valid, materialId: "MDF 18" },
    { ...valid, extra: "unsupported" }
  ];
  for (const entry of invalid) {
    const result = serializeProjectMaterialConsumptionSummaryFile([entry]);
    assert.equal(result.status, "blocked");
    assert.equal(result.json, null);
    assert.equal(result.diagnostics.length, 1);
  }

  const duplicateAcrossGroups = [
    valid,
    {
      ...valid,
      material: "Wood",
      materialId: "wood-18",
      thicknessMm: 18,
      partIds: ["part-a"],
      partLineCount: 1,
      totalQuantity: 1,
      panelAreaM2: 0.2,
      volumeM3: 0.0036,
      edgeBanding: { widthEdgesLengthMm: 0, lengthEdgesLengthMm: 0, totalLengthMm: 0, edgeCount: 0 }
    }
  ];
  const duplicateResult = serializeProjectMaterialConsumptionSummaryFile(duplicateAcrossGroups);
  assert.equal(duplicateResult.status, "blocked");
  assert.equal(duplicateResult.json, null);
});

test("parser fails closed on malformed, unsupported, non-canonical and oversized JSON", () => {
  const serialized = serializeProjectMaterialConsumptionSummaryFile(createSummary());
  const unsupported = JSON.parse(serialized.json);
  unsupported.schemaVersion = 2;
  const unknownField = JSON.parse(serialized.json);
  unknownField.extra = true;
  const badUnits = JSON.parse(serialized.json);
  badUnits.units.edgeBandingLengthMm = "m";

  assert.equal(parseProjectMaterialConsumptionSummaryFile("{not-json").status, "blocked");
  assert.equal(parseProjectMaterialConsumptionSummaryFile(JSON.stringify(unsupported)).status, "blocked");
  assert.equal(parseProjectMaterialConsumptionSummaryFile(JSON.stringify(unknownField)).status, "blocked");
  assert.equal(parseProjectMaterialConsumptionSummaryFile(JSON.stringify(badUnits)).status, "blocked");
  assert.equal(parseProjectMaterialConsumptionSummaryFile("x".repeat(5_000_001)).status, "blocked");
});
