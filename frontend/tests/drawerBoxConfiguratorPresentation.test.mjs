import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentPath = new URL("../src/components/production/DrawerBoxConfigurator.tsx", import.meta.url);
const stylePath = new URL("../src/components/production/DrawerBoxConfigurator.css", import.meta.url);
const component = readFileSync(componentPath, "utf8");
const style = readFileSync(stylePath, "utf8");

test("drawer configurator loads its scoped industrial presentation layer", () => {
  assert.match(component, /import "\.\/DrawerBoxConfigurator\.css"/);
  assert.match(style, /\.cad-drawer-configurator\s*\{/);
  assert.match(style, /--drawer-surface:\s*#192832/);
});

test("dimension, material and panel groups use compact technical controls", () => {
  assert.match(style, /\.cad-drawer-config-grid/);
  assert.match(style, /\.cad-drawer-option-grid/);
  assert.match(style, /\.cad-drawer-config-panel/);
  assert.match(style, /font-variant-numeric:\s*tabular-nums/);
  assert.match(style, /:focus-visible/);
});

test("narrow configuration panels collapse to a single readable column", () => {
  assert.match(style, /@media\s*\(max-width:\s*560px\)/);
  assert.match(style, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("reduced motion is respected and validation remains announced", () => {
  assert.match(style, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(style, /transition:\s*none\s*!important/);
  assert.match(component, /className="cad-drawer-config-error" role="alert"/);
});
