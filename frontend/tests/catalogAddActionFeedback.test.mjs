import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCardAction.css", import.meta.url),
  "utf8",
);

test("catalog add target stays compact on medium desktop widths", () => {
  assert.match(styles, /@media\s*\(min-width:\s*821px\)\s*and\s*\(max-width:\s*1180px\)/);
  const mediumDesktop = styles.match(
    /@media \(min-width: 821px\) and \(max-width: 1180px\)[\s\S]*?\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__add\s*\{([^}]*)\}/
  )?.[1];
  assert.ok(mediumDesktop, "the medium-desktop catalog breakpoint exists");
  assert.match(mediumDesktop, /width:\s*34px\s*;/);
  assert.match(mediumDesktop, /height:\s*34px\s*;/);
  assert.match(styles, /@media \(min-width: 821px\) and \(max-width: 1180px\)[\s\S]*?\.mc-catalog-card__add-label\s*\{\s*display:\s*none\s*;/);
});

test("catalog add target has visible hover, keyboard focus, and pressed feedback", () => {
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card:hover \.mc-catalog-card__add,[\s\S]*?\.cad-catalog-card\.mc-catalog-card:focus-visible \.mc-catalog-card__add/);
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card:active \.mc-catalog-card__add/);
  assert.match(styles, /box-shadow:\s*inset 0 1px 3px/);
});

test("catalog add target remains motion-safe and forced-colors visible", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /outline:\s*2px solid Highlight/);
});
