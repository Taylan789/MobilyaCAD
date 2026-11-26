import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8"
);
const layout = readFileSync(
  new URL("../src/components/production/MaterialCatalogManagerContainerLayout.css", import.meta.url),
  "utf8"
);

test("material catalog container layout is wired after the existing material styles", () => {
  assert.match(component, /import "\.\/MaterialCatalogManagerContainerLayout\.css";/);
  assert.ok(component.indexOf("MaterialPanelThicknessSelector.css") < component.indexOf("MaterialCatalogManagerContainerLayout.css"));
});

test("material editor stacks when its own workspace is narrower than the desktop split", () => {
  assert.match(layout, /container-name:\s*material-catalog/);
  assert.match(layout, /container-type:\s*inline-size/);
  const compactWorkspace = layout.split("@container material-catalog (max-width: 1120px)")[1]?.split("@container")[0] ?? "";
  assert.match(compactWorkspace, /\.mc-material-library__workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(compactWorkspace, /\.mc-material-library__editor\s*\{[^}]*position:\s*static/);
});

test("narrow material panels use single-column cards and forms without viewport dependence", () => {
  const narrow = layout.split("@container material-catalog (max-width: 720px)")[1]?.split("@container")[0] ?? "";
  assert.match(narrow, /\.mc-material-library__grid,[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(narrow, /\.mc-material-library__editor form[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  const compact = layout.split("@container material-catalog (max-width: 520px)")[1] ?? "";
  assert.match(compact, /\.mc-material-library__header/);
  assert.match(compact, /\.mc-material-card\s*\{[^}]*grid-template-columns:\s*88px minmax\(0, 1fr\)/);
});

test("container-fit styles preserve forced-colors readability and add no motion dependency", () => {
  assert.match(layout, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(layout, /border-color:\s*CanvasText/);
  assert.doesNotMatch(layout, /animation\s*:|transition\s*:/);
});
