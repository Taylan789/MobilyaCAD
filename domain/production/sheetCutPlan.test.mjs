import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSheetCutPlanAreaSummary,
  createSheetCutPlan,
  parseSheetCutPlanJson,
  serializeSheetCutPlanJson
} from "./sheetCutPlan.ts";
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


test("placement çakışması ve yatay/düşey yetersiz kerf aralığı reddedilir", () => {
  const input = batch({ part: { quantity: 2 } });

  const overlap = structuredClone(calculateSheetNestingLayout(input));
  overlap.result.sheets[0].placements[1].xMm = 499;
  overlap.result.sheets[0].placements[1].yMm = 0;
  blocked({ schemaVersion: 1, batch: input, layout: overlap }, /çakışıyor veya gereken kerf/);

  const horizontalGap = structuredClone(calculateSheetNestingLayout(input));
  horizontalGap.result.sheets[0].placements[1].xMm = 502.9;
  horizontalGap.result.sheets[0].placements[1].yMm = 0;
  blocked({ schemaVersion: 1, batch: input, layout: horizontalGap }, /çakışıyor veya gereken kerf/);

  const verticalGap = structuredClone(calculateSheetNestingLayout(input));
  verticalGap.result.sheets[0].placements[1].xMm = 0;
  verticalGap.result.sheets[0].placements[1].yMm = 502.9;
  blocked({ schemaVersion: 1, batch: input, layout: verticalGap }, /çakışıyor veya gereken kerf/);
});

test("iki eksendeki küçük boşluk aynı anda oluştuğunda diagonal kerf ihlali reddedilir", () => {
  const input = batch({ part: { quantity: 2 } });
  const layout = structuredClone(calculateSheetNestingLayout(input));
  layout.result.sheets[0].placements[1].xMm = 502;
  layout.result.sheets[0].placements[1].yMm = 502;
  blocked({ schemaVersion: 1, batch: input, layout }, /çakışıyor veya gereken kerf/);
});

test("tam kerf aralığı ve sıfır kerf ile kenar teması geçerli kalır", () => {
  const exact = batch({ part: { quantity: 2 } });
  const exactLayout = calculateSheetNestingLayout(exact);
  assert.equal(makePlan(exact, exactLayout).status, "ready");
  assert.equal(exactLayout.result?.sheets[0].placements[1].xMm, 503);

  const zeroKerf = batch({
    sheet: { widthMm: 1000, lengthMm: 500 },
    kerfMm: 0,
    part: { widthMm: 500, lengthMm: 500, quantity: 2 }
  });
  const zeroKerfLayout = calculateSheetNestingLayout(zeroKerf);
  assert.equal(makePlan(zeroKerf, zeroKerfLayout).status, "ready");
  assert.equal(zeroKerfLayout.result?.sheets[0].placements[1].xMm, 500);
});

test("farklı levhalardaki aynı koordinatlar birbiriyle çakışma sayılmaz", () => {
  const input = batch({
    sheet: { widthMm: 500, lengthMm: 500 },
    part: { widthMm: 500, lengthMm: 500, quantity: 2 }
  });
  const layout = calculateSheetNestingLayout(input);
  assert.equal(layout.result?.sheets.length, 2);
  assert.equal(makePlan(input, layout).status, "ready");
});

test("50.000 fiziksel placement geometri denetimi O(n²) çifti taramadan tamamlanır", () => {
  const quantity = 50_000;
  const input = batch({
    sheet: { widthMm: 100_000, lengthMm: 1 },
    kerfMm: 1,
    part: { widthMm: 1, lengthMm: 1, quantity }
  });
  const placements = Array.from({ length: quantity }, (_, index) => ({
    sourcePartId: "part-1",
    pieceNumber: index + 1,
    xMm: index * 2,
    yMm: 0,
    widthMm: 1,
    lengthMm: 1,
    rotationDeg: 0
  }));
  const layout = {
    schemaVersion: 1,
    status: "ready",
    diagnostics: [],
    result: {
      schemaVersion: 1,
      strategy: "deterministic-shelf-v1",
      sheet: input.sheet,
      kerfMm: input.kerfMm,
      sheets: [{ index: 1, pieceCount: quantity, placements }],
      totalPieceCount: quantity
    }
  };

  const report = createSheetCutPlan({ schemaVersion: 1, batch: input, layout });
  assert.equal(report.status, "ready");
  assert.equal(report.result?.totalPieceCount, quantity);
  assert.equal(report.result?.sheets[0].placements.length, quantity);
});

