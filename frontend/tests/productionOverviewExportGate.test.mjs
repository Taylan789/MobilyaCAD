import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/production/ProductionOverview.tsx", import.meta.url), "utf8");

test("CSV export button uses the domain canExport flag as its primary gate", () => {
  assert.match(source, /const isBlocked = !production\.canExport;/);
  assert.match(source, /const canExport = production\.canExport && production\.parts\.length > 0;/);
  assert.match(source, /\{!production\.canExport && \(/);
  assert.match(source, /production\.exportBlockers\[0\]/);
});

test("blocked production UI exposes structured diagnostics without dropping provenance", () => {
  assert.match(source, /production\.productionDiagnostics\.map/);
  for (const field of ["source", "furnitureId", "family", "code", "message"]) {
    assert.match(source, new RegExp("diagnostic\\." + field));
  }
  assert.match(source, /diagnostic\.materialIdentityConflict\.sources\.map/);
});
