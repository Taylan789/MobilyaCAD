import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCardConstruction.css", import.meta.url), "utf8");

test("catalog cards surface only explicitly defined construction metadata", () => {
  assert.ok(component.includes("item.hasBackPanel === true"));
  assert.ok(component.includes("item.hasBackPanel === false"));
  assert.ok(component.includes("item.backThickness === undefined"));
  assert.ok(component.includes("item.edgeBanding === true"));
  assert.ok(component.includes("item.edgeBanding === false"));
  assert.ok(component.includes('item.material?.trim() ?? ""'));
  assert.ok(component.includes("const constructionLabel = construction.join"));
  assert.ok(component.includes('className="mc-catalog-card__construction-label">KONSTRÜKSİYON'));
  assert.ok(component.includes("Konstrüksiyon: ${constructionLabel}."));
});

test("construction metadata stays compact, truncates safely, and respects accessibility modes", () => {
  assert.ok(styles.includes(".mc-catalog-card__construction"));
  assert.ok(styles.includes("min-width: 0"));
  assert.ok(styles.includes("text-overflow: ellipsis"));
  assert.ok(styles.includes("white-space: nowrap"));
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes("@media (forced-colors: active)"));
});

test("catalog add and drag placement behavior remains connected", () => {
  assert.ok(component.includes("onClick={onAdd}"));
  assert.ok(component.includes('application/x-mobilyacad-catalog-id'));
  assert.ok(component.includes("onDragEnd={onDragEnd}"));
  assert.ok(component.includes("G × Y × D: ${dimensions} milimetre"));
});
