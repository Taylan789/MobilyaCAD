import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/production/MaterialCatalogManagerEmptyState.css", import.meta.url),
  "utf8",
);
const emptyState = component.slice(
  component.indexOf("{materials.length === 0 ?"),
  component.indexOf(") : filteredMaterials.length === 0 ?"),
);

test("the empty material catalog links to the existing material editor form", () => {
  assert.match(emptyState, /className="mc-material-library__empty-action"/);
  assert.match(emptyState, /href="#material-catalog-form"/);
  assert.match(emptyState, /aria-controls="material-catalog-form"/);
  assert.match(
    component,
    /<form id="material-catalog-form" tabIndex=\{-1\} onSubmit=\{submitMaterial\}>/,
  );
});

test("the empty-state form link stays compact, responsive and keyboard visible", () => {
  assert.match(styles, /\.mc-material-library__empty-action\s*\{[^}]*min-height:\s*34px;[^}]*grid-column:\s*3;/s);
  assert.match(styles, /\.mc-material-library__empty-action:focus-visible\s*\{[^}]*outline:\s*2px solid #b4d3e4;/s);
  assert.match(styles, /@container material-catalog \(max-width:\s*720px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /@media \(forced-colors:\s*active\)/);
  assert.match(styles, /#material-catalog-form:focus\s*\{[^}]*outline:/s);
});
