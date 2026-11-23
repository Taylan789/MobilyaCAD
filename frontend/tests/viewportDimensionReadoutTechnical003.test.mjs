import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url), "utf8");
const refinement = css.match(/\/\* UI-VIEWPORT-DIMENSION-READOUT-TECH-003[\s\S]*$/)?.[0] ?? "";

test("room dimensions HUD keeps a restrained technical frame and legible live count", () => {
  assert.match(refinement, /width: min\(326px, calc\(100% - 24px\)\)/);
  assert.match(refinement, /border-top: 1px solid/);
  assert.match(refinement, /header > small[\s\S]*text-overflow: ellipsis/);
});

test("dimension cells align values, keep units readable, and retain tabular precision", () => {
  assert.match(refinement, /dimensions > div[\s\S]*min-height: 44px/);
  assert.match(refinement, /dimensions strong[\s\S]*font-size: 14px[\s\S]*text-align: right/);
  assert.match(refinement, /dimensions small[\s\S]*font-size: 9px/);
});

test("HUD compacts at short desktop heights and preserves motion/high-contrast preferences", () => {
  assert.match(refinement, /@media \(max-height: 660px\) and \(min-width: 561px\)/);
  assert.match(refinement, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/);
  assert.match(refinement, /@media \(forced-colors: active\)[\s\S]*CanvasText/);
});
