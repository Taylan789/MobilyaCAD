import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/styles/ui-workspace-panel-toggle-labels-001.css", import.meta.url),
  "utf8"
);
const feedback = styles.match(/\/\* UI-WORKSPACE-PANEL-TOGGLE-FEEDBACK-001[\s\S]*$/)?.[0] ?? "";

test("panel dock toggles keep a consistent 34px target and distinct hover/expanded states", () => {
  assert.match(feedback, /min-height: 34px !important/);
  assert.match(feedback, /:hover:not\(:disabled\)[\s\S]*background: #2d424d !important/);
  assert.match(feedback, /\[aria-pressed="true"\][\s\S]*background: #3a5667 !important/);
});

test("compact panel toggles remain icon-only with a stable 32px width", () => {
  assert.match(feedback, /@media \(max-width: 1100px\)[\s\S]*width: 32px !important[\s\S]*min-width: 32px !important/);
  assert.match(styles, /@media \(max-width: 1100px\)[\s\S]*display: none !important/);
});

test("keyboard focus, reduced motion, and forced-colors remain explicit", () => {
  assert.match(feedback, /:focus-visible[\s\S]*outline: 2px solid #a9c7d8 !important/);
  assert.match(feedback, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none !important[\s\S]*transform: none/);
  assert.match(feedback, /@media \(forced-colors: active\)[\s\S]*background: Highlight !important[\s\S]*border-color: Highlight !important/);
});
