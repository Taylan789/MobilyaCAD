import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const entry = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../src/styles/ui-workbench-shell-detail-001.css", import.meta.url), "utf8");

test("CAD shell detail stylesheet is wired into the application entry", () => {
  assert.match(entry, /ui-workbench-shell-detail-001\.css/);
});

test("workbench dock uses selected-state technical treatment and tabular production values", () => {
  assert.match(stylesheet, /\.cad-bottom-dock-tabs\s+\[aria-selected="true"\]/);
  assert.match(stylesheet, /\.cad-dock-table\s+td/);
  assert.match(stylesheet, /font-variant-numeric:\s*tabular-nums/);
});

test("shell detail styles retain reduced-motion and forced-colors accommodations", () => {
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /forced-colors:\s*active/);
  assert.match(stylesheet, /CanvasText/);
});
