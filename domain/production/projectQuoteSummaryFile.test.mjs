import assert from "node:assert/strict";
import test from "node:test";

import {
  parseProjectQuoteSummaryFile,
  PROJECT_QUOTE_SUMMARY_FILE_TYPE,
  PROJECT_QUOTE_SUMMARY_FILE_UNITS,
  serializeProjectQuoteSummaryFile
} from "./projectQuoteSummaryFile.ts";

function readySummary() {
  return {
    status: "ready",
    currencyCode: "TRY",
    requiredLineCount: 3,
    pricedLineCount: 3,
    missingPrices: [],
    missingTariffs: [],
    diagnostics: [],
    lineSources: [
      { costLineId: "consumption-0001", sourceType: "production-consumption", sourceId: "mdf-18", sourcePartIds: ["part-a", "part-b"], resourceType: "material", resourceId: "mdf-18", unit: "m2" },
      { costLineId: "roll-pvc-a", sourceType: "production-consumption", sourceId: "roll-pvc-a", sourcePartIds: ["part-a"], resourceType: "edge-banding", resourceId: "pvc-a", unit: "rulo", rollCount: 2, rollLengthMm: 100000, purchasedLengthMm: 200000, furnitureIds: ["cabinet-a"], planSourceReference: "roll-plan:v1", priceSourceReference: "roll-price:v1" },
      { costLineId: "work-0001", sourceType: "labor-operation", sourceId: "installation", tariffId: "labor-hourly" }
    ],
    costSummary: {
      status: "ready",
      currencyCode: "TRY",
      lineCount: 3,
      lines: [
        { id: "consumption-0001", category: "material", description: "MDF Lam", quantity: 2.5, unit: "m2", unitPriceMinor: 1500, currencyCode: "TRY", sourceReference: "material-price:v1", lineTotalMinor: 3750 },
        { id: "roll-pvc-a", category: "material", description: "PVC edge band", quantity: 2, unit: "rulo", unitPriceMinor: 12500, currencyCode: "TRY", sourceReference: "roll-price:v1", lineTotalMinor: 25000 },
        { id: "work-0001", category: "labor", description: "Montaj", quantity: 1.5, unit: "h", unitPriceMinor: 2400, currencyCode: "TRY", sourceReference: "labor-rate:v1", lineTotalMinor: 3600 }
      ],
      categoryTotalsMinor: { material: 28750, hardware: 0, labor: 3600, operation: 0, waste: 0, profit: 0 },
      grandTotalMinor: 32350
    }
  };
}

function emptySummary() {
  return {
    status: "empty",
    currencyCode: null,
    requiredLineCount: 0,
    pricedLineCount: 0,
    missingPrices: [],
    missingTariffs: [],
    diagnostics: [],
    lineSources: [],
    costSummary: null
  };
}

function serialize(summary) {
  return serializeProjectQuoteSummaryFile(summary);
}

