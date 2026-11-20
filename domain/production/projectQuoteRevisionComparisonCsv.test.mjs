import assert from "node:assert/strict";
import test from "node:test";

import {
  parseProjectQuoteRevisionComparisonCsv,
  PROJECT_QUOTE_REVISION_COMPARISON_CSV_COLUMNS,
  serializeProjectQuoteRevisionComparisonCsv
} from "./projectQuoteRevisionComparisonCsv.ts";


function quoteAdjustmentLine(category, description, sourceId, sourceReference, amount) {
  return { category, description, quantity: 1, unit: "kalem", unitPriceMinor: amount, lineTotalMinor: amount,
    currencyCode: "TRY", sourceReference, sourceType: "quote-adjustment", sourceId };
}
function quoteAdjustmentChanges() {
  return [
    { type: "changed", from: quoteAdjustmentLine("waste", "Manuel fire", "waste-adjustment-changed", "fire:v1", 100),
      to: quoteAdjustmentLine("waste", "Manuel fire", "waste-adjustment-changed", "fire:v2", 150) },
    { type: "added", from: null, to: quoteAdjustmentLine("waste", "Eklenen fire", "waste-adjustment-added", "fire:add:v1", 100) },
    { type: "removed", from: quoteAdjustmentLine("waste", "Eski fire", "waste-adjustment-removed", "fire:remove:v1", 25), to: null },
    { type: "changed", from: quoteAdjustmentLine("profit", "Manuel kâr", "profit-adjustment-changed", "profit:v1", 300),
      to: quoteAdjustmentLine("profit", "Manuel kâr", "profit-adjustment-changed", "profit:v2", 350) },
    { type: "added", from: null, to: quoteAdjustmentLine("profit", "Eklenen kâr", "profit-adjustment-added", "profit:add:v1", 200) },
    { type: "removed", from: quoteAdjustmentLine("profit", "Eski kâr", "profit-adjustment-removed", "profit:remove:v1", 50), to: null }
  ];
}
function assertQuoteAdjustmentProvenance(comparison) {
  const changes = comparison.lineChanges.filter(change => (change.from ?? change.to)?.sourceType === "quote-adjustment");
  assert.equal(changes.length, 6);
  assert.deepEqual(changes.reduce((counts, change) => { counts[change.type] += 1; return counts; }, { added: 0, removed: 0, changed: 0 }),
    { added: 2, removed: 2, changed: 2 });
  const summarize = line => line === null ? null : {
    sourceReference: line.sourceReference, lineTotalMinor: line.lineTotalMinor, category: line.category,
    sourceType: line.sourceType, unit: line.unit, currencyCode: line.currencyCode, quantity: line.quantity
  };
  const actual = changes.map(change => ({
    sourceId: (change.from ?? change.to).sourceId, type: change.type,
    from: summarize(change.from), to: summarize(change.to)
  })).sort((a, b) => a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0);
  assert.deepEqual(actual, [
    { sourceId: "profit-adjustment-added", type: "added", from: null, to: {
      sourceReference: "profit:add:v1", lineTotalMinor: 200, category: "profit", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    } },
    { sourceId: "profit-adjustment-changed", type: "changed", from: {
      sourceReference: "profit:v1", lineTotalMinor: 300, category: "profit", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    }, to: {
      sourceReference: "profit:v2", lineTotalMinor: 350, category: "profit", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    } },
    { sourceId: "profit-adjustment-removed", type: "removed", from: {
      sourceReference: "profit:remove:v1", lineTotalMinor: 50, category: "profit", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    }, to: null },
    { sourceId: "waste-adjustment-added", type: "added", from: null, to: {
      sourceReference: "fire:add:v1", lineTotalMinor: 100, category: "waste", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    } },
    { sourceId: "waste-adjustment-changed", type: "changed", from: {
      sourceReference: "fire:v1", lineTotalMinor: 100, category: "waste", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    }, to: {
      sourceReference: "fire:v2", lineTotalMinor: 150, category: "waste", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    } },
    { sourceId: "waste-adjustment-removed", type: "removed", from: {
      sourceReference: "fire:remove:v1", lineTotalMinor: 25, category: "waste", sourceType: "quote-adjustment", unit: "kalem", currencyCode: "TRY", quantity: 1
    }, to: null }
  ]);
  assert.equal(comparison.categoryDeltasMinor.waste, 125);
  assert.equal(comparison.categoryDeltasMinor.profit, 200);
  assert.equal(comparison.grandTotalDeltaMinor, 1075);
  assert.equal(comparison.toGrandTotalMinor, 11075);
}

