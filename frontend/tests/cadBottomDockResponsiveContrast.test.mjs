import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/App.css", import.meta.url), "utf8");

test("production dock tabs retain tab semantics and visible focus", () => {
  assert.match(app, /className="cad-bottom-dock-tabs" role="tablist" aria-label="Alt panel sekmeleri"/);
  for (const tab of ["parts", "materials", "issues"]) {
    assert.match(app, new RegExp("role=\\"tab\\" aria-selected=\\\\{bottomPanelTab === \\"" + tab + "\\"\\\\}"));
  }
  assert.match(styles, /\.cad-bottom-dock-tabs button:focus-visible\s*\{[^}]*outline-color:[^}]*outline-offset:/s);
});

test("narrow dock headers allow tab labels to scroll instead of shrink", () => {
  assert.match(
    styles,
    /@media \(max-width: 700px\)\s*\{[^}]*\.cad-bottom-dock-header\s*\{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/s,
  );
  assert.match(styles, /\.cad-bottom-dock-tabs button\s*\{[^}]*flex: 0 0 auto;[^}]*min-height: 40px;/s);
});

test("forced-colors keeps the selected dock tab and focus visible with system colors", () => {
  assert.match(
    styles,
    /@media \(forced-colors: active\)\s*\{[^}]*\.cad-bottom-dock-tabs button:focus-visible\s*\{[^}]*outline-color: Highlight !important;/s,
  );
  assert.match(
    styles,
    /\.cad-bottom-dock-tabs button\.active\s*\{[^}]*color: HighlightText !important;[^}]*background: Highlight !important;/s,
  );
  assert.match(
    styles,
    /\.cad-bottom-dock-tabs button b\s*\{[^}]*color: ButtonText !important;[^}]*background: Canvas !important;/s,
  );
});
