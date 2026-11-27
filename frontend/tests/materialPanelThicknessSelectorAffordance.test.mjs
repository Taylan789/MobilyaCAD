import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/production/MaterialPanelThicknessSelector.css", import.meta.url),
  "utf8",
);
const affordance = styles.slice(
  styles.indexOf("/* UI-MATERIAL-THICKNESS-STATE-READABILITY-001"),
);

test("thickness preview choices keep their real selected state and callback", () => {
  assert.ok(component.includes("aria-pressed={sampleThickness === thickness}"));
  assert.ok(component.includes("onClick={() => onSelectThickness(thickness)}"));
});

test("selected thickness has a persistent technical marker and usable target size", () => {
  assert.match(affordance, /min-height:\s*42px;/);
  assert.match(affordance, /border-left:\s*2px solid #c39470;/);
  assert.match(affordance, /::after\s*\{[^}]*content:\s*"✓";/s);
  assert.match(affordance, /min-height:\s*44px;/);
});

test("thickness controls retain reduced-motion and forced-colors support", () => {
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(affordance, /@media \(forced-colors:\s*active\)/);
  assert.match(affordance, /border-left-color:\s*Highlight;/);
  assert.match(affordance, /color:\s*HighlightText;/);
});
