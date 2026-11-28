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

const axisCommit = component.match(/function commitAxis[\s\S]*?\n  }\n\n  function commitRotation/)?.[0] ?? "";
const rotationCommit = component.match(/function commitRotation[\s\S]*?\n  }\n\n  return/)?.[0] ?? "";

test("invalid position drafts remain visible while the committed geometry stays unchanged", () => {
  assert.match(axisCommit, /setPositionErrors\(\(previous\) => \(\{[\s\S]*?\[axis\]:/);
  assert.doesNotMatch(axisCommit, /setPositionDraft/);
  assert.match(axisCommit, /geçerli değer girilene kadar önceki konum uygulanır/);
  assert.match(component, /Object\.keys\(positionErrors\)\.length > 0/);
  assert.match(component, /id=\{\`furniture-position-\$\{axis\.key\}-error\`\}/);
});

test("editing one axis clears only that axis error and does not hide other rejected drafts", () => {
  assert.match(component, /delete next\[axis\.key\]/);
  assert.match(component, /aria-invalid=\{Boolean\(positionErrors\[axis\.key\]\)\}/);
  assert.ok(component.includes('aria-errormessage={positionErrors[axis.key] ? `furniture-position-${axis.key}-error` : undefined}'));
});

test("valid position commits retain the existing millimetre precision and clear only the committed axis error", () => {
  assert.match(axisCommit, /nextPosition\[index\] = parsedValue \/ 1000/);
  assert.match(axisCommit, /onPositionCommit\(nextPosition\)/);
  assert.match(axisCommit, /delete next\[axis\]/);
  assert.match(component, /meters \* 1000\)\.toFixed\(1\)/);
});

test("invalid rotation drafts remain editable and preserve the last committed angle", () => {
  assert.match(rotationCommit, /parsedValue < 0 \|\|\s*parsedValue > 359/);
  assert.match(rotationCommit, /geçerli değer girilene kadar önceki açı uygulanır/);
  assert.doesNotMatch(rotationCommit, /setRotationDraft/);
  assert.match(component, /aria-invalid=\{Boolean\(rotationError\)\}/);
  assert.match(component, /aria-errormessage=\{rotationError \? "furniture-rotation-error" : undefined\}/);
});

test("valid rotation commits keep the existing 0–359 degree contract", () => {
  assert.match(rotationCommit, /onRotationCommit\(parsedValue\)/);
  assert.match(rotationCommit, /setRotationError\(null\)/);
});

test("multiple transform errors use a compact, readable technical warning stack", () => {
  assert.match(component, /className="cad-transform-validation-list"/);
  assert.match(styles, /\.cad-transform-validation-list\s*\{[\s\S]*?display:\s*grid/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
});
