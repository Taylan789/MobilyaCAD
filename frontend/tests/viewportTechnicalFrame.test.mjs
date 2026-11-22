import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/styles/viewport-technical-frame.css", import.meta.url), "utf8");
const entry = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");

test("precision frame is layered above canvas without intercepting input", () => {
  assert.match(css, /\.cad-viewport::after\s*\{/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /z-index:\s*2/);
  assert.equal((css.match(/linear-gradient\(/g) ?? []).length, 8);
  assert.match(entry, /viewport-technical-frame\.css/);
});

test("drop state is accented and accessibility modes are respected", () => {
  assert.match(css, /\.cad-viewport--drop-ready::after/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /border-color:\s*CanvasText/);
});
