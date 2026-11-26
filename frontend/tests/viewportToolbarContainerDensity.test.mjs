import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/styles/cad-viewport-toolbar.css", import.meta.url),
  "utf8",
);
const change = styles.slice(styles.lastIndexOf("UI-VIEWPORT-TOOLBAR-CONTAINER-DENSITY-001"));

test("viewport toolbar measures its available workspace width", () => {
  assert.match(change, /container-name:\s*cad-viewport-toolbar/);
  assert.match(change, /container-type:\s*inline-size/);
  assert.match(change, /\.cad-viewport-title\s*\{[^}]*flex:\s*1 1 auto !important;[^}]*min-width:\s*0 !important;/s);
  assert.match(change, /\.studio-viewport-actions\s*\{[^}]*flex:\s*0 1 auto !important;[^}]*min-width:\s*0 !important;/s);
});

test("the 760px tier removes only secondary toolbar captions", () => {
  const tier = change.split("@container cad-viewport-toolbar (max-width: 760px)")[1]?.split("@container")[0] ?? "";
  assert.match(tier, /\.cad-viewport-title small/);
  assert.match(tier, /\.studio-viewport-actions \.studio-view-label/);
  assert.match(tier, /display:\s*none !important/);
  assert.doesNotMatch(tier, /\.studio-transform-tools button\s*\{[^}]*font-size:\s*0/s);
});

test("the 620px tier preserves transform icons while labels collapse", () => {
  const tier = change.split("@container cad-viewport-toolbar (max-width: 620px)")[1]?.split("@container")[0] ?? "";
  assert.match(tier, /width:\s*32px !important/);
  assert.match(tier, /font-size:\s*0 !important/);
  assert.match(tier, /\.studio-transform-tools button svg/);
  assert.match(tier, /width:\s*14px !important/);
});

test("the 520px tier compacts the title, panel toggles and millimetre readout", () => {
  const tier = change.split("@container cad-viewport-toolbar (max-width: 520px)")[1] ?? "";
  assert.match(tier, /max-width:\s*12ch !important/);
  assert.match(tier, /\.studio-panel-tools button\.studio-panel-toggle[\s\S]*?min-width:\s*30px !important/);
  assert.match(tier, /\.studio-viewport-actions \.studio-unit-pill[\s\S]*?min-width:\s*28px !important/);
});

test("the existing motion and high-contrast fallbacks remain intact", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /:focus-visible/);
});
