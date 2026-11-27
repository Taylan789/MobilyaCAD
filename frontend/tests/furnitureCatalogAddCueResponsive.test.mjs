import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCardAction.css", import.meta.url),
  "utf8"
);

test("catalog add cue shows its explicit EKLE label at standard desktop widths", () => {
  assert.match(component, /className="mc-catalog-card__add-label">EKLE/);
  assert.match(component, /onClick={onAdd}/);
  assert.match(styles, /min-width:\s*48px/);
  assert.match(styles, /min-height:\s*34px/);
  assert.match(styles, /@media \(min-width: 821px\) and \(max-width: 1180px\)/);
  assert.doesNotMatch(styles, /max-width: 1360px/);
});

test("compact widths keep a visible icon cue while the card remains the real action target", () => {
  const compact = styles.match(/@media \(max-width: 820px\)([\s\S]*?)(?=@media \(|$)/);
  assert.ok(compact);
  assert.match(compact[1], /width:\s*36px/);
  assert.match(compact[1], /height:\s*36px/);
  assert.match(compact[1], /\.mc-catalog-card__add-label\s*\{\s*display:\s*none;/);
});

test("medium desktop retains a compact cue and desktop widths show the EKLE label", () => {
  const medium = styles.match(/@media \(min-width: 821px\) and \(max-width: 1180px\)([\s\S]*?)(?=@media \(|$)/);
  assert.ok(medium);
  assert.match(medium[1], /width:\s*34px/);
  assert.match(medium[1], /\.mc-catalog-card__add-label\s*\{\s*display:\s*none;/);
});

test("catalog add cue preserves reduced-motion and forced-colors accessibility", () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /transition:\s*none !important/);
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /ButtonFace/);
  assert.match(styles, /outline:\s*2px solid Highlight/);
});
