import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync(
  new URL("../src/styles/ui-inspector-layout-001.css", import.meta.url),
  "utf8",
);
const inspector = readFileSync(
  new URL("../src/components/workspace/FurniturePartInspector.tsx", import.meta.url),
  "utf8",
);

test("selected-part dimensions adapt to the actual inspector width", () => {
  assert.match(layout, /\.cad-part-inspector\s*\{[^}]*container-type:\s*inline-size/s);
  assert.match(layout, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(layout, /@container\s*\(max-width:\s*330px\)/);
  assert.match(layout, /@container\s*\(max-width:\s*270px\)/);
  assert.match(layout, /\.cad-part-inspector \.cad-dimension-fields \.cad-dimension-field:last-child\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});

test("dimension editing keeps the existing millimeter values and safe input bounds", () => {
  assert.match(inspector, /id=\{\`selected-part-\$\{field\}\`\}/);
  assert.match(inspector, /min="1"/);
  assert.match(inspector, /max="280000"/);
  assert.match(inspector, /step="1"/);
  assert.match(inspector, /<span>mm<\/span>/);
});

test("local position stays behind native progressive disclosure", () => {
  assert.match(inspector, /<details className="cad-part-position-disclosure">/);
  assert.match(inspector, /aria-controls="cad-part-position-fields"/);
  assert.match(layout, /\.cad-part-position-disclosure > summary:focus-visible|:focus-visible/);
});

test("production scope remains explanatory and the compact rail stays accessible", () => {
  assert.match(inspector, /className="cad-part-production-note"/);
  assert.match(inspector, /Kesim listesi şu anda desteklenen mobilya konstrüksiyon kurallarından hesaplanır/);
  assert.match(layout, /prefers-reduced-motion:\s*reduce/);
  assert.match(layout, /forced-colors:\s*active/);
  assert.match(layout, /CanvasText/);
});