function parse(json) {
  return parseProjectQuoteSummaryFile(json);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fileFor(summary) {
  const result = serialize(summary);
  assert.equal(result.status, "ready");
  assert.ok(result.json);
  return JSON.parse(result.json);
}

test("ready quote JSON v1 round-trips exact line units, currency and source provenance", () => {
  const source = readySummary();
  const exported = serialize(source);
  assert.equal(exported.status, "ready");
  assert.deepEqual(exported.diagnostics, []);
  const parsed = parse(exported.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.summary, source);
  assert.deepEqual(parsed.file.units, PROJECT_QUOTE_SUMMARY_FILE_UNITS);
  assert.equal(parsed.summary.costSummary.lines[0].unit, "m2");
  assert.equal(parsed.summary.costSummary.lines[1].unit, "rulo");
  assert.equal(parsed.summary.costSummary.lines[2].unit, "h");
  assert.equal(parsed.summary.currencyCode, "TRY");
  assert.equal(parsed.summary.lineSources[0].resourceType, "material");
  assert.equal(parsed.summary.lineSources[0].resourceId, "mdf-18");
  assert.equal(parsed.summary.lineSources[0].unit, "m2");
  assert.equal(parsed.summary.lineSources[1].planSourceReference, "roll-plan:v1");
  assert.equal(parsed.summary.lineSources[1].priceSourceReference, "roll-price:v1");
  assert.deepEqual(parse(serialize(parsed.summary).json), parsed);
});

test("panel malzeme kaynak metadata katalog kimliği ve m2/Part eşleşmesini zorunlu kılar", () => {
  const missingParts = fileFor(readySummary());
  delete missingParts.summary.lineSources[0].sourcePartIds;
  assert.match(parse(JSON.stringify(missingParts)).diagnostics[0], /panel malzeme kaynak Part kimlikleri/);

  const wrongUnit = fileFor(readySummary());
  wrongUnit.summary.lineSources[0].unit = "mm";
  assert.match(parse(JSON.stringify(wrongUnit)).diagnostics[0], /m2 birimiyle/);

  const wrongResourceType = fileFor(readySummary());
  wrongResourceType.summary.lineSources[0].resourceType = "edge-banding";
  assert.match(parse(JSON.stringify(wrongResourceType)).diagnostics[0], /kenar bandı tüketim birimi/);
});

test("empty quote JSON v1 round-trips without inventing currency or totals", () => {
  const exported = serialize(emptySummary());
  assert.equal(exported.status, "empty");
  const parsed = parse(exported.json);
  assert.equal(parsed.status, "empty");
  assert.deepEqual(parsed.summary, emptySummary());
  assert.equal(parsed.summary.costSummary, null);
});

test("incomplete and blocked quotes never serialize partial totals", () => {
  for (const status of ["incomplete", "blocked"]) {
    const summary = clone(readySummary());
    summary.status = status;
    summary.currencyCode = null;
    summary.pricedLineCount = 1;
    summary.missingPrices = [{ resourceType: "material", resourceId: "mdf-18", unit: "m2" }];
    summary.diagnostics = ["Eksik fiyat"];
    const result = serialize(summary);
    assert.equal(result.status, "blocked");
    assert.equal(result.json, null);
    assert.ok(result.diagnostics.length > 0);
  }
});

test("parse rejects malformed JSON, non-text input and unsupported envelope fields", () => {
  assert.equal(parse("{").status, "blocked");
  assert.equal(parse({}).status, "blocked");
  const file = fileFor(readySummary());
  file.extra = true;
  assert.equal(parse(JSON.stringify(file)).status, "blocked");
});

test("parse rejects unsupported type, version and unit contract", () => {
  const wrongType = fileFor(readySummary());
  wrongType.fileType = "other";
  assert.equal(parse(JSON.stringify(wrongType)).status, "blocked");
  const wrongVersion = fileFor(readySummary());
  wrongVersion.schemaVersion = 2;
  assert.equal(parse(JSON.stringify(wrongVersion)).status, "blocked");
  const wrongUnits = fileFor(readySummary());
  wrongUnits.units.rollLengthMm = "cm";
  assert.equal(parse(JSON.stringify(wrongUnits)).status, "blocked");
});

test("parse recomputes line and grand totals instead of trusting the JSON", () => {
  const wrongLine = fileFor(readySummary());
  wrongLine.summary.costSummary.lines[0].lineTotalMinor = 3751;
  assert.match(parse(JSON.stringify(wrongLine)).diagnostics[0], /yeniden hesaplanan/);
  const wrongGrand = fileFor(readySummary());
  wrongGrand.summary.costSummary.grandTotalMinor = 32351;
  assert.match(parse(JSON.stringify(wrongGrand)).diagnostics[0], /genel toplamı/);
});

test("parse rejects category totals that do not reconcile with cost lines", () => {
  const file = fileFor(readySummary());
  file.summary.costSummary.categoryTotalsMinor.material = 28749;
  assert.match(parse(JSON.stringify(file)).diagnostics[0], /kategori toplamı/);
});

test("parse requires one source mapping for every cost line in exact order", () => {
  const missing = fileFor(readySummary());
  missing.summary.lineSources.pop();
  assert.equal(parse(JSON.stringify(missing)).status, "blocked");
  const duplicate = fileFor(readySummary());
  duplicate.summary.lineSources[1].costLineId = duplicate.summary.lineSources[0].costLineId;
  assert.match(parse(JSON.stringify(duplicate)).diagnostics[0], /sıralaması\/kimliği/);
});

test("parse rejects unknown source fields and unsorted Part provenance", () => {
  const unknown = fileFor(readySummary());
  unknown.summary.lineSources[0].debug = true;
  assert.match(parse(JSON.stringify(unknown)).diagnostics[0], /desteklenmeyen alan/);
  const unsorted = fileFor(readySummary());
  unsorted.summary.lineSources[0].sourcePartIds = ["part-b", "part-a"];
  assert.match(parse(JSON.stringify(unsorted)).diagnostics[0], /sıralı ve benzersiz/);
});

test("roll source metadata reconciles roll count and purchased length", () => {
  const countMismatch = fileFor(readySummary());
  countMismatch.summary.lineSources[1].rollCount = 3;
  assert.match(parse(JSON.stringify(countMismatch)).diagnostics[0], /rulo adedi teklif satır miktarı/);
  const lengthMismatch = fileFor(readySummary());
  lengthMismatch.summary.lineSources[1].purchasedLengthMm = 199999.9;
  assert.match(parse(JSON.stringify(lengthMismatch)).diagnostics[0], /satın alınan uzunluk/);
});

test("complete summaries reject leftover diagnostics or missing price/tariff data", () => {
  const withDiagnostics = clone(readySummary());
  withDiagnostics.diagnostics = ["warning"];
  assert.equal(serialize(withDiagnostics).status, "blocked");
  const withMissing = clone(readySummary());
  withMissing.missingTariffs = [{ tariffId: "labor-hourly" }];
  assert.equal(serialize(withMissing).status, "blocked");
});

test("parse blocks JSON payloads above the size cap", () => {
  assert.match(parse(" ".repeat(5_000_001)).diagnostics[0], /5 MB/);
});

test("serialization and parsing do not mutate source; parsed values are deeply frozen", () => {
  const source = readySummary();
  const before = clone(source);
  const exported = serialize(source);
  const parsed = parse(exported.json);
  assert.deepEqual(source, before);
  assert.equal(Object.isFrozen(parsed.file), true);
  assert.equal(Object.isFrozen(parsed.summary.lineSources), true);
  assert.equal(Object.isFrozen(parsed.summary.costSummary.lines[0]), true);
});
