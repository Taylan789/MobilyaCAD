import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../src/components/production/DrawerBoxConfigurator.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/production/DrawerBoxConfiguratorSections.css", import.meta.url), "utf8");

test("drawer inputs are grouped by dimensions, visible front, and material without changing field IDs", () => {
  assert.match(component, /dimensionGroups\s*=\s*\[/);
  assert.match(component, /fields:\s*dimensionFields\.slice\(0,\s*6\)/);
  assert.match(component, /fields:\s*dimensionFields\.slice\(6\)/);
  for (const title of ["Kutu ölçüleri", "Görünür ön panel", "Adet ve malzeme"]) {
    assert.ok(component.includes(title), `Missing section title: ${title}`);
  }
  assert.match(component, /group\.fields\.map/);
  assert.match(component, /aria-labelledby/);
  for (const fieldId of ["drawer-quantity", "drawer-material-catalog", "drawer-material"]) {
    assert.ok(component.includes(fieldId), `Missing existing field: ${fieldId}`);
  }
  assert.match(component, /onSubmit={saveConfig}/);
  assert.match(component, /calculateDrawerBoxParts/);
});

test("drawer section hierarchy adapts and honors accessibility preferences", () => {
  assert.match(styles, /\.cad-drawer-config-section-heading\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*600px\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
