import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overview = readFileSync(
  new URL("../src/components/production/ProductionOverview.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/production/ProductionOverviewMetrics.css", import.meta.url),
  "utf8"
);
const start = overview.indexOf('<section className="mc-production__metrics"');
const end = overview.indexOf("</section>", start);
assert.notEqual(start, -1, "production metrics section should exist");
assert.notEqual(end, -1, "production metrics section should close");
const metrics = overview.slice(start, end + "</section>".length);

test("production overview keeps four live values in a compact non-card strip", () => {
  assert.equal((metrics.match(/<article className="mc-production__metric">/g) ?? []).length, 4);
  assert.match(metrics, /production\.parts\.length/);
  assert.match(metrics, /totalPieceCount/);
  assert.match(metrics, /edgeBanding\.totalLength/);
  assert.match(metrics, /materialConsumption\.length/);
  assert.doesNotMatch(metrics, /mc-production__metric-icon/);
  assert.match(overview, /ProductionOverviewMetrics\.css/);
});

test("compact metrics remain responsive, high-contrast and motion-safe", () => {
  assert.match(styles, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /CanvasText/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
