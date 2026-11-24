import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCardAction.css", import.meta.url), "utf8");
const cardStyles = readFileSync(new URL("../src/components/catalog/FurnitureCatalogCard.css", import.meta.url), "utf8");

test("catalog card explains the real click and drag placement actions", () => {
  assert.ok(component.includes('details || "Tıkla: ekle · Sürükle: yerleştir"'));
  assert.ok(component.includes('className="mc-catalog-card__add-label">EKLE'));
  assert.ok(component.includes("Tıkla ile odaya ekle; sürükleyerek sahnede konumlandır."));
  assert.ok(component.includes("onClick={onAdd}"));
  assert.ok(component.includes('dataTransfer.setData("application/x-mobilyacad-catalog-id", item.id)'));
  assert.ok(!component.includes("Özel ölçü modülü"));
});

test("catalog add label inherits hover, keyboard-focus and touch visibility states", () => {
  assert.ok(styles.includes(".mc-catalog-card__add"));
  assert.ok(cardStyles.includes(".cad-catalog-card.mc-catalog-card:hover .mc-catalog-card__add"));
  assert.ok(cardStyles.includes(".cad-catalog-card.mc-catalog-card:focus-visible .mc-catalog-card__add"));
  assert.ok(cardStyles.includes("@media (hover: none)"));
  assert.ok(component.includes("onDragStart"));
  assert.ok(component.includes("onDragEnd={onDragEnd}"));
});

test("catalog action affordance respects reduced-motion preferences", () => {
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes("transition: none"));
  assert.ok(styles.includes("transform: none"));
});
