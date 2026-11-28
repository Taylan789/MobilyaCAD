import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/styles/cad-studio-refinement.css", import.meta.url),
  "utf8",
);

function forcedColorsBlock() {
  const start = css.indexOf("@media (forced-colors: active)");
  assert.notEqual(start, -1, "Inspector forced-colors rules should be present");

  const openingBrace = css.indexOf("{", start);
  let depth = 0;

  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;

    if (depth === 0) return css.slice(start, index + 1);
  }

  assert.fail("Inspector forced-colors block should be balanced");
}

test("inspector fields use system colors in forced-colors mode", () => {
  const block = forcedColorsBlock();

  assert.match(block, /\.cad-inspector \.cad-field input/);
  assert.match(block, /forced-color-adjust:\s*auto/);
  assert.match(block, /color:\s*CanvasText/);
  assert.match(block, /background:\s*Canvas/);
  assert.match(block, /border:\s*1px solid ButtonText/);
});

test("inspector focus and selected-object states remain distinct in forced-colors mode", () => {
  const block = forcedColorsBlock();

  assert.match(block, /outline:\s*2px solid Highlight/);
  assert.match(block, /background:\s*Highlight/);
  assert.match(block, /color:\s*HighlightText/);
});

test("inspector forced-colors controls do not rely on shadows", () => {
  const block = forcedColorsBlock();

  assert.match(block, /box-shadow:\s*none/);
});
