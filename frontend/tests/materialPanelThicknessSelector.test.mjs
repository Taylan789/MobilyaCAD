import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8"
);
const stylesheet = readFileSync(
  new URL("../src/components/production/MaterialPanelThicknessSelector.css", import.meta.url),
  "utf8"
);

test("panel thickness preview uses the existing live thickness choices", () => {
  assert.match(component, /MaterialPanelThicknessSelector\.css/);
  assert.match(component, /className="mc-panel-preview__options"/);
  assert.match(component, /availableThicknesses\.map\(\(thickness\)/);
  assert.match(component, /aria-pressed=\{sampleThickness === thickness\}/);
  assert.match(component, /onClick=\{\(\) => onSelectThickness\(thickness\)\}/);
});

test("thickness choices have a compact technical segmented-control hierarchy", () => {
  assert.match(stylesheet, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(76px,\s*1fr\)\)/);
  assert.match(stylesheet, /border-top:\s*1px solid/);
  assert.match(stylesheet, /button\[aria-pressed="true"\]/);
  assert.match(stylesheet, /font-variant-numeric:\s*tabular-nums/);
});

test("thickness choices retain keyboard focus and responsive targets", () => {
  assert.match(stylesheet, /button:focus-visible/);
  assert.match(stylesheet, /outline:\s*2px solid/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)/);
  assert.match(stylesheet, /min-height:\s*40px/);
});

test("thickness selector honors reduced motion and forced-colors modes", () => {
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /transition:\s*none/);
  assert.match(stylesheet, /forced-colors:\s*active/);
  assert.match(stylesheet, /ButtonFace/);
  assert.match(stylesheet, /Highlight/);
});
