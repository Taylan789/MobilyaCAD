import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("reduced-motion preference disables global animations and transitions", () => {
  const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.ok(block, "reduced-motion media block should exist");
  assert.match(block, /animation:\s*none\s*!important/);
  assert.match(block, /transition:\s*none\s*!important/);
  assert.match(block, /scroll-behavior:\s*auto\s*!important/);
});

test("reduced-motion overrides are scoped to the user preference", () => {
  const beforePreference = css.split("@media (prefers-reduced-motion: reduce)")[0];
  assert.doesNotMatch(beforePreference, /animation:\s*none\s*!important/);
});

test("forced-colors mode uses system focus color and disabled text", () => {
  const block = css.match(/@media \(forced-colors: active\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.ok(block, "forced-colors media block should exist");
  assert.match(block, /outline:\s*2px solid Highlight\s*!important/);
  assert.match(block, /color:\s*GrayText\s*!important/);
});
