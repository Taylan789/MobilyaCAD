import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectEdgeBandingRollCostSummary } from "./projectEdgeBandingRollCostSummary.ts";

const readyRollPlan = () => ({
  status: "ready",
  plans: [
    {
      edgeBandingId: "pvc-b",
      consumedLengthMm: 1000,
      wasteAllowanceMm: 0,
      requiredLengthMm: 1000,
      rollLengthMm: 1000,
      rollCount: 1,
      purchasedLengthMm: 1000,
      leftoverLengthMm: 0,
      partIds: ["part-b"],
      furnitureIds: ["cab-b"],
      sourceReference: "rulo-b:v1"
    },
    {
      edgeBandingId: "pvc-a",
      consumedLengthMm: 1000,
      wasteAllowanceMm: 0,
      requiredLengthMm: 1000,
      rollLengthMm: 500,
      rollCount: 2,
      purchasedLengthMm: 1000,
      leftoverLengthMm: 0,
      partIds: ["part-a"],
      furnitureIds: ["cab-a"],
      sourceReference: "rulo-a:v1"
    }
  ],
  missingRollSpecs: [],
  diagnostics: []
});

const price = (overrides = {}) => ({
  edgeBandingId: "pvc-a",
  unit: "rulo",
  unitPriceMinor: 25000,
  currencyCode: "TRY",
  sourceReference: "atolye-fiyat-listesi:v2",
  ...overrides
});

test("rulo adedi üzerinden açık fiyatları quote-ready material satırlarına dönüştürür ve kaynakları korur", () => {
  const result = calculateProjectEdgeBandingRollCostSummary(readyRollPlan(), [
    price({ edgeBandingId: "pvc-b", unitPriceMinor: 12000, sourceReference: "fiyat-b:v1" }),
    price()
  ]);
  assert.equal(result.status, "ready");
  assert.equal(result.currencyCode, "TRY");
  assert.equal(result.requiredLineCount, 2);
  assert.equal(result.pricedLineCount, 2);
  assert.deepEqual(result.missingPrices, []);
  assert.deepEqual(result.costSummary?.lines.map((line) => [line.id, line.quantity, line.unitPriceMinor, line.lineTotalMinor]), [
    ["edge-roll-0001", 2, 25000, 50000],
    ["edge-roll-0002", 1, 12000, 12000]
  ]);
  assert.equal(result.costSummary?.categoryTotalsMinor.material, 62000);
  assert.equal(result.costSummary?.grandTotalMinor, 62000);
  assert.deepEqual(result.lineSources.map((source) => source.edgeBandingId), ["pvc-a", "pvc-b"]);
  assert.deepEqual(result.lineSources[0].partIds, ["part-a"]);
  assert.equal(result.lineSources[0].planSourceReference, "rulo-a:v1");
  assert.equal(result.lineSources[0].priceSourceReference, "atolye-fiyat-listesi:v2");
});

test("explicit zero price is accepted without inferring a price", () => {
  const result = calculateProjectEdgeBandingRollCostSummary(readyRollPlan(), [
    price({ unitPriceMinor: 0, sourceReference: "free-sample" }),
    price({ edgeBandingId: "pvc-b", unitPriceMinor: 0 })
  ]);
  assert.equal(result.status, "ready");
  assert.equal(result.costSummary?.grandTotalMinor, 0);
  assert.equal(result.costSummary?.lines[0].unitPriceMinor, 0);
});

test("missing roll prices produce an incomplete result without partial cost lines", () => {
  const result = calculateProjectEdgeBandingRollCostSummary(readyRollPlan(), [price()]);
  assert.equal(result.status, "incomplete");
  assert.equal(result.requiredLineCount, 2);
  assert.equal(result.pricedLineCount, 1);
  assert.deepEqual(result.missingPrices, ["pvc-b"]);
  assert.equal(result.costSummary, null);
  assert.deepEqual(result.lineSources, []);
});

test("mixed currencies and unused catalog prices block the complete cost summary", () => {
  const mixed = calculateProjectEdgeBandingRollCostSummary(readyRollPlan(), [
    price({ currencyCode: "TRY" }),
    price({ edgeBandingId: "pvc-b", currencyCode: "USD" })
  ]);
  assert.equal(mixed.status, "blocked");
  assert.equal(mixed.costSummary, null);
  const unused = calculateProjectEdgeBandingRollCostSummary(readyRollPlan(), [
    price(),
    price({ edgeBandingId: "pvc-b" }),
    price({ edgeBandingId: "pvc-unused" })
  ]);
  assert.equal(unused.status, "blocked");
  assert.match(unused.diagnostics[0], /bulunmayan rulo fiyatları/);
  assert.equal(unused.costSummary, null);
});

test("duplicate, unknown, wrong-unit, invalid-currency and invalid-price inputs fail closed", () => {
  const valid = price();
  const invalidTables = [
    [valid, valid],
    [{ ...valid, extra: true }],
    [{ ...valid, unit: "metre" }],
    [{ ...valid, currencyCode: "try" }],
    [{ ...valid, unitPriceMinor: -1 }],
    [{ ...valid, unitPriceMinor: 1.5 }],
    [{ ...valid, sourceReference: " " }]
  ];
  for (const table of invalidTables) {
    const result = calculateProjectEdgeBandingRollCostSummary(readyRollPlan(), table);
    assert.equal(result.status, "blocked", JSON.stringify(table));
    assert.equal(result.costSummary, null);
  }
});

test("roll plan arithmetic and source IDs are revalidated before pricing", () => {
  const plan = readyRollPlan();
  plan.plans[0].rollCount = 2;
  const result = calculateProjectEdgeBandingRollCostSummary(plan, [
    price(),
    price({ edgeBandingId: "pvc-b", unitPriceMinor: 12000 })
  ]);
  assert.equal(result.status, "blocked");
  assert.equal(result.costSummary, null);
  const invalidSource = readyRollPlan();
  invalidSource.plans[0].partIds = ["part-b", "part-b"];
  assert.equal(calculateProjectEdgeBandingRollCostSummary(invalidSource, []).status, "blocked");
});

test("incomplete roll quantity plan propagates missing roll specifications", () => {
  const result = calculateProjectEdgeBandingRollCostSummary({
    status: "incomplete",
    plans: null,
    missingRollSpecs: ["pvc-a"],
    diagnostics: ["Rulo uzunluğu tanımlanmalı."]
  }, []);
  assert.equal(result.status, "incomplete");
  assert.deepEqual(result.missingRollSpecs, ["pvc-a"]);
  assert.equal(result.costSummary, null);
});

test("empty plan stays empty; unused prices are rejected", () => {
  const empty = calculateProjectEdgeBandingRollCostSummary({
    status: "empty", plans: [], missingRollSpecs: [], diagnostics: []
  }, []);
  assert.equal(empty.status, "empty");
  assert.equal(empty.costSummary, null);
  const unused = calculateProjectEdgeBandingRollCostSummary({
    status: "empty", plans: [], missingRollSpecs: [], diagnostics: []
  }, [price()]);
  assert.equal(unused.status, "blocked");
  assert.equal(unused.costSummary, null);
});

test("blocked roll plan remains blocked and exposes no cost output", () => {
  const result = calculateProjectEdgeBandingRollCostSummary({
    status: "blocked", plans: null, missingRollSpecs: [], diagnostics: ["Legacy katalog kimliği eksik."]
  }, [price()]);
  assert.equal(result.status, "blocked");
  assert.equal(result.costSummary, null);
  assert.equal(result.lineSources.length, 0);
});
