import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");

test("scene hierarchy keeps the existing live scene selection, visibility and disclosure actions", () => {
  assert.match(app, /className="studio-scene-tree"/);
  assert.match(app, /onClick=\{\(\) => focusSceneFurniture\(item\.id\)\}/);
  assert.match(app, /onClick=\{\(\) => toggleFurnitureVisibility\(item\.id\)\}/);
  assert.match(app, /aria-expanded=\{isExpanded\}/);
  assert.match(app, /sceneMaterialSourceLabels\[itemMaterial\.source\]/);
  assert.match(app, /Sahne henüz boş/);
  assert.match(app, /setLeftPanelMode\("catalog"\)/);
});

test("desktop scene register uses compact hierarchy, readable dimensions and explicit hidden/isolated states", () => {
  assert.match(css, /UI-SCENE-HIERARCHY-REGISTER-001/);
  assert.match(css, /@media \(min-width: 821px\)/);
  assert.match(css, /\.studio-tree-heading\s*\{[\s\S]*?position: sticky/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(css, /\.studio-tree-visibility-toggle/);
  assert.match(css, /\.studio-tree-object\.is-hidden/);
  assert.match(css, /\.studio-tree-object\.is-isolated-out/);
  assert.match(css, /\.studio-tree-object-select\.selected/);
  assert.match(css, /\.studio-tree-part\.selected/);
});

test("scene register preserves reduced-motion and high-contrast accessibility", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /outline: 2px solid Highlight/);
});
