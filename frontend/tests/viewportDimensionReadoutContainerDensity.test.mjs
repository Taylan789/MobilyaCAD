import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8",
);

test("viewport room register uses a moderate density tier for a 681–820px canvas", () => {
  assert.match(
    css,
    /@container cad-viewport \(min-width: 681px\) and \(max-width: 820px\)/,
  );
  assert.match(css, /width: min\(282px, calc\(100% - 18px\)\)/);
  assert.match(css, /min-height: 34px/);
  assert.match(css, /dimensions strong[\s\S]*font-size: 11px/);
});

test("viewport room register uses a tighter density tier for a 521–680px canvas", () => {
  assert.match(
    css,
    /@container cad-viewport \(min-width: 521px\) and \(max-width: 680px\)/,
  );
  assert.match(css, /width: min\(258px, calc\(100% - 18px\)\)/);
  assert.match(css, /header > small[\s\S]*max-width: 110px[\s\S]*text-overflow: ellipsis/);
  assert.match(css, /min-height: 30px/);
  assert.match(css, /dimensions strong[\s\S]*font-size: 10px/);
});

test("both density tiers preserve the live X/Z/Y dimension register and accessibility overrides", () => {
  assert.match(css, /dimensions > div:nth-child\(1\) > span::before[\s\S]*content: "X"/);
  assert.match(css, /dimensions > div:nth-child\(2\) > span::before[\s\S]*content: "Z"/);
  assert.match(css, /dimensions > div:nth-child\(3\) > span::before[\s\S]*content: "Y"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});
