import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/styles/cad-graphite-workspace-001.css", import.meta.url),
  "utf8"
);
const feature = css.slice(css.indexOf("/* UI-SCENE-TREE-STICKY-SEARCH-001"));

test("scene-tree search stays pinned below the hierarchy header", () => {
  assert.match(feature, /\.cad-app \.studio-tree-search\s*\{[\s\S]*?position:\s*sticky !important;[\s\S]*?top:\s*42px !important;[\s\S]*?z-index:\s*3 !important;/);
  assert.match(feature, /border-bottom:\s*1px solid #3b515e !important/);
});

test("compact side dock gives the scene hierarchy its own scroll container", () => {
  assert.match(feature, /@media\s*\(max-width:\s*820px\)/);
  assert.match(feature, /\.cad-app \.cad-sidebar-content > \.studio-scene-tree\s*\{[\s\S]*?display:\s*flex !important;[\s\S]*?min-height:\s*0 !important;[\s\S]*?overflow-y:\s*auto !important;[\s\S]*?overscroll-behavior:\s*contain;/);
  assert.match(feature, /\.cad-app \.studio-tree-heading\s*\{[\s\S]*?position:\s*sticky !important;[\s\S]*?top:\s*0 !important;/);
});

test("scene-tree search remains legible in forced-colors mode", () => {
  assert.match(feature, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(feature, /background:\s*Canvas !important/);
  assert.match(feature, /border-bottom-color:\s*CanvasText !important/);
});
