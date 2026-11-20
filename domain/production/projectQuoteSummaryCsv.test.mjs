import assert from "node:assert/strict";
import test from "node:test";

import {
  parseProjectQuoteSummaryCsv,
  PROJECT_QUOTE_SUMMARY_CSV_COLUMNS,
  serializeProjectQuoteSummaryCsv
} from "./projectQuoteSummaryCsv.ts";
import { PROJECT_COST_CATEGORIES } from "./projectCostSummary.ts";
import {
  parseProjectQuoteSummaryFile,
  serializeProjectQuoteSummaryFile
} from "./projectQuoteSummaryFile.ts";

function readySummary() {
  const lines = [
    { id: "material-mdf", category: "material", description: "MDF Lam", quantity: 2.5, unit: "m2", unitPriceMinor: 1500, currencyCode: "TRY", sourceReference: "material-price:v1", lineTotalMinor: 3750 },
    { id: "material-edge", category: "material", description: "PVC kenar bandı sağ", quantity: 250, unit: "mm", unitPriceMinor: 1, currencyCode: "TRY", sourceReference: "edge-price:mm:v1", edgeDirection: "right", lineTotalMinor: 250 },
    { id: "hardware-hinge", category: "hardware", description: "Menteşe", quantity: 4, unit: "adet", unitPriceMinor: 125, currencyCode: "TRY", sourceReference: "hardware-price:v1", lineTotalMinor: 500 },
    { id: "labor-install", category: "labor", description: "Montaj", quantity: 1.5, unit: "h", unitPriceMinor: 2400, currencyCode: "TRY", sourceReference: "labor-rate:v1", lineTotalMinor: 3600 },
    { id: "operation-drill", category: "operation", description: "Delme operasyonu", quantity: 2, unit: "adet", unitPriceMinor: 500, currencyCode: "TRY", sourceReference: "operation-rate:v1", lineTotalMinor: 1000 },
    { id: "waste-line", category: "waste", description: "Açık fire", quantity: 1, unit: "kalem", unitPriceMinor: 250, currencyCode: "TRY", sourceReference: "waste:explicit:v1", lineTotalMinor: 250 },
    { id: "profit-line", category: "profit", description: "Açık kâr", quantity: 1, unit: "kalem", unitPriceMinor: 500, currencyCode: "TRY", sourceReference: "profit:explicit:v1", lineTotalMinor: 500 },
    { id: "roll-pvc-1", category: "material", description: "PVC rulo alımı", quantity: 2, unit: "rulo", unitPriceMinor: 10000, currencyCode: "TRY", sourceReference: "roll-price:v1", lineTotalMinor: 20000 }
  ];
  const lineSources = [
    { costLineId: "material-mdf", sourceType: "production-consumption", sourceId: "mdf-18", sourcePartIds: ["part-a", "part-b"], resourceType: "material", resourceId: "mdf-18", unit: "m2" },
    { costLineId: "material-edge", sourceType: "production-consumption", sourceId: "pvc-edge", sourcePartIds: ["part-a", "part-b"], resourceType: "edge-banding", resourceId: "pvc-edge", unit: "mm", edgeDirection: "right" },
    { costLineId: "hardware-hinge", sourceType: "production-consumption", sourceId: "hinge-01", sourcePartIds: ["part-hinge"] },
    { costLineId: "labor-install", sourceType: "labor-operation", sourceId: "installation", tariffId: "labor-hourly" },
    { costLineId: "operation-drill", sourceType: "labor-operation", sourceId: "drilling", tariffId: "operation-drill" },
    { costLineId: "waste-line", sourceType: "quote-adjustment", sourceId: "waste" },
    { costLineId: "profit-line", sourceType: "quote-adjustment", sourceId: "profit" },
    { costLineId: "roll-pvc-1", sourceType: "production-consumption", sourceId: "roll-pvc-1", sourcePartIds: ["part-a"], resourceType: "edge-banding", resourceId: "pvc-roll", unit: "rulo", rollCount: 2, rollLengthMm: 100000, purchasedLengthMm: 200000, furnitureIds: ["cabinet-a"], planSourceReference: "roll-plan:v1", priceSourceReference: "roll-price:v1" }
  ];
  return {
    status: "ready",
    currencyCode: "TRY",
    requiredLineCount: lines.length,
    pricedLineCount: lines.length,
    missingPrices: [],
    missingTariffs: [],
    diagnostics: [],
    lineSources,
    costSummary: {
      status: "ready",
      currencyCode: "TRY",
      lineCount: lines.length,
      lines,
      categoryTotalsMinor: { material: 24000, hardware: 500, labor: 3600, operation: 1000, waste: 250, profit: 500 },
      grandTotalMinor: 29850
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

function normalize(summary) {
  const exported = serializeProjectQuoteSummaryFile(summary);
  assert.ok(exported.json, exported.diagnostics[0]);
  const parsed = parseProjectQuoteSummaryFile(exported.json);
  assert.ok(parsed.summary, parsed.diagnostics[0]);
  return parsed.summary;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function parseRecords(csv) {
  const text = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const records = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"' && field === "") {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}

function encodeRecords(records) {
  return "\uFEFF" + records.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function setCell(csv, rowIndex, column, value) {
  const records = parseRecords(csv);
  records[rowIndex][PROJECT_QUOTE_SUMMARY_CSV_COLUMNS.indexOf(column)] = String(value);
  return encodeRecords(records);
}

function lineRowIndex(csv, lineId) {
  const records = parseRecords(csv);
  const index = PROJECT_QUOTE_SUMMARY_CSV_COLUMNS.indexOf("costLineId");
  return records.findIndex((row) => row[index] === lineId);
}

test("ready CSV v1 round-trips all cost categories, units, line IDs and provenance", () => {
  const original = readySummary();
  const exported = serializeProjectQuoteSummaryCsv(original);
  assert.equal(exported.status, "ready", exported.diagnostics.join(" | "));
  assert.ok(exported.csv);
  const parsed = parseProjectQuoteSummaryCsv(exported.csv);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join(" | "));
  assert.deepEqual(parsed.summary, normalize(original));
  assert.equal(parsed.summary?.costSummary?.grandTotalMinor, 29850);
  assert.deepEqual(Object.keys(parsed.summary?.costSummary?.categoryTotalsMinor ?? {}).sort(), [...PROJECT_COST_CATEGORIES].sort());
  assert.equal(parsed.summary?.costSummary?.lines.find((line) => line.id === "material-edge")?.edgeDirection, "right");
  const material = parsed.summary?.lineSources.find((source) => source.costLineId === "material-mdf");
  assert.equal(material?.resourceType, "material");
  assert.equal(material?.resourceId, "mdf-18");
  assert.equal(material?.unit, "m2");
  const roll = parsed.summary?.lineSources.find((source) => source.costLineId === "roll-pvc-1");
  assert.equal(roll?.rollCount, 2);
  assert.equal(roll?.purchasedLengthMm, 200000);
  assert.equal(roll?.priceSourceReference, "roll-price:v1");
});

test("CSV panel malzeme katalog kimliği yalnızca m2 kaynak satırında kabul edilir", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  const row = lineRowIndex(valid, "material-mdf");
  assert.ok(row > 0);
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, row, "unit", "mm")).status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, row, "resourceType", "edge-banding")).status, "blocked");
});

