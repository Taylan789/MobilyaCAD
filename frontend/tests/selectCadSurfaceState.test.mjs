import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/components/ui/select-cad-surface.css", import.meta.url), "utf8");

test("CAD select trigger exposes a visible open state", () => {
  assert.match(styles, /\.cad-select-trigger\[aria-expanded="true"\]/);
  assert.match(styles, /box-shadow:[\s\S]*var\(--ring\)/);
  assert.match(styles, /background:[\s\S]*var\(--accent\)/);
});

test("selected options remain distinct from highlighted options", () => {
  assert.match(styles, /\.cad-select-item\[data-selected\]:not\(\[data-highlighted\]\)/);
  assert.match(styles, /\.cad-select-item\[data-selected\]\[data-highlighted\]/);
  assert.match(styles, /font-weight:\s*600/);
  assert.match(styles, /border-inline-start-color:\s*var\(--ring\)/);
});

test("select controls preserve reduced-motion and high-contrast states", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /transition:\s*none\s*!important/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /CanvasText/);
  assert.match(styles, /Highlight/);
});
