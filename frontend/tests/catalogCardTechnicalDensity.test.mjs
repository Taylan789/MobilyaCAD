import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.css", import.meta.url),
  "utf8"
);
const component = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8"
);

test("catalog cards prioritize a compact technical preview and legible live dimensions", () => {
  assert.match(styles, /grid-template-columns:\s*92px\s+minmax\(0,\s*1fr\)/);
  assert.match(styles, /min-height:\s*96px/);
  assert.match(styles, /background-size:\s*12px\s+12px/);
  assert.match(component, /mc-catalog-card__dimensions/);
  assert.match(component, /dimensions/);
});

test("the add affordance is visible without hover and card focus is explicit", () => {
  const add = styles.match(/\.mc-catalog-card__add\s*\{([^}]*)\}/);
  assert.ok(add, "add affordance should have a dedicated style");
  assert.match(add[1], /opacity:\s*1/);
  assert.match(add[1], /transform:\s*none/);
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card:focus-visible/);
  assert.match(styles, /outline:\s*2px solid #a9c7d8/);
});

test("catalog cards support touch, reduced motion and forced-colors modes", () => {
  assert.match(styles, /@media\s*\(hover:\s*none\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /CanvasText/);
  assert.match(styles, /Highlight/);
});
