import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/production/ProductionWorkspace.css", import.meta.url),
  "utf8",
);
const compactRules = styles.split("/* UI-PRODUCTION-SHORT-HEIGHT-001")[1] ?? "";

test("production workspace gains a compact desktop tier below 821px viewport height", () => {
  assert.match(compactRules, /@media \(min-width: 821px\) and \(max-height: 820px\)/);
  assert.match(compactRules, /\.mc-production-studio__topbar\s*\{[\s\S]*?min-height:\s*50px/);
  assert.match(compactRules, /\.mc-production-studio__rail\s*\{[\s\S]*?gap:\s*14px/);
  assert.match(compactRules, /\.mc-production-studio__navigation button\s*\{[\s\S]*?min-height:\s*34px/);
  assert.match(compactRules, /\.mc-production-studio__main\s*\{[\s\S]*?padding-top:\s*16px/);
  assert.match(compactRules, /\.mc-production-studio__heading\s*\{[\s\S]*?margin-bottom:\s*12px/);
});

test("very short desktop windows use a second denser tier without hiding production navigation", () => {
  const shortWindow = compactRules.split("@media (min-width: 821px) and (max-height: 700px)")[1] ?? "";
  assert.match(compactRules, /@media \(min-width: 821px\) and \(max-height: 700px\)/);
  assert.match(shortWindow, /min-height:\s*46px/);
  assert.match(shortWindow, /min-height:\s*31px/);
  assert.doesNotMatch(shortWindow, /display:\s*none/);
});

test("short-height overrides remain desktop-only and retain reduced-motion support", () => {
  assert.match(compactRules, /@media \(min-width: 821px\) and \(max-height: 820px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media \(max-width: 820px\)/);
});
