import assert from "node:assert/strict";
import test from "node:test";

import {
  appendProjectQuoteRevision,
  compareProjectQuoteRevisions,
  createProjectQuoteRevision
} from "./projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionComparisonFile,
  PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE,
  serializeProjectQuoteRevisionComparisonFile
} from "./projectQuoteRevisionComparisonFile.ts";


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
        material: 1250,
        hardware: 0,
        labor: -500,
        operation: 0,
        waste: 125,
        profit: 200
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
        },
        ...quoteAdjustmentChanges()
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
  assert.equal(envelope.schemaVersion, 2);
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
  assertQuoteAdjustmentProvenance(parsed.comparison);
});

test("legacy JSON v1 comparisons remain readable without catalog resource metadata", () => {
  const original = readyComparisonResult();
  const legacyEnvelope = {
    fileType: PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE,
    schemaVersion: 1,
    comparison: original.comparison
  };
  const parsed = parseProjectQuoteRevisionComparisonFile(JSON.stringify(legacyEnvelope));
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.file.schemaVersion, 1);
  assert.deepEqual(parsed.comparison, original.comparison);
});

test("JSON v2 preserves complete catalog resource identity and rejects partial or mismatched metadata", () => {
  const original = readyComparisonResult();
  const materialChange = original.comparison.lineChanges[0];
  for (const line of [materialChange.from, materialChange.to]) {
    line.resourceType = "material";
    line.resourceId = "mdf-18";
    line.resourceUnit = "m2";
  }
  const edgeBandLine = original.comparison.lineChanges[1].to;
  edgeBandLine.resourceType = "edge-banding";
  edgeBandLine.resourceId = "pvc-1";
  edgeBandLine.resourceUnit = "mm";
  const serialized = serializeProjectQuoteRevisionComparisonFile(original);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join("; "));
  assert.equal(JSON.parse(serialized.json).schemaVersion, 2);
  const parsed = parseProjectQuoteRevisionComparisonFile(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison, original.comparison);
  assert.equal(parsed.comparison.lineChanges[1].to.resourceId, "pvc-1");

  const partial = structuredClone(original);
  delete partial.comparison.lineChanges[0].to.resourceId;
  assert.equal(serializeProjectQuoteRevisionComparisonFile(partial).status, "blocked");
  const mismatched = structuredClone(original);
  mismatched.comparison.lineChanges[0].to.resourceUnit = "kg";
  assert.equal(serializeProjectQuoteRevisionComparisonFile(mismatched).status, "blocked");

  const legacyWithMetadata = structuredClone(original);
  legacyWithMetadata.comparison.lineChanges[0].to.resourceType = "material";
  legacyWithMetadata.comparison.lineChanges[0].to.resourceId = "mdf-18";
  legacyWithMetadata.comparison.lineChanges[0].to.resourceUnit = "m2";
  const legacyParse = parseProjectQuoteRevisionComparisonFile(JSON.stringify({
    fileType: PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE,
    schemaVersion: 1,
    comparison: legacyWithMetadata.comparison
  }));
  assert.equal(legacyParse.status, "blocked");
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
  assert.equal(serialized.status, "ready", serialized.diagnostics.join("; "));
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

  const valid = serializeProjectQuoteRevisionComparisonFile(readyComparisonResult());
  assert.equal(valid.status, "ready");
  const malformedTotals = JSON.parse(valid.json);
  malformedTotals.comparison.categoryDeltasMinor.material += 1;
  const parsedMalformed = parseProjectQuoteRevisionComparisonFile(JSON.stringify(malformedTotals));
  assert.equal(parsedMalformed.status, "blocked");
  assert.equal(parsedMalformed.file, null);
  assert.equal(parsedMalformed.comparison, null);
});

