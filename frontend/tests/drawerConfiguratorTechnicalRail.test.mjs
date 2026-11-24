import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../src/components/production/DrawerBoxConfigurator.css", import.meta.url), "utf8");

test("drawer quantity summary and saved groups use a compact technical hierarchy", () => {
  assert.match(styles, /\.cad-drawer-configurator\s*\{[^}]*gap:\s*8px/s);
  assert.match(styles, /\.cad-drawer-configurator\s*>\s*\.cad-production-summary\s*\{[^}]*border-left:\s*2px/s);
  assert.match(styles, /font-variant-numeric:\s*tabular-nums/);
  assert.match(styles, /\.cad-drawer-configurator\s*>\s*\.cad-production-card\s*\{[^}]*background:/s);
});

test("the dimension form has clear field surfaces and keyboard focus", () => {
  assert.match(styles, /\.cad-drawer-configurator\s+\.cad-drawer-config-form\s*\{[^}]*padding:/s);
  assert.match(styles, /\.cad-drawer-configurator\s+\.cad-drawer-config-grid\s*>\s*\.cad-field\s*\{[^}]*border:/s);
  assert.match(styles, /\.cad-drawer-config-grid\s+input[^,]*,\s*\.cad-drawer-configurator\s+\.cad-drawer-config-grid\s+select/);
  assert.match(styles, /:focus-visible\s*\{[^}]*outline:\s*2px/s);
});

test("compact layout retains reduced-motion and forced-colors accommodations", () => {
  assert.match(styles, /@media\s*\(max-width:\s*560px\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /transition:\s*none/);
});
