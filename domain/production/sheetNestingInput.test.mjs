import assert from "node:assert/strict";
import test from "node:test";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

const baseSheet = {
  materialId: "mdf-18",
  widthMm: 2800,
  lengthMm: 2070,
  thicknessMm: 18,
  grainDirection: "length"
};

const basePart = {
  id: "part-1",
  materialId: "mdf-18",
  widthMm: 500,
  lengthMm: 700,
  thicknessMm: 18,
  quantity: 2,
  grainDirection: "length",
  geometry: "rectangular"
};

function createInput(options = {}) {
  return {
    schemaVersion: 1,
    sheet: { ...baseSheet, ...(options.sheet ?? {}) },
    kerfMm: options.kerfMm ?? 3.2,
    parts: options.parts ?? [{ ...basePart, ...(options.part ?? {}) }],
    ...(options.root ?? {})
  };
}

function assertBlocked(input, expectedMessage) {
  const report = validateSheetNestingInput(input);
  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
  assert.ok(report.diagnostics.length > 0);
  if (expectedMessage) assert.match(report.diagnostics[0], expectedMessage);
}

test("geçerli levha ve dikdörtgen parçayı 0.1 mm hassasiyetinde normalize eder", () => {
  const report = validateSheetNestingInput(createInput({
    part: { widthMm: 500.06, quantity: 3 }
  }));

  assert.equal(report.status, "ready");
  assert.equal(report.result?.sheet.widthMm, 2800);
  assert.equal(report.result?.parts[0].widthMm, 500.1);
  assert.deepEqual(report.result?.parts[0].allowedRotationsDeg, [0]);
  assert.equal(report.result?.totalPieceCount, 3);
  assert.equal(report.result?.kerfMm, 3.2);
});

test("levha ve parça damar eksenleri dik olduğunda yalnızca 90 derece dönüşe izin verir", () => {
  const report = validateSheetNestingInput(createInput({
    part: {
      widthMm: 2050,
      lengthMm: 500,
      grainDirection: "width"
    }
  }));

  assert.equal(report.status, "ready");
  assert.deepEqual(report.result?.parts[0].allowedRotationsDeg, [90]);
});

test("damar yönü none olduğunda sığan iki yönü de korur", () => {
  const report = validateSheetNestingInput(createInput({
    sheet: { grainDirection: "none" },
    part: { grainDirection: "none" }
  }));

  assert.equal(report.status, "ready");
  assert.deepEqual(report.result?.parts[0].allowedRotationsDeg, [0, 90]);
});

test("damar kısıtı olmayan parça yalnızca sığdığı 90 derece yönüyle kabul edilir", () => {
  const report = validateSheetNestingInput(createInput({
    sheet: { widthMm: 2800, lengthMm: 2070, grainDirection: "none" },
    part: { widthMm: 2100, lengthMm: 500, grainDirection: "none" }
  }));

  assert.equal(report.status, "ready");
  assert.deepEqual(report.result?.parts[0].allowedRotationsDeg, [90]);
});

test("kerf açıkça saklanır fakat henüz levha zarfına güvenlik payı gibi uygulanmaz", () => {
  const report = validateSheetNestingInput(createInput({
    sheet: { widthMm: 1000, lengthMm: 1000, grainDirection: "none" },
    kerfMm: 5,
    part: { widthMm: 1000, lengthMm: 1000, grainDirection: "none" }
  }));

  assert.equal(report.status, "ready");
  assert.equal(report.result?.kerfMm, 5);
});

test("parçasız fakat geçerli batch empty döner", () => {
  const report = validateSheetNestingInput(createInput({ parts: [] }));

  assert.equal(report.status, "empty");
  assert.deepEqual(report.result?.parts, []);
  assert.equal(report.result?.totalPieceCount, 0);
});

test("şema sürümü ve bilinmeyen alanlar reddedilir", () => {
  assertBlocked(createInput({ root: { schemaVersion: 2 } }), /şema sürümü/);
  assertBlocked(createInput({ root: { unexpected: true } }), /desteklenmeyen alan/);
});

test("negatif, sonsuz veya normalizasyon aralığını aşan kerf reddedilir", () => {
  assertBlocked(createInput({ kerfMm: -0.1 }), /kerf/);
  assertBlocked(createInput({ kerfMm: Number.POSITIVE_INFINITY }), /kerf/);
  assertBlocked(createInput({ kerfMm: Number.MAX_VALUE }), /normalizasyon aralığını/);
});

test("malzeme kimliği ve kalınlık levha ile birebir eşleşmelidir", () => {
  assertBlocked(createInput({ part: { materialId: "mdf-8" } }), /malzeme kimliği/);
  assertBlocked(createInput({ part: { thicknessMm: 8 } }), /kalınlığı/);
});

test("yinelenen parça kimliği ve güvenli olmayan quantity reddedilir", () => {
  const duplicate = createInput({
    parts: [
      { ...basePart, id: "same" },
      { ...basePart, id: "same" }
    ]
  });
  assertBlocked(duplicate, /yinelenen/);
  assertBlocked(createInput({ part: { quantity: 1.5 } }), /güvenli bir tam sayı/);
});

test("damar yönü nedeniyle izin verilen hiçbir dönüşe sığmayan parça bloklanır", () => {
  assertBlocked(createInput({
    part: {
      widthMm: 2100,
      lengthMm: 2500,
      grainDirection: "length"
    }
  }), /damar yönünü koruyan/);
});

test("dikdörtgen dışındaki kesit geometrisi nesting girdisine alınmaz", () => {
  assertBlocked(createInput({ part: { geometry: "cutout" } }), /yalnızca rectangular/);
});

test("tek bir geçersiz parça tüm batch sonucunu bloklar; kısmi liste döndürülmez", () => {
  const report = validateSheetNestingInput(createInput({
    parts: [
      { ...basePart, id: "valid" },
      { ...basePart, id: "invalid", materialId: "other-material" }
    ]
  }));

  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
});

test("quantity toplamı güvenli tam sayı sınırını aşarsa batch bloklanır", () => {
  assertBlocked(createInput({
    parts: [
      { ...basePart, id: "large-1", quantity: Number.MAX_SAFE_INTEGER },
      { ...basePart, id: "large-2", quantity: 1 }
    ]
  }), /güvenli tam sayı aralığını/);
});
