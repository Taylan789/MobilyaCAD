import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/ui/label-cad-technical.css", import.meta.url),
  "utf8"
);

test("CAD form labels use a compact technical register without changing their authored casing", () => {
  assert.match(source, /min-height:\s*16px/);
  assert.match(source, /letter-spacing:\s*\.055em/);
  assert.doesNotMatch(source, /text-transform:\s*uppercase/i);
  assert.match(source, /border-radius:\s*0 3px 3px 0/);
});

test("focused CAD fields give their existing label a restrained steel-blue context cue", () => {
  assert.match(source, /\.cad-field:focus-within label/);
  assert.match(source, /border-left-color:\s*var\(--cad-form-label-rule-active\)/);
  assert.match(source, /linear-gradient\(90deg, rgba\(143, 184, 209, \.11\)/);
});

test("compact, reduced-motion and forced-colors preferences remain supported", () => {
  assert.match(source, /@media \(max-width:\s*560px\)/);
  assert.match(source, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(source, /@media \(forced-colors:\s*active\)/);
  assert.match(source, /outline:\s*1px solid Highlight/);
});
