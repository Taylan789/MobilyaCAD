import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(
  new URL("../src/styles/cad-production-dock-collapse-001.css", import.meta.url),
  "utf8"
);

test("production dock tabs expose their existing live selection through aria-selected", () => {
  const tabsStart = app.indexOf('<div className="cad-bottom-dock-tabs"');
  const metricsStart = app.indexOf('<div className="cad-bottom-dock-metrics"', tabsStart);
  assert.ok(tabsStart >= 0 && metricsStart > tabsStart, "production tab rail must exist before its live metrics");
  const tabs = app.slice(tabsStart, metricsStart);

  assert.match(tabs, /role="tablist"/);
  assert.equal((tabs.match(/role="tab" aria-selected=\{bottomPanelTab ===/g) ?? []).length, 3);
  assert.match(stylesheet, /\.cad-bottom-dock-tabs button\[aria-selected="true"\]/);
  assert.match(stylesheet, /border-bottom-color: #8eb5ce/);
});

test("production tabs provide a distinct hover and keyboard-focus target", () => {
  assert.match(stylesheet, /button:hover:not\(\[aria-selected="true"\]\)/);
  assert.match(stylesheet, /\.cad-bottom-dock-tabs button:focus-visible/);
  assert.match(stylesheet, /outline: 2px solid #a8cce0/);
  assert.match(stylesheet, /outline-offset: -4px/);
});

test("production tab states respect reduced motion and Windows forced colors", () => {
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.cad-bottom-dock-tabs button\s*\{\s*transition: none !important;/);
  assert.match(stylesheet, /@media \(forced-colors: active\)/);
  assert.match(stylesheet, /background: Highlight/);
  assert.match(stylesheet, /outline: 2px solid Highlight/);
});
