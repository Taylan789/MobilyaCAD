import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const component = readFileSync(new URL("../src/components/ui/scroll-area.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/scroll-area-cad.css", import.meta.url), "utf8");

test("CAD scroll areas expose dedicated rail and thumb hooks", () => {
  assert.match(component, /cad-scroll-area/);
  assert.match(component, /cad-scroll-area__scrollbar/);
  assert.match(component, /cad-scroll-area__thumb/);
  assert.match(component, /scroll-area-cad\.css/);
});

test("scroll rails and thumb have readable technical sizing and hover feedback", () => {
  assert.match(styles, /vertical[^\{]*\{[^}]*width:\s*12px/s);
  assert.match(styles, /horizontal[^\{]*\{[^}]*height:\s*10px/s);
  assert.match(styles, /min-height:\s*34px/);
  assert.match(styles, /:hover/);
  assert.match(styles, /background:\s*#465e6c/);
});

test("scrollbar styling honors reduced motion and forced colors", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /CanvasText/);
  assert.match(styles, /ButtonText/);
});
