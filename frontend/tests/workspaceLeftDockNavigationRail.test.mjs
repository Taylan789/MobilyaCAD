import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(
  new URL("../src/styles/ui-workspace-vertical-rhythm-001.css", import.meta.url),
  "utf8"
);

test("left dock keeps the real library and scene tabs with the live scene count", () => {
  assert.match(app, /className="studio-sidebar-switch" role="tablist" aria-label="Sol panel görünümü"/);
  assert.match(app, /aria-selected={leftPanelMode === "catalog"}/);
  assert.match(app, /aria-selected={leftPanelMode === "scene"}/);
  assert.match(app, /setLeftPanelMode\("catalog"\)/);
  assert.match(app, /setLeftPanelMode\("scene"\)/);
  assert.match(app, /<Layers3 \/> Sahne ağacı <span>\{furniture\.length\}<\/span>/);
});

test("the active left-dock view is a distinct technical segment with visible hover and keyboard focus", () => {
  assert.match(css, /UI-LEFT-DOCK-NAVIGATION-RAIL-001/);
  assert.match(css, /\.cad-app \.studio-sidebar-switch\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.studio-sidebar-switch > button\[aria-selected="true"\][\s\S]*?background:/);
  assert.match(css, /\.studio-sidebar-switch > button\[aria-selected="true"\]::after/);
  assert.match(css, /\.studio-sidebar-switch > button:hover/);
  assert.match(css, /\.studio-sidebar-switch > button:focus-visible/);
});

test("the navigation rail preserves compact touch targets, reduced motion and forced-colors support", () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.studio-sidebar-switch > button\s*\{[^}]*min-height:\s*40px/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.studio-sidebar-switch > button\s*\{[^}]*transition:\s*none/s);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.studio-sidebar-switch > button\[aria-selected="true"\]/s);
});
