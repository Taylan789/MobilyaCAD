import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url), "utf8");
const hud = css.match(/\/\* UI-VIEWPORT-DIMENSION-HUD-002[\s\S]*$/)?.[0] ?? "";

test("live viewport dimensions use a compact instrument header and value badge", () => {
  assert.match(hud, /width: min\(304px, calc\(100% - 24px\)\)/);
  assert.match(hud, /border-left: 2px solid #7699b0/);
  assert.match(hud, /header > small[\s\S]*border: 1px solid/);
});

test("dimension cells are visually separated without changing their live values", () => {
  assert.match(hud, /dimensions > div::before/);
  assert.match(hud, /nth-child\(2\)::before[\s\S]*#c39470/);
  assert.match(hud, /nth-child\(3\)::before[\s\S]*#8eaf99/);
  assert.match(hud, /font-size: 13px/);
});

test("HUD remains responsive and supports reduced motion and forced colors", () => {
  assert.match(hud, /@media \(max-width: 560px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(hud, /@media \(forced-colors: active\)/);
  assert.match(hud, /background: Highlight/);
});
