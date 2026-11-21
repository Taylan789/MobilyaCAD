import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/components/viewport/ViewportCameraControls.css", import.meta.url), "utf8");

test("camera toolbar density follows the actual viewport panel width", () => {
  assert.match(css, /\.cad-viewport\s*\{[^}]*container-name:\s*cad-viewport/s);
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /@container\s+cad-viewport\s*\(max-width:\s*720px\)/);
  assert.match(css, /@container\s+cad-viewport\s*\(max-width:\s*560px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
