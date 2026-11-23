import test from "node:test";
import assert from "node:assert/strict";

import {
  validateDimensionMillimeters,
  validatePositionMillimeters,
} from "../src/components/workspace/inspectorFieldValidation.ts";

test("parça ölçüsü geçerli pozitif ondalıkları ve sınır değerlerini kabul eder", () => {
  assert.equal(validateDimensionMillimeters("1"), null);
  assert.equal(validateDimensionMillimeters("600.5"), null);
  assert.equal(validateDimensionMillimeters("280000"), null);
});

test("parça ölçüsünde boş değer ve yalnızca boşluk reddedilir", () => {
  assert.equal(validateDimensionMillimeters(""), "Ölçü boş bırakılamaz.");
  assert.equal(validateDimensionMillimeters("   "), "Ölçü boş bırakılamaz.");
});

test("parça ölçüsünde sayısal olmayan ve sonlu olmayan değerler reddedilir", () => {
  assert.equal(validateDimensionMillimeters("abc"), "Geçerli bir sayı gir.");
  assert.equal(validateDimensionMillimeters("Infinity"), "Geçerli bir sayı gir.");
  assert.equal(validateDimensionMillimeters("NaN"), "Geçerli bir sayı gir.");
});

test("parça ölçüsü 1 mm altını ve 280000 mm üstünü reddeder", () => {
  assert.equal(validateDimensionMillimeters("0.9"), "Ölçü en az 1 mm olmalıdır.");
  assert.equal(validateDimensionMillimeters("280000.1"), "Ölçü 280000 mm sınırını aşamaz.");
});

test("yerel konum negatif, pozitif ve sınır koordinatlarını kabul eder", () => {
  assert.equal(validatePositionMillimeters("-125.5"), null);
  assert.equal(validatePositionMillimeters("0"), null);
  assert.equal(validatePositionMillimeters("280000"), null);
  assert.equal(validatePositionMillimeters("-280000"), null);
});

test("yerel konumda boş değer ve sayısal olmayan değer reddedilir", () => {
  assert.equal(validatePositionMillimeters(""), "Konum boş bırakılamaz.");
  assert.equal(validatePositionMillimeters("  "), "Konum boş bırakılamaz.");
  assert.equal(validatePositionMillimeters("x"), "Geçerli bir sayı gir.");
});

test("yerel konum mutlak 280000 mm sınırını aşamaz", () => {
  const message = "Konum -280000 ile 280000 mm arasında olmalıdır.";
  assert.equal(validatePositionMillimeters("280000.1"), message);
  assert.equal(validatePositionMillimeters("-280000.1"), message);
});
