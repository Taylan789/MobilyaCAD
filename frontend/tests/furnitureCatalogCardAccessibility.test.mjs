import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8",
);

test("catalog card accessible name includes available configuration details", () => {
  const expectedLabel = 'aria-label={`${item.name}, ${dimensions} milimetre${details ? `, ${details}` : ""}. Odaya ekle.`}';
  assert.ok(card.includes(expectedLabel));
  assert.ok(
    card.includes('{details && <span className="mc-catalog-card__details">{details}</span>}'),
    "details should render only when catalog data provides them",
  );
});

test("catalog cards do not show an invented fallback detail", () => {
  assert.doesNotMatch(card, /Özel ölçü modülü/);
});

test("catalog cards remain native keyboard-operable buttons with drag support", () => {
  assert.match(card, /<button\s+type="button"/);
  assert.match(card, /onClick=\{onAdd\}/);
  assert.match(card, /onDragStart=\{\(event\) =>/);
});