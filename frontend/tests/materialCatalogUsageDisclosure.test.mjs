import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/production/MaterialCatalogUsageTrace.css", import.meta.url),
  "utf8"
);

test("material usage trace starts with a bounded list and can reveal every real usage", () => {
  assert.ok(component.includes("const visibleUsages = usageExpanded ? usages : usages.slice(0, 8);"));
  assert.ok(component.includes("{visibleUsages.map((usage, index) => ("));
  assert.ok(component.includes("usageByMaterialId.get(material.id) ?? []"));
});

test("usage disclosure is keyed by material identity and exposes its expanded state", () => {
  assert.ok(component.includes("expandedUsageMaterialIds"));
  assert.ok(component.includes("aria-expanded={usageExpanded}"));
  assert.ok(component.includes("current.filter((id) => id !== material.id)"));
  assert.ok(component.includes("[...current, material.id]"));
  assert.ok(component.includes("İlk 8 kullanımı göster"));
});

test("each usage row continues to select its actual furniture and part", () => {
  assert.ok(component.includes("onClick={() => onSelectUsage(usage.furnitureId, usage.partId ?? null)}"));
  assert.ok(component.includes("usage.furnitureName"));
  assert.ok(component.includes("usage.partName"));
});

test("expanded usage lists stay bounded and keyboard-visible", () => {
  assert.ok(styles.includes("max-height: 224px;"));
  assert.ok(styles.includes("overflow-y: auto;"));
  assert.ok(styles.includes(".mc-material-card__locations-more:focus-visible"));
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes("@media (forced-colors: active)"));
});
