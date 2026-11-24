import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylesheet = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8"
);

test("1280x800 desktop compacts the live room-dimension HUD without hiding measurements", () => {
  const compactRule = stylesheet.match(
    /@media \(min-width: 761px\) and \(max-width: 1320px\) and \(min-height: 661px\) and \(max-height: 820px\) \{([\s\S]*?)\n\}/
  );

  assert.ok(compactRule, "compact desktop breakpoint must be present");
  assert.match(compactRule[1], /width: min\(286px, calc\(100% - 20px\)\)/);
  assert.match(compactRule[1], /gap: 5px/);
  assert.match(compactRule[1], /padding: 6px 7px/);
  assert.match(compactRule[1], /min-height: 34px/);
  assert.match(compactRule[1], /font-size: 12px/);
});

test("large desktop keeps the full precision HUD and accessibility fallbacks", () => {
  assert.match(stylesheet, /UI-VIEWPORT-DIMENSION-READOUT-TECH-003[\s\S]*?width: min\(326px/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesheet, /@media \(forced-colors: active\)/);
});
