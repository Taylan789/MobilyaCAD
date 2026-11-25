import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8",
);

test("the room-dimension HUD responds to the actual viewport container width", () => {
  assert.match(
    css,
    /\.cad-viewport\s*\{[^}]*container:\s*cad-viewport\s*\/\s*inline-size\s*;/,
  );
  assert.match(css, /@container cad-viewport \(max-width: 520px\)/);

  const start = css.indexOf("@container cad-viewport (max-width: 520px)");
  const end = css.indexOf("@container", start + 1);
  const compactRule = css.slice(start, end === -1 ? undefined : end);

  assert.match(compactRule, /width:\s*min\(246px, calc\(100% - 16px\)\)/);
  assert.match(compactRule, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(compactRule, /nth-child\(3\)[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(compactRule, /nth-child\(3\) > small[\s\S]*grid-column:\s*3/);
});

test("very narrow viewports clamp the HUD and keep the live count from forcing overflow", () => {
  const start = css.indexOf("@container cad-viewport (max-width: 360px)");
  assert.notEqual(start, -1, "the narrow-viewport container rule must exist");
  const narrowRule = css.slice(start);

  assert.match(narrowRule, /width:\s*min\(216px, calc\(100% - 12px\)\)/);
  assert.match(narrowRule, /header > small[\s\S]*max-width:\s*104px[\s\S]*overflow:\s*hidden[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(narrowRule, /dimensions strong[\s\S]*font-size:\s*10px/);
});

test("the HUD remains passive and retains reduced-motion and forced-colors fallbacks", () => {
  assert.match(css, /\.cad-viewport-dimension-readout\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});