function readyComparisonResult() {
  return {
    status: "ready",
    diagnostics: [],
    comparison: {
      schemaVersion: 1,
      projectId: "project-42",
      fromRevisionId: "quote-r1",
      fromRevisionNumber: 1,
      toRevisionId: "quote-r2",
      toRevisionNumber: 2,
      currencyCode: "TRY",
      fromGrandTotalMinor: 10000,
      toGrandTotalMinor: 11075,
      grandTotalDeltaMinor: 1075,
      categoryDeltasMinor: {
        material: 1250, hardware: 0, labor: -500, operation: 0, waste: 125, profit: 200
      },
      lineChanges: [
        {
          type: "changed",
          from: {
            category: "material", description: "MDF Lam 18", quantity: 2, unit: "m2",
            unitPriceMinor: 2000, lineTotalMinor: 4000, currencyCode: "TRY",
            sourceReference: "material-list-v1", sourceType: "production-consumption",
            sourceId: "mdf-18", sourcePartIds: ["part-a", "part-b"], edgeDirection: "top"
          },
          to: {
            category: "material", description: "MDF Lam 18", quantity: 2, unit: "m2",
            unitPriceMinor: 2500, lineTotalMinor: 5000, currencyCode: "TRY",
            sourceReference: "material-list-v2", sourceType: "production-consumption",
            sourceId: "mdf-18", sourcePartIds: ["part-a", "part-b"], edgeDirection: "top"
          }
        },
        {
          type: "added", from: null,
          to: {
            category: "material", description: "Kenar bandı PVC (sağ)", quantity: 250, unit: "mm",
            unitPriceMinor: 1, lineTotalMinor: 250, currencyCode: "TRY",
            sourceReference: "edge-catalog-mm-v1", sourceType: "production-consumption",
            sourceId: "pvc-1", sourcePartIds: ["part-edge"], edgeDirection: "right"
          }
        },
        {
          type: "removed",
          from: {
            category: "labor", description: "Dolap montajı", quantity: 1, unit: "h",
            unitPriceMinor: 500, lineTotalMinor: 500, currencyCode: "TRY",
            sourceReference: "labor-tariff-v1", sourceType: "labor-operation",
            sourceId: "assembly", tariffId: "labor-hourly"
          },
          to: null
        },
        ...quoteAdjustmentChanges()
      ]
    }
  };
}

test("CSV v2 has stable columns and round-trips exact comparison metadata", () => {
  const original = readyComparisonResult();
  const serialized = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.csv);
  assert.ok(serialized.csv.startsWith("\uFEFF"));
  const header = PROJECT_QUOTE_REVISION_COMPARISON_CSV_COLUMNS.map((column => '"' + column + '"')).join(",");
  assert.ok(serialized.csv.slice(1).startsWith(header + "\r\n"));
  assert.equal(serialized.csv.split('"MobilyaCADQuoteRevisionComparisonCsv","2","line"').length - 1, 9);

  const parsed = parseProjectQuoteRevisionComparisonCsv(serialized.csv);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison, original.comparison);
  assert.equal(parsed.comparison?.currencyCode, "TRY");
  assert.equal(parsed.comparison?.lineChanges[0].to.unit, "m2");
  assert.equal(parsed.comparison?.lineChanges[1].to.sourceReference, "edge-catalog-mm-v1");
  assert.deepEqual(parsed.comparison?.lineChanges[0].to.sourcePartIds, ["part-a", "part-b"]);
  assert.equal(parsed.comparison?.lineChanges[1].to.edgeDirection, "right");
  assert.equal(parsed.comparison?.lineChanges[2].from.tariffId, "labor-hourly");
  assertQuoteAdjustmentProvenance(parsed.comparison);
});