test("DOM-096 JSON import/export blocks duplicate line identities without partial payload", () => {
  const duplicateResult = readyComparisonResult();
  const duplicate = structuredClone(duplicateResult.comparison.lineChanges[0]);
  duplicateResult.comparison.lineChanges.push(duplicate);
  duplicateResult.comparison.categoryDeltasMinor.material += 1000;
  duplicateResult.comparison.grandTotalDeltaMinor += 1000;
  duplicateResult.comparison.toGrandTotalMinor += 1000;
  const serializedDuplicate = serializeProjectQuoteRevisionComparisonFile(duplicateResult);
  assert.equal(serializedDuplicate.status, "blocked");
  assert.equal(serializedDuplicate.json, null);
  assert.match(serializedDuplicate.diagnostics[0], /yineleniyor/);

  const valid = serializeProjectQuoteRevisionComparisonFile(readyComparisonResult());
  assert.equal(valid.status, "ready");
  const duplicateImport = JSON.parse(valid.json);
  const repeated = structuredClone(duplicateImport.comparison.lineChanges[0]);
  duplicateImport.comparison.lineChanges.push(repeated);
  duplicateImport.comparison.categoryDeltasMinor.material += 1000;
  duplicateImport.comparison.grandTotalDeltaMinor += 1000;
  duplicateImport.comparison.toGrandTotalMinor += 1000;
  const parsedDuplicate = parseProjectQuoteRevisionComparisonFile(JSON.stringify(duplicateImport));
  assert.equal(parsedDuplicate.status, "blocked");
  assert.equal(parsedDuplicate.file, null);
  assert.equal(parsedDuplicate.comparison, null);
  assert.match(parsedDuplicate.diagnostics[0], /yineleniyor/);
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
  unsupported.schemaVersion = 3;
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


function createRollPricingSnapshot({ rollCount, rollLengthMm, unitPriceMinor, planSourceReference, priceSourceReference }) {
  const lineTotalMinor = rollCount * unitPriceMinor;
  return {
    schemaVersion: 1,
    quotedOn: "2026-11-20",
    consumptionPriceList: { catalogId: "edge-roll-price-list", version: "2026-11", effectiveFrom: "2026-11-01" },
    laborOperationTariffList: null,
    quoteSummary: {
      status: "ready", currencyCode: "TRY", requiredLineCount: 1, pricedLineCount: 1,
      missingPrices: [], missingTariffs: [], diagnostics: [],
      lineSources: [{
        costLineId: "roll-cost-1", sourceType: "production-consumption", sourceId: "pvc-roll",
        sourcePartIds: ["part-a", "part-b"], resourceType: "edge-banding", resourceId: "pvc-a",
        unit: "rulo", rollCount, rollLengthMm, purchasedLengthMm: rollCount * rollLengthMm,
        furnitureIds: ["cabinet-a"], planSourceReference, priceSourceReference
      }],
      costSummary: {
        status: "ready", currencyCode: "TRY", lineCount: 1,
        lines: [{
          id: "roll-cost-1", category: "material", description: "PVC rulo satın alımı",
          quantity: rollCount, unit: "rulo", unitPriceMinor, lineTotalMinor, currencyCode: "TRY",
          sourceReference: priceSourceReference
        }],
        categoryTotalsMinor: { material: lineTotalMinor, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 },
        grandTotalMinor: lineTotalMinor
      }
    }
  };
}

function createRealRollComparison() {
  const first = createProjectQuoteRevision({
    projectId: "project-42", revisionId: "quote-r1", revisionNumber: 1,
    createdAt: "2026-11-20T10:00:00Z", previousRevision: null, sourceIntegrityVersion: 1,
    pricingSnapshot: createRollPricingSnapshot({
      rollCount: 2, rollLengthMm: 100000, unitPriceMinor: 15000,
      planSourceReference: "roll-spec:v1", priceSourceReference: "roll-prices:v1"
    })
  });
  assert.equal(first.status, "ready");
  const history = { schemaVersion: 1, projectId: "project-42", revisions: [first.revision] };
  const appended = appendProjectQuoteRevision(history, {
    revisionId: "quote-r2", createdAt: "2026-11-20T11:00:00Z",
    pricingSnapshot: createRollPricingSnapshot({
      rollCount: 3, rollLengthMm: 80000, unitPriceMinor: 16000,
      planSourceReference: "roll-spec:v2", priceSourceReference: "roll-prices:v2"
    })
  });
  assert.equal(appended.status, "ready");
  const comparison = compareProjectQuoteRevisions(appended.history, "quote-r1", "quote-r2");
  assert.equal(comparison.status, "ready");
  assert.ok(comparison.comparison);
  return comparison;
}

test("DOM-072 immutable revision comparison carries roll purchase provenance and JSON round-trips", () => {
  const result = createRealRollComparison();
  const rollChange = result.comparison.lineChanges.find(change => (change.from ?? change.to)?.unit === "rulo");
  assert.ok(rollChange);
  assert.equal(rollChange.type, "changed");
  assert.equal(rollChange.from.rollCount, 2);
  assert.equal(rollChange.from.rollLengthMm, 100000);
  assert.equal(rollChange.from.purchasedLengthMm, 200000);
  assert.deepEqual(rollChange.from.furnitureIds, ["cabinet-a"]);
  assert.equal(rollChange.from.resourceType, "edge-banding");
  assert.equal(rollChange.from.resourceId, "pvc-a");
  assert.equal(rollChange.from.resourceUnit, "rulo");
  assert.equal(rollChange.to.resourceType, "edge-banding");
  assert.equal(rollChange.to.resourceId, "pvc-a");
  assert.equal(rollChange.to.resourceUnit, "rulo");
  assert.equal(rollChange.from.planSourceReference, "roll-spec:v1");
  assert.equal(rollChange.from.priceSourceReference, "roll-prices:v1");
  assert.equal(rollChange.to.rollCount, 3);
  assert.equal(rollChange.to.rollLengthMm, 80000);
  assert.equal(rollChange.to.purchasedLengthMm, 240000);
  assert.equal(rollChange.to.planSourceReference, "roll-spec:v2");
  assert.equal(rollChange.to.priceSourceReference, "roll-prices:v2");

  const serialized = serializeProjectQuoteRevisionComparisonFile(result);
  assert.equal(serialized.status, "ready", serialized.diagnostics.join("; "));
  const parsed = parseProjectQuoteRevisionComparisonFile(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.comparison, result.comparison);
  assert.ok(Object.isFrozen(parsed.comparison.lineChanges.find(change => (change.from ?? change.to)?.unit === "rulo").from));
});

test("DOM-072 JSON comparison blocks partial or inconsistent roll metadata", () => {
  const result = createRealRollComparison();
  const rollChange = result.comparison.lineChanges.find(change => (change.from ?? change.to)?.unit === "rulo");
  assert.ok(rollChange);
  for (const invalid of [
    { ...rollChange.to, rollCount: 2 },
    { ...rollChange.to, purchasedLengthMm: 100000 },
    { ...rollChange.to, furnitureIds: ["cabinet-a", "cabinet-a"] },
    { ...rollChange.to, rollLengthMm: 80000.05 },
    { ...rollChange.to, planSourceReference: " " }
  ]) {
    const candidate = structuredClone(result);
    const target = candidate.comparison.lineChanges.find(change => (change.from ?? change.to)?.unit === "rulo");
    target.to = invalid;
    assert.equal(serializeProjectQuoteRevisionComparisonFile(candidate).status, "blocked");
  }
});


test("DOM-098 comparison JSON import rejects oversized UTF-8 payloads without partial data", () => {
  const valid = serializeProjectQuoteRevisionComparisonFile(readyComparisonResult());
  assert.equal(valid.status, "ready");
  const oversized = valid.json + "🙂".repeat(300_000);
  assert.ok(oversized.length < 1_048_576);
  const parsed = parseProjectQuoteRevisionComparisonFile(oversized);
  assert.equal(parsed.status, "blocked");
  assert.equal(parsed.file, null);
  assert.equal(parsed.comparison, null);
  assert.match(parsed.diagnostics[0], /1 MiB/);
});

test("DOM-098 comparison JSON import and export cap line changes at 2,000", () => {
  const valid = serializeProjectQuoteRevisionComparisonFile(readyComparisonResult());
  assert.equal(valid.status, "ready");
  const candidate = JSON.parse(valid.json);
  candidate.comparison.lineChanges = Array.from({ length: 2_001 }, (_, index) => ({
    type: "added",
    from: null,
    to: {
      category: "waste", description: "Fire", quantity: 1, unit: "kalem",
      unitPriceMinor: 0, lineTotalMinor: 0, currencyCode: "TRY",
      sourceType: "quote-adjustment", sourceId: "waste-" + index
    }
  }));
  const serialized = serializeProjectQuoteRevisionComparisonFile({
    status: "ready", comparison: candidate.comparison, diagnostics: []
  });
  assert.equal(serialized.status, "blocked");
  assert.equal(serialized.json, null);
  assert.match(serialized.diagnostics[0], /2.000 kayıt/);

  const oversizedLineJson = JSON.stringify(candidate);
  assert.ok(oversizedLineJson.length < 1_048_576);
  const parsed = parseProjectQuoteRevisionComparisonFile(oversizedLineJson);
  assert.equal(parsed.status, "blocked");
  assert.equal(parsed.file, null);
  assert.equal(parsed.comparison, null);
  assert.match(parsed.diagnostics[0], /2.000 kayıt/);
});

test("DOM-098 JSON serializer refuses payloads above 1 MiB", () => {
  const comparison = readyComparisonResult().comparison;
  comparison.fromGrandTotalMinor = 0;
  comparison.toGrandTotalMinor = 0;
  comparison.grandTotalDeltaMinor = 0;
  comparison.categoryDeltasMinor = { material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 };
  comparison.lineChanges = Array.from({ length: 2_000 }, (_, index) => ({
    type: "added",
    from: null,
    to: {
      category: "waste", description: "x".repeat(512), quantity: 1, unit: "kalem",
      unitPriceMinor: 0, lineTotalMinor: 0, currencyCode: "TRY",
      sourceType: "quote-adjustment", sourceId: "waste-" + index
    }
  }));
  const estimatedJson = JSON.stringify({
    fileType: PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE,
    schemaVersion: 2,
    comparison
  });
  assert.ok(new TextEncoder().encode(estimatedJson).byteLength > 1_048_576);
  const serialized = serializeProjectQuoteRevisionComparisonFile({
    status: "ready", comparison, diagnostics: []
  });
  assert.equal(serialized.status, "blocked");
  assert.equal(serialized.json, null);
  assert.match(serialized.diagnostics[0], /1 MiB/);
});
