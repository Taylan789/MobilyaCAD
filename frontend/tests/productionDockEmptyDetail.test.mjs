import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/styles/ui-production-dock-empty-state-001.css", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const detail = styles.slice(styles.lastIndexOf("UI-PRODUCTION-DOCK-EMPTY-DETAIL-002"));

test("parts and material empty panes use a compact technical register", () => {
  assert.match(app, /className="cad-dock-empty"><Layers3/);
  assert.match(app, /className="cad-dock-empty"><Package/);
  assert.match(detail, /\.cad-dock-empty:not\(\.cad-dock-empty--waiting\):not\(\.cad-dock-empty--clear\)/);
  assert.match(detail, /display: grid;/);
  assert.match(detail, /min-height: 76px;/);
  assert.match(detail, /text-align: left;/);
});

test("empty-state icon and copy keep a stable two-row hierarchy", () => {
  assert.match(detail, /> svg\s*\{[^}]*grid-column: 1;[^}]*grid-row: 1 \/ span 2;/s);
  assert.match(detail, /> strong\s*\{[^}]*grid-column: 2;[^}]*grid-row: 1;/s);
  assert.match(detail, /> span:last-child\s*\{[^}]*grid-column: 2;[^}]*grid-row: 2;/s);
});

test("compact layouts retain readable icon and copy sizing", () => {
  assert.match(detail, /@media \(max-width: 700px\)/);
  assert.match(detail, /grid-template-columns: 24px minmax\(0, 1fr\)/);
  assert.match(detail, /font-size: 9px;/);
});

test("waiting and clear production statuses remain distinct and accessible", () => {
  assert.match(styles, /\.cad-app \.cad-dock-empty--waiting/);
  assert.match(styles, /\.cad-app \.cad-dock-empty--clear/);
  assert.match(detail, /prefers-reduced-motion: reduce/);
  assert.match(detail, /forced-colors: active/);
  assert.match(detail, /border-left: 3px solid Highlight/);
});
