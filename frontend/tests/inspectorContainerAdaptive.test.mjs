import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/styles/ui-inspector-layout-001.css", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const adaptive = styles.slice(styles.indexOf("UI-INSPECTOR-CONTAINER-ADAPTIVE-001"));

test("inspector tabs switch to a readable two-column rail when the actual panel is narrow", () => {
  assert.match(styles, /\.cad-inspector-tabs\s*\{[^}]*container-type:\s*inline-size;[^}]*container-name:\s*cad-inspector;/s);
  assert.match(adaptive, /@container cad-inspector \(max-width: 255px\)/);
  assert.match(adaptive, /\.cad-inspector-tab-list\s*\{[^}]*display:\s*grid !important;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\) !important;/s);
  assert.match(app, /className="cad-inspector-tab-list"/);
});

test("room dimension fields use a single column when the inspector rail cannot support two", () => {
  assert.match(adaptive, /\.cad-tab-content-room\[data-state="active"\] \.cad-property-section:first-child\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  for (const field of [2, 3, 4]) {
    assert.match(adaptive, new RegExp(`\\.cad-tab-content-room\\[data-state="active"\\] \\.cad-property-section:first-child > \\.cad-field:nth-child\\(${field}\\)`));
  }
  assert.match(adaptive, /grid-column:\s*1;/);
});

test("the narrower fallback keeps tab labels and icons bounded", () => {
  assert.match(adaptive, /@container cad-inspector \(max-width: 225px\)/);
  assert.match(adaptive, /min-height:\s*32px !important/);
  assert.match(adaptive, /font-size:\s*7px !important/);
  assert.match(adaptive, /width:\s*11px !important/);
});

test("existing motion and forced-colors accessibility rules remain present", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
});

test("active inspector tab state remains bound to the existing selection marker", () => {
  assert.match(styles, /\.cad-inspector-tab-list button\[data-active="true"\]/);
  assert.match(app, /aria-selected/);
});
