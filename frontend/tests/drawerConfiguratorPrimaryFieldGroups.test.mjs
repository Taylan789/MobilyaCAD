import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/DrawerBoxConfigurator.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/production/DrawerBoxConfigurator.css", import.meta.url),
  "utf8"
);

test("drawer geometry inputs are grouped under an explicit millimetre heading", () => {
  const dimensions = component.match(
    /<fieldset className="cad-drawer-config-fieldset cad-drawer-config-fieldset--dimensions">([\s\S]*?)<\/fieldset>/
  )?.[1] ?? "";

  assert.match(dimensions, /<legend>ANA ÖLÇÜLER · mm<\/legend>/);
  assert.match(dimensions, /dimensionFields\.map/);
  assert.match(dimensions, /type="number"[\s\S]*?min="0\.1"[\s\S]*?step="0\.1"/);
  assert.match(dimensions, /value={draft\[key\]}/);
});

test("quantity and material inputs remain together with their existing draft bindings", () => {
  const materialGroup = component.match(
    /<fieldset className="cad-drawer-config-fieldset cad-drawer-config-fieldset--material">([\s\S]*?)<\/fieldset>/
  )?.[1] ?? "";

  assert.match(materialGroup, /<legend>ADET & MALZEME<\/legend>/);
  assert.match(materialGroup, /id="drawer-quantity"/);
  assert.match(materialGroup, /value={draft\.quantity}/);
  assert.match(materialGroup, /value={draft\.materialId}/);
  assert.match(materialGroup, /value={draft\.material}/);
  assert.match(materialGroup, /disabled={draft\.materialId !== ""}/);
  assert.match(component, /calculateDrawerBoxParts\(/);
});

test("primary field groups remain responsive and Windows high-contrast safe", () => {
  assert.match(styles, /UI-DRAWER-PRIMARY-FIELD-GROUPS-001/);
  assert.match(styles, /grid-column:\s*1\s*\/\s*-1/);
  assert.match(
    styles,
    /@media \(max-width: 560px\)[\s\S]*?cad-drawer-config-field-grid[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/
  );
  assert.match(
    styles,
    /@media \(forced-colors: active\)[\s\S]*?cad-drawer-config-fieldset[\s\S]*?border-color: CanvasText/
  );
});
