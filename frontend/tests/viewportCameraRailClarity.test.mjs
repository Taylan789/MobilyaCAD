import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../src/components/viewport/ViewportCameraControls.css", import.meta.url), "utf8");
const marker = "UI-VIEWPORT-CAMERA-RAIL-CLARITY-001";
const rail = styles.slice(styles.indexOf(marker));

test("camera rail uses a clear technical surface and larger view targets", () => {
  assert.notEqual(styles.indexOf(marker), -1);
  assert.match(rail, /\.cad-viewport-camera-tools\s*\{[\s\S]*?min-height:\s*40px/);
  assert.match(rail, /\.cad-viewport-camera-tools button\s*\{[\s\S]*?min-width:\s*42px;[\s\S]*?min-height:\s*34px/);
  assert.match(rail, /border-radius:\s*4px/);
});

test("camera selection and keyboard focus remain visibly distinguishable", () => {
  assert.match(rail, /button\[aria-pressed="true"\][\s\S]*?background:/);
  assert.match(rail, /button:focus-visible\s*\{[\s\S]*?outline:\s*2px solid/);
  assert.match(rail, /button:hover:not\(:disabled\)/);
});

test("camera rail keeps compact responsive targets and accessibility overrides", () => {
  assert.match(rail, /@media\s*\(max-width:\s*820px\)[\s\S]*?min-height:\s*32px/);
  assert.match(rail, /prefers-reduced-motion:\s*reduce/);
  assert.match(rail, /forced-colors:\s*active/);
  assert.match(rail, /HighlightText/);
});
