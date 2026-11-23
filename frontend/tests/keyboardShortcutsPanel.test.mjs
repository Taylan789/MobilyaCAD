import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/workspace/KeyboardShortcuts.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("CAD shortcut panel groups project, modelling and help commands", () => {
  assert.match(app, /cad-shortcuts-panel/);
  assert.match(app, /cad-shortcuts-list/);
  assert.match(css, /nth-child\(1\)::before/);
  assert.match(css, /content:\s*"PROJE"/);
  assert.match(css, /nth-child\(5\)::before/);
  assert.match(css, /content:\s*"MODELLEME"/);
  assert.match(css, /nth-child\(8\)::before/);
  assert.match(css, /content:\s*"YARDIM"/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
});

test("shortcut reference stays usable at desktop and narrow widths", () => {
  assert.match(css, /width:\s*min\(408px,\s*calc\(100vw\s*-\s*28px\)\)/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.match(css, /@media\s*\(max-width:\s*420px\)/);
});

test("shortcut panel respects reduced-motion preferences", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none/);
  assert.match(css, /transition:\s*none/);
});
