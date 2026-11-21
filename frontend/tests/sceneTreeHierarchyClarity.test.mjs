import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/styles/workbench.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("scene tree styles are loaded by the active CAD workspace", () => {
  assert.match(app, /import ["']\.\/styles\/workbench\.css["']/);
});

test("object rows and nested parts have a compact, explicit hierarchy", () => {
  assert.match(styles, /\.studio-tree-object-row\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+27px\s+27px/s);
  assert.match(styles, /\.studio-tree-object-parts\s*\{[^}]*border-left:\s*1px solid/s);
  assert.match(styles, /\.studio-tree-part-line\s*\{[^}]*flex:\s*0 0 7px/s);
});

test("selected furniture and parts have visible steel-blue selection rails", () => {
  assert.match(styles, /\.studio-tree-object-select\.selected\s*\{[^}]*box-shadow:\s*inset 3px 0 0 #8eb5ce/s);
  assert.match(styles, /\.studio-tree-part\.selected\s*\{[^}]*box-shadow:\s*inset 2px 0 0 #8eb5ce/s);
});

test("scene-tree controls retain keyboard focus, reduced motion, and high-contrast support", () => {
  assert.match(styles, /\.studio-tree-object-select:focus-visible[^}]*outline:\s*2px solid #8eb5ce/s);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[^}]*\.studio-tree-object-select[^}]*transition:\s*none/s);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)[^}]*border-color:\s*CanvasText/s);
});
