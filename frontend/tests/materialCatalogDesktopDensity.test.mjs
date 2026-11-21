import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/production/MaterialCatalogManager.css", import.meta.url), "utf8");

test("desktop material catalog uses compact technical card geometry", () => {
  const desktop = css.match(/@media \\(min-width: 1121px)\\s*\\{([\\s\\S]*?)\\n\\}/)?.[1] ?? "";
  assert.match(desktop, /grid-template-columns: minmax\\(0, 1.25fr\\) minmax\\(300px, .8fr\\)/);
  assert.match(desktop, /min-height: 116px/);
  assert.match(desktop, /grid-template-columns: 88px minmax\\(0, 1fr\\)/);
  assert.match(desktop, /padding: 8px/);
});

test("material catalog keeps its existing compact breakpoint behavior", () => {
  assert.match(css, /@media \\(max-width: 1120px)/);
  assert.match(css, /@media \\(max-width: 720px)[\\s\\S]*?mc-material-library__grid \\{ grid-template-columns: minmax\\(0, 1fr\\)/);
});

test("material controls remain keyboard-visible and support reduced motion and forced colors", () => {
  assert.match(css, /mc-material-library button:focus-visible/);
  assert.match(css, /@media \\(prefers-reduced-motion: reduce)/);
  assert.match(css, /@media \\(forced-colors: active)/);
  assert.match(css, /color: HighlightText;[\\s\\S]*background: Highlight;/);
});
