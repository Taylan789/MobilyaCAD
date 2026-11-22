import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles/ui-inspector-layout-001.css", import.meta.url), "utf8");

test("inspector refinement is wired into the real CAD app", () => {
  assert.match(app, /ui-inspector-layout-001\.css/);
  assert.match(app, /className="cad-inspector"/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /cad-dimension-fields/);
});

test("inspector context and tabs have scan-first hierarchy", () => {
  assert.match(styles, /\.cad-inspector > div\[aria-live="polite"\]/);
  assert.match(styles, /\.cad-inspector-tab-list button\s*\{/);
  assert.match(styles, /flex-direction:\s*column/);
  assert.match(styles, /\.cad-selected-object-icon/);
});

test("room and furniture dimensions use responsive grids without changing field behavior", () => {
  assert.match(styles, /cad-tab-content\[data-state="active"\].*cad-property-section:first-child/);
  assert.match(styles, /\.cad-dimension-fields\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*760px\)/);
});

test("refinement honors reduced motion and forced-colors accessibility", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /transition:\s*none !important/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /Canvas/);
});
