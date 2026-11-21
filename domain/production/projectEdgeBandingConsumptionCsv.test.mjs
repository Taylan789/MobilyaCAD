import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";
import {
  PROJECT_EDGE_BANDING_CONSUMPTION_CSV_COLUMNS,
  PROJECT_EDGE_BANDING_CONSUMPTION_CSV_FORMAT,
  PROJECT_EDGE_BANDING_CONSUMPTION_CSV_METADATA_COLUMNS,
  parseProjectEdgeBandingConsumptionCsv,
  serializeProjectEdgeBandingConsumptionCsv
} from "./projectEdgeBandingConsumptionCsv.ts";

const fixture = {
  schemaVersion: 1,
  furniture: [{ furnitureId: "cab-a" }, { furnitureId: "cab-b" }],
  parts: [
    { id: "part-b", furnitureId: "cab-a", name: "Shelf B", width: 500, length: 400, thickness: 18, quantity: 1, material: "MDF",
      edgeBanding: { top: true, bottom: false, left: true, right: false },
      edgeBandingByEdge: { top: { edgeBandingId: "pvc-top", unit: "mm" }, left: { edgeBandingId: "pvc-side", unit: "m" } },
    },
    { id: "part-a", furnitureId: "cab-b", name: "Shelf A", width: 300, length: 200, thickness: 18, quantity: 2, material: "MDF",
      edgeBanding: { top: true, bottom: false, left: false, right: false }, edgeBandingByEdge: { top: { edgeBandingId: "pvc-top", unit: "mm" } } },
    { id: "legacy-part", furnitureId: "cab-a", name: "Legacy shelf", width: 100, length: 50, thickness: 18, quantity: 1, material: "MDF",
      edgeBanding: { top: true, bottom: false, left: false, right: false } }
  ]
};
const summary = () => calculateProjectEdgeBandingConsumptionSummary(fixture);
function roundTrip(input) {
  const serialized = serializeProjectEdgeBandingConsumptionCsv(input);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join("; "));
  assert.ok(serialized.csv);
  const parsed = parseProjectEdgeBandingConsumptionCsv(serialized.csv);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join("; "));
  assert.ok(parsed.file);
  assert.deepEqual(parsed.groups, parsed.file.groups);
  assert.deepEqual(parsed.groups, input);
  return { serialized, parsed };
}

test("directional edge-band CSV v1 round-trips mm/m, direction and source IDs", () => {
  const input = summary();
  const { serialized, parsed } = roundTrip(input);
  assert.equal(parsed.file?.format, PROJECT_EDGE_BANDING_CONSUMPTION_CSV_FORMAT);
  assert.equal(parsed.file?.formatVersion, 1);
  assert.deepEqual(parsed.file?.units, { totalLengthMm: "mm", totalQuantity: "group.unit" });
  assert.equal(serialized.csv.charCodeAt(0), 0xfeff);
  assert.ok(serialized.csv.endsWith("\r\n"));
  assert.ok(serialized.csv.includes("\r\n"));
  assert.equal(serialized.csv.replace(/\r\n/g, "").includes("\n"), false);
  assert.deepEqual(PROJECT_EDGE_BANDING_CONSUMPTION_CSV_METADATA_COLUMNS, ["fileType", "schemaVersion", "totalLengthMmUnit", "totalQuantityUnit"]);
  assert.deepEqual(PROJECT_EDGE_BANDING_CONSUMPTION_CSV_COLUMNS, ["edgeBandingId", "unit", "edge", "partLineCount", "totalQuantity", "totalLengthMm", "edgeCount", "partIds", "furnitureIds"]);
});

test("empty consumption emits metadata and headers without invented group rows", () => {
  const { parsed, serialized } = roundTrip([]);
  assert.deepEqual(parsed.groups, []);
  assert.equal(serialized.csv.split("\r\n").length, 4);
});

test("CSV quoting preserves commas and quotes inside provenance IDs", () => {
  const original = summary().find(group => group.edgeBandingId === "pvc-top");
  assert.ok(original);
  const changed = [{ ...original, partLineCount: 1, totalQuantity: 100, totalLengthMm: 100, edgeCount: 1, partIds: ['part, "A"'], furnitureIds: ['cab,"B"'] }];
  const { parsed, serialized } = roundTrip(changed);
  const expectedPartCell = '"' + JSON.stringify(changed[0].partIds).replace(/"/g, '""') + '"';
  const expectedFurnitureCell = '"' + JSON.stringify(changed[0].furnitureIds).replace(/"/g, '""') + '"';
  assert.ok(serialized.csv.includes(expectedPartCell));
  assert.ok(serialized.csv.includes(expectedFurnitureCell));
  assert.deepEqual(parsed.groups, changed);
});

test("serializer fails closed for inconsistent groups and parser rejects metadata/header/JSON", () => {
  const invalid = summary().map(group => ({ ...group, totalQuantity: group.totalQuantity + 1 }));
  assert.equal(serializeProjectEdgeBandingConsumptionCsv(invalid).status, "blocked");
  const valid = serializeProjectEdgeBandingConsumptionCsv(summary());
  assert.equal(valid.status, "ready");
  assert.ok(valid.csv);
  assert.equal(parseProjectEdgeBandingConsumptionCsv(valid.csv.replace('"1","mm","group.unit"', '"2","mm","group.unit"')).status, "blocked");
  assert.equal(parseProjectEdgeBandingConsumptionCsv(valid.csv.replace('"furnitureIds"', '"unknownColumn"')).status, "blocked");
  assert.equal(parseProjectEdgeBandingConsumptionCsv(valid.csv.replace('"[""part-a"",""part-b""]"', '"not-json"')).status, "blocked");
  assert.equal(parseProjectEdgeBandingConsumptionCsv(valid.csv.replace('"mm"', '"cm"')).status, "blocked");
});

test("parser rejects malformed quotes, numeric cells and partial records", () => {
  const valid = serializeProjectEdgeBandingConsumptionCsv(summary());
  assert.equal(valid.status, "ready");
  assert.ok(valid.csv);
  const brokenQuotes = valid.csv.replace('"pvc-top"', '"pvc-top');
  assert.equal(parseProjectEdgeBandingConsumptionCsv(brokenQuotes).groups, null);
  const brokenNumber = valid.csv.replace('"1100"', '"not-a-number"');
  const parsed = parseProjectEdgeBandingConsumptionCsv(brokenNumber);
  assert.equal(parsed.status, "blocked");
  assert.equal(parsed.groups, null);
  assert.equal(parsed.file, null);
});

test("CSV size and group limits fail closed", () => {
  assert.equal(parseProjectEdgeBandingConsumptionCsv(" ".repeat(5_000_001)).status, "blocked");
  const manyGroups = Array.from({ length: 1_001 }, (_, index) => {
    const suffix = String(index).padStart(4, "0");
    return { edgeBandingId: "band-" + suffix, unit: "mm", partLineCount: 1, totalQuantity: 100, totalLengthMm: 100, edgeCount: 1, partIds: ["part-" + suffix], furnitureIds: ["furniture-" + suffix] };
  });
  assert.equal(serializeProjectEdgeBandingConsumptionCsv(manyGroups).status, "blocked");
});
