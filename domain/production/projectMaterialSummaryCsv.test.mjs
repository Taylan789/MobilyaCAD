import assert from "node:assert/strict";
import test from "node:test";

import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import {
  PROJECT_MATERIAL_CONSUMPTION_CSV_COLUMNS,
  PROJECT_MATERIAL_CONSUMPTION_CSV_FORMAT,
  PROJECT_MATERIAL_CONSUMPTION_CSV_METADATA_COLUMNS,
  parseProjectMaterialConsumptionCsv,
  serializeProjectMaterialConsumptionCsv
} from "./projectMaterialSummaryCsv.ts";

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

function roundTrip(input) {
  const serialized = serializeProjectMaterialConsumptionCsv(input);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join("; "));
  assert.ok(serialized.csv);
  const parsed = parseProjectMaterialConsumptionCsv(serialized.csv);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join("; "));
  assert.ok(parsed.file);
  assert.deepEqual(parsed.materials, parsed.file.materials);
  assert.deepEqual(parsed.materials, input);
  return { serialized, parsed };
}

test("material consumption CSV v1 round-trips calculated units, quantity and catalog/Part/furniture provenance", () => {
  const input = createSummary();
  const { serialized, parsed } = roundTrip(input);
  assert.equal(parsed.file?.format, PROJECT_MATERIAL_CONSUMPTION_CSV_FORMAT);
  assert.equal(parsed.file?.formatVersion, 1);
  assert.deepEqual(parsed.file?.units, { thicknessMm: "mm", panelAreaM2: "m2", volumeM3: "m3", edgeBandingLengthMm: "mm" });
  assert.equal(serialized.csv.charCodeAt(0), 0xfeff);
  assert.ok(serialized.csv.endsWith("\r\n"));
  assert.ok(serialized.csv.includes("\r\n"));
  assert.equal(serialized.csv.replace(/\r\n/g, "").includes("\n"), false);
  assert.deepEqual(PROJECT_MATERIAL_CONSUMPTION_CSV_METADATA_COLUMNS, [
    "fileType", "schemaVersion", "thicknessMmUnit", "panelAreaM2Unit", "volumeM3Unit", "edgeBandingLengthMmUnit"
  ]);
  assert.deepEqual(PROJECT_MATERIAL_CONSUMPTION_CSV_COLUMNS, [
    "material", "materialId", "thicknessMm", "partLineCount", "totalQuantity", "partIds",
    "panelAreaM2", "volumeM3", "widthEdgesLengthMm", "lengthEdgesLengthMm", "totalLengthMm",
    "edgeCount", "furnitureIds"
  ]);
  assert.deepEqual(parsed.materials?.[0].partIds, ["part-a", "part-b"]);
  assert.deepEqual(parsed.materials?.[0].furnitureIds, ["cab-1"]);
});

test("empty consumption emits metadata and headers without invented group rows", () => {
  const { serialized, parsed } = roundTrip([]);
  assert.deepEqual(parsed.materials, []);
  assert.equal(serialized.csv.split("\r\n").length, 4);
});

test("legacy groups without catalog or furniture IDs remain compatible", () => {
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
  const { parsed, serialized } = roundTrip(legacy);
  assert.ok(serialized.csv.includes('""'));
  assert.equal(parsed.materials?.[0].materialId, undefined);
  assert.equal(parsed.materials?.[0].furnitureIds, undefined);
  assert.deepEqual(parsed.materials, legacy);
});

test("CSV quoting preserves commas, quotes and CRLF in material and provenance IDs", () => {
  const original = createSummary()[0];
  const changed = [{
    ...original,
    material: 'MDF, "A"\r\nsecond line',
    partIds: ['part, "A"', "part-b"],
    furnitureIds: ['cab, "B"']
  }];
  const { parsed, serialized } = roundTrip(changed);
  assert.ok(serialized.csv.includes('"MDF, ""A""\r\nsecond line"'));
  assert.deepEqual(parsed.materials, changed);
});

test("serializer fails closed on invalid totals, IDs, order and unknown fields", () => {
  const valid = createSummary()[0];
  const invalid = [
    { ...valid, totalQuantity: 1 },
    { ...valid, volumeM3: 0.01 },
    { ...valid, edgeBanding: { ...valid.edgeBanding, totalLengthMm: 1 } },
    { ...valid, partIds: ["part-b", "part-a"] },
    { ...valid, partIds: ["part-a", "part-a"] },
    { ...valid, furnitureIds: ["cab-b", "cab-a"] },
    { ...valid, furnitureIds: [] },
    { ...valid, furnitureIds: ["cab-a", "cab-a"] },
    { ...valid, extra: true }
  ];
  for (const entry of invalid) {
    const result = serializeProjectMaterialConsumptionCsv([entry]);
    assert.equal(result.status, "blocked");
    assert.equal(result.csv, null);
    assert.equal(result.diagnostics.length, 1);
  }
});

test("parser rejects malformed CSV, wrong version, units, headers and non-numeric fields", () => {
  const valid = serializeProjectMaterialConsumptionCsv(createSummary());
  assert.equal(valid.status, "ready");
  assert.ok(valid.csv);
  assert.equal(parseProjectMaterialConsumptionCsv("{not-csv").status, "blocked");
  assert.equal(parseProjectMaterialConsumptionCsv(valid.csv.replace('"MobilyaCADMaterialConsumptionCsv","1"', '"MobilyaCADMaterialConsumptionCsv","2"')).status, "blocked");
  assert.equal(parseProjectMaterialConsumptionCsv(valid.csv.replace('"mm","m2","m3","mm"', '"cm","m2","m3","mm"')).status, "blocked");
  assert.equal(parseProjectMaterialConsumptionCsv(valid.csv.replace('"material","materialId"', '"unknown","materialId"')).status, "blocked");
  assert.equal(parseProjectMaterialConsumptionCsv(valid.csv.replace('"18","2","3"', '"NaN","2","3"')).status, "blocked");
});

test("parser rejects partial and extra rows without returning any materials", () => {
  const valid = serializeProjectMaterialConsumptionCsv(createSummary());
  assert.equal(valid.status, "ready");
  assert.ok(valid.csv);
  const extra = valid.csv + '"unexpected"\r\n';
  const parsed = parseProjectMaterialConsumptionCsv(extra);
  assert.equal(parsed.status, "blocked");
  assert.equal(parsed.materials, null);
  assert.equal(parsed.file, null);
  const truncatedRow = valid.csv.replace('"MDF Lam","mdf-18","18","2","3","[""part-a"",""part-b""]","0.46","0.00828","1300","800","2100","5","[""cab-1""]"',
    '"MDF Lam","mdf-18","18","2","3","[""part-a"",""part-b""]","0.46","0.00828","1300","800","2100","5"');
  assert.equal(parseProjectMaterialConsumptionCsv(truncatedRow).status, "blocked");
});

test("serializer and parser do not mutate source material summaries", () => {
  const input = createSummary();
  const before = JSON.stringify(input);
  const serialized = serializeProjectMaterialConsumptionCsv(input);
  assert.equal(serialized.status, "ready");
  const parsed = parseProjectMaterialConsumptionCsv(serialized.csv);
  assert.equal(parsed.status, "ready");
  assert.equal(JSON.stringify(input), before);
});

test("parser rejects non-text and oversized inputs", () => {
  assert.equal(parseProjectMaterialConsumptionCsv(null).status, "blocked");
  assert.equal(parseProjectMaterialConsumptionCsv("x".repeat(5_000_001)).status, "blocked");
});
