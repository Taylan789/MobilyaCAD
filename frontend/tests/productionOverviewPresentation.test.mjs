import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylesheet = readFileSync(
  new URL("../src/components/production/ProductionOverview.css", import.meta.url),
  "utf8"
);

function cssRule(selector) {
  const start = stylesheet.indexOf(selector + " {");
  assert.notEqual(start, -1, "CSS kuralı bulunamadı: " + selector);
  const open = stylesheet.indexOf("{", start);
  const close = stylesheet.indexOf("}", open);
  assert.ok(open > start && close > open, "CSS bloğu geçersiz: " + selector);
  return stylesheet.slice(open + 1, close);
}

test("üretim ölçütleri dashboard kartları yerine teknik veri şeridi kullanır", () => {
  const metrics = cssRule(".mc-production__metrics");
  const metric = cssRule(".mc-production__metric");

  assert.match(metrics, /border-block/);
  assert.match(metric, /background:\s*transparent/);
  assert.match(metric, /box-shadow:\s*none/);
  assert.doesNotMatch(stylesheet, /\.mc-production__metric:hover/);
});

test("ölçüt düzeni panel genişliğine göre dört, iki veya tek sütuna geçer", () => {
  assert.match(stylesheet, /@container mc-production \(min-width:\s*720px\)/);
  assert.match(stylesheet, /@container mc-production \(max-width:\s*360px\)/);
  assert.match(stylesheet, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(stylesheet, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test("üretim raporu grafit ve koyu çelik yüzey tokenlarını tanımlar", () => {
  assert.match(stylesheet, /--mc-production-bg:\s*#111b22/);
  assert.match(stylesheet, /--mc-production-surface:\s*#19262f/);
  assert.match(stylesheet, /--mc-production-blue:\s*#a8c4d4/);
});

test("gerçek malzeme önizlemesi olmayan dekoratif swatch gizlenir", () => {
  assert.match(cssRule(".mc-production__material-swatch"), /display:\s*none/);
});

test("kesim listesi odağı görünür ve reduced-motion tercihi korunur", () => {
  assert.match(stylesheet, /\.mc-production__cut-focus:focus-visible/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(stylesheet, /transition:\s*none !important/);
});
