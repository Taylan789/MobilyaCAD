import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/styles/cad-graphite-workspace-001.css", import.meta.url),
  "utf8",
);

test("desktop inspector empty state uses a compact two-column technical layout", () => {
  assert.match(css, /@media\s*\(min-width:\s*761px\)[\s\S]*?\.cad-app \.cad-inspector \.cad-inspector-empty\s*\{[^}]*display:\s*grid\s*!important/s);
  assert.match(css, /grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\)\s*!important/);
  assert.match(css, /min-height:\s*82px/);
  assert.match(css, /border-left:\s*2px solid #7fa8c1/);
});

test("empty-state icon and copy occupy separate grid tracks", () => {
  assert.match(css, /\.cad-inspector-empty > div\s*\{[^}]*grid-row:\s*1\s*\/\s*span\s*2/s);
  assert.match(css, /\.cad-inspector-empty > strong\s*\{[^}]*grid-column:\s*2/s);
  assert.match(css, /\.cad-inspector-empty > p\s*\{[^}]*grid-column:\s*2/s);
});

test("forced-colors keeps the empty inspector state and copy legible", () => {
  assert.match(css, /@media\s*\(min-width:\s*761px\)\s*and\s*\(forced-colors:\s*active\)/);
  assert.match(css, /\.cad-inspector-empty\s*\{[^}]*border-color:\s*CanvasText/s);
  assert.match(css, /\.cad-inspector-empty :is\(strong,\s*p\)\s*\{[^}]*color:\s*CanvasText/s);
});


test("compact desktop widths retain the empty-state hierarchy without crowding the inspector", () => {
  assert.match(css, /@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*900px\)/);
  assert.match(css, /grid-template-columns:\s*30px\s+minmax\(0,\s*1fr\)\s*!important/);
  assert.match(css, /min-height:\s*76px/);
  assert.match(css, /padding:\s*9px\s+10px\s*!important/);
});
