import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logoPath = new URL("../src/components/brand/MobilyaCadLogo.tsx", import.meta.url);
const themePath = new URL("../src/components/brand/MobilyaCadLogo.css", import.meta.url);
const faviconPath = new URL("../public/favicon.svg", import.meta.url);

const logo = readFileSync(logoPath, "utf8");
const theme = readFileSync(themePath, "utf8");
const favicon = readFileSync(faviconPath, "utf8");

function pathsFrom(source) {
  return [...source.matchAll(/<path[^>]*d="([^"]+)"/g)].map((match) => match[1]);
}

test("workspace wordmark and favicon share the same original vector mark", () => {
  assert.deepEqual(pathsFrom(logo), pathsFrom(favicon));
  assert.equal(pathsFrom(logo).length, 5);
});

test("brand component loads its industrial studio theme and keeps an accessible name", () => {
  assert.match(logo, /import "\.\/MobilyaCadLogo\.css"/);
  assert.match(logo, /aria-label="MobilyaCAD Studio"/);
  assert.match(logo, /aria-hidden="true"/);
});

test("studio entry uses graphite surfaces and steel-blue accents", () => {
  assert.match(theme, /\.atelier-home\s*\{/);
  assert.match(theme, /background:\s*#101820/);
  assert.match(theme, /\.atelier-start-card\s*\{/);
  assert.match(theme, /#8fb6d1/i);
  assert.match(theme, /\.atelier-feature-art\s*\{/);
});

test("studio motion respects reduced-motion preferences", () => {
  assert.match(theme, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(theme, /animation:\s*none\s*!important/);
});
