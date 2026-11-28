import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/ui/tooltip.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/tooltip-cad-surface.css", import.meta.url), "utf8");

test("shared CAD tooltip uses a compact technical surface and labeled arrow", () => {
  assert.match(component, /tooltip-cad-surface\.css/);
  assert.match(component, /cad-tooltip-content/);
  assert.match(component, /data-slot="tooltip-arrow"/);
  assert.match(component, /cad-tooltip-arrow/);
  assert.match(styles, /\[data-slot="tooltip-content"\]\.cad-tooltip-content/);
  assert.match(styles, /box-shadow:/);
});

test("keyboard hints inside tooltips remain readable as technical keycaps", () => {
  assert.match(styles, /\[data-slot="kbd"\]/);
  assert.match(styles, /font-family: ui-monospace/);
  assert.match(styles, /line-height: 1\.2/);
});

test("tooltip surface respects reduced motion and forced colors", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /animation: none !important/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /background: Canvas/);
  assert.match(styles, /color: CanvasText/);
});
