import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/workspace/FurnitureTransformFields.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/workspace/FurnitureTransformFields.css", import.meta.url),
  "utf8",
);

test("position inspector exposes compact, color-coded axis controls without changing the mm group", () => {
  assert.match(component, /cad-transform-axis-grid/);
  assert.match(component, /cad-transform-axis-field cad-transform-axis-field--\$\{axis\.key\}/);
  assert.match(component, /cad-transform-axis-label__letter/);
  assert.match(component, /aria-label="Mobilya konumu, milimetre"/);
  assert.match(styles, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /cad-transform-axis-field--x[\s\S]*cad-transform-axis-field--y[\s\S]*cad-transform-axis-field--z/);
  assert.match(styles, /cad-transform-axis-value > span/);
});

test("rotation is clearly separated while preserving its degree range and unit", () => {
  assert.match(component, /cad-transform-rotation__range[^>]*>0–359°<\/span>/);
  assert.match(component, /cad-transform-rotation__value/);
  assert.match(component, /<span>°<\/span>/);
  assert.match(styles, /cad-transform-rotation\s*\{[\s\S]*?grid-template-columns:/);
});

test("transform inspector remains responsive, reduced-motion aware, and high-contrast compatible", () => {
  assert.match(styles, /@media\s*\(max-width:\s*390px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /transition:\s*none/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(component, /aria-describedby="furniture-position-help"/);
  assert.match(component, /aria-describedby="furniture-rotation-help"/);
});
