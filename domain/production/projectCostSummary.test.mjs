import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjectCostSummary, PROJECT_COST_CATEGORIES } from "./projectCostSummary.ts";

const line = (overrides = {}) => ({
  id: "material-board",
  category: "material",
  description: "MDF panel",
  quantity: 2.5,
  unit: "m2",
  unitPriceMinor: 1250,
  currencyCode: "TRY",
  ...overrides
});

test("boş proje maliyet listesi fiyat uydurmadan boş özet döndürür", () => {
  const summary = calculateProjectCostSummary([]);
  assert.equal(summary.status, "empty");
  assert.equal(summary.currencyCode, null);
  assert.equal(summary.lineCount, 0);
  assert.equal(summary.grandTotalMinor, 0);
  assert.deepEqual(summary.categoryTotalsMinor, {
    material: 0, hardware: 0, labor: 0, operation: 0, waste: 0, profit: 0
  });
});

test("malzeme, donanım, işçilik, operasyon, fire ve kâr açık girdilerden ayrı toplanır", () => {
  const summary = calculateProjectCostSummary([
    line(),
    line({ id: "hinges", category: "hardware", description: "Menteşe", quantity: 0.1, unit: "adet", unitPriceMinor: 50 }),
    line({ id: "labor", category: "labor", description: "Montaj", quantity: 1.5, unit: "saat", unitPriceMinor: 2000 }),
    line({ id: "operation", category: "operation", description: "Kesim operasyonu", quantity: 1, unit: "iş", unitPriceMinor: 500 }),
    line({ id: "waste", category: "waste", description: "Açık fire bedeli", quantity: 0.25, unit: "m2", unitPriceMinor: 400 }),
    line({ id: "profit", category: "profit", description: "Açık kâr kalemi", quantity: 1, unit: "kalem", unitPriceMinor: 750 })
  ]);

  assert.equal(summary.status, "ready");
  assert.equal(summary.currencyCode, "TRY");
  assert.equal(summary.lineCount, 6);
  assert.deepEqual(summary.lines.map((entry) => entry.lineTotalMinor), [3125, 5, 3000, 500, 100, 750]);
  assert.deepEqual(summary.categoryTotalsMinor, {
    material: 3125, hardware: 5, labor: 3000, operation: 500, waste: 100, profit: 750
  });
  assert.equal(summary.grandTotalMinor, 7480);
});

test("0.1 ve 0.2 miktarlar ayrı satırlarda ondalık kayma üretmeden hesaplanır", () => {
  const summary = calculateProjectCostSummary([
    line({ id: "fraction-a", quantity: 0.1, unitPriceMinor: 100 }),
    line({ id: "fraction-b", quantity: 0.2, unitPriceMinor: 100 })
  ]);
  assert.deepEqual(summary.lines.map((entry) => entry.lineTotalMinor), [10, 20]);
  assert.equal(summary.grandTotalMinor, 30);
});

test("her satır en yakın küçük para birimine yarım-yukarı yuvarlanır", () => {
  const summary = calculateProjectCostSummary([
    line({ id: "half-a", quantity: 0.5, unitPriceMinor: 1 }),
    line({ id: "half-b", quantity: 0.5, unitPriceMinor: 1 })
  ]);
  assert.deepEqual(summary.lines.map((entry) => entry.lineTotalMinor), [1, 1]);
  assert.equal(summary.grandTotalMinor, 2);
});

test("açık kaynak referansı ve sıfır birim fiyat korunur", () => {
  const summary = calculateProjectCostSummary([
    line({ unitPriceMinor: 0, sourceReference: "atolye-fiyat-listesi:v3" })
  ]);
  assert.equal(summary.lines[0].unitPriceMinor, 0);
  assert.equal(summary.lines[0].lineTotalMinor, 0);
  assert.equal(summary.lines[0].sourceReference, "atolye-fiyat-listesi:v3");
});

test("kategori sözleşmesi altı açık maliyet türüyle sınırlıdır", () => {
  assert.deepEqual(PROJECT_COST_CATEGORIES, [
    "material", "hardware", "labor", "operation", "waste", "profit"
  ]);
});

test("farklı para birimleri ve geçersiz para birimi kodları reddedilir", () => {
  assert.throws(
    () => calculateProjectCostSummary([
      line(),
      line({ id: "other-currency", currencyCode: "USD" })
    ]),
    /farklı para birimleri/
  );
  assert.throws(
    () => calculateProjectCostSummary([line({ currencyCode: "try" })]),
    /üç büyük harf/
  );
});

test("geçersiz miktar, hassasiyet ve birim fiyat reddedilir", () => {
  for (const quantity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.0000001]) {
    assert.throws(() => calculateProjectCostSummary([line({ quantity })]));
  }
  for (const unitPriceMinor of [-1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateProjectCostSummary([line({ unitPriceMinor })]));
  }
});

test("kimlikler benzersiz olmalı ve bilinmeyen alanlar sessizce yutulmamalıdır", () => {
  assert.throws(
    () => calculateProjectCostSummary([line(), line({ id: "material-board" })]),
    /Yinelenen proje maliyet kalemi kimliği/
  );
  assert.throws(
    () => calculateProjectCostSummary([line({ untrackedPrice: 100 })]),
    /desteklenmeyen alan/
  );
});

test("açıklama, birim, kategori ve kaynak referansı doğrulanır", () => {
  for (const invalid of [
    { description: " " },
    { unit: " " },
    { category: "discount" },
    { sourceReference: " " }
  ]) {
    assert.throws(() => calculateProjectCostSummary([line(invalid)]));
  }
});

test("satır veya proje toplamı güvenli tam sayı aralığını aşarsa reddedilir", () => {
  assert.throws(
    () => calculateProjectCostSummary([
      line({ quantity: Number.MAX_SAFE_INTEGER, unitPriceMinor: 2 })
    ]),
    /güvenli tam sayı aralığını/
  );
  assert.throws(
    () => calculateProjectCostSummary([
      line({ id: "large-a", quantity: 1, unitPriceMinor: Number.MAX_SAFE_INTEGER }),
      line({ id: "large-b", quantity: 1, unitPriceMinor: 1 })
    ]),
    /güvenli tam sayı aralığını/
  );
});