test("CSV quoting round-trip preserves Turkish text, commas, quotes and embedded line breaks", () => {
  const original = readyComparisonResult();
  const escapedText = 'MDF, "özel"\r\nlam';
  original.comparison.lineChanges[0].from.description = escapedText;
  original.comparison.lineChanges[0].to.description = escapedText;
  original.comparison.lineChanges[0].to.sourceReference = 'katalog, "rev 2"';
  const serialized = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(serialized.status, "ready");
  const parsed = parseProjectQuoteRevisionComparisonCsv(serialized.csv);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison, original.comparison);
  assert.match(serialized.csv, /""özel""/);
});

test("CSV preserves mm and m as separate line changes without conversion", () => {
  const original = readyComparisonResult();
  original.comparison.fromGrandTotalMinor = 10000;
  original.comparison.toGrandTotalMinor = 10000;
  original.comparison.grandTotalDeltaMinor = 0;
  original.comparison.categoryDeltasMinor = { material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 };
  original.comparison.lineChanges = [
    {
      type: "removed",
      from: {
        category: "material", description: "PVC", quantity: 300, unit: "mm",
        unitPriceMinor: 1, lineTotalMinor: 300, currencyCode: "TRY",
        sourceType: "production-consumption", sourceId: "pvc", sourcePartIds: ["part-1"]
      },
      to: null
    },
    {
      type: "added",
      from: null,
      to: {
        category: "material", description: "PVC", quantity: 0.3, unit: "m",
        unitPriceMinor: 1000, lineTotalMinor: 300, currencyCode: "TRY",
        sourceType: "production-consumption", sourceId: "pvc", sourcePartIds: ["part-1"]
      }
    }
  ];
  const serialized = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(serialized.status, "ready");
  const parsed = parseProjectQuoteRevisionComparisonCsv(serialized.csv);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison.lineChanges.map((line) => line.type), ["removed", "added"]);
  assert.equal(parsed.comparison.lineChanges[0].from.unit, "mm");
  assert.equal(parsed.comparison.lineChanges[1].to.unit, "m");
  assert.equal(parsed.comparison.grandTotalDeltaMinor, 0);
});

test("CSV rejects inconsistent category deltas, malformed quoting and unknown headers", () => {
  const valid = serializeProjectQuoteRevisionComparisonCsv(readyComparisonResult());
  assert.equal(valid.status, "ready");
  const categoryTampered = valid.csv.replace('"material","1250",""', '"material","9999",""');
  assert.equal(parseProjectQuoteRevisionComparisonCsv(categoryTampered).status, "blocked");
  assert.equal(parseProjectQuoteRevisionComparisonCsv(valid.csv.replace('"MDF Lam 18"', '"MDF Lam 18')).comparison, null);
  const unknownHeader = valid.csv.replace('"projectId"', '"extraField"');
  assert.equal(parseProjectQuoteRevisionComparisonCsv(unknownHeader).status, "blocked");
});

test("CSV fails closed for blocked input and round-trips absent optional metadata", () => {
  const blocked = serializeProjectQuoteRevisionComparisonCsv({
    status: "blocked", comparison: null, diagnostics: ["currency mismatch"]
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.csv, null);

  const original = readyComparisonResult();
  delete original.comparison.lineChanges[1].to.sourceReference;
  delete original.comparison.lineChanges[1].to.sourcePartIds;
  delete original.comparison.lineChanges[1].to.edgeDirection;
  const serialized = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(serialized.status, "ready");
  const parsed = parseProjectQuoteRevisionComparisonCsv(serialized.csv);
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.comparison.lineChanges[1].to.sourceReference, undefined);
  assert.equal(parsed.comparison.lineChanges[1].to.sourcePartIds, undefined);
  assert.equal(parsed.comparison.lineChanges[1].to.edgeDirection, undefined);
});

test("CSV represents an empty comparison with total and category rows only", () => {
  const original = readyComparisonResult();
  original.comparison.fromGrandTotalMinor = 10000;
  original.comparison.toGrandTotalMinor = 10000;
  original.comparison.grandTotalDeltaMinor = 0;
  original.comparison.categoryDeltasMinor = { material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 };
  original.comparison.lineChanges = [];
  const serialized = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(serialized.status, "ready");
  const parsed = parseProjectQuoteRevisionComparisonCsv(serialized.csv);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison.lineChanges, []);
});


function emptyComparisonResult() {
  const result = readyComparisonResult();
  result.comparison.fromGrandTotalMinor = 10000;
  result.comparison.toGrandTotalMinor = 10000;
  result.comparison.grandTotalDeltaMinor = 0;
  result.comparison.categoryDeltasMinor = { material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 };
  result.comparison.lineChanges = [];
  return result;
}

