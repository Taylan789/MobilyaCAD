import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/viewport/ViewportCameraControls.css", import.meta.url), "utf8");

test("camera view dock stays viewport-bounded and scrolls instead of compressing controls", () => {
  assert.match(css, /max-width:\s*min\(620px,\s*calc\(100vw\s*-\s*30px\)\)/);
  assert.match(css, /\.cad-viewport-camera-tools\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /overscroll-behavior-x:\s*contain/);
  assert.match(css, /\.cad-viewport-camera-tools button,\s*\.cad-viewport-camera-tools__label,\s*\.cad-viewport-camera-tools__divider\s*\{[^}]*flex:\s*0 0 auto/s);
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
});

test("camera view state is readable by aria-pressed and keyboard focus", () => {
  assert.match(css, /\.cad-viewport-camera-tools button\[aria-pressed="true"\]/);
  assert.match(css, /button\[aria-pressed="true"\]::after/);
  assert.match(css, /\.cad-viewport-camera-tools button:focus-visible\s*\{[^}]*outline:\s*2px solid/s);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
});

test("camera dock responsive additions preserve reduced-motion behavior", () => {
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /scroll-behavior:\s*auto/);
});
