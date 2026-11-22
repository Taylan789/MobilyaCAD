import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");

test("medium desktop topbar keeps the project name flexible and truncated", () => {
  const start = css.lastIndexOf("@media (min-width: 761px) and (max-width: 1400px)");
  assert.notEqual(start, -1, "expected medium desktop topbar rules");
  const block = css.slice(start, css.indexOf("}", start) + 1);
  assert.match(block, /\.cad-document-name[\s\S]*?flex:\s*1 1 0/);
  assert.match(block, /\.cad-document-title[\s\S]*?text-overflow:\s*ellipsis/);
  assert.match(block, /\.cad-top-actions[\s\S]*?flex:\s*0 0 auto/);
});

test("compact desktop action labels remain available outside the visual layout", () => {
  const start = css.lastIndexOf("@media (min-width: 761px) and (max-width: 1100px)");
  assert.notEqual(start, -1, "expected compact desktop topbar rules");
  const block = css.slice(start, css.indexOf("}", start) + 1);
  assert.match(block, /\.cad-tool-toggle button span,\s*\.cad-top-right > button span[\s\S]*?display:\s*none/);
  assert.match(block, /\.cad-brand-lockup \.mc-brand__copy[\s\S]*?display:\s*none/);
  assert.match(block, /\.cad-mode-indicator[\s\S]*?font-size:\s*0/);
});
