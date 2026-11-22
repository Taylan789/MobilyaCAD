import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/button-cad-surface.css", import.meta.url), "utf8");

test("shared CAD buttons expose variant and size without changing button behavior", () => {
  assert.match(component, /button-cad-surface\.css/);
  assert.match(component, /cad-button-surface/);
  assert.match(component, /data-cad-variant=\{variant\}/);
  assert.match(component, /data-cad-size=\{size\}/);
});

test("button variants receive distinct graphite, steel and primary surfaces", () => {
  for (const variant of ["default", "outline", "secondary", "ghost", "link", "destructive"]) {
    assert.match(styles, new RegExp(`data-cad-variant=["']${variant}["']`));
  }
  assert.match(styles, /background-image:\s*linear-gradient/);
  assert.match(styles, /border-color:/);
});

test("button keyboard focus and active states are visually explicit", () => {
  assert.match(styles, /\.cad-button-surface:focus-visible/);
  assert.match(styles, /outline: 2px solid/);
  assert.match(styles, /:active:not\(:disabled\)/);
  assert.match(styles, /aria-disabled="true"/);
});

test("button surfaces honor reduced motion and forced colors", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /transition: none !important/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /ButtonFace/);
  assert.match(styles, /Highlight/);
});
