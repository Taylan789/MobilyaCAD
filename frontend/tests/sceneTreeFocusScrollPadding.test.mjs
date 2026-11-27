import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/styles/cad-graphite-workspace-001.css", import.meta.url),
  "utf8",
);
const appCss = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");
const feature = css.slice(css.indexOf("/* UI-SCENE-TREE-FOCUS-SCROLL-001"));

test("scene-tree scroll padding is applied to the real scroll container", () => {
  assert.match(appCss, /\.studio-scene-tree\s*\{[^}]*overflow:\s*auto/s);
  assert.match(feature, /\.cad-app \.studio-scene-tree\s*\{[^}]*scroll-padding-block-start:\s*88px;[^}]*scroll-padding-block-end:\s*14px;/s);
});

test("keyboard-focusable room, furniture, part and visibility rows keep scroll clearance", () => {
  for (const selector of [
    ".cad-app .studio-tree-room",
    ".cad-app .studio-tree-object-select",
    ".cad-app .studio-tree-part",
    ".cad-app .studio-tree-disclosure",
    ".cad-app .studio-tree-visibility-toggle",
  ]) {
    assert.ok(feature.includes(selector), "expected scroll margin for " + selector);
  }
  assert.match(feature, /scroll-margin-block:\s*6px 12px/);
});

test("compact scene tree accounts for both sticky rails and reduced motion", () => {
  assert.match(feature, /@media\s*\(max-width:\s*820px\)[\s\S]*?scroll-padding-block-start:\s*90px/);
  assert.match(feature, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?scroll-behavior:\s*auto !important/);
});
