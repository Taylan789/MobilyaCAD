import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8",
);
const controls = await readFile(
  new URL("../src/components/viewport/ViewportCameraControls.css", import.meta.url),
  "utf8",
);
const scene = await readFile(
  new URL("../src/components/viewport/Scene3D.tsx", import.meta.url),
  "utf8",
);
const marker = "UI-VIEWPORT-CAMERA-TOOLBAR-COMPACT-CANVAS-001";
const compact = css.slice(css.indexOf(marker));

test("medium CAD canvases use a bounded, compact camera rail", () => {
  assert.notEqual(css.indexOf(marker), -1);
  assert.ok(compact.includes("@container cad-viewport (min-width: 761px) and (max-width: 900px)"));
  assert.ok(compact.includes("max-width: calc(100% - 16px);"));
  assert.ok(compact.includes("gap: 1px;"));
  assert.ok(compact.includes("padding: 2px;"));
  assert.ok(compact.includes("min-width: 34px;"));
  assert.ok(compact.includes("min-height: 28px;"));
  assert.ok(compact.includes("font-size: 8px;"));
  assert.ok(compact.includes("width: 11px;"));
});

test("the medium rail keeps named camera actions visible and does not hide button labels", () => {
  assert.ok(compact.includes(".cad-viewport-camera-tools__label"));
  assert.ok(compact.includes("display: none;"));
  assert.ok(!compact.includes(".cad-viewport-camera-tools button > span"));
  for (const label of ["Perspektif görünüş", "Üst görünüş", "Ön görünüş", "Arka görünüş", "Sol görünüş", "Sağ görünüş", "Odayı görünüme sığdır"]) {
    assert.ok(scene.includes(`aria-label="${label}"`), `missing accessible action label: ${label}`);
  }
  assert.ok(scene.includes("Seçili mobilyaya odaklan"));
});

test("existing narrow-canvas and accessibility treatments remain intact", () => {
  assert.ok(css.includes("@container cad-viewport (max-width: 760px)"));
  assert.ok(css.includes("@container cad-viewport (max-width: 560px)"));
  assert.ok(controls.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(controls.includes("@media (forced-colors: active)"));
  assert.ok(controls.includes("button:focus-visible"));
});
