import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles/cad-viewport-toolbar.css", import.meta.url), "utf8");

test("viewport transforms are grouped and expose their selected state", () => {
  assert.match(app, /studio-viewport-actions" role="group" aria-label="3D görünüm ve panel araçları"/);
  assert.match(app, /studio-transform-tools" role="group" aria-label="Nesne dönüştürme"/);
  assert.match(app, /aria-pressed={transformMode === "translate"}/);
  assert.match(app, /aria-pressed={transformMode === "scale"}/);
  assert.match(app, /aria-pressed={transformMode === "rotate"}/);
});

test("panel visibility controls are a separately labeled group", () => {
  assert.match(app, /studio-panel-tools" role="group" aria-label="Panel görünürlüğü"/);
  assert.match(app, /aria-controls="cad-left-dock"/);
  assert.match(app, /aria-controls="cad-inspector"/);
});

test("viewport toolbar refinement is loaded after the existing CAD refinement", () => {
  const refinement = main.indexOf("./styles/cad-studio-refinement.css");
  const toolbar = main.indexOf("./styles/cad-viewport-toolbar.css");
  assert.ok(refinement >= 0 && toolbar > refinement);
});

test("toolbar has segmented states, compact desktop behavior and accessibility fallbacks", () => {
  assert.match(styles, /\.studio-transform-tools button\.active/);
  assert.match(styles, /\.studio-panel-tools button\.studio-panel-toggle\[aria-pressed="true"\]/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /max-width: 1120px/);
  assert.match(styles, /max-width: 760px/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
});


test("transform and panel states are visually bound to accessible disclosure", () => {
  assert.match(styles, /\.studio-transform-tools button\[aria-pressed="true"\]/);
  assert.match(styles, /\.studio-transform-tools button\[aria-pressed="true"\]::after/);
  assert.match(styles, /\.studio-panel-tools button\.studio-panel-toggle\[aria-expanded="true"\]/);
  assert.match(styles, /\.studio-panel-tools button\.studio-panel-toggle\[aria-expanded="false"\]/);
  assert.match(styles, /border-left:\s*1px solid/);
});


test("disabled viewport controls are quiet and excluded from hover feedback", () => {
  assert.match(styles, /\.studio-transform-tools button:hover:not\(\.active\):not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(styles, /\.studio-panel-tools button\.studio-panel-toggle:hover:not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(styles, /\.studio-transform-tools button:disabled/);
  assert.match(styles, /cursor:\s*not-allowed/);
  assert.match(styles, /opacity:\s*\.46/);
});

test("viewport orientation and unit readouts use legible technical sizing", () => {
  assert.match(styles, /\.studio-viewport-actions \.studio-view-label[\s\S]*?font-size:\s*8px !important/);
  assert.match(styles, /\.studio-viewport-actions \.studio-unit-pill[\s\S]*?font-variant-numeric:\s*tabular-nums !important/);
  assert.match(styles, /max-width: 1360px[\s\S]*?\.studio-viewport-actions \.studio-unit-pill[\s\S]*?min-width: 30px !important/);
});

test("disabled toolbar controls remain legible in Windows forced-colors mode", () => {
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.studio-transform-tools button:disabled[\s\S]*?border-color: GrayText !important/);
});
