import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const labelSource = readFileSync(
  new URL("../src/components/ui/label.tsx", import.meta.url),
  "utf8"
);
const surfaceCss = readFileSync(
  new URL("../src/components/ui/label-cad-technical.css", import.meta.url),
  "utf8"
);

test("shared labels load the scoped CAD technical register", () => {
  assert.match(labelSource, /import ["']\.\/label-cad-technical\.css["']/);
  assert.match(labelSource, /data-slot="label"/);
  assert.match(labelSource, /\.\.\.props/);
  assert.match(surfaceCss, /\.cad-field label\[data-slot="label"\]/);
});

test("coordinate-axis labels keep their existing axis-specific treatment", () => {
  assert.match(surfaceCss, /:not\(\.cad-transform-axis-label\)/);
  assert.match(surfaceCss, /:not\(\.cad-transform-rotation__label\)/);
});

test("field focus, reduced motion and forced-colors remain explicit", () => {
  assert.match(surfaceCss, /\.cad-field:focus-within/);
  assert.match(surfaceCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(surfaceCss, /forced-colors:\s*active/);
  assert.match(surfaceCss, /border-left-color:\s*Highlight/);
  assert.doesNotMatch(surfaceCss, /text-transform:\s*uppercase/i);
});
