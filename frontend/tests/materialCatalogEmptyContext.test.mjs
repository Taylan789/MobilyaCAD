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

test("filtered-empty material catalog shows the active query and usage filter", () => {
  assert.match(component, /import "\.\/MaterialCatalogManagerEmptyState\.css";/);
  assert.match(component, /const activeFilterLabel = materialFilter === "used"/);
  assert.match(component, /materialFilter === "unused"/);
  assert.match(component, /role="group" aria-label="Aktif arama ve filtre"/);
  assert.match(component, /mc-material-library__empty-context-query/);
  assert.match(component, /mc-material-library__empty-context-filter/);
  assert.match(component, /searchQuery\.trim\(\)/);
});

test("empty-state context chips stay compact, responsive and high-contrast", () => {
  assert.match(css, /\.mc-material-library__empty-context/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /overflow:\s*hidden/);
  assert.match(css, /text-overflow:\s*ellipsis/);
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
});
