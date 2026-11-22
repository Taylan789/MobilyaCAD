import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/ui/select.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/select-cad-surface.css", import.meta.url), "utf8");

test("shared select controls use the CAD technical surface without changing their API", () => {
  assert.match(component, /select-cad-surface\.css/);
  assert.match(component, /cad-select-trigger/);
  assert.match(component, /cad-select-popup/);
  assert.match(component, /cad-select-item/);
  assert.match(component, /cad-select-label/);
  assert.match(component, /cad-select-separator/);
});

test("select triggers and option lists expose restrained steel surface treatment", () => {
  assert.match(styles, /\.cad-select-trigger\s*\{[\s\S]*?border-color: color-mix/);
  assert.match(styles, /\.cad-select-popup\s*\{[\s\S]*?box-shadow:/);
  assert.match(styles, /\.cad-select-item\[data-highlighted\]/);
  assert.match(styles, /\.cad-select-item\[data-selected\]/);
});

test("select options keep keyboard focus visible and disabled states distinct", () => {
  assert.match(styles, /\.cad-select-trigger:focus-visible\s*\{[\s\S]*?outline: 2px solid/);
  assert.match(styles, /\.cad-select-item:focus-visible/);
  assert.match(styles, /\.cad-select-item\[data-disabled\]/);
});

test("select surface supports reduced motion and forced-colors", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition: none !important/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)[\s\S]*?outline: 2px solid Highlight/);
});
