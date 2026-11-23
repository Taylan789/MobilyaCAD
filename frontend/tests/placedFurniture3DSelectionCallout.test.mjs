import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/furniture/PlacedFurniture3D.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/furniture/PlacedFurniture3DSelectionCallout.css", import.meta.url), "utf8");

test("selected-part metadata remains a passive viewport status callout", () => {
  assert.match(component, /className="cad-part-selection-callout" role="status"/);
  assert.match(component, /pointerEvents: "none", userSelect: "none"/);
  assert.match(component, /dimensions/);
  assert.match(component, /part\?\.material \?\? furniture\.material/);
});

test("selection callout organizes live name, dimensions and material in a compact technical label", () => {
  assert.match(styles, /\.cad-part-selection-callout\s*\{[\s\S]*display:\s*grid/);
  assert.match(styles, /min-width:\s*150px/);
  assert.match(styles, /max-width:\s*min\(280px,\s*calc\(100vw\s*-\s*24px\)\)/);
  assert.match(styles, /\.cad-part-selection-callout strong[\s\S]*font-variant-numeric:\s*tabular-nums/);
  assert.match(styles, /\.cad-part-selection-callout small[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(styles, /pointer-events:\s*none/);
});

test("selection callout remains compact and legible on narrow and accessibility modes", () => {
  assert.match(styles, /@media\s*\(max-width:\s*560px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /animation:\s*none/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /CanvasText/);
});
