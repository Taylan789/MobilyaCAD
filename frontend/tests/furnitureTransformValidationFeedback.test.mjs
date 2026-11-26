import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/workspace/FurnitureTransformFields.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/workspace/FurnitureTransformFields.css", import.meta.url),
  "utf8",
);

test("invalid position drafts explain the rejected axis and preserve the last committed position", () => {
  assert.match(
    component,
    /setPositionError\(\x60\$\{axis\.toUpperCase\(\)\} konumu geçerli bir sayı değil; önceki değer korundu\.\x60\)/,
  );
  assert.match(component, /setPositionDraft\(createPositionDraft\(furniture\.position\)\)/);
  assert.match(component, /id="furniture-position-error" role="status" aria-live="polite"/);
  assert.match(component, /aria-describedby="furniture-position-help"/);
  assert.match(component, /aria-errormessage=\{positionError \? "furniture-position-error" : undefined\}/);
});

test("valid position commits retain the existing millimetre precision and clear the message", () => {
  assert.match(component, /meters \* 1000\)\.toFixed\(1\)/);
  assert.match(component, /setPositionError\(null\);\s*const nextPosition: \[number, number, number\] = \[\.\.\.furniture\.position\];\s*nextPosition\[index\] = parsedValue \/ 1000;\s*onPositionCommit\(nextPosition\)/);
  assert.match(component, /setPositionError\(null\);\s*setPositionDraft/);
});

test("invalid rotation drafts explain the existing 0–359 degree limit and preserve the last value", () => {
  assert.match(component, /parsedValue < 0 \|\|\s*parsedValue > 359/);
  assert.match(component, /Dönüş açısı 0–359° aralığında olmalı; önceki değer korundu\./);
  assert.match(component, /id="furniture-rotation-error" role="status" aria-live="polite"/);
  assert.match(component, /aria-describedby="furniture-rotation-help"/);
  assert.match(component, /aria-errormessage=\{rotationError \? "furniture-rotation-error" : undefined\}/);
  assert.match(component, /setRotationDraft\(String\(furniture\.rotation\)\)/);
  assert.match(component, /setRotationError\(null\);\s*onRotationCommit\(parsedValue\)/);
});

test("transform validation feedback uses the technical warning surface and forced-colors fallback", () => {
  assert.match(styles, /\.cad-transform-validation\s*\{[\s\S]*?display:\s*flex/);
  assert.match(styles, /border-left:\s*2px solid/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /color:\s*CanvasText\s*!important/);
});
