import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appCss = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
const css = readFileSync(
  new URL("../src/styles/ui-production-rail-register-001.css", import.meta.url),
  "utf8"
);

test("production module rail is integrated and independently scrollable on desktop", () => {
  assert.match(appCss, /@import "\.\/styles\/ui-production-rail-register-001\.css";/);
  assert.match(css, /@media\s*\(min-width:\s*821px\)/);
  assert.match(css, /\.mc-production-studio\.mc-production-studio\s+\.mc-production-studio__rail/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /overscroll-behavior-y:\s*contain/);
  assert.match(css, /position:\s*sticky/);
});

test("project scope reads as a compact, aligned technical register", () => {
  assert.match(css, /\.mc-production-studio__project-total\s*\{/);
  assert.match(css, /\.mc-production-studio__project-row\s*\{[\s\S]*?display:\s*grid/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /border-inline-start-color:\s*var\(--mps-steel\)/);
});

test("compact layouts and accessibility preferences remain supported", () => {
  assert.match(css, /@media\s*\(max-width:\s*820px\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /button:focus-visible/);
});
