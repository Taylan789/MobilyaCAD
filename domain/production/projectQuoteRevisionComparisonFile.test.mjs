import assert from "node:assert/strict";
import test from "node:test";

import {
  parseProjectQuoteRevisionComparisonFile,
  PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE,
  serializeProjectQuoteRevisionComparisonFile
} from "./projectQuoteRevisionComparisonFile.ts";

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
        material: 1250,
        hardware: 0,
        labor: -500,
        operation: 0,
        waste: 0,
        profit: 0
      },
      lineChanges: [
        {
          type: "changed",
          from: {
            category: "material",
            description: "MDF Lam 18",
            quantity: 2,
            unit: "m2",
            unitPriceMinor: 2000,
            lineTotalMinor: 4000,
            currencyCode: "TRY",
            sourceReference: "material-list-v1",
            sourceType: "production-consumption",
            sourceId: "mdf-18",
            sourcePartIds: ["part-a", "part-b"],
            edgeDirection: "top"
          },
          to: {
            category: "material",
            description: "MDF Lam 18",
            quantity: 2,
            unit: "m2",
            unitPriceMinor: 2500,
            lineTotalMinor: 5000,
            currencyCode: "TRY",
            sourceReference: "material-list-v2",
            sourceType: "production-consumption",
            sourceId: "mdf-18",
            sourcePartIds: ["part-a", "part-b"],
            edgeDirection: "top"
          }
        },
        {
          type: "added",
          from: null,
          to: {
            category: "material",
            description: "Kenar bandı PVC (sağ)",
            quantity: 250,
            unit: "mm",
            unitPriceMinor: 1,
            lineTotalMinor: 250,
            currencyCode: "TRY",
            sourceReference: "edge-catalog-mm-v1",
            sourceType: "production-consumption",
            sourceId: "pvc-1",
            sourcePartIds: ["part-edge"],
            edgeDirection: "right"
          }
        },
        {
          type: "removed",
          from: {
            category: "labor",
            description: "Dolap montajı",
            quantity: 1,
            unit: "h",
            unitPriceMinor: 500,
            lineTotalMinor: 500,
            currencyCode: "TRY",
            sourceReference: "labor-tariff-v1",
            sourceType: "labor-operation",
            sourceId: "assembly",
            tariffId: "labor-hourly"
          },
          to: null
        }
      ]
    }
  };
}

test("comparison JSON export round-trip exact currency, source, Part IDs and edge direction metadata", () => {
  const original = readyComparisonResult();
  const serialized = serializeProjectQuoteRevisionComparisonFile(original);

  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  const envelope = JSON.parse(serialized.json);
  assert.equal(envelope.fileType, PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE);
  assert.equal(envelope.schemaVersion, 1);
  assert.deepEqual(envelope.comparison, original.comparison);

  const parsed = parseProjectQuoteRevisionComparisonFile(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison, original.comparison);
  assert.equal(parsed.comparison?.currencyCode, "TRY");
  assert.equal(parsed.comparison?.lineChanges[0].from.unit, "m2");
  assert.equal(parsed.comparison?.lineChanges[0].to.sourceReference, "material-list-v2");
  assert.deepEqual(parsed.comparison?.lineChanges[0].to.sourcePartIds, ["part-a", "part-b"]);
  assert.equal(parsed.comparison?.lineChanges[1].to.edgeDirection, "right");
  assert.equal(parsed.comparison?.lineChanges[2].from.tariffId, "labor-hourly");
});

test("comparison JSON preserves mm and m as distinct added/removed lines without conversion", () => {
  const result = {
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
      fromGrandTotalMinor: 1000,
      toGrandTotalMinor: 1000,
      grandTotalDeltaMinor: 0,
      categoryDeltasMinor: { material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 },
      lineChanges: [
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
      ]
    }
  };
  const serialized = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(serialized.status, "ready");
  const parsed = parseProjectQuoteRevisionComparisonFile(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison?.lineChanges.map((change) => change.type), ["removed", "added"]);
  assert.equal(parsed.comparison?.lineChanges[0].from.unit, "mm");
  assert.equal(parsed.comparison?.lineChanges[1].to.unit, "m");
  assert.equal(parsed.comparison?.grandTotalDeltaMinor, 0);
});

test("tampered line/category totals block serialization without a partial JSON result", () => {
  const tampered = readyComparisonResult();
  tampered.comparison.categoryDeltasMinor.material = 1000;
  tampered.comparison.categoryDeltasMinor.labor = -250;
  const serialized = serializeProjectQuoteRevisionComparisonFile(tampered);

  assert.equal(serialized.status, "blocked");
  assert.equal(serialized.json, null);
  assert.match(serialized.diagnostics[0], /satır farkları kategori toplam farkıyla uyuşmuyor/);
});

test("unknown fields and unsupported comparison versions are rejected during parse", () => {
  const valid = serializeProjectQuoteRevisionComparisonFile(readyComparisonResult());
  assert.equal(valid.status, "ready");
  const unknown = JSON.parse(valid.json);
  unknown.comparison.extra = true;
  const unknownResult = parseProjectQuoteRevisionComparisonFile(JSON.stringify(unknown));
  assert.equal(unknownResult.status, "blocked");
  assert.equal(unknownResult.file, null);
  assert.equal(unknownResult.comparison, null);

  const unsupported = JSON.parse(valid.json);
  unsupported.schemaVersion = 2;
  const unsupportedResult = parseProjectQuoteRevisionComparisonFile(JSON.stringify(unsupported));
  assert.equal(unsupportedResult.status, "blocked");
  assert.equal(unsupportedResult.comparison, null);
});

test("blocked comparison and malformed JSON do not produce export data", () => {
  const blocked = serializeProjectQuoteRevisionComparisonFile({
    status: "blocked",
    comparison: null,
    diagnostics: ["currency mismatch"]
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.json, null);

  const malformed = parseProjectQuoteRevisionComparisonFile("{");
  assert.equal(malformed.status, "blocked");
  assert.equal(malformed.file, null);
  assert.equal(malformed.comparison, null);

  const nonString = parseProjectQuoteRevisionComparisonFile({ fileType: "wrong" });
  assert.equal(nonString.status, "blocked");
  assert.equal(nonString.file, null);
});
