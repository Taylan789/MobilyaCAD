import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const input = readFileSync(new URL("../src/components/ui/input.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/cad-input-precision.css", import.meta.url), "utf8");

test("shared inputs use the CAD technical surface without changing the component API", () => {
  assert.match(input, /cad-input-control/);
  assert.match(styles, /border-color: color-mix\(in srgb, var\(--input\) 76%, var\(--foreground\) 24%\)/);
  assert.match(styles, /background-color: color-mix\(in srgb, var\(--background\) 82%, var\(--muted\) 18%\)/);
});

test("dimension inputs keep tabular numerals and reveal interaction affordances", () => {
  assert.match(styles, /\.cad-input-control\[type="number"\][\s\S]*?font-variant-numeric: tabular-nums lining-nums;/);
  assert.match(styles, /:hover:not\(:disabled\):not\(\[aria-invalid="true"\]\)/);
  assert.match(styles, /\.cad-input-control:focus-visible:not\(\[aria-invalid="true"\]\)/);
  assert.match(styles, /outline-offset: 1px/);
});

test("invalid and disabled CAD fields are distinguishable", () => {
  assert.match(styles, /\.cad-input-control\[aria-invalid="true"\][\s\S]*?border-color: var\(--destructive\);/);
  assert.match(styles, /\.cad-input-control:disabled[\s\S]*?cursor: not-allowed;/);
});

test("input surface supports reduced motion and forced-colors", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition: none !important;/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)[\s\S]*?outline: 2px solid Highlight/);
  assert.match(styles, /\.cad-input-control\[aria-invalid="true"\][\s\S]*?border-color: Mark;/);
});
