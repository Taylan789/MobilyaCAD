import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionStyles = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCardAction.css", import.meta.url),
  "utf8"
);
const card = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8"
);

test("the existing catalog add cue is visible before hover or keyboard focus", () => {
  const baseRule = actionStyles.match(
    /\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__add\s*\{([^}]+)\}/
  )?.[1];

  assert.ok(baseRule, "the catalog add affordance rule exists");
  assert.match(baseRule, /opacity:\s*1\s*;/);
  assert.match(baseRule, /transform:\s*none\s*;/);
  assert.match(baseRule, /background:\s*rgba\(48,\s*72,\s*86,\s*\.82\)\s*;/);
});

test("hover and keyboard focus strengthen the same existing add affordance", () => {
  assert.match(
    actionStyles,
    /\.cad-catalog-card\.mc-catalog-card:hover \.mc-catalog-card__add,[\s\S]*?\.cad-catalog-card\.mc-catalog-card:focus-visible \.mc-catalog-card__add/
  );
  assert.match(card, /className="mc-catalog-card__add" aria-hidden="true"/);
  assert.match(card, /onClick=\{onAdd\}/);
});

test("the persistent cue respects reduced motion and Windows forced colors", () => {
  assert.match(actionStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition:\s*none !important/);
  assert.match(actionStyles, /@media \(forced-colors: active\)[\s\S]*?background:\s*ButtonFace/);
  assert.match(actionStyles, /border-color:\s*ButtonText/);
});
