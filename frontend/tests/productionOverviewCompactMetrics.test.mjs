import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productionCss = readFileSync(new URL("../src/components/production/ProductionWorkspace.css", import.meta.url), "utf8");
const densityCss = productionCss.slice(productionCss.indexOf("UI-PRODUCTION-DENSITY-001"));

test("production summary is a compact technical strip rather than four raised cards", () => {
  assert.match(densityCss, /UI-PRODUCTION-DENSITY-001/);
  const strip = densityCss.match(/\.mc-production-studio \.mc-production__metrics\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(strip, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(strip, /gap:\s*0;/);
  const metric = densityCss.match(/\.mc-production-studio \.mc-production__metric\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(metric, /background:\s*transparent !important;/);
  assert.match(metric, /box-shadow:\s*none !important;/);
  assert.match(metric, /border-right:\s*1px solid var\(--mps-line\) !important;/);
  assert.match(densityCss, /\.mc-production-studio \.mc-production__metric:hover[\s\S]*?transform:\s*none !important;/);
});

test("summary strip adapts to two and one-column narrow layouts", () => {
  assert.match(densityCss, /@media \(max-width:\s*820px\)[\s\S]*?\.mc-production-studio \.mc-production__metrics\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(densityCss, /@media \(max-width:\s*420px\)[\s\S]*?\.mc-production-studio \.mc-production__metrics\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
});
