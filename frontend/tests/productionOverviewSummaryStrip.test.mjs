import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../src/components/production/ProductionOverview.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/production/ProductionOverviewSummary.css", import.meta.url), "utf8");

test("production summary displays live report values without metric cards", () => {
  assert.ok(component.includes('className="mc-production__summary-strip"'));
  assert.ok(component.includes('aria-label="Üretim özeti"'));
  assert.ok(component.includes("formatNumber(production.parts.length, 0)"));
  assert.ok(component.includes("formatNumber(totalPieceCount, 0)"));
  assert.ok(component.includes("formatNumber(edgeBanding.totalLength, 1)"));
  assert.ok(component.includes("formatNumber(materialConsumption.length, 0)"));
  assert.ok(!component.includes("mc-production__metrics"));
  assert.ok(!component.includes("mc-production__metric"));
});

test("summary is compact, responsive, and remains readable in forced colors", () => {
  assert.ok(css.includes("grid-template-columns: repeat(4, minmax(0, 1fr));"));
  assert.ok(css.includes("@media (max-width: 700px)"));
  assert.ok(css.includes("grid-template-columns: repeat(2, minmax(0, 1fr));"));
  assert.ok(css.includes("@media (forced-colors: active)"));
  assert.ok(css.includes("color: CanvasText;"));
});
