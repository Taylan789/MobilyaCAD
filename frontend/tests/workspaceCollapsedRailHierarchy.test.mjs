import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/workspace-layout.css", import.meta.url), "utf8");
const rail = css.slice(css.indexOf("/* UI-WORKSPACE-COLLAPSED-RAIL-001"));

test("collapsed left dock keeps the existing library and scene tabs visibly named", () => {
  assert.match(app, /studio-sidebar-switch" role="tablist" aria-label="Sol panel görünümü"/);
  assert.match(app, /role="tab" aria-selected={leftPanelMode === "catalog"}/);
  assert.match(app, /role="tab" aria-selected={leftPanelMode === "scene"}/);
  assert.match(rail, /button\s*\{[\s\S]*?flex-direction:\s*column/);
  assert.match(rail, /font-size:\s*6px/);
  assert.match(rail, /text-transform:\s*uppercase/);
});

test("the scene tab keeps its existing live furniture count as a compact badge", () => {
  assert.match(app, /<Layers3 \/> Sahne ağacı <span>\{furniture\.length\}<\/span>/);
  assert.match(rail, /button:nth-child\(2\) > span\s*\{[\s\S]*?font-variant-numeric:\s*tabular-nums/);
  assert.match(rail, /display:\s*inline-flex/);
});

test("collapsed tab selection, keyboard focus, reduced motion and forced colors remain explicit", () => {
  assert.match(rail, /button\[aria-selected="true"\]/);
  assert.match(rail, /button:hover:not\(\[aria-selected="true"\]\)/);
  assert.match(rail, /button:focus-visible/);
  assert.match(rail, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(rail, /@media \(forced-colors:\s*active\)/);
});
