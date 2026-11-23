import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const base = new URL("../src/components/workspace/", import.meta.url);
const inspectorCss = readFileSync(new URL("FurniturePartInspector.css", base), "utf8");
const focusCss = readFileSync(new URL("FurniturePartInspectorMaterialFocus.css", base), "utf8");

test("material clarity stylesheet is wired into the existing inspector", () => {
  assert.match(inspectorCss, /^@import\s+["']\.\/FurniturePartInspectorMaterialFocus\.css["'];?/);
});

test("material summary and source states gain a readable technical hierarchy", () => {
  assert.match(focusCss, /\.cad-part-material-group::before/);
  assert.match(focusCss, /\.cad-part-material-summary__copy strong[\s\S]*font-size:\s*12px/);
  for (const source of ["is-custom", "is-missing", "is-unassigned"]) {
    assert.match(inspectorCss, new RegExp("\\." + "cad-part-material-source\\." + source));
    assert.match(focusCss, new RegExp("\\." + "cad-part-material-source\\." + source));
  }
});

test("material select keeps keyboard focus, responsive density and reduced-motion support", () => {
  assert.match(focusCss, /\.cad-part-material-select:focus-visible/);
  assert.match(focusCss, /@media\s*\(max-width:\s*560px\)/);
  assert.match(focusCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(focusCss, /@media\s*\(forced-colors:\s*active\)/);
});
