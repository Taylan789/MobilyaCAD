import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inspectorCss = readFileSync(
  new URL("../src/styles/ui-inspector-layout-001.css", import.meta.url),
  "utf8"
);
const viewportFitCss = readFileSync(
  new URL("../src/styles/workspace-viewport-fit.css", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8"
);
const delivery = inspectorCss.split("/* UI-INSPECTOR-DIMENSION-GRID-001")[1] ?? "";

test("UI-INSPECTOR-DIMENSION-GRID-001 sizes the inspector from its own available width", () => {
  assert.match(delivery, /\.cad-inspector-tabs\s*\{[^}]*container-type:\s*inline-size;[^}]*container-name:\s*cad-inspector;/s);
  assert.match(delivery, /@container\s+cad-inspector\s*\(min-width:\s*270px\)/);
  assert.match(appSource, /import\s+"\.\/styles\/workspace-viewport-fit\.css"/);
  assert.match(
    viewportFitCss,
    /\.cad-app \.cad-inspector\s*\{[^}]*flex:\s*0 0 clamp\(264px,\s*calc\(7vw \+ 186\.9px\),\s*360px\) !important;/s
  );
  const inspectorWidthAt = (viewportWidth) =>
    Math.max(264, Math.min(viewportWidth * 0.07 + 186.9, 360));
  assert.equal(Math.round(inspectorWidthAt(1280) * 10) / 10, 276.5);
  assert.equal(Math.round(inspectorWidthAt(1440) * 10) / 10, 287.7);
  assert.ok(inspectorWidthAt(1280) >= 270 && inspectorWidthAt(1280) < 300);
  assert.ok(inspectorWidthAt(1440) >= 270 && inspectorWidthAt(1440) < 300);
});

test("wide inspector puts the three selected-furniture dimensions on one row", () => {
  assert.match(
    delivery,
    /\.cad-tab-content:not\(\.cad-tab-content-room\)\s+\.cad-property-section:not\(\.cad-part-inspector\)\s*>\s*\.cad-dimension-fields\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*!important;/s
  );
  assert.match(delivery, /\.cad-dimension-field:last-child\s*\{\s*grid-column:\s*auto\s*!important;/s);
});

test("room dimensions and nested part-inspector grids are excluded from the new layout", () => {
  assert.match(delivery, /:not\(\.cad-tab-content-room\)/);
  assert.match(delivery, /:not\(\.cad-part-inspector\)/);
  assert.match(inspectorCss, /\.cad-part-inspector \.cad-dimension-fields\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
  assert.match(inspectorCss, /\.cad-dimension-fields\s*\{\s*grid-template-columns:\s*repeat\(2,/s);
});

test("compact numeric inputs retain room for the mm unit label", () => {
  assert.match(delivery, /padding-right:\s*31px\s*!important;/);
  assert.match(delivery, /font-variant-numeric:\s*tabular-nums;/);
  assert.match(delivery, /\.cad-input-with-unit\s*>\s*span\s*\{[^}]*right:\s*7px;/s);
});

test("existing reduced-motion and forced-colors support remains present", () => {
  assert.match(inspectorCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(inspectorCss, /@media\s*\(forced-colors:\s*active\)/);
});
