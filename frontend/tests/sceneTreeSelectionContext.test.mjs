import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/styles/cad-graphite-workspace-001.css", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const marker = "/* UI-SCENE-TREE-SELECTION-CONTEXT-001";
const feature = css.slice(css.indexOf(marker));
const parentContext =
  ".studio-tree-object:has(> .studio-tree-object-parts > .studio-tree-part.selected)";

test("a selected child Part highlights its parent furniture row as context", () => {
  assert.ok(feature.startsWith(marker));
  assert.ok(feature.includes(parentContext));
  assert.match(
    feature,
    /\.studio-tree-object-row > \.studio-tree-object-select\s*\{[^}]*background:\s*#243842 !important;[^}]*border-color:\s*#5b7889 !important;/s,
  );
  assert.match(
    feature,
    /\.studio-tree-object-parts\s*\{[^}]*border-left-color:\s*#7e9fb2 !important;/s,
  );
});

test("parent context remains visually distinct from the actual selected furniture state", () => {
  assert.match(
    app,
    /className=\{"studio-tree-object-select" \+ \(selectedFurnitureId === item\.id && !selectedPartId \? " selected" : ""\)\}/,
  );
  assert.match(
    app,
    /className=\{selectedFurnitureId === item\.id && selectedPartId === part\.id \? "studio-tree-part selected" : "studio-tree-part"\}/,
  );
  assert.doesNotMatch(feature, /studio-tree-object-select\.selected/);
});

test("the parent-to-Part relationship stays visible in forced-colors mode", () => {
  const forcedColors = feature.slice(feature.indexOf("@media (forced-colors: active)"));
  assert.ok(forcedColors.includes(parentContext));
  assert.match(forcedColors, /border-color:\s*Highlight !important/);
  assert.match(forcedColors, /border-left-color:\s*Highlight !important/);
});
