import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const entry = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../src/styles/ui-workbench-shell-detail-001.css", import.meta.url), "utf8");

test("CAD shell detail stylesheet is wired into the application entry", () => {
  assert.match(entry, /ui-workbench-shell-detail-001\.css/);
});

test("workbench dock uses selected-state technical treatment and tabular production values", () => {
  assert.match(stylesheet, /\.cad-bottom-dock-tabs\s+\[aria-selected="true"\]/);
  assert.match(stylesheet, /\.cad-dock-table\s+td/);
  assert.match(stylesheet, /font-variant-numeric:\s*tabular-nums/);
});

test("shell detail styles retain reduced-motion and forced-colors accommodations", () => {
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /forced-colors:\s*active/);
  assert.match(stylesheet, /CanvasText/);
});

test("scene hierarchy distinguishes selected objects, hidden items, and material provenance", () => {
  assert.match(stylesheet, /\.cad-app \.studio-tree-object-select\.selected/);
  assert.match(stylesheet, /\.cad-app \.studio-tree-object\.is-hidden/);
  assert.match(stylesheet, /\.studio-tree-material-source\.is-missing/);
  assert.match(stylesheet, /\.studio-tree-material-source\.is-custom/);
});

test("scene tree refinements retain reduced-motion and forced-colors support", () => {
  assert.match(stylesheet, /\.studio-tree-object-parts\s*\{\s*animation:\s*none\s*!important/);
  assert.match(stylesheet, /\.cad-app \.studio-tree-part\.selected/);
  assert.match(stylesheet, /Canvas/);
  assert.match(stylesheet, /Highlight/);
});
