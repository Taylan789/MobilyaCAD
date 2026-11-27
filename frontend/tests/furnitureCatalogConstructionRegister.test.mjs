import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCardConstruction.css", import.meta.url), "utf8");

test("catalog cards surface only explicitly defined construction metadata", () => {
  assert.ok(component.includes('item.hasBackPanel === true'));
  assert.ok(component.includes('item.hasBackPanel === false'));
  assert.ok(component.includes("item.backThickness === undefined"));
  assert.ok(component.includes('item.edgeBanding === true'));
  assert.ok(component.includes('item.edgeBanding === false'));
  assert.ok(component.includes("const material = item.material?.trim()"));
  assert.ok(component.includes('label: "ARKALIK"'));
  assert.ok(component.includes('label: "KENAR"'));
  assert.ok(component.includes('label: "MALZEME"'));
  assert.ok(component.includes("const constructionLabel = construction.map"));
  assert.ok(component.includes('className="mc-catalog-card__construction-label">KONSTRÜKSİYON'));
  assert.ok(component.includes("Konstrüksiyon: ${constructionLabel}."));
});

test("construction metadata is rendered as individually labelled register cells", () => {
  assert.ok(component.includes('className="mc-catalog-card__construction-entries"'));
  assert.ok(component.includes('className="mc-catalog-card__construction-entry"'));
  assert.ok(component.includes('className="mc-catalog-card__construction-entry-label"'));
  assert.ok(component.includes('className="mc-catalog-card__construction-entry-value"'));
  assert.ok(component.includes('aria-hidden="true"'));
});

test("construction register stays compact, readable, and accessible", () => {
  assert.ok(styles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
  assert.ok(styles.includes("min-height: 122px"));
  assert.ok(styles.includes("text-overflow: ellipsis"));
  assert.ok(styles.includes("@media (max-width: 560px)"));
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes("@media (forced-colors: active)"));
});

test("construction metadata uses legible technical type with tabular dimension values", () => {
  assert.match(styles, /\.mc-catalog-card__construction-label\s*\{[^}]*font-size:\s*7px/s);
  assert.match(styles, /\.mc-catalog-card__construction-entry-label\s*\{[^}]*font-size:\s*7px/s);
  assert.match(styles, /\.mc-catalog-card__construction-entry-value\s*\{[^}]*font-size:\s*8px[^}]*font-variant-numeric:\s*tabular-nums/s);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.mc-catalog-card__construction-entry-value[\s\S]*?font-size:\s*7px/);
});

test("catalog add and drag placement behavior remains connected", () => {
  assert.ok(component.includes("onClick={onAdd}"));
  assert.ok(component.includes('application/x-mobilyacad-catalog-id'));
  assert.ok(component.includes("onDragEnd={onDragEnd}"));
  assert.ok(component.includes("G × Y × D: ${dimensions} milimetre"));
});
