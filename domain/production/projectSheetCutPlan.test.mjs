import assert from "node:assert/strict";
import test from "node:test";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { parseProjectSheetCutPlanJson } from "./projectSheetCutPlanFile.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

function part(id, materialId, thickness, quantity, grainDirection, overrides = {}) {
  return {
    id,
    furnitureId: "furniture-1",
    name: id,
    width: materialId === "mdf-18" ? 500 : 300,
    length: materialId === "mdf-18" ? 700 : 400,
    thickness,
    quantity,
    material: materialId,
    materialId,
    grainDirection,
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    ...overrides
  };
}

function productionReport(parts) {
  return {
    schemaVersion: 1,
    status: "ready",
    firstError: null,
    result: { schemaVersion: 1, parts }
  };
}

function makeBatchReport(options = {}) {
  const report = productionReport([
    part("mdf-part", "mdf-18", 18, 2, "length"),
    part("plywood-part", "plywood-8", 8, 1, "width"),
    part("excluded-part", "other-12", 12, 1, "length")
  ]);
  const stockSheets = [
    {
      sheet: {
        materialId: "mdf-18",
        widthMm: 1200,
        lengthMm: 1000,
        thicknessMm: 18,
        grainDirection: "length"
      },
      kerfMm: 3
    },
    {
      sheet: {
        materialId: "plywood-8",
        widthMm: 1200,
        lengthMm: 1000,
        thicknessMm: 8,
        grainDirection: "width"
      },
      kerfMm: 2.4
    }
  ];
  return createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport: report,
    partIds: ["mdf-part", "plywood-part"],
    stockSheets: options.missingPlywood
      ? stockSheets.slice(0, 1)
      : stockSheets
  });
}

function groupId(group) {
  return JSON.stringify([group.materialId, Math.round(group.thicknessMm * 10)]);
}

function makeLayouts(batchReport, options = {}) {
  const batches = batchReport.result?.batches ?? [];
  return batches.map((group, index) => ({
    groupId: groupId(group),
    layoutReport: calculateSheetNestingLayout({
      ...group.batch,
      ...(options.trimFirst && index === 0
        ? { edgeTrimMm: { left: 10, right: 10, top: 5, bottom: 5 } }
        : {})
    })
  }));
}

function assertBlocked(value, pattern) {
  const result = createProjectSheetCutPlan(value);
  assert.equal(result.status, "blocked");
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.length > 0);
  if (pattern) assert.match(result.diagnostics.join(" "), pattern);
  return result;
}

test("çoklu batch ve layout raporu tek proje planında grup sırasını, kaynakları, trim ve JSON round-trip'i korur", () => {
  const batchReport = makeBatchReport();
  assert.equal(batchReport.status, "ready");
  const layouts = makeLayouts(batchReport, { trimFirst: true });
  const result = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport,
    layoutReports: layouts.slice().reverse()
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.sourcePartIds, ["mdf-part", "plywood-part"]);
  assert.deepEqual(result.excludedPartIds, ["excluded-part"]);
  assert.deepEqual(result.result.groups.map((group) => group.groupId), [
    JSON.stringify(["mdf-18", 180]),
    JSON.stringify(["plywood-8", 80])
  ]);
  assert.deepEqual(result.result.groups.map((group) => group.sourcePartIds), [
    ["mdf-part"],
    ["plywood-part"]
  ]);
  assert.equal(result.result.groups[0].cutPlan.totalPieceCount, 2);
  assert.deepEqual(result.result.groups[0].cutPlan.edgeTrimMm, {
    left: 10, right: 10, top: 5, bottom: 5
  });
  assert.deepEqual(result.result.groups[0].cutPlan.sheets.map((sheet) => sheet.index), [1]);
  assert.deepEqual(result.result.groups[1].cutPlan.sheets.map((sheet) => sheet.index), [1]);

  const parsed = parseProjectSheetCutPlanJson(result.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.result, result.result);
});

test("layout raporu giriş sırası değişse de çıktı grupları batch kaynak sırasını izler", () => {
  const batchReport = makeBatchReport();
  const layouts = makeLayouts(batchReport);
  const forward = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport,
    layoutReports: layouts
  });
  const reverse = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport,
    layoutReports: layouts.slice().reverse()
  });

  assert.equal(forward.status, "ready");
  assert.equal(reverse.status, "ready");
  assert.deepEqual(
    reverse.result.groups.map((group) => group.groupId),
    forward.result.groups.map((group) => group.groupId)
  );
});