test("empty quote CSV preserves zero totals without inventing currency", () => {
  const exported = serializeProjectQuoteSummaryCsv(emptySummary());
  assert.equal(exported.status, "empty");
  assert.ok(exported.csv);
  const parsed = parseProjectQuoteSummaryCsv(exported.csv);
  assert.equal(parsed.status, "empty");
  assert.deepEqual(parsed.summary, normalize(emptySummary()));
});

test("incomplete and blocked quote summaries never export partial CSV", () => {
  for (const status of ["incomplete", "blocked"]) {
    const summary = clone(readySummary());
    summary.status = status;
    summary.currencyCode = null;
    summary.pricedLineCount = 1;
    summary.missingPrices = [{ resourceType: "material", resourceId: "mdf-18", unit: "m2" }];
    summary.diagnostics = ["Eksik fiyat"];
    const exported = serializeProjectQuoteSummaryCsv(summary);
    assert.equal(exported.status, "blocked");
    assert.equal(exported.csv, null);
    assert.ok(exported.diagnostics.length > 0);
  }
});

test("CSV v1 has a stable quoted header, BOM and CRLF", () => {
  const exported = serializeProjectQuoteSummaryCsv(readySummary());
  assert.equal(exported.status, "ready", exported.diagnostics.join(" | "));
  assert.ok(exported.csv.startsWith("\uFEFF" + PROJECT_QUOTE_SUMMARY_CSV_COLUMNS.map(csvCell).join(",") + "\r\n"));
  assert.ok(exported.csv.endsWith("\r\n"));
  const parsed = parseProjectQuoteSummaryCsv(exported.csv);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join(" | "));
});

