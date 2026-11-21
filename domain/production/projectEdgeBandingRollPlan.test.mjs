import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectEdgeBandingRollPlan } from "./projectEdgeBandingRollPlan.ts";

const groups = () => [
  { edgeBandingId: "pvc-18", unit: "m", edge: "left", partLineCount: 2, totalQuantity: 0.9, totalLengthMm: 900, edgeCount: 2, partIds: ["part-a", "part-b"], furnitureIds: ["cab-a"] },
  { edgeBandingId: "pvc-18", unit: "mm", edge: "top", partLineCount: 1, totalQuantity: 1200, totalLengthMm: 1200, edgeCount: 2, partIds: ["part-c"], furnitureIds: ["cab-b"] }
];

test("aggregates mm/m directional consumption by catalog ID and applies explicit roll/waste inputs", () => {
  const result = calculateProjectEdgeBandingRollPlan(groups(), [
    { edgeBandingId: "pvc-18", rollLengthMm: 1000, wasteAllowanceMm: 100, sourceReference: "Atölye rulo ölçüsü" }
  ]);
  assert.deepEqual(result, {
    status: "ready",
    plans: [{
      edgeBandingId: "pvc-18", consumedLengthMm: 2100, wasteAllowanceMm: 100,
      requiredLengthMm: 2200, rollLengthMm: 1000, rollCount: 3,
      purchasedLengthMm: 3000, leftoverLengthMm: 800,
      partIds: ["part-a", "part-b", "part-c"], furnitureIds: ["cab-a", "cab-b"],
      sourceReference: "Atölye rulo ölçüsü"
    }],
    missingRollSpecs: [], diagnostics: []
  });
});

test("exact roll fit without allowance produces no leftover", () => {
  const input = [{ edgeBandingId: "pvc-18", unit: "mm", edge: "top", partLineCount: 1, totalQuantity: 2000, totalLengthMm: 2000, edgeCount: 2, partIds: ["part-a"], furnitureIds: ["cab-a"] }];
  const result = calculateProjectEdgeBandingRollPlan(input, [{ edgeBandingId: "pvc-18", rollLengthMm: 1000 }]);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.plans?.[0], {
    edgeBandingId: "pvc-18", consumedLengthMm: 2000, wasteAllowanceMm: 0, requiredLengthMm: 2000,
    rollLengthMm: 1000, rollCount: 2, purchasedLengthMm: 2000, leftoverLengthMm: 0,
    partIds: ["part-a"], furnitureIds: ["cab-a"]
  });
});

test("one missing roll definition blocks all plans rather than returning a partial list", () => {
  const input = [
    { edgeBandingId: "pvc-a", unit: "mm", edge: "top", partLineCount: 1, totalQuantity: 500, totalLengthMm: 500, edgeCount: 1, partIds: ["part-a"], furnitureIds: ["cab-a"] },
    { edgeBandingId: "pvc-b", unit: "mm", edge: "left", partLineCount: 1, totalQuantity: 400, totalLengthMm: 400, edgeCount: 1, partIds: ["part-b"], furnitureIds: ["cab-b"] }
  ];
  const result = calculateProjectEdgeBandingRollPlan(input, [{ edgeBandingId: "pvc-a", rollLengthMm: 1000 }]);
  assert.equal(result.status, "incomplete");
  assert.equal(result.plans, null);
  assert.deepEqual(result.missingRollSpecs, ["pvc-b"]);
});

test("legacy unassigned edge banding cannot be planned using an invented catalog ID", () => {
  const legacy = [{ edgeBandingId: null, unit: "mm", partLineCount: 1, totalQuantity: 300, totalLengthMm: 300, edgeCount: 1, partIds: ["legacy-part"], furnitureIds: ["cab-a"] }];
  const result = calculateProjectEdgeBandingRollPlan(legacy, []);
  assert.equal(result.status, "blocked");
  assert.equal(result.plans, null);
  assert.match(result.diagnostics[0], /Katalog kimliği/);
});

test("empty consumption returns an empty plan without invented rolls", () => {
  assert.deepEqual(calculateProjectEdgeBandingRollPlan([], []), {
    status: "empty", plans: [], missingRollSpecs: [], diagnostics: []
  });
});

test("invalid, duplicate and unused roll definitions fail closed", () => {
  const input = [{ edgeBandingId: "pvc-18", unit: "mm", edge: "top", partLineCount: 1, totalQuantity: 100, totalLengthMm: 100, edgeCount: 1, partIds: ["part-a"], furnitureIds: ["cab-a"] }];
  const valid = { edgeBandingId: "pvc-18", rollLengthMm: 1000 };
  const invalidSpecs = [
    [{ ...valid, rollLengthMm: 0 }],
    [{ ...valid, rollLengthMm: 1000.05 }],
    [{ ...valid, wasteAllowanceMm: -1 }],
    [{ ...valid, unknown: true }],
    [valid, valid],
    [{ ...valid, sourceReference: " " }],
    [{ edgeBandingId: "pvc-other", rollLengthMm: 1000 }]
  ];
  for (const spec of invalidSpecs) assert.equal(calculateProjectEdgeBandingRollPlan(input, spec).status, "blocked", JSON.stringify(spec));
});

test("roll and allowance measurements preserve tenth-millimeter arithmetic", () => {
  const input = [{ edgeBandingId: "pvc-18", unit: "mm", edge: "top", partLineCount: 1, totalQuantity: 1200.1, totalLengthMm: 1200.1, edgeCount: 1, partIds: ["part-a"], furnitureIds: ["cab-a"] }];
  const result = calculateProjectEdgeBandingRollPlan(input, [{ edgeBandingId: "pvc-18", rollLengthMm: 1000, wasteAllowanceMm: 0.1 }]);
  assert.equal(result.status, "ready");
  assert.equal(result.plans?.[0].requiredLengthMm, 1200.2);
  assert.equal(result.plans?.[0].rollCount, 2);
  assert.equal(result.plans?.[0].leftoverLengthMm, 799.8);
});
