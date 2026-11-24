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

test("coordinate guidance is progressively disclosed without hiding the concise axis reference", () => {
  assert.match(component, /id="furniture-position-help">\s*X\/Z: oda merkezi · Y: zemin/);
  assert.match(component, /<details className="cad-transform-reference">/);
  assert.match(component, /<summary>[\s\S]*?Ölçüm referansı/);
  assert.doesNotMatch(component, /<details[^>]*\bopen\b/);
  assert.match(component, /aria-describedby="furniture-position-help"/);
  assert.match(styles, /\.cad-transform-reference > summary/);
  assert.match(styles, /\.cad-transform-reference\[open\] > summary/);
});

test("rotation range remains the visible accessible description for the degree input", () => {
  assert.match(component, /aria-describedby="furniture-rotation-help"/);
  assert.match(component, /id="furniture-rotation-help">0–359°/);
  assert.match(component, /min="0"\s+max="359"/);
  assert.match(component, /Dönüş açısı 0–359° aralığında derece olarak uygulanır\./);
});

test("progressive disclosure does not alter millimeter conversion or transform commit behavior", () => {
  assert.match(component, /meters \* 1000\)\.toFixed\(1\)/);
  assert.match(component, /nextPosition\[index\] = parsedValue \/ 1000/);
  assert.match(component, /onPositionCommit\(nextPosition\)/);
  assert.match(component, /onRotationCommit\(parsedValue\)/);
  assert.match(component, /if \(event\.key === "Enter"\) event\.currentTarget\.blur\(\);/);
});

test("reference disclosure stays responsive, motion-safe and high-contrast compatible", () => {
  assert.match(styles, /@container \(max-width:\s*250px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /transition:\s*none/);
});
