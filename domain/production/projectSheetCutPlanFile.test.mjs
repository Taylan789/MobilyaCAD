import assert from "node:assert/strict";
import test from "node:test";
import {
  parseProjectSheetCutPlanJson,
  serializeProjectSheetCutPlanJson
} from "./projectSheetCutPlanFile.ts";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

function makeCutPlan(options = {}) {
  const materialId = options.materialId ?? "mdf-18";
  const thicknessMm = options.thicknessMm ?? 18;
  const id = options.id ?? "part-1";
  const batchReport = validateSheetNestingInput({
    schemaVersion: 1,
    sheet: {
      materialId,
      widthMm: options.sheetWidthMm ?? 1000,
      lengthMm: options.sheetLengthMm ?? 1000,
      thicknessMm,
      grainDirection: "none"
    },
    kerfMm: options.kerfMm ?? 3,
    parts: [{
      id,
      materialId,
      widthMm: options.partWidthMm ?? 200,
      lengthMm: options.partLengthMm ?? 300,
      thicknessMm,
      quantity: options.quantity ?? 1,
      grainDirection: "none",
      geometry: "rectangular"
    }]
  });
  assert.equal(batchReport.status, "ready");
  assert.ok(batchReport.result);
  const layout = calculateSheetNestingLayout({
    ...batchReport.result,
    ...(options.edgeTrimMm === undefined ? {} : { edgeTrimMm: options.edgeTrimMm })
  });
  const report = createSheetCutPlan({ schemaVersion: 1, batch: batchReport.result, layout });
  assert.equal(report.status, "ready");
  assert.ok(report.result);
  return report.result;
}

function group(cutPlan, overrides = {}) {
  const materialId = cutPlan.stockSheet.materialId;
  const thicknessMm = cutPlan.stockSheet.thicknessMm;
  return {
    groupId: JSON.stringify([materialId, Math.round(thicknessMm * 10)]),
    materialId,
    thicknessMm,
    sourcePartIds: cutPlan.sourceParts.map((part) => part.id),
    cutPlan,
    ...overrides
  };
}

function report(result, overrides = {}) {
  return { schemaVersion: 1, status: "ready", result, diagnostics: [], ...overrides };
}

function assertBlocked(value, pattern) {
  const result = serializeProjectSheetCutPlanJson(value);
  assert.equal(result.status, "blocked");
  assert.equal(result.json, null);
  assert.ok(result.diagnostics.length > 0);
  if (pattern) assert.match(result.diagnostics.join(" "), pattern);
  return result;
}

test("çoklu grup JSON round-trip grup kimliğini, kaynak sırasını, yerel levha indekslerini, trim ve kerf'i korur", () => {
  const mdf = makeCutPlan({
    id: "part-mdf",
    materialId: "mdf-18",
    thicknessMm: 18,
    quantity: 2,
    partWidthMm: 600,
    partLengthMm: 600,
    kerfMm: 3.2,
    edgeTrimMm: { left: 10, right: 10, top: 5, bottom: 5 }
  });
  const plywood = makeCutPlan({
    id: "part-plywood",
    materialId: "plywood-8",
    thicknessMm: 8,
    quantity: 1,
    partWidthMm: 100,
    partLengthMm: 200,
    kerfMm: 2.4
  });
  const result = {
    schemaVersion: 1,
    sourcePartIds: ["part-mdf", "part-plywood"],
    groups: [group(mdf), group(plywood)]
  };

  const serialized = serializeProjectSheetCutPlanJson(report(result));
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  const parsed = parseProjectSheetCutPlanJson(serialized.json);

  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.result, result);
  assert.deepEqual(parsed.result?.groups.map((item) => item.groupId), [
    JSON.stringify(["mdf-18", 180]),
    JSON.stringify(["plywood-8", 80])
  ]);
  assert.deepEqual(parsed.result?.groups.map((item) => item.sourcePartIds), [
    ["part-mdf"],
    ["part-plywood"]
  ]);
  assert.deepEqual(parsed.result?.groups[0]?.cutPlan.sheets.map((sheet) => sheet.index), [1, 2]);
  assert.deepEqual(parsed.result?.groups[1]?.cutPlan.sheets.map((sheet) => sheet.index), [1]);
  assert.deepEqual(parsed.result?.groups[0]?.cutPlan.edgeTrimMm, {
    left: 10, right: 10, top: 5, bottom: 5
  });
  assert.equal(parsed.result?.groups[0]?.cutPlan.kerfMm, 3.2);
  assert.equal(parsed.result?.groups[1]?.cutPlan.kerfMm, 2.4);
});

