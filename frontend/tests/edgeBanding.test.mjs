import test from "node:test";
import assert from "node:assert/strict";

import { calculateEdgeBandingSummary } from "../src/engine/edgeBanding.ts";

function createPart(overrides = {}) {
  return {
    id: "part-1",
    furnitureId: "furniture-1",
    name: "Test Panel",
    width: 600,
    length: 720,
    thickness: 18,
    quantity: 1,
    edgeBanding: {
      top: false,
      bottom: false,
      left: false,
      right: false
    },
    material: "MDF",
    cncOperations: [],
    grainDirection: "none",
    ...overrides
  };
}

test("kenar bantlama uzunluğu kenar yönlerini ve adet çarpanını doğru hesaplar", () => {
  const summary = calculateEdgeBandingSummary([
    createPart({
      quantity: 2,
      edgeBanding: {
        top: true,
        bottom: true,
        left: true,
        right: false
      }
    }),
    createPart({
      id: "part-2",
      width: 400,
      length: 500,
      edgeBanding: {
        top: false,
        bottom: false,
        left: true,
        right: true
      }
    })
  ]);

  assert.deepEqual(summary, {
    widthEdgesLength: 2400,
    lengthEdgesLength: 2440,
    totalLength: 4840,
    edgeCount: 8
  });
});

test("kenar bantlama işareti olmayan parçalar uzunluk toplamına eklenmez", () => {
  const summary = calculateEdgeBandingSummary([createPart()]);

  assert.deepEqual(summary, {
    widthEdgesLength: 0,
    lengthEdgesLength: 0,
    totalLength: 0,
    edgeCount: 0
  });
});

test("boş parça listesi sıfır toplam döndürür", () => {
  assert.deepEqual(calculateEdgeBandingSummary([]), {
    widthEdgesLength: 0,
    lengthEdgesLength: 0,
    totalLength: 0,
    edgeCount: 0
  });
});

test("geçersiz ölçü veya adet değerleri reddedilir", () => {
  assert.throws(
    () => calculateEdgeBandingSummary([createPart({ width: 0 })]),
    /genişliği/
  );
  assert.throws(
    () => calculateEdgeBandingSummary([createPart({ quantity: 0 })]),
    /pozitif tam sayı/
  );
  assert.throws(
    () => calculateEdgeBandingSummary([createPart({ quantity: 1.5 })]),
    /pozitif tam sayı/
  );
});

test("kenar uzunlukları milimetrenin onda birine yuvarlanır", () => {
  const summary = calculateEdgeBandingSummary([
    createPart({
      width: 100.25,
      edgeBanding: {
        top: true,
        bottom: false,
        left: false,
        right: false
      }
    })
  ]);

  assert.equal(summary.widthEdgesLength, 100.3);
  assert.equal(summary.totalLength, 100.3);
});
