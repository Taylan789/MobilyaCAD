import assert from "node:assert/strict";
import testFn from "node:test";

import {
  parseProjectEdgeBandingRollCostCsv,
  PROJECT_EDGE_BANDING_ROLL_COST_CSV_COLUMNS,
  PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT,
  serializeProjectEdgeBandingRollCostCsv
} from "./projectEdgeBandingRollCostCsv.ts";
import { calculateProjectCostSummary } from "./projectCostSummary.ts";

function readySummary(options = {}) {
  const lineSources = [
    {
      costLineId: "edge-roll-0001",
      edgeBandingId: "pvc-a",
      rollCount: 2,
      rollLengthMm: 500,
      purchasedLengthMm: 1000,
      partIds: ["part-a", "part-z"],
      furnitureIds: ["cab-a"],
      planSourceReference: "roll-plan:v1",
      priceSourceReference: "price-list:v1"
    },
    {
      costLineId: "edge-roll-0002",
      edgeBandingId: "pvc-b",
      rollCount: 1,
      rollLengthMm: 1000,
      purchasedLengthMm: 1000,
      partIds: ["part-b"],
      furnitureIds: ["cab-b"],
      planSourceReference: "roll-plan:b",
      priceSourceReference: "price-list:b"
    }
  ];
  const lines = [
    {
      id: "edge-roll-0001",
      category: "material",
      description: "Kenar bandı rulo satın alımı — pvc-a",
      quantity: 2,
      unit: "rulo",
      unitPriceMinor: 25000,
      currencyCode: "TRY",
      sourceReference: "price-list:v1"
    },
    {
      id: "edge-roll-0002",
      category: "material",
      description: "Kenar bandı rulo satın alımı — pvc-b",
      quantity: 1,
      unit: "rulo",
      unitPriceMinor: 12000,
      currencyCode: "TRY",
      sourceReference: "price-list:b"
    }
  ];
  const calculated = calculateProjectCostSummary(lines);
  return {
    status: "ready",
    currencyCode: "TRY",
    requiredLineCount: 2,
    pricedLineCount: 2,
    missingRollSpecs: [],
    missingPrices: [],
    diagnostics: [],
    lineSources,
    costSummary: calculated,
    ...options
  };
}

function emptySummary() {
  return {
    status: "empty",
    currencyCode: null,
    requiredLineCount: 0,
    pricedLineCount: 0,
    missingRollSpecs: [],
    missingPrices: [],
    diagnostics: [],
    lineSources: [],
    costSummary: null
  };
}

function serialize(summary) {
  return serializeProjectEdgeBandingRollCostCsv(summary);
}

function parse(csv) {
  return parseProjectEdgeBandingRollCostCsv(csv);
}

function csvRecords(csv) {
  return csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map(line => {
    const cells = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      if (quoted) {
        if (line[i] === '"' && line[i + 1] === '"') {
          value += '"';
          i += 1;
        } else if (line[i] === '"') {
          quoted = false;
        } else value += line[i];
      } else if (line[i] === '"') quoted = true;
      else if (line[i] === ",") {
        cells.push(value);
        value = "";
      } else value += line[i];
    }
    cells.push(value);
    return cells;
  });
}

testFn("ready per-roll CSV v1 round-trips exact roll, currency, price and provenance", () => {
  const source = readySummary();
  const exported = serialize(source);
  assert.equal(exported.status, "ready");
  assert.deepEqual(exported.diagnostics, []);
  assert.ok(exported.csv.startsWith("\uFEFF"));
  assert.ok(exported.csv.includes("\r\n"));
  const parsed = parse(exported.csv);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.summary, source);
  assert.equal(parsed.summary.lineSources[0].rollCount, 2);
  assert.equal(parsed.summary.lineSources[0].purchasedLengthMm, 1000);
  assert.equal(parsed.summary.costSummary.lines[0].unit, "rulo");
  assert.equal(parsed.summary.costSummary.lines[0].lineTotalMinor, 50000);
  assert.equal(parsed.summary.costSummary.grandTotalMinor, 62000);
  assert.equal(parse(serialize(parsed.summary).csv).status, "ready");
});

testFn("empty CSV round-trips without invented currency or line", () => {
  const exported = serialize(emptySummary());
  assert.equal(exported.status, "empty");
  assert.equal(parse(exported.csv).status, "empty");
  assert.deepEqual(parse(exported.csv).summary, emptySummary());
  assert.equal(parse(exported.csv).summary.costSummary, null);
});

testFn("incomplete and blocked cost summaries never export partial CSV", () => {
  for (const status of ["incomplete", "blocked"]) {
    const source = readySummary({ status, diagnostics: ["Eksik fiyat girdisi"] });
    const exported = serialize(source);
    assert.equal(exported.status, "blocked");
    assert.equal(exported.csv, null);
    assert.ok(exported.diagnostics.length > 0);
  }
});

testFn("CSV format name, version, header and row types are explicit", () => {
  const exported = serialize(readySummary());
  const records = csvRecords(exported.csv);
  assert.deepEqual(records[0], PROJECT_EDGE_BANDING_ROLL_COST_CSV_COLUMNS);
  assert.equal(records[1][0], PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT);
  assert.equal(records[1][1], "1");
  assert.equal(records[1][2], "summary");
  assert.equal(records[2][2], "line");
  assert.equal(records[1].length, records[2].length);
});

