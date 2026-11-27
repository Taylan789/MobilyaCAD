import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8",
);
const marker = "UI-VIEWPORT-READOUT-COMPACT-DESKTOP-001";
const compactRules = css.slice(css.indexOf(marker));

test("compact desktop viewport HUD is bounded to 761–1320px by 661–820px", () => {
  assert.notEqual(css.indexOf(marker), -1);
  assert.match(compactRules, /@media \\(min-width: 761px\\) and \\(max-width: 1320px\\) and \\(min-height: 661px\\) and \\(max-height: 820px\\)/);
  assert.match(compactRules, /width: min\\(278px, calc\\(100% - 20px\\)\\)/);
  assert.match(compactRules, /padding: 7px 8px 8px/);
});

test("compact HUD reduces header and dimension density without changing live values", () => {
  assert.match(compactRules, /header > span\\s*\\{\\s*font-size: 7px/);
  assert.match(compactRules, /header > small\\s*\\{\\s*font-size: 8px/);
  assert.match(compactRules, /dimensions > div\\s*\\{\\s*padding-inline: 5px/);
  assert.match(compactRules, /dimensions strong\\s*\\{\\s*font-size: 11px/);
  assert.doesNotMatch(compactRules, /width:\\s*min\\(318px/);
});

test("the default wide-screen HUD and accessibility modes remain present", () => {
  assert.match(css, /width: min\\(318px, calc\\(100% - 24px\\)\\)/);
  assert.match(css, /@media \\(prefers-reduced-motion: reduce\\)/);
  assert.match(css, /@media \\(forced-colors: active\\)/);
});
