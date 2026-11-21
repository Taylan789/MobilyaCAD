import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectLaborOperationPricingSummary } from "./projectLaborOperationPricing.ts";

const usage = (overrides = {}) => ({
  id: "assembly-labor",
  category: "labor",
  description: "Dolap montaj işçiliği",
  duration: 1.5,
  unit: "h",
  tariffId: "labor-hourly",
  ...overrides
});
const tariff = (overrides = {}) => ({
  tariffId: "labor-hourly",
  category: "labor",
  unit: "h",
  unitPriceMinor: 2400,
  currencyCode: "TRY",
  sourceReference: "atolye-tarife:v1",
  ...overrides
});

test("işçilik ve operasyon sürelerini aynı birimli açık tarifelerle fiyatlandırır", () => {
  const summary = calculateProjectLaborOperationPricingSummary([
    usage(),
    usage({ id: "edge-trimming", category: "operation", description: "Kenar işleme operasyonu", duration: 15, unit: "min", tariffId: "edge-operation-minute" })
  ], [
    tariff(),
    tariff({ tariffId: "edge-operation-minute", category: "operation", unit: "min", unitPriceMinor: 30, sourceReference: "makine-tarife:2026-11" })
  ]);
  assert.equal(summary.status, "ready");
  assert.equal(summary.currencyCode, "TRY");
  assert.equal(summary.requiredLineCount, 2);
  assert.equal(summary.pricedLineCount, 2);
  assert.deepEqual(summary.lines.map((line) => line.lineTotalMinor), [3600, 450]);
  assert.deepEqual(summary.lines.map((line) => line.tariffId), ["labor-hourly", "edge-operation-minute"]);
  assert.deepEqual(summary.lines.map((line) => line.sourceReference), ["atolye-tarife:v1", "makine-tarife:2026-11"]);
  assert.equal(summary.costSummary.categoryTotalsMinor.labor, 3600);
  assert.equal(summary.costSummary.categoryTotalsMinor.operation, 450);
  assert.equal(summary.costSummary.grandTotalMinor, 4050);
});

test("boş proje fiyat veya süre uydurmadan empty döndürür", () => {
  const summary = calculateProjectLaborOperationPricingSummary([], []);
  assert.equal(summary.status, "empty");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.requiredLineCount, 0);
});

test("eksik tarife kısmi parasal toplam üretmez", () => {
  const summary = calculateProjectLaborOperationPricingSummary([
    usage(),
    usage({ id: "drilling", category: "operation", tariffId: "drilling-minute", unit: "min" })
  ], [tariff()]);
  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.lines.length, 0);
  assert.equal(summary.requiredLineCount, 2);
  assert.equal(summary.pricedLineCount, 1);
  assert.deepEqual(summary.missingTariffs.map((issue) => [issue.code, issue.usageId, issue.tariffId, issue.requiredUnit]),
    [["missing-tariff", "drilling", "drilling-minute", "min"]]);
});

test("tarife birimi farklıysa dakika-saat dönüşümü yapmadan incomplete döndürür", () => {
  const summary = calculateProjectLaborOperationPricingSummary([usage({ duration: 30, unit: "min" })], [tariff()]);
  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.missingTariffs[0].code, "unit-mismatch");
  assert.equal(summary.missingTariffs[0].requiredUnit, "min");
  assert.deepEqual(summary.missingTariffs[0].availableUnits, ["h"]);
});

test("işçilik satırı operasyon tarifesini kullanamaz", () => {
  const summary = calculateProjectLaborOperationPricingSummary([usage()], [tariff({ category: "operation" })]);
  assert.equal(summary.status, "blocked");
  assert.match(summary.diagnostics[0], /kategorisi.*eşleşmiyor/);
});

test("farklı para birimli tarifeler tek toplamı bloklar", () => {
  const summary = calculateProjectLaborOperationPricingSummary([
    usage(),
    usage({ id: "machine", category: "operation", tariffId: "machine-hourly" })
  ], [tariff(), tariff({ tariffId: "machine-hourly", category: "operation", currencyCode: "USD", sourceReference: "machine-rate:v1" })]);
  assert.equal(summary.status, "blocked");
  assert.equal(summary.costSummary, null);
  assert.match(summary.diagnostics[0], /farklı para birimleri/);
});

test("yinelenen kullanım/tarife kimliği ve bilinmeyen alan reddedilir", () => {
  const summaries = [
    calculateProjectLaborOperationPricingSummary([usage(), usage()], [tariff()]),
    calculateProjectLaborOperationPricingSummary([usage()], [tariff(), tariff()]),
    calculateProjectLaborOperationPricingSummary([usage({ guessedDuration: 2 })], [tariff()])
  ];
  for (const summary of summaries) {
    assert.equal(summary.status, "blocked");
    assert.equal(summary.costSummary, null);
    assert.equal(summary.diagnostics.length, 1);
  }
});

test("süre, birim, fiyat, para birimi ve kaynak referansı doğrulanır", () => {
  const cases = [
    { items: [usage({ duration: 0 })], rates: [tariff()] },
    { items: [usage({ duration: 0.0000001 })], rates: [tariff()] },
    { items: [usage({ unit: "adet" })], rates: [tariff()] },
    { items: [usage()], rates: [tariff({ unitPriceMinor: -1 })] },
    { items: [usage()], rates: [tariff({ currencyCode: "try" })] },
    { items: [usage()], rates: [tariff({ sourceReference: " " })] }
  ];
  for (const entry of cases) {
    const summary = calculateProjectLaborOperationPricingSummary(entry.items, entry.rates);
    assert.equal(summary.status, "blocked");
    assert.equal(summary.costSummary, null);
  }
});

test("açık sıfır tarife fiyatı geçerlidir ancak varsayılmaz", () => {
  const summary = calculateProjectLaborOperationPricingSummary([usage()], [
    tariff({ unitPriceMinor: 0, sourceReference: "approved-free-work:v1" })
  ]);
  assert.equal(summary.status, "ready");
  assert.equal(summary.costSummary.grandTotalMinor, 0);
  assert.equal(summary.lines[0].unitPriceMinor, 0);
  assert.equal(summary.lines[0].sourceReference, "approved-free-work:v1");
});
