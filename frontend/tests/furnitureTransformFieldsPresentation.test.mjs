import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(
  new URL("../src/components/workspace/FurnitureTransformFields.tsx", import.meta.url),
  "utf8"
);
const styles = await readFile(
  new URL("../src/components/workspace/FurnitureTransformFields.css", import.meta.url),
  "utf8"
);

test("mobilya dönüş denetleyicisi erişilebilir konum ve dönüş grupları sunar", () => {
  assert.match(component, /import "\.\/FurnitureTransformFields\.css"/);
  assert.match(component, /aria-label="Mobilya konumu ve dönüşü"/);
  assert.match(component, /role="group"/);
  assert.match(component, /aria-label="Yerel konum, milimetre"/);
  assert.match(component, /aria-label=\{\x60\$\{axis\.label\} ekseni konumu, milimetre\x60\}/);
  assert.match(component, /htmlFor="furniture-rotation"/);
});

test("konum dönüşümü ve dönüş sınırları mevcut mm sözleşmesini korur", () => {
  assert.match(component, /meters \* 1000\)\.toFixed\(1\)/);
  assert.match(component, /nextPosition\[index\] = parsedValue \/ 1000/);
  assert.match(component, /onPositionCommit\(nextPosition\)/);
  assert.match(component, /step="0\.1"/);
  assert.match(component, /parsedValue < 0 \|\|\s*parsedValue > 359/);
  assert.match(component, /onRotationCommit\(parsedValue\)/);
});

test("teknik alan düzeni dar panelde uyum sağlar ve reduced-motion tercihine uyar", () => {
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /font-variant-numeric: tabular-nums/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /transition: none !important/);
  assert.match(styles, /:focus-visible/);
});
