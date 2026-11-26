import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylesheet = readFileSync(
  new URL("../src/styles/ui-workspace-panel-toggle-labels-001.css", import.meta.url),
  "utf8"
);

test("panel labels follow the available viewport toolbar width", () => {
  const expanded = stylesheet.match(
    /@container cad-viewport-toolbar \(min-width: 821px\) \{([\s\S]*?)\n\}/
  );
  const compact = stylesheet.match(
    /@container cad-viewport-toolbar \(max-width: 820px\) \{([\s\S]*?)\n\}/
  );

  assert.ok(expanded, "wide viewport toolbar rule must be present");
  assert.ok(compact, "compact viewport toolbar rule must be present");
  assert.match(expanded[1], /\.studio-panel-toggle__label\s*\{\s*display: inline !important;/);
  assert.match(expanded[1], /padding-inline: 8px !important/);
  assert.match(compact[1], /\.studio-panel-toggle__label\s*\{\s*display: none !important;/);
  assert.match(compact[1], /width: 32px !important/);
  assert.match(compact[1], /gap: 0 !important/);
});

test("viewport-width fallback and accessibility states remain available", () => {
  assert.match(stylesheet, /@media \(max-width: 1100px\)/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesheet, /@media \(forced-colors: active\)/);
  assert.match(stylesheet, /\.studio-panel-toggle:focus-visible/);
});
