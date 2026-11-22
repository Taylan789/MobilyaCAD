import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scene = readFileSync(new URL("../src/components/viewport/Scene3D.tsx", import.meta.url), "utf8");
const readoutCss = readFileSync(new URL("../src/components/viewport/ViewportCameraCurrentView.css", import.meta.url), "utf8");

test("camera toolbar readout follows and announces the active orientation", () => {
  assert.match(scene, /const cameraViewLabels: Record<CameraOrientation, string> = \{[\s\S]*?right: "SAĞ",\s*\};/);
  assert.match(scene, /className="cad-viewport-camera-tools__current-view"[\s\S]*?data-view=\{activeView\}[\s\S]*?role="status"[\s\S]*?aria-live="polite"[\s\S]*?aria-atomic="true"[\s\S]*?\{cameraViewLabels\[activeView\]\}/);
  assert.match(scene, /<PanelLeft aria-hidden="true" \/>/);
  assert.match(scene, /<PanelRight aria-hidden="true" \/>/);
});

test("orientation readout stays compact and uses system colors in high contrast", () => {
  assert.match(readoutCss, /\.cad-viewport-camera-tools__current-view\s*\{[\s\S]*?letter-spacing:\s*0\.12em;/);
  const compact = readoutCss.match(/@media \(max-width: 1040px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(compact, /\.cad-viewport-camera-tools__current-view\s*\{\s*display:\s*none;/);
  assert.match(readoutCss, /@media \(forced-colors: active\)[\s\S]*?color:\s*ButtonText;/);
});