test("CSV quoting round-trip preserves commas, quotes and embedded newlines", () => {
  const summary = readySummary();
  summary.costSummary.lines[0].description = 'MDF, "özel"\r\nlam';
  summary.costSummary.lines[0].sourceReference = 'price, "revision 2"';
  const parsed = parseProjectQuoteSummaryCsv(serializeProjectQuoteSummaryCsv(summary).csv);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join(" | "));
  assert.equal(parsed.summary?.costSummary?.lines[0].description, 'MDF, "özel"\r\nlam');
  assert.equal(parsed.summary?.costSummary.lines[0].sourceReference, 'price, "revision 2"');
});

test("parser rejects non-text, malformed quoting and closed-quote trailing characters", () => {
  assert.equal(parseProjectQuoteSummaryCsv({}).status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv("").status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv('"open').status, "blocked");
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  assert.equal(parseProjectQuoteSummaryCsv(valid.replace('"TRY"', '"TRY"x')).status, "blocked");
});

test("parser rejects unsupported header, format and version", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  const wrongHeader = valid.replace('"category"', '"wrongCategory"');
  assert.equal(parseProjectQuoteSummaryCsv(wrongHeader).status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 1, "format", "OtherQuoteCsv")).status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 1, "formatVersion", "2")).status, "blocked");
});

test("parser blocks missing line rows and count mismatch", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  const records = parseRecords(valid);
  records.pop();
  assert.equal(parseProjectQuoteSummaryCsv(encodeRecords(records)).status, "blocked");
});

test("parser rejects unknown row types and repeated metadata", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 2, "rowType", "meta")).status, "blocked");
  const records = parseRecords(valid);
  records.splice(2, 0, [...records[1]]);
  assert.equal(parseProjectQuoteSummaryCsv(encodeRecords(records)).status, "blocked");
});

test("parser revalidates category totals and grand total", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  const totals = { material: 24001, hardware: 500, labor: 3600, operation: 1000, waste: 250, profit: 500 };
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 1, "categoryTotalsMinor", JSON.stringify(totals))).status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 1, "grandTotalMinor", 29851)).status, "blocked");
});

test("parser recomputes and rejects line totals", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 2, "lineTotalMinor", 3751)).status, "blocked");
});

test("parser blocks mixed line currencies", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 2, "currencyCode", "USD")).status, "blocked");
});

test("parser blocks invalid source identity and unsorted Part provenance", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 2, "sourceId", "invalid id")).status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 2, "sourcePartIds", JSON.stringify(["part-b", "part-a"]))).status, "blocked");
});

test("parser rejects inconsistent roll quantity and purchased length provenance", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  const row = lineRowIndex(valid, "roll-pvc-1");
  assert.ok(row > 0);
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, row, "rollCount", 3)).status, "blocked");
});

test("CSV serializer does not mutate the quote", () => {
  const summary = readySummary();
  const original = clone(summary);
  serializeProjectQuoteSummaryCsv(summary);
  assert.deepEqual(summary, original);
});

test("empty summary cannot carry nonzero category or grand totals", () => {
  const valid = serializeProjectQuoteSummaryCsv(emptySummary()).csv;
  const totals = { material: 1, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0 };
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 1, "categoryTotalsMinor", JSON.stringify(totals))).status, "blocked");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, 1, "grandTotalMinor", 1)).status, "blocked");
});

test("parser blocks duplicate cost-line IDs", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  const row = lineRowIndex(valid, "material-edge");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, row, "costLineId", "material-mdf")).status, "blocked");
});

test("parser rejects inconsistent purchased roll length", () => {
  const valid = serializeProjectQuoteSummaryCsv(readySummary()).csv;
  const row = lineRowIndex(valid, "roll-pvc-1");
  assert.equal(parseProjectQuoteSummaryCsv(setCell(valid, row, "purchasedLengthMm", 100000)).status, "blocked");
});

test("CSV parser blocks files above the five-megabyte cap", () => {
  assert.equal(parseProjectQuoteSummaryCsv("x".repeat(5_000_001)).status, "blocked");
});
