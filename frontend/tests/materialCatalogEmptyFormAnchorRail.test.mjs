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

test("the empty material catalog links to the real focusable editor form", () => {
  assert.match(component, /href="#material-catalog-form"/);
  assert.match(component, /aria-controls="material-catalog-form"/);
  assert.match(component, /<form id="material-catalog-form" tabIndex=\{-1\}/);
});

test("the editor form receives enough scroll margin and a visible anchor destination", () => {
  assert.match(styles, /#material-catalog-form\s*\{[^}]*scroll-margin-block:\s*18px/s);
  assert.match(styles, /#material-catalog-form:target\s*\{[^}]*outline:\s*2px solid/s);
  assert.match(styles, /#material-catalog-form:focus-visible\s*\{[^}]*outline:\s*2px solid/s);
});

test("the anchored editor destination remains visible in Windows high-contrast mode", () => {
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)[\s\S]*?#material-catalog-form:target[\s\S]*?outline:\s*2px solid Highlight/);
});
