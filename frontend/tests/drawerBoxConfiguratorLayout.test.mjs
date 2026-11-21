import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../src/components/production/DrawerBoxConfigurator.css", import.meta.url), "utf8");

test("drawer configuration uses a compact two-column technical form and summary hierarchy", () => {
  assert.match(styles, /\.cad-drawer-configurator\s*\{[^}]*display:\s*grid/s);
  assert.match(styles, /\.cad-drawer-configurator\s*>\s*\.cad-production-summary\s*\{[^}]*border-left:\s*2px solid/s);
  assert.match(styles, /\.cad-drawer-config-form\s*\{[^}]*display:\s*grid/s);
  assert.match(styles, /\.cad-drawer-config-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(styles, /\.cad-drawer-config-panel\s*\{/);
  assert.match(styles, /\.cad-drawer-config-error\s*\{/);
});

test("drawer form collapses on narrow viewports and respects accessibility modes", () => {
  assert.match(styles, /@media\s*\(max-width:\s*600px\)[\s\S]*?\.cad-drawer-config-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /:focus-visible/);
});
