import assert from "node:assert/strict";
import test from "node:test";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

const sheetBase = { materialId: "mdf-18", widthMm: 1003, lengthMm: 1003, thicknessMm: 18, grainDirection: "none" };
const partBase = {
  id: "part-1", materialId: "mdf-18", widthMm: 500, lengthMm: 500,
  thicknessMm: 18, quantity: 1, grainDirection: "none", geometry: "rectangular"
};
function batch(options = {}) {
  const report = validateSheetNestingInput({
    schemaVersion: 1, sheet: { ...sheetBase, ...(options.sheet ?? {}) },
    kerfMm: options.kerfMm ?? 3,
    parts: options.parts ?? [{ ...partBase, ...(options.part ?? {}) }]
  });
  if (report.status === "blocked" || report.result === null) throw new Error(report.diagnostics.join(" "));
  return report.result;
}
function blocked(value, pattern) {
  const report = calculateSheetNestingLayout(value);
  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
  assert.ok(report.diagnostics.length > 0);
  if (pattern) assert.match(report.diagnostics.join(" "), pattern);
}

test("aynı sıradaki parçalar arasında kerf kadar boşluk bırakır", () => {
  const r = calculateSheetNestingLayout(batch({
    sheet: { widthMm: 1003, lengthMm: 500 },
    parts: [{ ...partBase, id: "part-a" }, { ...partBase, id: "part-b" }]
  }));
  assert.equal(r.status, "ready");
  assert.equal(r.result?.sheets.length, 1);
  assert.deepEqual(r.result?.sheets[0].placements.map((p) => p.xMm), [0, 503]);
  const placements = r.result?.sheets[0].placements ?? [];
  assert.equal(placements[1].xMm - placements[0].xMm - placements[0].widthMm, 3);
});

test("kerf dahil yatay aralık sığmazsa ikinci levhayı açar", () => {
  const r = calculateSheetNestingLayout(batch({
    sheet: { widthMm: 1002.9, lengthMm: 500 },
    parts: [{ ...partBase, id: "a" }, { ...partBase, id: "b" }]
  }));
  assert.equal(r.status, "ready");
  assert.equal(r.result?.sheets.length, 2);
});

test("ardışık sıralar arasında kerf tüketir", () => {
  const r = calculateSheetNestingLayout(batch({
    sheet: { widthMm: 500, lengthMm: 1003 },
    parts: [{ ...partBase, id: "a" }, { ...partBase, id: "b" }]
  }));
  assert.equal(r.status, "ready");
  assert.deepEqual(r.result?.sheets[0].placements.map((p) => p.yMm), [0, 503]);
});

test("kerf dahil düşey aralık sığmazsa yeni levha kullanır", () => {
  const r = calculateSheetNestingLayout(batch({
    sheet: { widthMm: 500, lengthMm: 1002.9 },
    parts: [{ ...partBase, id: "a" }, { ...partBase, id: "b" }]
  }));
  assert.equal(r.status, "ready");
  assert.equal(r.result?.sheets.length, 2);
});

test("damar uyumlu 90 derece dönüşte yerleşmiş ölçüleri değiştirir", () => {
  const r = calculateSheetNestingLayout(batch({
    sheet: { widthMm: 700, lengthMm: 500, grainDirection: "length" },
    part: { widthMm: 500, lengthMm: 700, grainDirection: "width" }
  }));
  assert.equal(r.status, "ready");
  assert.deepEqual(r.result?.sheets[0].placements[0], {
    sourcePartId: "part-1", pieceNumber: 1, xMm: 0, yMm: 0,
    widthMm: 700, lengthMm: 500, rotationDeg: 90
  });
});

test("quantity her fiziksel parça için ayrı placement ve sıra numarası üretir", () => {
  const r = calculateSheetNestingLayout(batch({ part: { quantity: 3 } }));
  assert.equal(r.status, "ready");
  assert.equal(r.result?.totalPieceCount, 3);
  assert.deepEqual(r.result?.sheets.flatMap((s) => s.placements.map((p) => p.pieceNumber)), [1, 2, 3]);
  assert.deepEqual(r.result?.sheets.map((s) => s.pieceCount), [3]);
});

