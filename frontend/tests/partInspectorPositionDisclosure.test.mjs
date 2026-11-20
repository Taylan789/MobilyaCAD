import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const inspector = readFileSync(
  new URL("../src/components/workspace/FurniturePartInspector.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/workspace/FurniturePartInspector.css", import.meta.url),
  "utf8"
);
const start = inspector.indexOf('<details className="cad-part-position-disclosure">');
const end = inspector.indexOf("</details>", start);
assert.notEqual(start, -1, "local position disclosure should exist");
assert.notEqual(end, -1, "local position disclosure should close");
const disclosure = inspector.slice(start, end + "</details>".length);

test("local position controls are progressively disclosed and preview their current axis values", () => {
  assert.match(disclosure, /<summary className="cad-part-position-disclosure__summary">/);
  assert.doesNotMatch(disclosure.slice(0, disclosure.indexOf("<summary")), /\bopen\b/);
  assert.match(disclosure, /aria-label="Yerel konum değerleri, milimetre"/);
  assert.match(disclosure, /positionDraft\.x/);
  assert.match(disclosure, /positionDraft\.y/);
  assert.match(disclosure, /positionDraft\.z/);
});

test("disclosed controls preserve millimeter inputs and position commit handlers", () => {
  assert.match(disclosure, /id=\{\x60selected-part-position-\x24\{axis\.key\}\x60\}/);
  assert.match(disclosure, /step="0\.1"/);
  assert.match(disclosure, /onBlur=\{\(\) => commitPosition\(axis\.key, axis\.index\)\}/);
  assert.match(disclosure, /nextPosition\[index\] = value \/ 1000/);
  assert.match(disclosure, /onPositionChange\(nextPosition\)/);
  assert.match(disclosure, /if \(event\.key === "Enter"\) event\.currentTarget\.blur\(\)/);
});

test("position disclosure keeps visible keyboard focus, forced-colors, and reduced-motion styles", () => {
  assert.match(styles, /cad-part-position-disclosure__summary:focus-visible/);
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /outline: 2px solid Highlight/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
