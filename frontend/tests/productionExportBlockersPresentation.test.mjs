import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const overview = readFileSync(
  new URL("../src/components/production/ProductionOverview.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/production/ProductionOverview.css", import.meta.url),
  "utf8"
);

test("production report lists every domain export blocker when multiple extensions are present", () => {
  assert.match(overview, /production\.exportBlockers\.length > 0\s*\?\s*production\.exportBlockers/);
  assert.match(overview, /exportBlockers\.map\(\(blocker, index\)/);
  assert.match(overview, /aria-label="Dışa aktarım engelleri"/);
  assert.match(overview, /exportBlockers\.length === 1/);
});

test("production report falls back to the authoritative single blocker reason", () => {
  assert.match(overview, /production\.exportBlockReason\s*\?\s*\[production\.exportBlockReason\]/);
  assert.match(overview, /disabled={!canExport}/);
});

test("blocker list remains compact and readable in the production notice", () => {
  assert.match(styles, /\.mc-production__export-blockers\s*\{[^}]*display:\s*grid/s);
  assert.match(styles, /\.mc-production__export-blockers li::marker/);
});
