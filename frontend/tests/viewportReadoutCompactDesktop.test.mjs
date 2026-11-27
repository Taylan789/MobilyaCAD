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
  assert.ok(compactRules.includes("@media (min-width: 761px) and (max-width: 1320px) and (min-height: 661px) and (max-height: 820px)"));
  assert.ok(compactRules.includes("width: min(278px, calc(100% - 20px));"));
  assert.ok(compactRules.includes("padding: 7px 8px 8px;"));
});

test("compact HUD reduces header and dimension density without changing live values", () => {
  assert.ok(compactRules.includes(".cad-viewport-dimension-readout__header > span"));
  assert.ok(compactRules.includes("font-size: 7px;"));
  assert.ok(compactRules.includes("font-size: 8px;"));
  assert.ok(compactRules.includes("padding-inline: 5px;"));
  assert.ok(compactRules.includes("font-size: 11px;"));
  assert.ok(!compactRules.includes("width: min(318px"));
});

test("the default wide-screen HUD and accessibility modes remain present", () => {
  assert.ok(css.includes("width: min(318px, calc(100% - 24px));"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes("@media (forced-colors: active)"));
});
