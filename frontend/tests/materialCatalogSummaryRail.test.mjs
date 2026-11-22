import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/production/MaterialCatalogManager.css", import.meta.url), "utf8");
const rail = css.slice(css.indexOf("/* UI-MATERIAL-SUMMARY-RAIL-001"));

test("material inventory counts share a single compact technical rail", () => {
  assert.ok(rail.includes(".mc-material-library__metrics {"));
  assert.ok(rail.includes("gap: 0;"));
  assert.ok(rail.includes("border: 1px solid var(--mcl-line);"));
  assert.ok(rail.includes(".mc-material-library__metric + .mc-material-library__metric {"));
  assert.ok(rail.includes("border-left: 1px solid var(--mcl-line);"));
});

test("summary cells keep labels, descriptions and aligned numeric values without card surfaces", () => {
  assert.ok(rail.includes("grid-template-columns: minmax(0, 1fr) auto;"));
  assert.ok(rail.includes("grid-row: 1 / 3;"));
  assert.ok(rail.includes("font-size: 18px;"));
  assert.ok(rail.includes("border: 0;"));
  assert.ok(rail.includes("background: transparent;"));
  assert.ok(rail.includes("box-shadow: none;"));
});

test("summary rail adapts to tablet and narrow mobile widths", () => {
  assert.ok(rail.includes("@media (max-width: 720px)"));
  assert.ok(rail.includes("grid-template-columns: repeat(2, minmax(0, 1fr));"));
  assert.ok(rail.includes("grid-column: 1 / -1;"));
  assert.ok(rail.includes("@media (max-width: 520px)"));
  assert.ok(rail.includes("grid-template-columns: minmax(0, 1fr);"));
});

test("summary rail separators remain visible in forced-colors mode", () => {
  assert.ok(rail.includes("@media (forced-colors: active)"));
  assert.ok(rail.includes("border-color: CanvasText;"));
  assert.ok(rail.includes("border-left-color: CanvasText;"));
  assert.ok(rail.includes("border-top-color: CanvasText;"));
});
