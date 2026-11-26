import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/components/production/MaterialCatalogUsageTrace.css", import.meta.url),
  "utf8",
);

test("material usage navigation keeps keyboard-focused rows inside a stable scroll rail", () => {
  const listRule = css.match(/\.mc-material-card__locations ul\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(listRule, /overflow-y:\s*auto/);
  assert.match(listRule, /overscroll-behavior:\s*contain/);
  assert.match(listRule, /scroll-padding-block:\s*8px/);
  assert.match(listRule, /scrollbar-gutter:\s*stable/);
});

test("keyboard focus and pointer activation are visually distinct from hover", () => {
  assert.match(css, /\.mc-material-card__locations > summary:focus-visible\s*\{[^}]*box-shadow:/);
  assert.match(css, /\.mc-material-card__locations li button:focus-visible\s*\{[^}]*background:/);
  assert.match(css, /\.mc-material-card__locations li button:active\s*\{[^}]*box-shadow:/);
});

test("Windows forced-colors keeps system focus cues and removes decorative focus shadows", () => {
  const forcedColors = css.slice(css.indexOf("@media (forced-colors: active)"));
  assert.match(forcedColors, /summary:focus-visible[\s\S]*outline-color:\s*Highlight/);
  assert.match(forcedColors, /summary:focus-visible[\s\S]*box-shadow:\s*none/);
});
