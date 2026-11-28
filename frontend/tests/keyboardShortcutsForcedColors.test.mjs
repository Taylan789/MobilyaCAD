import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/workspace/KeyboardShortcuts.css", import.meta.url),
  "utf8",
);

test("shortcut panel close button has a visible keyboard focus treatment", () => {
  assert.match(styles, /\.cad-shortcuts-panel__header button:focus-visible\s*\{[^}]*outline:\s*2px solid #[0-9a-f]{6}[^}]*outline-offset:\s*2px/s);
});

test("shortcut help keeps its hierarchy and controls readable in forced colors", () => {
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /\.cad-shortcuts-panel\s*\{[^}]*color:\s*CanvasText;[^}]*background:\s*Canvas;[^}]*border-color:\s*CanvasText;[^}]*box-shadow:\s*none;/s);
  assert.match(styles, /\.cad-shortcuts-list > div:hover\s*\{[^}]*background:\s*Highlight;/s);
  assert.match(styles, /\.cad-shortcuts-list > div:hover > span\s*\{[^}]*color:\s*HighlightText;/s);
  assert.match(styles, /\.cad-shortcuts-list kbd\s*\{[^}]*color:\s*ButtonText;[^}]*background:\s*ButtonFace;[^}]*border-color:\s*ButtonText;/s);
  assert.match(styles, /\.cad-shortcuts-panel__header button:focus-visible\s*\{[^}]*outline:\s*2px solid Highlight;/s);
});
