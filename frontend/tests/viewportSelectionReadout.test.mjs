import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scene = readFileSync(
  new URL("../src/components/viewport/Scene3D.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/viewport/ViewportSelectionReadout.css", import.meta.url),
  "utf8",
);

test("viewport selection readout derives from the live selected furniture and part IDs", () => {
  assert.match(
    scene,
    /const selectedFurniture = furniture\.find\(\(item\) => item\.id === selectedFurnitureId\)/,
  );
  assert.match(
    scene,
    /const selectedPart = selectedFurniture\?\.parts\.find\(\(item\) => item\.id === selectedPartId\)/,
  );
  assert.match(scene, /selectedPart\?\.name \?\? selectedFurniture\.name/);
});

test("viewport selection readout distinguishes a selected part from its parent furniture", () => {
  assert.match(scene, /data-selection-kind=\{selectedPart \? "part" : "furniture"\}/);
  assert.match(scene, /selectedPart \? "PARÇA" : "MOBİLYA"/);
  assert.match(scene, /className="cad-viewport-selection-readout__parent"/);
  assert.match(scene, /aria-label="3D görünümde seçili öğe"/);
  assert.match(scene, /role="group"/);
});

test("viewport selection readout remains passive and cannot intercept viewport gestures", () => {
  assert.match(styles, /\.cad-viewport-selection-readout\s*\{[^}]*pointer-events:\s*none/s);
  const start = scene.indexOf('className="cad-viewport-selection-readout"');
  const end = scene.indexOf("</div>", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const markup = scene.slice(start, end);
  assert.doesNotMatch(markup, /<button|onClick=/);
});

test("selection readout stays compact and legible in forced-colors mode", () => {
  assert.match(styles, /@media\s*\(max-width:\s*560px\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /border-left-color:\s*Highlight/);
});
