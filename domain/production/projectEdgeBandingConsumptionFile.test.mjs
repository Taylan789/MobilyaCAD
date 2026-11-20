import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";
import { PROJECT_EDGE_BANDING_CONSUMPTION_FILE_TYPE, PROJECT_EDGE_BANDING_CONSUMPTION_FILE_UNITS, parseProjectEdgeBandingConsumptionFile, serializeProjectEdgeBandingConsumptionFile } from "./projectEdgeBandingConsumptionFile.ts";

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
const groups = () => calculateProjectEdgeBandingConsumptionSummary(fixture);
function roundTrip(input) {
  const out = serializeProjectEdgeBandingConsumptionFile(input);
  assert.equal(out.status, "ready", out.diagnostics.join("; "));
  assert.ok(out.json);
  const parsed = parseProjectEdgeBandingConsumptionFile(out.json);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join("; "));
  assert.ok(parsed.file);
  assert.deepEqual(parsed.groups, parsed.file.groups);
  assert.deepEqual(parsed.groups, input);
  return { out, parsed };
}

test("directional edge-band JSON v1 preserves mm/m, edge and Part/furniture provenance", () => {
  const summary = groups();
  const legacy = summary.find((g) => g.edgeBandingId === null), left = summary.find((g) => g.edgeBandingId === "pvc-side"), top = summary.find((g) => g.edgeBandingId === "pvc-top");
  assert.deepEqual(legacy, { edgeBandingId: null, unit: "mm", partLineCount: 1, totalQuantity: 100, totalLengthMm: 100, edgeCount: 1, partIds: ["legacy-part"], furnitureIds: ["cab-a"] });
  assert.deepEqual(left, { edgeBandingId: "pvc-side", unit: "m", edge: "left", partLineCount: 1, totalQuantity: 0.4, totalLengthMm: 400, edgeCount: 1, partIds: ["part-b"], furnitureIds: ["cab-a"] });
  assert.deepEqual(top, { edgeBandingId: "pvc-top", unit: "mm", edge: "top", partLineCount: 2, totalQuantity: 1100, totalLengthMm: 1100, edgeCount: 3, partIds: ["part-a", "part-b"], furnitureIds: ["cab-a", "cab-b"] });
  assert.ok(left?.partIds.some((id) => top?.partIds.includes(id)), "same Part can appear in distinct directional groups");
  const { parsed } = roundTrip(summary);
  assert.equal(parsed.file?.fileType, PROJECT_EDGE_BANDING_CONSUMPTION_FILE_TYPE);
  assert.deepEqual(parsed.file?.units, PROJECT_EDGE_BANDING_CONSUMPTION_FILE_UNITS);
});

test("empty summary round-trips without fabricating material groups", () => { assert.deepEqual(roundTrip([]).parsed.groups, []); });

test("serializer rejects duplicate groups, unknown fields and invalid arithmetic/provenance", () => {
  const top = groups().find((g) => g.edgeBandingId === "pvc-top");
  assert.ok(top);
  const invalid = [
    { ...top, extra: true }, { ...top, totalQuantity: top.totalQuantity + 1 }, { ...top, totalLengthMm: 1100.01 },
    { ...top, edge: "front" }, { ...top, edgeBandingId: "PVC TOP" }, { ...top, partIds: [...top.partIds].reverse() },
    { ...top, partIds: [top.partIds[0], top.partIds[0]] }, { ...top, furnitureIds: [top.furnitureIds[0], top.furnitureIds[0]] },
    { ...top, edgeCount: 1 }, { ...top, partLineCount: 1 }
  ];
  for (const group of invalid) assert.equal(serializeProjectEdgeBandingConsumptionFile([group]).status, "blocked");
  assert.equal(serializeProjectEdgeBandingConsumptionFile([...groups(), groups()[0]]).status, "blocked");
});

test("parser blocks unsupported versions/units, unknown fields, duplicate groups and malformed input", () => {
  const json = roundTrip(groups()).out.json;
  assert.ok(json);
  const valid = JSON.parse(json);
  const invalid = [
    { ...valid, extra: true }, { ...valid, schemaVersion: 2 }, { ...valid, units: { totalLengthMm: "cm", totalQuantity: "group.unit" } },
    { ...valid, groups: [{ ...valid.groups[0], extra: true }] }, { ...valid, groups: [...valid.groups, valid.groups[0]] }
  ];
  for (const file of invalid) assert.equal(parseProjectEdgeBandingConsumptionFile(JSON.stringify(file)).status, "blocked");
  assert.equal(parseProjectEdgeBandingConsumptionFile("{broken").status, "blocked");
  assert.equal(parseProjectEdgeBandingConsumptionFile({}).status, "blocked");
});

test("serializer blocks provenance beyond 10,000 IDs and parser blocks 5 MB input", () => {
  const ids = Array.from({ length: 10_001 }, (_, i) => "part-" + String(i).padStart(5, "0"));
  const tooMany = { edgeBandingId: null, unit: "mm", partLineCount: ids.length, totalQuantity: ids.length, totalLengthMm: ids.length, edgeCount: ids.length, partIds: ids, furnitureIds: ["cab"] };
  assert.equal(serializeProjectEdgeBandingConsumptionFile([tooMany]).status, "blocked");
  assert.equal(parseProjectEdgeBandingConsumptionFile(" ".repeat(5_000_001)).status, "blocked");
});
