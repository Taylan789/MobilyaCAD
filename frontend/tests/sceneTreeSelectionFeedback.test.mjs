import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const selectionCss = readFileSync(
  new URL("../src/styles/scene-selection-feedback.css", import.meta.url),
  "utf8",
);

test("scene-tree furniture and part selection remain connected to the existing selected IDs", () => {
  assert.match(
    app,
    /selectedFurnitureId === item\.id && !selectedPartId \? " selected" : ""/,
  );
  assert.match(
    app,
    /selectedFurnitureId === item\.id && selectedPartId === part\.id \? "studio-tree-part selected" : "studio-tree-part"/,
  );
});

test("selected scene rows use clear steel-blue rails distinct from hover", () => {
  const furnitureRule =
    selectionCss.match(/\.studio-tree-object-select\.selected\s*\{([^}]*)\}/)?.[1] ?? "";
  const partRule =
    selectionCss.match(/\.studio-tree-part\.selected\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(furnitureRule, /inset 3px 0 0 #a7cadb/);
  assert.match(furnitureRule, /border-color: #8eb6cc/);
  assert.match(partRule, /inset 2px 0 0 #93b8ce/);
});

test("scene-tree room, furniture and part controls keep a visible keyboard focus", () => {
  assert.match(selectionCss, /\.studio-tree-room:focus-visible/);
  assert.match(selectionCss, /\.studio-tree-object-select:focus-visible/);
  assert.match(selectionCss, /\.studio-tree-part:focus-visible/);
  assert.match(selectionCss, /outline-offset: 2px/);
});

test("forced-colors uses system highlight colors for selected rows and focus", () => {
  assert.match(selectionCss, /@media \(forced-colors: active\)/);
  assert.match(selectionCss, /color: HighlightText !important/);
  assert.match(selectionCss, /background: Highlight !important/);
  assert.match(selectionCss, /outline: 2px solid Highlight !important/);
});
