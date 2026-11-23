import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/styles/cad-graphite-workspace-001.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("graphite CAD workspace skin is loaded by the actual app", () => {
  assert.match(app, /cad-graphite-workspace-001\.css/);
  assert.match(css, /--cad-dock-left:\s*260px/);
  assert.match(css, /--cad-dock-right:\s*326px/);
  assert.match(css, /\.cad-viewport\s*\{/);
  assert.match(css, /\.cad-sidebar\s*\{/);
  assert.match(css, /\.cad-inspector\s*\{/);
});

test("desktop workspace hierarchy remains compact and responsive", () => {
  assert.match(css, /\.cad-viewport-toolbar\s*\{/);
  assert.match(css, /\.cad-workspace-content\s*\{/);
  assert.match(css, /@media\s*\(min-width:\s*761px\)/);
  assert.match(css, /@media\s*\(min-width:\s*761px\)\s*and\s*\(max-width:\s*1200px\)/);
});

test("reduced-motion preference disables interface transitions", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /transition:\s*none\s*!important/);
  assert.match(css, /animation:\s*none\s*!important/);
});
