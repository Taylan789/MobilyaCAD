import assert from "node:assert/strict";
import test from "node:test";

import {
  parseProjectQuoteRevisionComparisonCsv,
  PROJECT_QUOTE_REVISION_COMPARISON_CSV_COLUMNS,
  serializeProjectQuoteRevisionComparisonCsv
} from "./projectQuoteRevisionComparisonCsv.ts";

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
      toGrandTotalMinor: 10750,
      grandTotalDeltaMinor: 750,
      categoryDeltasMinor: {
        material: 1250, hardware: 0, labor: -500, operation: 0, waste: 0, profit: 0
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
        }
      ]
    }
  };
}

test("CSV v1 has stable columns and round-trips exact comparison metadata", () => {
  const original = readyComparisonResult();
  const serialized = serializeProjectQuoteRevisionComparisonCsv(original);
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.csv);
  assert.ok(serialized.csv.startsWith("\uFEFF"));
  const header = PROJECT_QUOTE_REVISION_COMPARISON_CSV_COLUMNS.map((column => '"' + column + '"')).join(",");
  assert.ok(serialized.csv.slice(1).startsWith(header + "\r\n"));
  assert.equal(serialized.csv.split('"MobilyaCADQuoteRevisionComparisonCsv","1","line"').length - 1, 3);

  const parsed = parseProjectQuoteRevisionComparisonCsv(serialized.csv);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison, original.comparison);
  assert.equal(parsed.comparison?.currencyCode, "TRY");
  assert.equal(parsed.comparison?.lineChanges[0].to.unit, "m2");
  assert.equal(parsed.comparison?.lineChanges[1].to.sourceReference, "edge-catalog-mm-v1");
  assert.deepEqual(parsed.comparison?.lineChanges[0].to.sourcePartIds, ["part-a", "part-b"]);
  assert.equal(parsed.comparison?.lineChanges[1].to.edgeDirection, "right");
  assert.equal(parsed.comparison?.lineChanges[2].from.tariffId, "labor-hourly");
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
  assert.equal(parsed.comparison.grandTotalDeltaMinor, 750);
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
