import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(
  new URL("../src/components/production/MaterialCatalogUsageTrace.css", import.meta.url),
  "utf8",
);
const containerLayout = readFileSync(
  new URL("../src/components/production/MaterialCatalogManagerContainerLayout.css", import.meta.url),
  "utf8",
);

test("material usage trace responds to the material panel's own width", () => {
  assert.match(containerLayout, /\.mc-material-library\s*\{[^}]*container-name:\s*material-catalog;[^}]*container-type:\s*inline-size;/s);
  assert.match(stylesheet, /@container\s+material-catalog\s+\(max-width:\s*560px\)/);
});

test("narrow usage rows stack the existing furniture, part, and source labels", () => {
  const narrowRule = stylesheet.slice(stylesheet.indexOf("@container material-catalog (max-width: 560px)"));
  assert.match(narrowRule, /\.mc-material-card__locations li button\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^}]*align-items:\s*start;/s);
  assert.match(narrowRule, /\.mc-material-card__locations li button > span,[\s\S]*?grid-column:\s*1;[\s\S]*?text-align:\s*left;/);
  assert.match(narrowRule, /\.mc-material-card__locations li button > strong\s*\{[^}]*font-size:\s*9px;/s);
  assert.match(narrowRule, /\.mc-material-card__locations li button > small\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*line-height:\s*1\.35;/s);
});

test("narrow usage list remains bounded and keeps comfortable existing actions", () => {
  const narrowRule = stylesheet.slice(stylesheet.indexOf("@container material-catalog (max-width: 560px)"));
  assert.match(narrowRule, /\.mc-material-card__locations ul\s*\{[^}]*max-height:\s*176px;/s);
  assert.match(narrowRule, /\.mc-material-card__locations li button\s*\{[^}]*min-height:\s*48px;/s);
  assert.match(narrowRule, /\.mc-material-card__locations-more\s*\{[^}]*min-height:\s*36px;/s);
});

test("keyboard focus, reduced motion, and forced-colors support remain intact", () => {
  assert.match(stylesheet, /\.mc-material-card__locations li button:focus-visible/);
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /forced-colors:\s*active/);
});
