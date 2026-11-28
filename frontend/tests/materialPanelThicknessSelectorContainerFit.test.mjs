import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(
  new URL("../src/components/production/MaterialPanelThicknessSelector.css", import.meta.url),
  "utf8",
);

test("editable thickness preview observes its own available panel width", () => {
  assert.match(stylesheet, /\.mc-panel-preview:not\(\.mc-panel-preview--compact\)\s*\{[^}]*container-name:\s*material-preview;[^}]*container-type:\s*inline-size;/s);
  assert.match(stylesheet, /@container\s+material-preview\s+\(max-width:\s*280px\)/);
});

test("narrow preview stacks the real schematic, caption, and existing thickness choices", () => {
  const narrowRule = stylesheet.slice(stylesheet.indexOf("@container material-preview"));
  assert.match(narrowRule, /\.mc-panel-preview\s*>\s*svg\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*justify-self:\s*center;/s);
  assert.match(narrowRule, /\.mc-panel-preview__caption\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/s);
  assert.match(narrowRule, /\.mc-panel-preview__options\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
});

test("compact catalogue swatches stay outside the editable preview container", () => {
  assert.match(stylesheet, /\.mc-panel-preview:not\(\.mc-panel-preview--compact\)/);
  assert.doesNotMatch(stylesheet, /\.mc-panel-preview--compact\s*\{[^}]*container-type:/s);
});

test("existing reduced-motion and forced-colors support remains present", () => {
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /forced-colors:\s*active/);
});
