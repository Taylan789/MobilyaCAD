import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/ui/cad-input-precision.css", import.meta.url),
  "utf8",
);
const input = readFileSync(
  new URL("../src/components/ui/input.tsx", import.meta.url),
  "utf8",
);
const rail = styles.slice(styles.indexOf("/* UI-CAD-NUMERIC-INPUT-FOCUS-RAIL-001"));

test("CAD number inputs retain tabular precision and use the shared control", () => {
  assert.match(input, /cad-input-precision\.css/);
  assert.match(styles, /\.cad-input-control\[type="number"\][\s\S]*?font-variant-numeric:\s*tabular-nums lining-nums/);
  assert.match(rail, /font-feature-settings:\s*"tnum" 1, "lnum" 1/);
});

test("native number steppers become clearer on hover and keyboard focus", () => {
  assert.match(rail, /::-webkit-inner-spin-button[\s\S]*?width:\s*18px/);
  assert.match(rail, /cursor:\s*ns-resize/);
  assert.match(rail, /:hover:not\(:disabled\)[\s\S]*?opacity:\s*\.96/s);
  assert.match(rail, /:focus-visible:not\(:disabled\)[\s\S]*?opacity:\s*\.96/s);
});

test("valid and invalid numeric focus states keep distinct rails", () => {
  assert.match(rail, /:focus-visible:not\(\[aria-invalid="true"\]\)[\s\S]*?inset 2px 0 0 var\(--ring\)/s);
  assert.match(rail, /\[aria-invalid="true"\][\s\S]*?inset 2px 0 0 var\(--destructive\)/s);
});

test("numeric stepper feedback respects reduced motion and forced colors", () => {
  assert.match(rail, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(rail, /@media \(forced-colors:\s*active\)/);
  assert.match(rail, /background:\s*Canvas/);
  assert.match(rail, /inset 2px 0 0 Highlight/);
});
