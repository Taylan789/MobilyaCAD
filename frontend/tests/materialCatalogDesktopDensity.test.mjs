import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/production/MaterialCatalogManager.css", import.meta.url), "utf8");

test("desktop material catalog uses compact technical card geometry", () => {
  const start = css.indexOf("@media (min-width: 1121px)");
  const end = start < 0 ? -1 : css.indexOf("\\n}", start);
  const desktop = start >= 0 && end >= 0 ? css.slice(start, end + 2) : "";
  assert.ok(desktop.includes("grid-template-columns: minmax(0, 1.25fr) minmax(300px, .8fr);"));
  assert.ok(desktop.includes("min-height: 116px;"));
  assert.ok(desktop.includes("grid-template-columns: 88px minmax(0, 1fr);"));
  assert.ok(desktop.includes("padding: 8px;"));
});

test("material catalog keeps its existing compact breakpoint behavior", () => {
  assert.ok(css.includes("@media (max-width: 1120px)"));
  assert.ok(css.includes("@media (max-width: 720px)"));
  assert.ok(css.includes(".mc-material-library__grid { grid-template-columns: minmax(0, 1fr); }"));
});

test("material controls remain keyboard-visible and support reduced motion and forced colors", () => {
  assert.ok(css.includes(".mc-material-library button:focus-visible"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes("@media (forced-colors: active)"));
  assert.ok(css.includes("color: HighlightText;"));
  assert.ok(css.includes("background: Highlight;"));
});
