import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const input = readFileSync(new URL("../src/components/ui/input.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/cad-input-precision.css", import.meta.url), "utf8");

test("shared inputs expose the refined CAD surface and a visible focus ring", () => {
  assert.match(input, /import\s+"\.\/cad-input-precision\.css"/);
  assert.match(input, /cad-input-control/);
  assert.match(input, /focus-visible:ring-2/);
  assert.match(input, /rounded-md/);
});

test("numeric inputs align stable digits without changing their value or step contract", () => {
  assert.match(styles, /\.cad-input-control\[type="number"\]\s*\{[^}]*font-variant-numeric:\s*tabular-nums lining-nums;[^}]*text-align:\s*right;/s);
  assert.match(styles, /::-webkit-inner-spin-button/);
});

test("CAD input styling honors reduced motion and forced-colors preferences", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /outline:\s*2px solid Highlight/);
});