test("bir upstream batch grubu blocked ise layout beklemeden proje sonucu atomik olarak blocked olur", () => {
  const batchReport = makeBatchReport({ missingPlywood: true });
  assert.equal(batchReport.status, "blocked");
  const result = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport,
    layoutReports: []
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.result, null);
  assert.equal(result.json, null);
  assert.match(result.diagnostics.join(" "), /plywood-8/);
});

test("eksik, yinelenen veya bilinmeyen grup layout raporu kısmi plan üretmez", () => {
  const batchReport = makeBatchReport();
  const layouts = makeLayouts(batchReport);

  assertBlocked({
    schemaVersion: 1,
    batchReport,
    layoutReports: layouts.slice(0, 1)
  }, /tam bir layout raporu/);

  assertBlocked({
    schemaVersion: 1,
    batchReport,
    layoutReports: [layouts[0], layouts[0]]
  }, /yinelenen layout raporu/);

  assertBlocked({
    schemaVersion: 1,
    batchReport,
    layoutReports: [
      ...layouts.slice(0, 1),
      { ...layouts[1], groupId: "unknown-group" }
    ]
  }, /karşılığı olmayan nesting batch/);
});

test("tek bir blocked layout tüm proje kesim planını blocked ve sonuçsuz yapar", () => {
  const batchReport = makeBatchReport();
  const layouts = makeLayouts(batchReport);
  const blockedLayouts = layouts.map((item, index) => index === 1
    ? {
        groupId: item.groupId,
        layoutReport: {
          schemaVersion: 1,
          status: "blocked",
          result: null,
          diagnostics: ["Kullanıcı levha ölçüsü geçersiz."]
        }
      }
    : item
  );

  assertBlocked({
    schemaVersion: 1,
    batchReport,
    layoutReports: blockedLayouts
  }, /Kullanıcı levha ölçüsü geçersiz/);
});

test("başka malzeme grubuna ait layout raporu groupId doğru görünse bile reddedilir", () => {
  const batchReport = makeBatchReport();
  const layouts = makeLayouts(batchReport);
  const swapped = [
    { groupId: layouts[0].groupId, layoutReport: layouts[1].layoutReport },
    { groupId: layouts[1].groupId, layoutReport: layouts[0].layoutReport }
  ];

  assertBlocked({
    schemaVersion: 1,
    batchReport,
    layoutReports: swapped
  }, /levhası materialId|batch ile eşleşmiyor/);
});

test("batch grup kimliği, kaynak Part kapsamı, sıra ve adet listesi uyuşmazlıkları reddedilir", () => {
  const batchReport = makeBatchReport();
  const duplicatePart = structuredClone(batchReport);
  duplicatePart.result.batches[1].sourcePartIds = ["mdf-part"];
  assertBlocked({
    schemaVersion: 1,
    batchReport: duplicatePart,
    layoutReports: makeLayouts(batchReport)
  }, /nesting batch parça sırasıyla eşleşmiyor|birden fazla nesting batch/);

  const duplicateGroup = structuredClone(batchReport);
  duplicateGroup.result.batches[1].materialId = "mdf-18";
  duplicateGroup.result.batches[1].thicknessMm = 18;
  assertBlocked({
    schemaVersion: 1,
    batchReport: duplicateGroup,
    layoutReports: makeLayouts(batchReport)
  }, /grubu birden fazla/);

  const duplicateSource = structuredClone(batchReport);
  duplicateSource.sourcePartIds = ["mdf-part", "mdf-part"];
  assertBlocked({
    schemaVersion: 1,
    batchReport: duplicateSource,
    layoutReports: makeLayouts(batchReport)
  }, /yinelenen kimlik/);
});

test("ready batch raporunda boş olmayan tanı, unknown field veya seçili/hariç ID çakışması reddedilir", () => {
  const batchReport = makeBatchReport();
  assertBlocked({
    schemaVersion: 1,
    batchReport: { ...batchReport, diagnostics: ["Beklenmeyen tanı."] },
    layoutReports: makeLayouts(batchReport)
  }, /tanı içermemelidir/);

  assertBlocked({
    schemaVersion: 1,
    batchReport: { ...batchReport, extra: true },
    layoutReports: makeLayouts(batchReport)
  }, /desteklenmeyen alan/);

  assertBlocked({
    schemaVersion: 1,
    batchReport: {
      ...batchReport,
      excludedPartIds: ["mdf-part"]
    },
    layoutReports: makeLayouts(batchReport)
  }, /listeleri çakışıyor/);
});
