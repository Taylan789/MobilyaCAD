import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/workspace/FurniturePartInspector.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/workspace/FurniturePartInspectorPrecision.css", import.meta.url), "utf8");

test("the precision rail is scoped to the selected-part inspector", () => {
  assert.match(component, /FurniturePartInspectorPrecision\.css/);
  assert.match(styles, /\.cad-part-inspector \.cad-selected-object/);
  assert.match(styles, /\.cad-part-inspector \.cad-part-editor-group/);
});

test("desktop dimensions align three values while compact inspectors retain two columns", () => {
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(styles, /@media \(max-width: 1200px\)[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(styles, /text-align: right !important/);
  assert.match(styles, /font-variant-numeric: tabular-nums lining-nums !important/);
});

test("inspector focus and motion preferences remain accessible", () => {
  assert.match(styles, /input:focus-visible[\s\S]*?box-shadow: 0 0 0 2px/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media \(forced-colors: active\)/);
});