testFn("parser rejects malformed text, unsupported version, format, header and row type", () => {
  assert.equal(parse("{").status, "blocked");
  assert.equal(parse({}).status, "blocked");
  const csv = serialize(readySummary()).csv;
  assert.equal(parse(csv.replace(',"1","summary"', ',"2","summary"')).status, "blocked");
  assert.equal(parse(csv.replace(PROJECT_EDGE_BANDING_ROLL_COST_CSV_FORMAT, "OtherFormat")).status, "blocked");
  assert.equal(parse(csv.replace("edgeBandingId", "catalogId")).status, "blocked");
  assert.equal(parse(csv.replace('"summary"', '"unknown"')).status, "blocked");
});

testFn("parser blocks incorrect summary counts, missing lines and invalid empty totals", () => {
  const csv = serialize(readySummary()).csv;
  assert.equal(parse(csv.replace('"2","2","62000"', '"3","3","62000"')).status, "blocked");
  const lines = csv.split("\r\n");
  const missingLine = lines.filter(line => !line.includes('"edge-roll-0002"')).join("\r\n");
  assert.equal(parse(missingLine).status, "blocked");
  const empty = serialize(emptySummary()).csv.replace('"0","0","0"', '"1","0","0"');
  assert.equal(parse(empty).status, "blocked");
});

testFn("parser recomputes cost arithmetic and rejects edited totals or prices", () => {
  const csv = serialize(readySummary()).csv;
  assert.equal(parse(csv.replace('"50000"', '"50001"')).status, "blocked");
  assert.equal(parse(csv.replace('"62000"', '"62001"')).status, "blocked");
  assert.equal(parse(csv.replace('"25000"', '"25001"')).status, "blocked");
});

testFn("parser validates roll count, unit and purchased-length arithmetic", () => {
  const csv = serialize(readySummary()).csv;
  assert.equal(parse(csv.replace('"500","1000"', '"500","999"')).status, "blocked");
  assert.equal(parse(csv.replace('"2","rulo"', '"3","rulo"')).status, "blocked");
  assert.equal(parse(csv.replace('"rulo","500"', '"metre","500"')).status, "blocked");
});

testFn("parser blocks duplicate or unsorted catalog IDs and cost-line IDs", () => {
  const csv = serialize(readySummary()).csv;
  const lines = csv.split("\r\n");
  const swapped = lines[2] + "\r\n" + lines[3];
  const reversed = lines[3] + "\r\n" + lines[2];
  assert.equal(parse(csv.replace(swapped, reversed)).status, "blocked");
  assert.equal(parse(csv.replace('"edge-roll-0002"', '"edge-roll-0001"')).status, "blocked");
});

testFn("parser requires sorted unique source IDs and valid JSON arrays", () => {
  const csv = serialize(readySummary()).csv;
  const encoded = '"[""part-a"",""part-z""]"';
  assert.equal(parse(csv.replace(encoded, '"[""part-z"",""part-a""]"')).status, "blocked");
  assert.equal(parse(csv.replace(encoded, '"[""part-a"",""part-a""]"')).status, "blocked");
  assert.equal(parse(csv.replace(encoded, '"not-json"')).status, "blocked");
});

testFn("CSV quoting preserves commas, quotes and line breaks in source references", () => {
  const source = readySummary();
  source.lineSources[0].planSourceReference = "plan, with \"quotes\"\nsecond line";
  source.lineSources[0].priceSourceReference = "prices, \"quoted\"";
  source.costSummary.lines[0].sourceReference = source.lineSources[0].priceSourceReference;
  const exported = serialize(source);
  assert.equal(exported.status, "ready");
  const parsed = parse(exported.csv);
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.summary.lineSources[0].planSourceReference, "plan, with \"quotes\"\nsecond line");
  assert.equal(parsed.summary.lineSources[0].priceSourceReference, "prices, \"quoted\"");
});

testFn("serializer rejects unknown fields and inconsistent line source metadata", () => {
  const unknown = readySummary();
  unknown.extra = true;
  assert.equal(serialize(unknown).status, "blocked");
  const mismatch = readySummary();
  mismatch.lineSources[0].priceSourceReference = "different:v1";
  assert.equal(serialize(mismatch).status, "blocked");
  const quantity = readySummary();
  quantity.costSummary.lines[0].quantity = 3;
  assert.equal(serialize(quantity).status, "blocked");
});

testFn("empty provenance arrays are supported; no source identifiers are fabricated", () => {
  const source = readySummary();
  source.lineSources[0].partIds = [];
  source.lineSources[0].furnitureIds = [];
  const exported = serialize(source);
  assert.equal(exported.status, "ready");
  const parsed = parse(exported.csv);
  assert.deepEqual(parsed.summary.lineSources[0].partIds, []);
  assert.deepEqual(parsed.summary.lineSources[0].furnitureIds, []);
});

testFn("serialization and parsing do not mutate inputs and parsed summary is frozen", () => {
  const source = readySummary();
  const before = JSON.parse(JSON.stringify(source));
  const exported = serialize(source);
  assert.deepEqual(source, before);
  const parsed = parse(exported.csv);
  assert.equal(Object.isFrozen(parsed.summary), true);
  assert.equal(Object.isFrozen(parsed.summary.lineSources), true);
  assert.equal(Object.isFrozen(parsed.summary.costSummary.lines[0]), true);
});

testFn("CSV size limit blocks oversized inputs", () => {
  assert.match(parse(" ".repeat(5_000_001)).diagnostics[0], /5 MB/);
});
