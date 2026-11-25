import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/styles/cad-viewport-toolbar.css", import.meta.url),
  "utf8"
);
const change = styles.slice(styles.lastIndexOf("UI-VIEWPORT-TOOLBAR-HIT-AREA-001"));

test("desktop transform and panel controls receive consistent 32px targets", () => {
  assert.match(change, /@media \(min-width: 761px\)/);
  assert.match(change, /\.studio-transform-tools button\s*\{[^}]*min-height: 32px !important;[^}]*height: 32px !important;/s);
  assert.match(change, /\.studio-panel-tools button\.studio-panel-toggle\s*\{[^}]*min-width: 32px !important;[^}]*width: 32px !important;[^}]*min-height: 32px !important;[^}]*height: 32px !important;/s);
});

test("medium desktop icon-only tools retain a square 32px target", () => {
  assert.match(change, /@media \(min-width: 761px\) and \(max-width: 1120px\)[\s\S]*?min-width: 32px !important;[\s\S]*?width: 32px !important;/);
});

test("mobile controls retain their existing compact 28px height", () => {
  assert.match(change, /@media \(max-width: 760px\)[\s\S]*?min-height: 28px !important;[\s\S]*?height: 28px !important;/);
});

test("existing reduced-motion and forced-colors fallbacks remain present", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /:focus-visible/);
});
