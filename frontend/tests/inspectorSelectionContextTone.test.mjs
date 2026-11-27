import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(
  new URL("../src/styles/ui-inspector-layout-001.css", import.meta.url),
  "utf8",
);

test("inspector context rail reflects the live selected object kind", () => {
  assert.match(
    stylesheet,
    /:has\(> div:first-child svg\.lucide-layers-3\)[\s\S]*?border-left: 2px solid #c39470/,
  );
  assert.match(
    stylesheet,
    /:has\(> div:first-child svg\.lucide-box\)[\s\S]*?border-left: 2px solid #91b4c9/,
  );
  assert.match(
    stylesheet,
    /:has\(> div:first-child svg\.lucide-house\)[\s\S]*?border-left: 2px solid #718996/,
  );
});

test("each context uses a matching icon surface and label tone", () => {
  assert.match(stylesheet, /lucide-layers-3\) > div:first-child[\s\S]*?background: #49372c/);
  assert.match(stylesheet, /lucide-box\) > div:first-child[\s\S]*?background: #38586e/);
  assert.match(stylesheet, /lucide-house\) > div:first-child[\s\S]*?background: #2d3c46/);
  assert.match(stylesheet, /lucide-layers-3\) > div:nth-child\(2\) > span[\s\S]*?color: #d0a98a/);
});

test("selection context remains motion-safe and legible in forced-colors mode", () => {
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesheet, /@media \(forced-colors: active\)/);
  assert.match(stylesheet, /border-left-color: Highlight !important/);
  assert.match(stylesheet, /border-left-color: CanvasText !important/);
  assert.match(stylesheet, /background: Canvas !important/);
});
