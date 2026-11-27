import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionStyles = await readFile(
  new URL("../src/components/catalog/FurnitureCatalogCardAction.css", import.meta.url),
  "utf8",
);
const cardSource = await readFile(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8",
);

test("catalog add affordance is visible and more legible on wide desktop", () => {
  const baseRule = actionStyles.match(
    /\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__add\s*\{([^}]*)\}/,
  );
  assert.ok(baseRule, "base add-action rule exists");
  assert.match(baseRule[1], /min-width:\s*48px/);
  assert.match(baseRule[1], /min-height:\s*34px/);
  assert.match(baseRule[1], /opacity:\s*1/);
  assert.match(actionStyles, /\.mc-catalog-card:focus-visible \.mc-catalog-card__add/);
});

test("compact and medium layouts keep distinct icon-only targets", () => {
  const compact = actionStyles.match(
    /@media \(max-width: 820px\)[\s\S]*?\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__add\s*\{([^}]*)\}/,
  );
  assert.ok(compact, "compact catalog breakpoint exists");
  assert.match(compact[1], /width:\s*36px/);
  assert.match(compact[1], /height:\s*36px/);
  assert.match(
    actionStyles,
    /@media \(max-width: 820px\)[\s\S]*?\.mc-catalog-card__add-label\s*\{\s*display:\s*none;/,
  );

  const medium = actionStyles.match(
    /@media \(min-width: 821px\) and \(max-width: 1180px\)[\s\S]*?\.cad-catalog-card\.mc-catalog-card \.mc-catalog-card__add\s*\{([^}]*)\}/,
  );
  assert.ok(medium, "medium-desktop catalog breakpoint exists");
  assert.match(medium[1], /width:\s*34px/);
  assert.match(medium[1], /height:\s*34px/);
  assert.match(
    actionStyles,
    /@media \(min-width: 821px\) and \(max-width: 1180px\)[\s\S]*?\.mc-catalog-card__add-label\s*\{\s*display:\s*none;/,
  );
});

test("catalog card remains the real click-and-drag control", () => {
  assert.match(cardSource, /<button[\s\S]*?draggable/);
  assert.match(cardSource, /onClick=\{onAdd\}/);
  assert.match(cardSource, /setData\("application\/x-mobilyacad-catalog-id", item\.id\)/);
  assert.match(cardSource, /className="mc-catalog-card__add" aria-hidden="true"/);
});

test("reduced motion and Windows forced-colors remain supported", () => {
  assert.match(actionStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(actionStyles, /transition:\s*none !important/);
  assert.match(actionStyles, /@media \(forced-colors: active\)/);
  assert.match(actionStyles, /outline:\s*2px solid Highlight/);
});