test("kullanıcı trim payları kesim planı ve JSON round-trip içinde korunur", () => {
  const input = batch({
    sheet: { widthMm: 1000, lengthMm: 1000 },
    kerfMm: 0,
    part: { widthMm: 900, lengthMm: 900, quantity: 1 }
  });
  const edgeTrimMm = { left: 10, right: 20, top: 30, bottom: 40 };
  const layout = calculateSheetNestingLayout({ ...input, edgeTrimMm });
  const plan = makePlan(input, layout);
  assert.equal(plan.status, "ready");
  assert.deepEqual(plan.result?.edgeTrimMm, edgeTrimMm);
  assert.deepEqual(
    plan.result?.sheets[0].placements.map(({ xMm, yMm }) => [xMm, yMm]),
    [[10, 30]]
  );
  const serialized = serializeSheetCutPlanJson(plan);
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  assert.deepEqual(parseSheetCutPlanJson(serialized.json), plan);

  const outsideTrim = structuredClone(layout);
  outsideTrim.result.sheets[0].placements[0].xMm = 0;
  blocked({ schemaVersion: 1, batch: input, layout: outsideTrim }, /trim sınırlarının dışına taşıyor/);

  const tamperedJson = JSON.parse(serialized.json);
  tamperedJson.plan.edgeTrimMm.left = -1;
  const invalidTrim = parseSheetCutPlanJson(JSON.stringify(tamperedJson));
  assert.equal(invalidTrim.status, "blocked");
  assert.match(invalidTrim.diagnostics.join(" "), /sıfır veya pozitif/);
});

test("kesim planı sürümlü JSON zarfına kayıpsız yazılır ve yeniden doğrulanır", () => {
  const original = makePlan(batch({ part: { quantity: 3 } }));
  const serialized = serializeSheetCutPlanJson(original);

  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  assert.deepEqual(parseSheetCutPlanJson(serialized.json), original);
});

test("JSON parser bozuk, değiştirilmiş geometriyi ve desteklenmeyen sürümü reddeder", () => {
  const original = makePlan(batch({ part: { quantity: 2 } }));
  const serialized = serializeSheetCutPlanJson(original);
  assert.equal(serialized.status, "ready");
  if (!serialized.json) throw new Error("JSON çıktısı bekleniyordu.");

  const tampered = JSON.parse(serialized.json);
  tampered.plan.sheets[0].placements[1].xMm = 499;
  const invalidGeometry = parseSheetCutPlanJson(JSON.stringify(tampered));
  assert.equal(invalidGeometry.status, "blocked");
  assert.match(invalidGeometry.diagnostics.join(" "), /çakışıyor veya gereken kerf/);

  tampered.plan.sheets[0].placements[1].xMm = 503;
  tampered.formatVersion = 2;
  const unsupported = parseSheetCutPlanJson(JSON.stringify(tampered));
  assert.equal(unsupported.status, "blocked");
  assert.match(unsupported.diagnostics.join(" "), /formatı veya sürümü/);
  assert.equal(parseSheetCutPlanJson("{").status, "blocked");
});

test("blocked plan JSON olarak dışa aktarılamaz ve empty plan round-trip korunur", () => {
  const blockedReport = makePlan(batch(), {
    schemaVersion: 1,
    status: "blocked",
    result: null,
    diagnostics: ["Yerleşim engellendi."]
  });
  const blockedJson = serializeSheetCutPlanJson(blockedReport);
  assert.equal(blockedJson.status, "blocked");
  assert.equal(blockedJson.json, null);

  const empty = makePlan(batch({ parts: [] }));
  const serialized = serializeSheetCutPlanJson(empty);
  assert.equal(serialized.status, "empty");
  assert.ok(serialized.json);
  assert.deepEqual(parseSheetCutPlanJson(serialized.json), empty);
});


