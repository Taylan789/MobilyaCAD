import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCard.css", import.meta.url), "utf8");

test("catalog preview side faces reference the per-item gradient IDs", () => {
  const sideReference = "fill={`url(#catalog-side-${item.id})`}";
  assert.equal(component.split(sideReference).length - 1, 2);
  assert.ok(!component.includes('fill="url(#catalog-side-${item.id})"'));
});

test("catalog dimensions expose the width-height-depth order", () => {
  assert.ok(component.includes('mc-catalog-card__axis-label">G × Y × D'));
  assert.ok(component.includes("{dimensions} mm"));
  assert.ok(component.includes("G × Y × D: ${dimensions} milimetre"));
  assert.ok(styles.includes(".mc-catalog-card__axis-label"));
});

test("catalog click and drag-to-place behavior remains connected", () => {
  assert.ok(component.includes("onClick={onAdd}"));
  assert.ok(component.includes("application/x-mobilyacad-catalog-id"));
  assert.ok(component.includes("onDragEnd={onDragEnd}"));
});
