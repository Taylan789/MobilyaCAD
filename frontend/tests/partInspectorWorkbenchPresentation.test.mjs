import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(
  new URL("../src/components/workspace/FurniturePartInspector.css", import.meta.url),
  "utf8"
);
const component = await readFile(
  new URL("../src/components/workspace/FurniturePartInspector.tsx", import.meta.url),
  "utf8"
);

test("selected part inspector uses compact three-axis technical groups", () => {
  assert.match(component, /className="cad-part-editor-group"/);
  assert.match(component, /className="cad-dimension-fields"/);
  assert.match(component, /className="cad-part-coordinate-grid"/);
  assert.match(component, /<span>mm<\/span>/);
  assert.match(css, /\.cad-part-inspector\s*\{/);
  assert.match(css, /\.cad-part-inspector \.cad-dimension-fields,\s*\.cad-part-inspector \.cad-part-coordinate-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.cad-part-inspector \.cad-input-with-unit input\s*\{/);
});

test("part inspector keeps narrow-panel, reduced-motion and high-contrast support", () => {
  assert.match(css, /@container part-inspector \(max-width: 280px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /:focus-visible/);
});

test("part inspector keeps existing model and material callbacks wired", () => {
  assert.match(component, /onFieldChange\(field, value\)/);
  assert.match(component, /onPositionChange\(nextPosition\)/);
  assert.match(component, /onOpenMaterialLibrary/);
  assert.match(component, /onSelectUsage\(usage\.furnitureId, usage\.partId \?\? null\)/);
  assert.match(component, /onClearSelection/);
});
