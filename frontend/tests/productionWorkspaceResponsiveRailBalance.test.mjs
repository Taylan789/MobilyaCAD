import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/components/production/ProductionWorkspace.css", import.meta.url),
  "utf8"
);

test("production workspace reclaims width on mid-size desktop without removing its rail", () => {
  assert.match(css, /@media \(min-width: 1101px\) and \(max-width: 1360px\)[\s\S]*?grid-template-columns: 218px minmax\(0, 1fr\);/);
  assert.match(css, /@media \(min-width: 1101px\) and \(max-width: 1360px\)[\s\S]*?padding: 22px clamp\(16px, 2vw, 28px\) 30px;/);
});

test("compact desktop production rail keeps navigation labels and usable targets", () => {
  const tabletRule = css.match(/@media \(min-width: 821px\) and \(max-width: 1100px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(tabletRule, /grid-template-columns: 188px minmax\(0, 1fr\);/);
  assert.match(tabletRule, /min-height: 36px;/);
  assert.match(tabletRule, /font-size: 10px;/);
  assert.match(tabletRule, /\.mc-production-studio__scope p[\s\S]*?font-size: 9px;/);
  assert.match(tabletRule, /\.mc-production-studio__top-actions[\s\S]*?gap: 8px;/);
});

test("existing stacked mobile breakpoints and reduced-motion support remain in place", () => {
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
