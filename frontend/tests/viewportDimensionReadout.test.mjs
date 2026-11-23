import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scene = readFileSync(new URL("../src/components/viewport/Scene3D.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url), "utf8");

test("viewport dimension readout is rendered from live room props and visible scene state", () => {
  assert.match(scene, /className="cad-viewport-dimension-readout"/);
  assert.match(scene, /width\.toLocaleString\("tr-TR"\)/);
  assert.match(scene, /length\.toLocaleString\("tr-TR"\)/);
  assert.match(scene, /height\.toLocaleString\("tr-TR"\)/);
  assert.match(scene, /visibleFurniture\.length/);
});

test("viewport dimension readout has compact, tabular three-axis hierarchy", () => {
  assert.match(stylesheet, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(stylesheet, /font-variant-numeric:\s*tabular-nums/);
  assert.match(stylesheet, /pointer-events:\s*none/);
});

test("viewport dimension readout is responsive and respects accessibility preferences", () => {
  assert.match(stylesheet, /@media\s*\(max-width:\s*560px\)/);
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /forced-colors:\s*active/);
  assert.match(stylesheet, /CanvasText/);
});
