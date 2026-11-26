import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8"
);
const css = readFileSync(
  new URL("../src/components/production/MaterialCatalogManagerEmptyState.css", import.meta.url),
  "utf8"
);

test("material catalog empty states use the existing real catalog branches", () => {
  assert.match(component, /import "\.\/MaterialCatalogManagerEmptyState\.css";/);
  assert.match(component, /materials\.length === 0 \?/);
  assert.match(component, /mc-material-library__empty--search/);
  assert.match(component, /Eşleşen malzeme bulunamadı/);
  assert.match(component, /Kütüphane henüz boş/);
});

test("empty catalog state is a compact two-column technical panel", () => {
  assert.match(css, /\.mc-material-library__empty:not\(\.mc-material-library__empty--search\)/);
  assert.match(css, /min-height:\s*128px/);
  assert.match(css, /grid-template-columns:\s*42px minmax\(0, 1fr\)/);
  assert.match(css, /text-align:\s*left/);
  assert.match(css, /border-left:\s*2px solid #8eabc0/);
});

test("filtered-empty state keeps active query context aligned and compact", () => {
  assert.match(css, /\.mc-material-library__empty--search \.mc-material-library__empty-context/);
  assert.match(css, /justify-content:\s*flex-start/);
  assert.match(css, /\.mc-material-library__empty--search > button/);
});

test("empty states adapt to compact and short workspaces without motion or contrast loss", () => {
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
  assert.match(css, /@media\s*\(max-height:\s*700px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /CanvasText/);
  assert.match(css, /Highlight/);
  assert.match(css, /:focus-visible/);
});
