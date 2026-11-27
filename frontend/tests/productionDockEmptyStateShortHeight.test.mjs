import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/styles/ui-production-dock-empty-state-001.css", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const compact = styles.slice(styles.lastIndexOf("UI-PRODUCTION-DOCK-EMPTY-SHORT-HEIGHT-001"));

test("short desktop workspaces use a compact two-column waiting and clear register", () => {
  assert.match(compact, /@media \(min-width: 761px\) and \(max-height: 820px\)/);
  assert.match(compact, /\.cad-dock-empty--waiting,[\s\S]*?\.cad-dock-empty--clear\s*\{[^}]*display: grid[^}]*min-height: 62px/s);
  assert.match(compact, /grid-template-columns: minmax\(100px, 132px\) minmax\(0, 1fr\)/);
  assert.match(compact, /\.cad-dock-empty__eyebrow\s*\{[^}]*grid-column: 1[^}]*grid-row: 1 \/ span 2/s);
  assert.match(compact, /\.cad-dock-empty--waiting > strong,[\s\S]*?\.cad-dock-empty--clear > strong\s*\{[^}]*grid-column: 2/s);
});

test("short desktop workspaces reduce the regular parts and material empty register without hiding it", () => {
  assert.match(compact, /\.cad-dock-empty:not\(\.cad-dock-empty--waiting\):not\(\.cad-dock-empty--clear\)\s*\{[^}]*min-height: 58px/s);
  assert.match(compact, /\.cad-dock-empty:not\(\.cad-dock-empty--waiting\):not\(\.cad-dock-empty--clear\) > svg\s*\{[^}]*width: 18px[^}]*height: 18px/s);
  assert.match(compact, /\.cad-dock-empty:not\(\.cad-dock-empty--waiting\):not\(\.cad-dock-empty--clear\) > span:last-child\s*\{[^}]*font-size: 9px/s);
  assert.doesNotMatch(compact, /display:\s*none/);
});

test("the existing CAD empty states remain wired and 1440x900 is outside the compact tier", () => {
  assert.match(app, /\.\/styles\/ui-production-dock-empty-state-001\.css/);
  assert.match(app, /cad-dock-empty--waiting/);
  assert.match(app, /cad-dock-empty--clear/);
  assert.match(app, /Henüz üretim parçası yok/);
  assert.match(compact, /max-height: 820px/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media \(forced-colors: active\)/);
});
