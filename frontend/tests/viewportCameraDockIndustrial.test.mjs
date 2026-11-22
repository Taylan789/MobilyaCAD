import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/viewport/ViewportCameraControls.css", import.meta.url), "utf8");

test("viewport camera dock uses a compact segmented industrial surface", () => {
  assert.match(css, /UI-VIEWPORT-DOCK-001/);
  assert.match(css, /\.cad-viewport-camera-tools \{/);
  assert.match(css, /border-radius: 5px/);
  assert.match(css, /\.cad-viewport-camera-tools button\.is-active::after/);
  assert.match(css, /background: #a8c9de/);
});

test("camera dock remains compact, reduced-motion safe and high-contrast aware", () => {
  assert.match(css, /@media \(max-width: 1040px\)/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /outline-color: Highlight/);
});
