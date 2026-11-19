import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/workspace/FurnitureTransformFields.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/workspace/FurnitureTransformFields.css", import.meta.url), "utf8");

test("transform inspector keeps its live axis and rotation commit behavior", () => {
  assert.match(component, /onPositionCommit\(nextPosition\)/);
  assert.match(component, /nextPosition\[index\]\s*=\s*parsedValue\s*\/\s*1000/);
  assert.match(component, /onRotationCommit\(parsedValue\)/);
  assert.match(component, /rotationDraft\.trim\(\)\s*===\s*""/);
  assert.match(component, /parsedValue\s*<\s*0/);
  assert.match(component, /parsedValue\s*>\s*359/);
});

test("axis fields expose axis identity, units, and precise numeric input steps", () => {
  assert.match(component, /FurnitureTransformFields\.css/);
  assert.match(component, /cad-transform-fields__axes grid grid-cols-3 gap-2/);
  assert.match(component, /data-axis=\{axis\.key\}/);
  assert.match(component, /cad-transform-fields__axis-input/);
  assert.match(component, /step="0\.1"/);
  assert.match(component, /ekseni konumu, milimetre/);
  assert.match(component, /Dönüş açısı, derece/);
});

test("axis inspector styling includes responsive and high-contrast states", () => {
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\) !important;/);
  assert.match(styles, /\.cad-transform-fields__axis-input:focus-visible/);
  assert.match(styles, /@media \(max-width:\s*420px\)/);
  assert.match(styles, /@media \(forced-colors:\s*active\)/);
  assert.match(styles, /border-color:\s*FieldText !important;/);
});
