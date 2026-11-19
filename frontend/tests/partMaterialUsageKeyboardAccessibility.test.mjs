import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/components/workspace/FurniturePartInspector.css", import.meta.url), "utf8");
const component = readFileSync(new URL("../src/components/workspace/FurniturePartInspector.tsx", import.meta.url), "utf8");

test("material usage disclosure and rows show keyboard focus", () => {
  assert.match(styles, /\.cad-part-material-usage > summary:focus-visible,\s*\.cad-part-material-usage__list button:focus-visible/);
  assert.match(styles, /outline: 2px solid #a9c7d8/);
  assert.match(styles, /outline-offset: 2px/);
});

test("material usage location rows have a minimum touch target", () => {
  assert.match(styles, /\.cad-part-material-usage__list button\s*\{[^}]*min-height: 40px/s);
  assert.match(component, /onClick=\{\(\) => onSelectUsage\(usage\.furnitureId, usage\.partId \?\? null\)\}/);
});

test("material usage controls adapt to forced system colors", () => {
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /color: ButtonText/);
  assert.match(styles, /background: ButtonFace/);
  assert.match(styles, /outline-color: Highlight/);
});