function toLegacyV1Csv(csv) {
  const records = csv.slice(1).trimEnd().split("\r\n").map(row => row.split(",").map(cell => cell.slice(1, -1)));
  const legacyColumnCount = PROJECT_QUOTE_REVISION_COMPARISON_CSV_COLUMNS.length - 12;
  return records.map((row, index) => {
    if (index > 0) row[1] = "1";
    return row.slice(0, legacyColumnCount).map(value => '"' + value.replace(/"/g, '""') + '"').join(",");
  }).join("\r\n") + "\r\n";
}

test("DOM-072 CSV v2 round-trip preserves roll count, lengths and source references", () => {
  const original = readyComparisonResult();
  const from = {
    category: "material", description: "PVC rulo satın alımı", quantity: 1, unit: "rulo",
    unitPriceMinor: 15000, lineTotalMinor: 15000, currencyCode: "TRY",
    sourceReference: "roll-prices:v1", sourceType: "production-consumption", sourceId: "pvc-roll",
    sourcePartIds: ["part-a", "part-b"], rollCount: 1, rollLengthMm: 100000,
    purchasedLengthMm: 100000, furnitureIds: ["cabinet-a"],
    planSourceReference: "roll-spec:v1", priceSourceReference: "roll-prices:v1"
  };
  const to = { ...from, quantity: 2, unitPriceMinor: 18000, lineTotalMinor: 36000,
    sourceReference: "roll-prices:v2", rollCount: 2, purchasedLengthMm: 200000,
    planSourceReference: "roll-spec:v2", priceSourceReference: "roll-prices:v2" };
  original.comparison.lineChanges.push({ type: "changed", from, to });
  original.comparison.fromGrandTotalMinor += from.lineTotalMinor;
  original.comparison.toGrandTotalMinor += to.lineTotalMinor;
  original.comparison.grandTotalDeltaMinor = original.comparison.toGrandTotalMinor - original.comparison.fromGrandTotalMinor;
  original.comparison.categoryDeltasMinor.material += to.lineTotalMinor - from.lineTotalMinor;

  const serialized = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join("; "));
  assert.ok(serialized.csv);
  assert.match(serialized.csv, /"fromRollCount","toRollCount"/);
  assert.match(serialized.csv, /"fromPlanSourceReference","toPlanSourceReference"/);
  const parsed = parseProjectQuoteRevisionComparisonCsv(serialized.csv);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join("; "));
  const rollChange = parsed.comparison.lineChanges.find(change => (change.from ?? change.to)?.unit === "rulo");
  assert.ok(rollChange);
  assert.deepEqual(rollChange.from, from);
  assert.deepEqual(rollChange.to, to);
});

test("DOM-072 CSV v2 blocks inconsistent roll metadata instead of partial export", () => {
  const candidate = emptyComparisonResult();
  candidate.comparison.lineChanges = [{
    type: "added", from: null, to: {
      category: "material", description: "PVC rulo", quantity: 2, unit: "rulo",
      unitPriceMinor: 10000, lineTotalMinor: 20000, currencyCode: "TRY",
      sourceType: "production-consumption", sourceId: "pvc-roll", sourcePartIds: ["part-a"],
      rollCount: 2, rollLengthMm: 100000, purchasedLengthMm: 100000, furnitureIds: ["cabinet-a"]
    }
  }];
  candidate.comparison.fromGrandTotalMinor = 0;
  candidate.comparison.toGrandTotalMinor = 20000;
  candidate.comparison.grandTotalDeltaMinor = 20000;
  candidate.comparison.categoryDeltasMinor.material = 20000;
  const serialized = serializeProjectQuoteRevisionComparisonCsv(candidate);
  assert.equal(serialized.status, "blocked");
  assert.equal(serialized.csv, null);
});

test("DOM-072 legacy CSV v1 without roll metadata remains readable", () => {
  const original = emptyComparisonResult();
  const current = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(current.status, "ready");
  const legacy = toLegacyV1Csv(current.csv);
  const parsed = parseProjectQuoteRevisionComparisonCsv(legacy);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison, original.comparison);
  assert.equal(parsed.comparison.lineChanges.length, 0);
});
