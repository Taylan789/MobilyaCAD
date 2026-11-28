import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("global component tokens use a restrained graphite and steel-blue palette", () => {
  const root = globalCss.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(root, /--background:\s*oklch\(0\.155 0\.012 250\);/);
  assert.match(root, /--primary:\s*oklch\(0\.7 0\.07 235\);/);
  assert.match(root, /--accent:\s*oklch\(0\.3 0\.03 242\);/);
  assert.match(globalCss, /::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*#4b6272;/s);
});

test("global motion rules respect reduced-motion preference", () => {
  assert.match(globalCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration:\s*0\.01ms !important;[\s\S]*?transition-duration:\s*0\.01ms !important;/);
});

test("focus indicators remain system-visible in forced-colors mode", () => {
  assert.match(globalCss, /@media \(forced-colors: active\)[\s\S]*?:focus-visible\s*\{[^}]*outline-color:\s*Highlight !important;/s);
});
