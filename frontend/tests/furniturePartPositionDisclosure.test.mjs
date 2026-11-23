import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/workspace/FurniturePartInspector.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/workspace/FurniturePartInspector.css", import.meta.url),
  "utf8"
);

test("local position controls are progressively disclosed and initially collapsed", () => {
  assert.match(source, /<details className="cad-part-position-disclosure">/);
  assert.match(source, /<summary aria-controls="cad-part-position-fields">[\s\S]*?Yerel konum[\s\S]*?Mobilya merkezine göre[\s\S]*?X · Y · Z \/ mm[\s\S]*?<ChevronDown aria-hidden="true" \/>[\s\S]*?<\/summary>/);
  assert.doesNotMatch(source, /<details className="cad-part-position-disclosure"[^>]*\bopen\b/);
  assert.match(source, /id="cad-part-position-fields" className="cad-part-coordinate-grid" role="group" aria-label="Parça konumu, milimetre"/);
});

test("position disclosure keeps the original millimeter fields and commit behavior", () => {
  assert.match(source, /key: "x", label: "X", index: 0/);
  assert.match(source, /key: "y", label: "Y", index: 1/);
  assert.match(source, /key: "z", label: "Z", index: 2/);
  assert.match(source, /id=\{\`selected-part-position-\$\{axis\.key\}\`\}/);
  assert.match(source, /onBlur=\{\(\) => commitPosition\(axis\.key, axis\.index\)\}/);
  assert.match(source, /nextPosition\[index\] = value \/ 1000/);
  assert.match(source, /Değişiklikler 3D önizlemeye ve proje verisine uygulanır\./);
});

test("disclosure is keyboard focusable and motion-safe in the technical inspector", () => {
  assert.match(styles, /\.cad-part-position-disclosure > summary:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce[\s\S]*?\.cad-part-position-disclosure > summary > svg:last-child\s*\{\s*transition:\s*none/s);
  assert.match(styles, /forced-colors:\s*active/);
});
