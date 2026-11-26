import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8",
);

test("viewport room register responds to the available canvas width", () => {
  assert.match(
    css,
    /@container cad-viewport \(min-width: 521px\) and \(max-width: 820px\)/,
  );
  assert.match(css, /width: min\(258px, calc\(100% - 18px\)\)/);
  assert.match(css, /header > small[\s\S]*max-width: 110px[\s\S]*text-overflow: ellipsis/);
});

test("compact register keeps all three live dimensions and their units legible", () => {
  assert.match(css, /dimensions > div[\s\S]*min-height: 30px/);
  assert.match(css, /dimensions strong[\s\S]*font-size: 10px/);
  assert.match(css, /dimensions small[\s\S]*font-size: 7px/);
  assert.match(css, /dimensions > div:nth-child\(1\) > span::before[\s\S]*content: "X"/);
  assert.match(css, /dimensions > div:nth-child\(2\) > span::before[\s\S]*content: "Z"/);
  assert.match(css, /dimensions > div:nth-child\(3\) > span::before[\s\S]*content: "Y"/);
});

test("existing reduced-motion and forced-colors accommodations remain present", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});
