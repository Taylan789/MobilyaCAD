import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const styles = readFileSync(
  new URL("../src/components/production/ProductionOverview.css", import.meta.url),
  "utf8",
);

test("production report readiness is a compact, status-aware grid", () => {
  assert.match(styles, /\.mc-production__readiness\s*\{[\s\S]*display:\s*grid/);
  assert.match(styles, /\.mc-production__readiness::before\s*\{/);
  assert.match(styles, /\.mc-production__readiness--ready::before/);
  assert.match(styles, /\.mc-production__readiness--partial/);
  assert.match(styles, /\.mc-production__readiness--blocked/);
  assert.match(styles, /\.mc-production__readiness--empty::before/);
});

test("production report cards use graphite surfaces and readable steel contrast", () => {
  assert.match(styles, /\.mc-production__section,[\s\S]*\.mc-production__issues\s*\{[\s\S]*background:\s*#182630/);
  assert.match(styles, /\.mc-production__material\s*\{[\s\S]*background:\s*#1b2a33/);
  assert.match(styles, /\.mc-production__cut-row\s*\{[\s\S]*background:\s*#1b2932/);
  assert.match(styles, /\.mc-production__empty\s*\{[\s\S]*background:\s*#1b2932/);
});

test("production overview preserves responsive and accessibility modes", () => {
  assert.match(styles, /@media\s*\(max-width:\s*700px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /border-color:\s*CanvasText/);
});
