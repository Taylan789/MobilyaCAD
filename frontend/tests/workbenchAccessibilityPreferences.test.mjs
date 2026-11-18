import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("reduced-motion preference shortens global animation and scroll motion", () => {
  const start = globalCss.indexOf("@media (prefers-reduced-motion: reduce)");
  const end = globalCss.indexOf("@media (forced-colors: active)", start);
  assert.notEqual(start, -1, "global reduced-motion media query must exist");
  assert.notEqual(end, -1, "forced-colors block must follow the motion preference block");

  const motionRules = globalCss.slice(start, end);
  assert.match(motionRules, /scroll-behavior:\s*auto !important;/);
  assert.match(motionRules, /animation-duration:\s*\.01ms !important;/);
  assert.match(motionRules, /animation-iteration-count:\s*1 !important;/);
  assert.match(motionRules, /transition-duration:\s*\.01ms !important;/);
  assert.doesNotMatch(motionRules, /(?:display:\s*none|visibility:\s*hidden|pointer-events:\s*none)/);
});

test("forced-colors keeps keyboard focus and disabled controls distinguishable", () => {
  const forcedColors = globalCss.slice(globalCss.indexOf("@media (forced-colors: active)"));
  assert.match(forcedColors, /:focus-visible\s*\{[^}]*outline:\s*2px solid Highlight/s);
  assert.match(forcedColors, /button:disabled\s*\{[^}]*color:\s*GrayText/s);
  assert.match(forcedColors, /border-color:\s*ButtonText;/);
  assert.match(globalCss, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ring\)/s);
});
