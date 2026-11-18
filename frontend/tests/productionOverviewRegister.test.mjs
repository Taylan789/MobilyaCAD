import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(
  new URL("../src/components/production/ProductionOverview.tsx", import.meta.url),
  "utf8"
);
const styles = await readFile(
  new URL("../src/components/production/ProductionOverview.css", import.meta.url),
  "utf8"
);

test("üretim özeti KPI kartları yerine semantik teknik veri kaydı kullanır", () => {
  assert.match(component, /<dl className="mc-production__register" aria-label="Üretim veri kaydı">/);
  assert.match(component, /<dt>Parça satırı<\\/dt>/);
  assert.match(component, /<dt>Toplam adet<\\/dt>/);
  assert.match(component, /<dt>Kenar bantlama<\\/dt>/);
  assert.match(component, /<dt>Malzeme grubu<\\/dt>/);
  assert.doesNotMatch(component, /mc-production__metric/);
});

test("veri kaydı yalnızca mevcut üretim hesaplarından beslenir", () => {
  assert.match(component, /formatNumber\\(production\\.parts\\.length, 0\\)/);
  assert.match(component, /formatNumber\\(totalPieceCount, 0\\)/);
  assert.match(component, /formatNumber\\(edgeBanding\\.totalLength, 1\\)/);
  assert.match(component, /formatNumber\\(materialConsumption\\.length, 0\\)/);
});

test("teknik veri kaydı masaüstünde dört, dar görünümde iki ve tek sütuna iner", () => {
  assert.match(styles, /\\.mc-production__register\\s*\\{[\\s\\S]*?grid-template-columns:\\s*repeat\\(4, minmax\\(0, 1fr\\)\\)/);
  assert.match(styles, /@media \\(max-width: 900px\\)[\\s\\S]*?grid-template-columns:\\s*repeat\\(2, minmax\\(0, 1fr\\)\\)/);
  assert.match(styles, /@media \\(max-width: 520px\\)[\\s\\S]*?grid-template-columns:\\s*minmax\\(0, 1fr\\)/);
  assert.match(styles, /prefers-reduced-motion:\\s*reduce/);
});