test("trim sonrası net levha alanı ile yerleşen net parça alanını toplam ve levha bazında ayırır", () => {
  const input = batch({
    sheet: { widthMm: 1000, lengthMm: 1000 },
    kerfMm: 0,
    part: { widthMm: 900, lengthMm: 900, quantity: 2 }
  });
  const edgeTrimMm = { left: 10, right: 20, top: 30, bottom: 40 };
  const plan = makePlan(input, calculateSheetNestingLayout({ ...input, edgeTrimMm }));
  const summary = calculateSheetCutPlanAreaSummary(plan);

  assert.equal(summary.status, "ready");
  assert.equal(summary.result?.sheetCount, 2);
  assert.equal(summary.result?.grossSheetAreaMm2, 2_000_000);
  assert.equal(summary.result?.trimExcludedAreaMm2, 195_800);
  assert.equal(summary.result?.usableSheetAreaMm2, 1_804_200);
  assert.equal(summary.result?.placedPartAreaMm2, 1_620_000);
  assert.equal(summary.result?.unoccupiedUsableAreaMm2, 184_200);
  assert.equal(summary.result?.geometricOccupancyPercent, 89.79);
  assert.deepEqual(summary.result?.sheets.map((sheet) => [
    sheet.sheetIndex, sheet.usableSheetAreaMm2, sheet.placedPartAreaMm2,
    sheet.unoccupiedUsableAreaMm2, sheet.geometricOccupancyPercent
  ]), [
    [1, 902_100, 810_000, 92_100, 89.79],
    [2, 902_100, 810_000, 92_100, 89.79]
  ]);
});

test("0.1 mm ölçülerden gelen alanı 0.01 mm² hassasiyetinde hesaplar", () => {
  const input = batch({
    sheet: { widthMm: 1000.1, lengthMm: 1000.1 },
    kerfMm: 0,
    part: { widthMm: 500.1, lengthMm: 500.1, quantity: 1 }
  });
  const edgeTrimMm = { left: 0.1, right: 0.2, top: 0.3, bottom: 0.4 };
  const summary = calculateSheetCutPlanAreaSummary(
    makePlan(input, calculateSheetNestingLayout({ ...input, edgeTrimMm }))
  );

  assert.equal(summary.status, "ready");
  assert.equal(summary.result?.grossSheetAreaMm2, 1_000_200.01);
  assert.equal(summary.result?.trimExcludedAreaMm2, 999.89);
  assert.equal(summary.result?.usableSheetAreaMm2, 999_200.12);
  assert.equal(summary.result?.placedPartAreaMm2, 250_100.01);
  assert.equal(summary.result?.unoccupiedUsableAreaMm2, 749_100.11);
  assert.equal(summary.result?.geometricOccupancyPercent, 25.03);
});

test("boş ve blocked kesim planlarında alan özeti güvenli durum döndürür", () => {
  const empty = calculateSheetCutPlanAreaSummary(makePlan(batch({ parts: [] })));
  assert.equal(empty.status, "empty");
  assert.deepEqual(empty.result?.sheets, []);
  assert.equal(empty.result?.sheetCount, 0);
  assert.equal(empty.result?.grossSheetAreaMm2, 0);
  assert.equal(empty.result?.usableSheetAreaMm2, 0);
  assert.equal(empty.result?.placedPartAreaMm2, 0);
  assert.equal(empty.result?.geometricOccupancyPercent, null);

  const blockedPlan = makePlan(batch(), {
    schemaVersion: 1, status: "blocked", result: null, diagnostics: ["Yerleşim engellendi."]
  });
  const blockedSummary = calculateSheetCutPlanAreaSummary(blockedPlan);
  assert.equal(blockedSummary.status, "blocked");
  assert.equal(blockedSummary.result, null);
  assert.match(blockedSummary.diagnostics.join(" "), /Yerleşim engellendi/);
});

test("değiştirilmiş kesim planı alan özeti üretmeden önce yeniden doğrulanır", () => {
  const plan = structuredClone(makePlan(batch({ part: { quantity: 1 } })));
  plan.result.sheets[0].placements[0].widthMm = 1;
  const summary = calculateSheetCutPlanAreaSummary(plan);
  assert.equal(summary.status, "blocked");
  assert.equal(summary.result, null);
  assert.match(summary.diagnostics.join(" "), /ölçüleri kaynak Part/);
});

test("alan hesabı güvenli 0.01 mm² integer aralığını aşarsa blocked olur", () => {
  const input = batch({
    sheet: { widthMm: 90_000_000, lengthMm: 90_000_000 },
    kerfMm: 0,
    part: { widthMm: 1, lengthMm: 1, quantity: 1 }
  });
  const plan = makePlan(input, calculateSheetNestingLayout(input));
  const summary = calculateSheetCutPlanAreaSummary(plan);
  assert.equal(summary.status, "blocked");
  assert.equal(summary.result, null);
  assert.match(summary.diagnostics.join(" "), /güvenli 0.01 mm²/);
});
