import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const layout = await readFile(
  new URL("../src/styles/workspace-layout.css", import.meta.url),
  "utf8"
);

test("desktop production dock uses a viewport-relative bounded height", () => {
  assert.match(
    layout,
    /--cad-production-dock-height:\s*clamp\(148px,\s*24vh,\s*224px\);/
  );
  assert.match(
    layout,
    /@media \(min-width: 761px\)[\s\S]*?\.cad-main-area > \.cad-bottom-dock \{[\s\S]*?flex:\s*0 1 var\(--cad-production-dock-height\) !important;[\s\S]*?min-height:\s*148px !important;[\s\S]*?max-height:\s*min\(30vh, 252px\) !important;/
  );
});

test("production table content scrolls inside its dock instead of expanding the viewport layout", () => {
  assert.match(
    layout,
    /\.cad-main-area > \.cad-bottom-dock > \.cad-bottom-dock-body \{[\s\S]*?min-height:\s*0 !important;[\s\S]*?overflow:\s*auto !important;[\s\S]*?overscroll-behavior:\s*contain;/
  );
});

test("existing reduced-motion support remains in the desktop layout", () => {
  assert.match(layout, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    layout,
    /\.cad-inspector\s*\{\s*transition:\s*none !important;/
  );
});