test("uzun kenara göre kararlı sıralar ve aynı girdide aynı sonucu üretir", () => {
  const input = batch({ parts: [
    { ...partBase, id: "small", widthMm: 200, lengthMm: 200 },
    { ...partBase, id: "large", widthMm: 600, lengthMm: 400 }
  ] });
  const first = calculateSheetNestingLayout(input);
  assert.equal(first.status, "ready");
  assert.deepEqual(first, calculateSheetNestingLayout(input));
  assert.deepEqual(first.result?.sheets[0].placements.map((p) => p.sourcePartId), ["large", "small"]);
});

test("yerleşimler levha sınırında kalır ve her parça çifti arasında kerf korunur", () => {
  const r = calculateSheetNestingLayout(batch({ part: { quantity: 4 } }));
  assert.equal(r.status, "ready");
  const placements = r.result?.sheets[0].placements ?? [];
  const kerf = r.result?.kerfMm ?? 0;
  const sheet = r.result?.sheet;
  for (const p of placements) {
    assert.ok(p.xMm >= 0 && p.yMm >= 0);
    assert.ok(p.xMm + p.widthMm <= (sheet?.widthMm ?? 0));
    assert.ok(p.yMm + p.lengthMm <= (sheet?.lengthMm ?? 0));
  }
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i], b = placements[j];
      const separated =
        a.xMm + a.widthMm + kerf <= b.xMm ||
        b.xMm + b.widthMm + kerf <= a.xMm ||
        a.yMm + a.lengthMm + kerf <= b.yMm ||
        b.yMm + b.lengthMm + kerf <= a.yMm;
      assert.ok(separated);
    }
  }
});

test("trim payı tanımlanmadığında levha kenarına ek boşluk uydurmaz", () => {
  const r = calculateSheetNestingLayout(batch({
    sheet: { widthMm: 1000, lengthMm: 1000 }, kerfMm: 5,
    part: { widthMm: 1000, lengthMm: 1000 }
  }));
  assert.equal(r.status, "ready");
  assert.deepEqual(r.result?.sheets[0].placements.map(({ xMm, yMm }) => [xMm, yMm]), [[0, 0]]);
});

test("boş batch empty döner ve levha oluşturmaz", () => {
  const r = calculateSheetNestingLayout(batch({ parts: [] }));
  assert.equal(r.status, "empty");
  assert.deepEqual(r.result?.sheets, []);
  assert.equal(r.result?.totalPieceCount, 0);
});

test("türetilmiş dönüşler yeniden hesaplanır ve giriş nesnesi değiştirilmez", () => {
  const input = batch({
    sheet: { widthMm: 1000, lengthMm: 500, grainDirection: "length" },
    part: { widthMm: 500, lengthMm: 400, grainDirection: "length" }
  });
  input.parts[0].allowedRotationsDeg = [90];
  const before = JSON.stringify(input);
  const r = calculateSheetNestingLayout(input);
  assert.equal(r.status, "ready");
  assert.equal(r.result?.sheets[0].placements[0].rotationDeg, 0);
  assert.equal(JSON.stringify(input), before);
});

test("toplam adet uyuşmazlığı ve bilinmeyen alanlar kısmi sonuç üretmez", () => {
  const input = batch();
  blocked({ ...input, totalPieceCount: 2 }, /toplam parça adedi/);
  blocked({ ...input, unexpected: true }, /desteklenmeyen alan/);
});

test("kesitli geometri yerleşimi bütünüyle engeller", () => {
  const input = batch();
  blocked({ ...input, parts: [{ ...input.parts[0], geometry: "cutout" }] }, /yalnızca rectangular/);
});

test("50.000 üzerindeki quantity bellek sınırı nedeniyle blocked döner", () => {
  blocked(batch({ part: { quantity: 50_001 } }), /en fazla 50000 fiziksel parçayı/);
});
