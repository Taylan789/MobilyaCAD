import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8"
);
const layout = readFileSync(
  new URL("../src/components/production/MaterialCatalogManagerContainerLayout.css", import.meta.url),
  "utf8"
);
const actionTargets = layout.split("/* UI-MATERIAL-ACTION-TARGETS-001")[1] ?? "";

test("material card edit and delete actions keep item-specific accessible labels", () => {
  assert.match(component, /className="mc-material-card__actions"/);
  assert.match(component, /aria-label=\{material\.name \+ " malzemesini düzenle"\}/);
  assert.match(component, /aria-label=\{material\.name \+ " malzemesini sil"\}/);
});

test("wide material panels use 36px action targets without changing action behavior", () => {
  const desktop = actionTargets.split("@container material-catalog (min-width: 721px)")[1]?.split("@container")[0] ?? "";
  assert.match(desktop, /\.mc-material-card__actions button\s*\{[^}]*min-width:\s*36px[^}]*min-height:\s*36px/);
  assert.match(desktop, /\.mc-material-card__actions button svg\s*\{[^}]*width:\s*14px[^}]*height:\s*14px/);
});

test("compact material panels increase action targets to 40px and 44px", () => {
  const compact = actionTargets.split("@container material-catalog (max-width: 720px)")[1]?.split("@container")[0] ?? "";
  const narrow = actionTargets.split("@container material-catalog (max-width: 520px)")[1]?.split("@media")[0] ?? "";
  assert.match(compact, /\.mc-material-card__actions button\s*\{[^}]*min-width:\s*40px[^}]*min-height:\s*40px/);
  assert.match(narrow, /\.mc-material-card__actions button\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/);
});

test("material action targets retain Windows high-contrast boundaries and visible focus", () => {
  const forcedColors = actionTargets.split("@media (forced-colors: active)")[1] ?? "";
  assert.match(forcedColors, /\.mc-material-card__actions button\s*\{[^}]*border:\s*1px solid ButtonText/);
  assert.match(forcedColors, /:focus-visible\s*\{[^}]*outline:\s*2px solid Highlight/);
});
