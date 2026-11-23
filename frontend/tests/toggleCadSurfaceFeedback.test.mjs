import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/ui/toggle.tsx", import.meta.url), "utf8");
const group = readFileSync(new URL("../src/components/ui/toggle-group.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/toggle-cad-surface.css", import.meta.url), "utf8");

test("shared toggle and toggle-group items opt into the CAD surface", () => {
  assert.match(component, /toggle-cad-surface\.css/);
  assert.match(component, /cad-toggle-surface/);
  assert.match(group, /cad-toggle-surface/);
});

test("persistent tool states are visually distinct without changing toggle behavior", () => {
  assert.match(styles, /\.cad-toggle-surface\[aria-pressed="true"\]/);
  assert.match(styles, /\.cad-toggle-surface\[data-state="on"\]/);
  assert.match(styles, /background-color:\s*color-mix/);
  assert.match(styles, /border-color:\s*color-mix/);
});

test("hover, focus, active and disabled feedback stay explicit", () => {
  assert.ok(styles.includes(".cad-toggle-surface:hover:not(:disabled)"));
  assert.ok(styles.includes(".cad-toggle-surface:focus-visible"));
  assert.ok(styles.includes(".cad-toggle-surface:active:not(:disabled)"));
  assert.ok(styles.includes(".cad-toggle-surface[aria-disabled=\"true\]"));
});

test("toggle feedback respects reduced motion and Windows forced colors", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none !important/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)[\s\S]*?HighlightText/);
});