test("boş proje yalnızca boş Part ve grup listeleriyle empty olarak round-trip olur", () => {
  const serialized = serializeProjectSheetCutPlanJson(report({
    schemaVersion: 1,
    sourcePartIds: [],
    groups: []
  }, { status: "empty" }));

  assert.equal(serialized.status, "empty");
  assert.ok(serialized.json);
  const parsed = parseProjectSheetCutPlanJson(serialized.json);
  assert.equal(parsed.status, "empty");
  assert.deepEqual(parsed.result, { schemaVersion: 1, sourcePartIds: [], groups: [] });
});

test("JSON parser bozuk metin, farklı format/sürüm ve bilinmeyen zarf alanlarını reddeder", () => {
  assert.equal(parseProjectSheetCutPlanJson("{").status, "blocked");
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify({
    format: "MobilyaCADSheetCutPlan",
    formatVersion: 1,
    result: { schemaVersion: 1, sourcePartIds: [], groups: [] }
  })).status, "blocked");
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify({
    format: "MobilyaCADProjectSheetCutPlan",
    formatVersion: 2,
    result: { schemaVersion: 1, sourcePartIds: [], groups: [] }
  })).status, "blocked");
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify({
    format: "MobilyaCADProjectSheetCutPlan",
    formatVersion: 1,
    result: { schemaVersion: 1, sourcePartIds: [], groups: [] },
    extra: true
  })).status, "blocked");
});

test("eksik/çift grup, yinelenen Part ID ve kaynak kapsamı dışı kimlik kısmi JSON üretmeden blocked olur", () => {
  const first = makeCutPlan({ id: "part-a", materialId: "mdf-18" });
  const second = makeCutPlan({ id: "part-b", materialId: "plywood-18" });
  const valid = {
    schemaVersion: 1,
    sourcePartIds: ["part-a", "part-b"],
    groups: [group(first), group(second)]
  };

  assertBlocked(report({ ...valid, groups: [group(first)] }), /karşılığı bulunmayan seçili Part ID/);
  assertBlocked(report({ ...valid, sourcePartIds: ["part-a", "part-a"] }), /yinelenen kimlik/);
  assertBlocked(report({
    ...valid,
    groups: [group(first), group(second, { sourcePartIds: ["part-a"] })]
  }), /birden fazla malzeme\/kalınlık grubunda/);
  assertBlocked(report({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [group(first, { sourcePartIds: ["missing-part"] })]
  }), /seçili proje listesinde bulunmayan Part ID/);
});

test("normalize malzeme/kalınlık grup kimliği zorunludur ve aynı grup iki kez verilemez", () => {
  const first = makeCutPlan({ id: "part-a", materialId: "mdf-18", thicknessMm: 18 });
  const second = makeCutPlan({ id: "part-b", materialId: "mdf-18", thicknessMm: 18 });

  assertBlocked(report({
    schemaVersion: 1,
    sourcePartIds: ["part-a", "part-b"],
    groups: [group(first), group(second)]
  }), /grubu birden fazla kez/);
  assertBlocked(report({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [group(first, { groupId: "wrong-group-key" })]
  }), /grup kimliği malzeme\/kalınlık anahtarıyla eşleşmiyor/);
});

test("nested plan geometri/şema bozulması veya kaynak Part eşleşmezliği reddedilir", () => {
  const plan = makeCutPlan({ id: "part-a", materialId: "mdf-18" });
  const invalidGeometry = structuredClone(plan);
  invalidGeometry.sheets[0].placements[0].xMm = -1;
  assertBlocked(report({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [group(invalidGeometry)]
  }), /Placement|sınır|pozitif/);

  const unknownField = structuredClone(plan);
  unknownField.untrusted = true;
  assertBlocked(report({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [group(unknownField)]
  }), /desteklenmeyen alan/);

  assertBlocked(report({
    schemaVersion: 1,
    sourcePartIds: ["part-a", "different-part"],
    groups: [group(plan, { sourcePartIds: ["different-part"] })]
  }), /kaynak Part ID listesi/);
});

test("parser nested plan içindeki değiştirilmiş placement ve grup kimliğini yeniden doğrular", () => {
  const plan = makeCutPlan({ id: "part-a", materialId: "mdf-18" });
  const serialized = serializeProjectSheetCutPlanJson(report({
    schemaVersion: 1,
    sourcePartIds: ["part-a"],
    groups: [group(plan)]
  }));
  assert.ok(serialized.json);

  const tampered = JSON.parse(serialized.json);
  tampered.result.groups[0].cutPlan.sheets[0].placements[0].xMm = -1;
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify(tampered)).status, "blocked");

  const wrongGroup = JSON.parse(serialized.json);
  wrongGroup.result.groups[0].groupId = "not-the-material-thickness-key";
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify(wrongGroup)).status, "blocked");
});

