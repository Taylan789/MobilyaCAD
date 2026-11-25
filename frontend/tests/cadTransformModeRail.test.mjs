import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const group = readFileSync(new URL("../src/components/ui/toggle-group.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/cad-transform-mode-rail.css", import.meta.url), "utf8");

test("the existing CAD transform group loads its scoped technical rail", () => {
  assert.match(group, /cad-transform-mode-rail\.css/);
  assert.match(group, /data-slot="toggle-group"/);
  assert.match(group, /data-slot="toggle-group-item"/);
  assert.match(app, /className="cad-tool-toggle"/);
});

test("the rail stays connected to the three existing transform modes", () => {
  assert.match(app, /value=\{\[transformMode\]\}/);
  assert.match(app, /setTransformMode\(value\)/);
  for (const [mode, label, shortcut] of [
    ["translate", "Taşı", "1"],
    ["scale", "Boyutlandır", "2"],
    ["rotate", "Döndür", "3"],
  ]) {
    assert.ok(app.includes(`value="${mode}" aria-label="${label}" aria-keyshortcuts="${shortcut}"`));
  }
});

test("the active transform mode has a clear selected surface and lower register", () => {
  assert.match(styles, /\[aria-pressed="true"\]/);
  assert.match(styles, /\[data-pressed="true"\]/);
  assert.match(styles, /\[data-state="on"\]/);
  assert.match(styles, /::after[\s\S]*?background: #c4dce9/);
});

test("compact widths preserve icon targets and accessibility preferences", () => {
  assert.match(styles, /@media \(min-width: 761px\) and \(max-width: 1120px\)[\s\S]*?width: 32px !important/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?width: 28px !important/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none !important/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?HighlightText/);
});
