import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/styles/ui-inspector-layout-001.css", import.meta.url),
  "utf8"
);
const delivery = source.slice(
  source.indexOf("/* UI-INSPECTOR-STICKY-SECTION-HEADERS-001")
);

test("inspector section headings remain visible above long property groups", () => {
  assert.match(
    delivery,
    /\.cad-inspector-scroll \.cad-section-heading\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/
  );
  assert.match(delivery, /z-index:\s*3;/);
  assert.match(delivery, /background:\s*#1b2933;/);
});

test("sticky inspector headings retain compact spacing on narrow panels", () => {
  assert.match(
    delivery,
    /@media \(max-width:\s*760px\)[\s\S]*?\.cad-inspector-scroll \.cad-section-heading\s*\{[^}]*padding-top:\s*7px;[^}]*padding-bottom:\s*7px;/
  );
});

test("sticky inspector headings remain legible in forced-colors mode", () => {
  assert.match(
    delivery,
    /@media \(forced-colors:\s*active\)[\s\S]*?\.cad-inspector-scroll \.cad-section-heading\s*\{[^}]*color:\s*CanvasText;[^}]*background:\s*Canvas;[^}]*border-bottom:\s*1px solid CanvasText;/
  );
  assert.match(delivery, /\.cad-inspector-scroll \.cad-section-heading::before\s*\{[^}]*background:\s*Highlight;/);
});
