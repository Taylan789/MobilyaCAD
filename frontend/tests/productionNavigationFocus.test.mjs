import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(
  new URL("../src/components/production/ProductionWorkspace.css", import.meta.url),
  "utf8",
);

test("production navigation and return controls expose a keyboard focus ring", () => {
  assert.match(stylesheet, /\.mc-production-studio__navigation button:focus-visible,\s*\.mc-production-studio__back:focus-visible/);
  assert.match(stylesheet, /outline:\s*2px solid #91b4ca/);
  assert.match(stylesheet, /outline-offset:\s*2px/);
});

test("production keyboard focus remains visible with forced colors enabled", () => {
  assert.match(stylesheet, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(stylesheet, /outline:\s*2px solid Highlight/);
  assert.match(stylesheet, /box-shadow:\s*none/);
});