test("JSON v2 tam proje Part snapshot'ını round-trip korur ve eksik snapshot'ı reddeder", () => {
  const first = makeCutPlan({ id: "part-mdf", materialId: "mdf-18" });
  const second = makeCutPlan({ id: "part-plywood", materialId: "plywood-8" });
  const projectPartSnapshot = {
    schemaVersion: 1,
    parts: [
      { id: "part-mdf", snapshot: '{"id":"part-mdf","width":200}' },
      { id: "part-plywood", snapshot: '{"id":"part-plywood","width":200}' },
      { id: "excluded-part", snapshot: '{"id":"excluded-part","width":400}' }
    ]
  };
  const serialized = serializeProjectSheetCutPlanJson(report({
    schemaVersion: 1,
    sourcePartIds: ["part-mdf", "part-plywood"],
    groups: [group(first), group(second)],
    projectPartSnapshot
  }));
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  const envelope = JSON.parse(serialized.json);
  assert.equal(envelope.formatVersion, 2);
  const parsed = parseProjectSheetCutPlanJson(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.result?.projectPartSnapshot, projectPartSnapshot);
  const missingSnapshot = structuredClone(envelope);
  delete missingSnapshot.result.projectPartSnapshot;
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify(missingSnapshot)).status, "blocked");
  const legacyWithV2Field = structuredClone(envelope);
  legacyWithV2Field.formatVersion = 1;
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify(legacyWithV2Field)).status, "blocked");
});

test("JSON v3 kullanıcı girdili levha kaynağı kimliği ve revizyonunu round-trip korur; v1/v2 biçimlerini ayırır", () => {
  const plan = makeCutPlan({ id: "part-mdf", materialId: "mdf-18" });
  const stockSheetSource = {
    sourceId: "stock-catalog:mdf-18:1200x1000",
    revision: "atelier-2026-11-18-r2"
  };
  const value = {
    schemaVersion: 1,
    sourcePartIds: ["part-mdf"],
    groups: [group(plan, { stockSheetSource })],
    projectPartSnapshot: {
      schemaVersion: 1,
      parts: [{ id: "part-mdf", snapshot: '{"id":"part-mdf","materialId":"mdf-18"}' }]
    }
  };
  const serialized = serializeProjectSheetCutPlanJson(report(value));
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  const envelope = JSON.parse(serialized.json);
  assert.equal(envelope.formatVersion, 3);
  const parsed = parseProjectSheetCutPlanJson(serialized.json);
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.result, value);
  assert.deepEqual(parsed.result?.groups[0]?.stockSheetSource, stockSheetSource);

  const versionTwoWithProvenance = structuredClone(envelope);
  versionTwoWithProvenance.formatVersion = 2;
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify(versionTwoWithProvenance)).status, "blocked");
  const versionThreeWithoutProvenance = structuredClone(envelope);
  delete versionThreeWithoutProvenance.result.groups[0].stockSheetSource;
  assert.equal(parseProjectSheetCutPlanJson(JSON.stringify(versionThreeWithoutProvenance)).status, "blocked");

  const missingSnapshot = structuredClone(value);
  delete missingSnapshot.projectPartSnapshot;
  assertBlocked(report(missingSnapshot), /tam proje Part snapshot/);
  const invalidSource = structuredClone(value);
  invalidSource.groups[0].stockSheetSource.sourceId = " ";
  assertBlocked(report(invalidSource), /levha kaynağı kimliği/);
  const unknownSourceField = structuredClone(value);
  unknownSourceField.groups[0].stockSheetSource.supplierName = "tahmin edilmemeli";
  assertBlocked(report(unknownSourceField), /desteklenmeyen alan/);
});

test("blocked rapor JSON üretmez ve serializer bilinmeyen rapor alanlarını reddeder", () => {
  const blockedReport = {
    schemaVersion: 1,
    status: "blocked",
    result: null,
    diagnostics: ["Operatör girdisi eksik."]
  };
  const serialized = serializeProjectSheetCutPlanJson(blockedReport);
  assert.equal(serialized.status, "blocked");
  assert.equal(serialized.json, null);
  assert.match(serialized.diagnostics.join(" "), /Operatör girdisi eksik/);

  assertBlocked(report({
    schemaVersion: 1,
    sourcePartIds: [],
    groups: []
  }, { extra: true }), /desteklenmeyen alan/);
});
