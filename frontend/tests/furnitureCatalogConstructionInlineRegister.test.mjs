import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCardConstruction.css", import.meta.url),
  "utf8",
);
const card = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8",
);

test("catalog construction facts render as a compact single-column technical register", () => {
  assert.match(styles, /UI-CATALOG-CONSTRUCTION-REGISTER-002/);
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__construction-entries\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__construction-entry\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*48px minmax\(0,\s*1fr\)/s);
  assert.match(styles, /\.mc-catalog-card__construction-entry-value\s*\{[^}]*text-align:\s*right/s);
  assert.match(styles, /border-bottom:\s*1px solid rgba\(125, 153, 169, \.16\)/);
});

test("the register continues to display only explicit catalog construction data", () => {
  assert.match(card, /item\.hasBackPanel === true/);
  assert.match(card, /item\.edgeBanding === true/);
  assert.match(card, /const material = item\.material\?\.trim\(\)/);
  assert.match(card, /construction\.map\(\(entry\) =>/);
  assert.match(card, /entry\.label/);
  assert.match(card, /entry\.value/);
});

test("compact and high-contrast layouts retain readable register values", () => {
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?grid-template-columns:\s*42px minmax\(0,\s*1fr\)/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?border-bottom-color:\s*CanvasText/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
