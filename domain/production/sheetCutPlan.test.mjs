import assert from "node:assert/strict";
import test from "node:test";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

const stock = { materialId: "mdf-18", widthMm: 1003, lengthMm: 1003, thicknessMm: 18, grainDirection: "none" };
const part = {
  id: "part-1", materialId: "mdf-18", widthMm: 500, lengthMm: 500,
  thicknessMm: 18, quantity: 2, grainDirection: "none", geometry: "rectangular"
};
function batch(options = {}) {
  const report = validateSheetNestingInput({
    schemaVersion: 1, sheet: { ...stock, ...(options.sheet ?? {}) },
    kerfMm: options.kerfMm ?? 3, parts: options.parts ?? [{ ...part, ...(options.part ?? {}) }]
  });
  if (report.status === "blocked" || report.result === null) throw new Error(report.diagnostics.join(" "));
  return report.result;
}
function makePlan(input, layout = calculateSheetNestingLayout(input)) {
  return createSheetCutPlan({ schemaVersion: 1, batch: input, layout });
}
function blocked(value, pattern) {
  const report = createSheetCutPlan(value);
  assert.equal(report.status, "blocked");
  assert.equal(report.result, null);
  assert.ok(report.diagnostics.length > 0);
  if (pattern) assert.match(report.diagnostics.join(" "), pattern);
}

test("kaynak kimliği, fiziksel adet, levha indeksi ve kerf korunur", () => {
  const input = batch({ part: { quantity: 3 } });
  const report = makePlan(input);
  assert.equal(report.status, "ready");
  assert.equal(report.result?.kerfMm, 3);
  assert.equal(report.result?.totalPieceCount, 3);
  assert.deepEqual(report.result?.sourceParts.map((p) => [p.id, p.quantity]), [["part-1", 3]]);
  assert.deepEqual(report.result?.sheets.flatMap((s) => s.placements.map((p) => [p.sourcePartId, p.pieceNumber, p.sheetIndex])),
    [["part-1", 1, 1], ["part-1", 2, 1], ["part-1", 3, 1]]);
  assert.equal("operations" in (report.result ?? {}), false);
});

test("grain uyumlu 90 derece dönüş ve döndürülmüş ölçüler korunur", () => {
  const input = batch({
    sheet: { widthMm: 700, lengthMm: 500, grainDirection: "length" },
    part: { widthMm: 500, lengthMm: 700, grainDirection: "width", quantity: 1 }
  });
  const report = makePlan(input);
  assert.equal(report.status, "ready");
  assert.deepEqual(report.result?.sheets[0].placements.map((p) => [p.rotationDeg, p.widthMm, p.lengthMm]), [[90, 700, 500]]);
});

test("yeni levhalarda sheetIndex 1 tabanlı ve kesintisizdir", () => {
  const input = batch({ sheet: { widthMm: 500, lengthMm: 500 }, part: { widthMm: 500, lengthMm: 500, quantity: 2 } });
  const report = makePlan(input);
  assert.equal(report.status, "ready");
  assert.deepEqual(report.result?.sheets.map((s) => s.index), [1, 2]);
  assert.deepEqual(report.result?.sheets.map((s) => s.placements[0].sheetIndex), [1, 2]);
});

test("boş batch yalnızca boş plan üretir", () => {
  const report = makePlan(batch({ parts: [] }));
  assert.equal(report.status, "empty");
  assert.deepEqual(report.result?.sheets, []);
  assert.deepEqual(report.result?.sourceParts, []);
  assert.equal(report.result?.totalPieceCount, 0);
});

test("upstream blocked rapor kısmi kesim planına dönüşmez", () => {
  blocked({ schemaVersion: 1, batch: batch(), layout: {
    schemaVersion: 1, status: "blocked", result: null, diagnostics: ["Yerleşim engellendi."]
  } }, /Yerleşim engellendi/);
});

test("eksik veya yinelenen fiziksel adet reddedilir", () => {
  const input = batch({ part: { quantity: 2 } });
  const missing = structuredClone(calculateSheetNestingLayout(input));
  missing.result.sheets[0].placements.pop();
  missing.result.sheets[0].pieceCount -= 1;
  missing.result.totalPieceCount -= 1;
  blocked({ schemaVersion: 1, batch: input, layout: missing }, /toplam parça adedi/);
  const duplicate = structuredClone(calculateSheetNestingLayout(input));
  duplicate.result.sheets[0].placements[1].pieceNumber = 1;
  blocked({ schemaVersion: 1, batch: input, layout: duplicate }, /birden fazla yerleştirilmiş/);
});

