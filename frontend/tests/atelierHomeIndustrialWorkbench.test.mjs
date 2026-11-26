import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/atelier-home-workbench-layout-001.css", import.meta.url), "utf8");

test("studio launcher uses the same graphite and steel-blue surface language as the CAD workbench", () => {
  assert.match(css, /UI-LAUNCHER-GRAPHITE-WORKBENCH-002/);
  assert.match(css, /--paper:\s*#0d141b/);
  assert.match(css, /background:\s*rgba\(18,\s*27,\s*35,\s*\.97\)/);
  assert.match(css, /background:\s*#35566b/);
  assert.match(css, /border-color:\s*#7899ad/);
  assert.match(css, /color:\s*#a6c9dc/);
});

test("existing project actions keep their real handlers while cards and empty state gain visible keyboard focus", () => {
  assert.match(app, /onClick=\{\(\) => startNewProject\(\)\}/);
  assert.match(app, /onClick=\{\(\) => startNewProject\("scene"\)\}/);
  assert.match(app, /onClick=\{\(\) => startNewProject\("catalog", "production"\)\}/);
  assert.match(app, /loadProject\(event\)/);
  assert.match(css, /\.atelier-start-card:focus-visible/);
  assert.match(css, /\.atelier-primary-action:focus-visible/);
  assert.match(css, /\.atelier-empty-project:focus-visible/);
});

test("launcher cards and recent-project state reflow for medium and narrow screens", () => {
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.atelier-bottom-row\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("launcher transitions respect reduced motion and Windows forced-colors settings", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition:\s*none !important/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /background:\s*Canvas !important/);
  assert.match(css, /\.atelier-primary-action,/);
  assert.match(css, /outline:\s*2px solid Highlight !important/);
});
