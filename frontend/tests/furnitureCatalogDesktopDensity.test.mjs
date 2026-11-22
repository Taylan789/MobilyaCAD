import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCard.css", import.meta.url), "utf8");

test("desktop library cards use a compact, readable specimen layout", () => {
  assert.match(css, /@media \(min-width: 821px\)/);
  assert.match(css, /grid-template-columns: 96px minmax\(0, 1fr\) !important;/);
  assert.match(css, /min-height: 98px !important;/);
  assert.match(css, /background-size: 14px 14px, 14px 14px, auto, auto;/);
  assert.match(css, /height: 82px;/);
  assert.match(css, /gap: 3px;\s*padding: 8px 10px;/);
  assert.match(css, /font-size: 9\.5px;/);
  assert.match(css, /font-size: 8\.5px;/);
});

test("catalog cards preserve keyboard, touch, reduced-motion and forced-color support", () => {
  assert.match(css, /\.cad-catalog-card\.mc-catalog-card:focus-visible/);
  assert.match(css, /@media \(hover: none\)[\s\S]*?opacity: 1;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration: \.01ms !important;/);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?background: ButtonFace;/);
  assert.match(css, /outline-color: Highlight !important;/);
});
