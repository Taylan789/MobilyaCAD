import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const css = await readFile(
  new URL("../src/components/workspace/FurnitureTransformFields.css", import.meta.url),
  "utf8"
);

test("transform inspector density responds to panel width", () => {
  assert.match(css, /\.cad-transform-panel\s*\{[^}]*container-type:\s*inline-size/s);
  assert.match(css, /\.cad-transform-axis-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /@container\s*\(min-width:\s*360px\)[\s\S]*?grid-template-columns:\s*repeat\(3,/);
  assert.match(css, /@container\s*\(max-width:\s*250px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /text-align:\s*right\s*!important/);
});

test("transform inspector retains motion and forced-color accessibility", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /border-color:\s*CanvasText\s*!important/);
});
