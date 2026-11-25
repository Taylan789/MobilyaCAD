import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/styles/cad-graphite-workspace-001.css", import.meta.url),
  "utf8",
);

const balanceStart = css.indexOf("UI-VIEWPORT-CENTER-BALANCE-001");
const balanceRules = balanceStart < 0 ? "" : css.slice(balanceStart);

test("desktop CAD docks scale down at 1280–1440 widths to release viewport space", () => {
  assert.match(balanceRules, /@media \(min-width: 1201px\)/);
  assert.match(balanceRules, /--cad-dock-left:\s*clamp\(224px,\s*17vw,\s*260px\)/);
  assert.match(balanceRules, /--cad-dock-right:\s*clamp\(284px,\s*21vw,\s*326px\)/);

  const leftAt1280 = Math.min(260, Math.max(224, 1280 * 0.17));
  const rightAt1280 = Math.min(326, Math.max(284, 1280 * 0.21));
  const leftAt1440 = Math.min(260, Math.max(224, 1440 * 0.17));
  const rightAt1440 = Math.min(326, Math.max(284, 1440 * 0.21));

  assert.deepEqual([leftAt1280, rightAt1280], [224, 284]);
  assert.deepEqual([leftAt1440, rightAt1440], [244.8, 302.4]);
});

test("the responsive balance continues to drive the existing dock sizing contract", () => {
  assert.match(css, /flex-basis:\s*var\(--cad-dock-left\)/);
  assert.match(css, /flex-basis:\s*var\(--cad-dock-right\)/);
  assert.match(css, /\.cad-workspace--left-collapsed \.cad-sidebar/);
  assert.match(css, /\.cad-workspace-content\.inspector-collapsed > \.cad-inspector/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.doesNotMatch(balanceRules, /\.cad-viewport\s*\{|transform\s*:|roomWidth|mm\s*;/);
});
