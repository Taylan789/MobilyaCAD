import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cameraCss = readFileSync(
  new URL("../src/components/viewport/ViewportCameraControls.css", import.meta.url),
  "utf8",
);
const scene = readFileSync(
  new URL("../src/components/viewport/Scene3D.tsx", import.meta.url),
  "utf8",
);

test("camera console remains a labelled toolbar with real view controls", () => {
  assert.match(scene, /role="toolbar" aria-label="Kamera görünüşleri"/);
  assert.match(scene, /aria-pressed=\{activeView === "perspective"\}/);
  assert.match(scene, /onClick=\{\(\) => selectCameraView\("top"\)\}/);
  assert.match(scene, /onClick=\{fitRoomToView\}/);
  assert.match(scene, /disabled=\{!selectedFurnitureId\}/);
});

test("camera console uses compact technical surfaces and a distinct active view", () => {
  assert.match(cameraCss, /--cad-camera-surface:/);
  assert.match(cameraCss, /\.cad-viewport-camera-tools button\.is-active/);
  assert.match(cameraCss, /inset 0 -2px 0/);
  assert.match(cameraCss, /font-variant-numeric: tabular-nums/);
});

test("camera controls retain visible focus and adapt to narrow viewports", () => {
  assert.match(cameraCss, /button:focus-visible/);
  assert.match(cameraCss, /@media \(max-width: 1040px\)/);
  assert.match(cameraCss, /@media \(max-width: 820px\)/);
  assert.match(cameraCss, /overflow-x: auto/);
});

test("camera console respects reduced motion and forced-colour modes", () => {
  assert.match(cameraCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cameraCss, /transition: none !important/);
  assert.match(cameraCss, /@media \(forced-colors: active\)/);
});
