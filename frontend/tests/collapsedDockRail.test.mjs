import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylesheet = readFileSync(
  new URL("../src/styles/collapsed-dock-rail.css", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const entry = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");

test("desktop left dock collapses to a reachable 56px rail", () => {
  assert.match(stylesheet, /@media\s*\(min-width:\s*821px\)/);
  assert.match(
    stylesheet,
    /\.cad-workspace\.cad-workspace--left-collapsed\s*\{[^}]*grid-template-columns:\s*56px\s+minmax\(0,\s*1fr\)/s
  );

  const sidebarRule = stylesheet.match(
    /\.cad-workspace--left-collapsed\s*>\s*\.cad-sidebar\s*\{([^}]*)\}/s
  )?.[1];

  assert.ok(sidebarRule, "collapsed sidebar rule must exist");
  assert.match(sidebarRule, /width:\s*56px/);
  assert.match(sidebarRule, /opacity:\s*1/);
  assert.match(sidebarRule, /pointer-events:\s*auto/);
});

test("collapsed rail keeps both navigation tabs and labels discoverable", () => {
  assert.match(app, /role="tablist"\s+aria-label="Sol panel görünümü"/);
  assert.match(app, /role="tab"[^>]*>\s*<Package\s*\/>\s*Kütüphane/);
  assert.match(app, /role="tab"[^>]*>\s*<Layers3\s*\/>\s*Sahne ağacı/);

  assert.match(stylesheet, /button:first-child::after\s*\{\s*content:\s*"Kütüphane"/);
  assert.match(stylesheet, /button:last-child::after\s*\{\s*content:\s*"Sahne ağacı"/);
  assert.match(stylesheet, /button:focus-visible::after/);
});

test("collapsed rail respects reduced-motion preferences and loads after app styles", () => {
  assert.match(entry, /import App from ['"]\.\/App\.tsx['"];?\s*import ['"]\.\/styles\/collapsed-dock-rail\.css['"]/);
  assert.match(
    stylesheet,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none\s*!important/
  );
});
