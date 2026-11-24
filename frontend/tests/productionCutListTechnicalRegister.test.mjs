import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/components/production/ProductionOverview.css", import.meta.url),
  "utf8"
);

test("production cut rows align live part, quantity, dimensions and focus action as a technical register", () => {
  assert.match(
    css,
    /\.mc-production-studio \.mc-production__cut-list > \.mc-production__cut-row\s*\{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(156px, auto\) auto;/s
  );
  assert.match(
    css,
    /\.mc-production-studio \.mc-production__cut-row > \.mc-production__cut-side\s*\{[^}]*grid-template-columns: auto auto;[^}]*grid-template-rows: auto auto;/s
  );
  assert.match(
    css,
    /\.mc-production-studio \.mc-production__cut-row > \.mc-production__cut-side > b\s*\{[^}]*grid-row: 1 \/ span 2;/s
  );
});

test("compact desktop cut rows keep the focus action reachable without crowding dimensions", () => {
  assert.match(css, /@media \(min-width: 761px\) and \(max-width: 900px\)/);
  assert.match(
    css,
    /@media \(min-width: 761px\) and \(max-width: 900px\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(132px, auto\) 32px;/
  );
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?grid-column: 1 \/ -1;/);
});

test("production cut register retains forced-colors and reduced-motion accessibility", () => {
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?border-inline-start-color: CanvasText;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none !important;/);
});
