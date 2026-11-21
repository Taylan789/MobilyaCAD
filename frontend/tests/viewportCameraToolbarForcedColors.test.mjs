import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cameraCss = readFileSync(
  new URL("../src/components/viewport/ViewportCameraControls.css", import.meta.url),
  "utf8",
);
const forcedColorsStart = cameraCss.indexOf(
  "/* UI-CAMERA-TOOLBAR-FORCED-COLORS-001",
);
const forcedColorsCss = forcedColorsStart >= 0 ? cameraCss.slice(forcedColorsStart) : "";

test("camera toolbar uses system colors and keeps the active view distinct", () => {
  assert.notEqual(forcedColorsStart, -1, "forced-colors block should exist");
  assert.match(forcedColorsCss, /@media \(forced-colors: active\)/);
  assert.match(
    forcedColorsCss,
    /\.cad-viewport-camera-tools button\s*\{[^}]*color:\s*ButtonText;[^}]*background:\s*ButtonFace;[^}]*border-color:\s*ButtonBorder;[^}]*box-shadow:\s*none;/s,
  );
  assert.match(
    forcedColorsCss,
    /button:hover:not\(:disabled\),\s*\.cad-viewport-camera-tools button\.is-active\s*\{[^}]*color:\s*HighlightText;[^}]*background:\s*Highlight;[^}]*border-color:\s*Highlight;/s,
  );
});

test("camera toolbar disabled and keyboard-focus states remain visible in forced colors", () => {
  assert.match(
    forcedColorsCss,
    /\.cad-viewport-camera-tools button:disabled\s*\{[^}]*color:\s*GrayText;[^}]*border-color:\s*GrayText;[^}]*opacity:\s*1;/s,
  );
  assert.match(
    forcedColorsCss,
    /\.cad-viewport-camera-tools button:focus-visible\s*\{[^}]*outline:\s*2px solid Highlight;[^}]*outline-offset:\s*2px;/s,
  );
  assert.match(forcedColorsCss, /\.cad-viewport-camera-tools__divider\s*\{[^}]*background:\s*CanvasText;/s);
});

test("part-selection callout retains readable system contrast without shadows", () => {
  assert.match(
    forcedColorsCss,
    /\.cad-part-selection-callout\s*\{[^}]*color:\s*CanvasText;[^}]*background:\s*Canvas;[^}]*border-color:\s*CanvasText;[^}]*border-left-color:\s*Highlight;[^}]*box-shadow:\s*none;[^}]*backdrop-filter:\s*none;/s,
  );
  assert.match(
    forcedColorsCss,
    /\.cad-part-selection-callout > span,\s*\.cad-part-selection-callout > strong,\s*\.cad-part-selection-callout > small\s*\{[^}]*color:\s*CanvasText;/s,
  );
});
