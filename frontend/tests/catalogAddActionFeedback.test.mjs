import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCardAction.css", import.meta.url),
  "utf8",
);

test("catalog add target stays compact on medium desktop widths", () => {
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)/);
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__add\s*\{[\s\S]*?width:\s*32px/);
  assert.match(styles, /\.mc-catalog-card__add-label\s*\{\s*display:\s*none/);
});

test("catalog add target has visible hover, keyboard focus, and pressed feedback", () => {
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card:focus-visible \.mc-catalog-card__add/);
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card:active \.mc-catalog-card__add/);
  assert.match(styles, /box-shadow:\s*inset 0 1px 3px/);
});

test("catalog add target remains motion-safe and forced-colors visible", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /outline:\s*2px solid Highlight/);
});