test("bilinmeyen kaynak ID ve quantity dışındaki parça numarası reddedilir", () => {
  const input = batch();
  const unknown = structuredClone(calculateSheetNestingLayout(input));
  unknown.result.sheets[0].placements[0].sourcePartId = "unknown";
  blocked({ schemaVersion: 1, batch: input, layout: unknown }, /bulunmayan kaynak Part ID/);
  const extra = structuredClone(calculateSheetNestingLayout(input));
  extra.result.sheets[0].placements[0].pieceNumber = 3;
  blocked({ schemaVersion: 1, batch: input, layout: extra }, /quantity sınırını/);
});

test("grain kısıtına aykırı dönüş ve kaynakla uyuşmayan ölçü reddedilir", () => {
  const input = batch({ sheet: { grainDirection: "length" }, part: { grainDirection: "length" } });
  const rotation = structuredClone(calculateSheetNestingLayout(input));
  rotation.result.sheets[0].placements[0].rotationDeg = 90;
  blocked({ schemaVersion: 1, batch: input, layout: rotation }, /damar yönü kısıtı/);
  const size = structuredClone(calculateSheetNestingLayout(input));
  size.result.sheets[0].placements[0].widthMm += 1;
  blocked({ schemaVersion: 1, batch: input, layout: size }, /ölçüleri kaynak Part/);
});

test("negatif, normalize edilmemiş ve levha dışı koordinatlar reddedilir", () => {
  const input = batch();
  const negative = structuredClone(calculateSheetNestingLayout(input));
  negative.result.sheets[0].placements[0].xMm = -0.1;
  blocked({ schemaVersion: 1, batch: input, layout: negative }, /X koordinatı/);
  const unnormalized = structuredClone(calculateSheetNestingLayout(input));
  unnormalized.result.sheets[0].placements[0].xMm = 0.04;
  blocked({ schemaVersion: 1, batch: input, layout: unnormalized }, /0.1 mm hassasiyetinde/);
  const outside = structuredClone(calculateSheetNestingLayout(input));
  outside.result.sheets[0].placements[0].xMm = 600;
  blocked({ schemaVersion: 1, batch: input, layout: outside }, /sınırlarının dışına/);
});

test("batch ile layout kerf, stock sheet ve toplam adet eşleşmelidir", () => {
  const input = batch();
  const kerf = structuredClone(calculateSheetNestingLayout(input));
  kerf.result.kerfMm = 4;
  blocked({ schemaVersion: 1, batch: input, layout: kerf }, /kerf değeri/);
  const sheet = structuredClone(calculateSheetNestingLayout(input));
  sheet.result.sheet.widthMm += 1;
  blocked({ schemaVersion: 1, batch: input, layout: sheet }, /widthMm alanı/);
  const count = structuredClone(calculateSheetNestingLayout(input));
  count.result.totalPieceCount += 1;
  blocked({ schemaVersion: 1, batch: input, layout: count }, /toplam parça adedi/);
});

test("sheetIndex, pieceCount ve kapalı placement şeması doğrulanır", () => {
  const input = batch();
  const index = structuredClone(calculateSheetNestingLayout(input));
  index.result.sheets[0].index = 2;
  blocked({ schemaVersion: 1, batch: input, layout: index }, /kesintisiz sırada/);
  const count = structuredClone(calculateSheetNestingLayout(input));
  count.result.sheets[0].pieceCount += 1;
  blocked({ schemaVersion: 1, batch: input, layout: count }, /placement sayısıyla/);
  const extra = structuredClone(calculateSheetNestingLayout(input));
  extra.result.sheets[0].placements[0].cncCode = "G01";
  blocked({ schemaVersion: 1, batch: input, layout: extra }, /desteklenmeyen alan/);
});

test("yanlış istek sürümü, bilinmeyen alan ve batch quantity tutarsızlığı reddedilir", () => {
  const input = batch();
  const layout = calculateSheetNestingLayout(input);
  blocked({ schemaVersion: 2, batch: input, layout }, /Desteklenmeyen.*şema sürümü/);
  blocked({ schemaVersion: 1, batch: input, layout, machine: "invented" }, /desteklenmeyen alan/);
  blocked({ schemaVersion: 1, batch: { ...input, totalPieceCount: 99 }, layout }, /toplam parça adedi içerikle eşleşmiyor/);
});
