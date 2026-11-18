import assert from "node:assert/strict";
import test from "node:test";
import { summarizeProjectSheetCutPlanProvenance } from "./projectSheetCutPlanProvenanceSummary.ts";
import { serializeProjectSheetCutPlanJson } from "./projectSheetCutPlanFile.ts";
import { createSheetCutPlan } from "./sheetCutPlan.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

function makeCutPlan({ id, materialId, thicknessMm }) {
  const batch = validateSheetNestingInput({
    schemaVersion: 1,
    sheet: {
      materialId,
      widthMm: 1000,
      lengthMm: 1000,
      thicknessMm,
      grainDirection: "none"
    },
    kerfMm: 3,
    parts: [{
      id,
      materialId,
      widthMm: 200,
      lengthMm: 300,
      thicknessMm,
      quantity: 1,
      grainDirection: "none",
      geometry: "rectangular"
    }]
  });
  assert.equal(batch.status, "ready");
  assert.ok(batch.result);
  const layout = calculateSheetNestingLayout(batch.result);
  const report = createSheetCutPlan({ schemaVersion: 1, batch: batch.result, layout });
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

function projectJson(formatVersion) {
  const first = makeCutPlan({ id: "part-mdf", materialId: "mdf-18", thicknessMm: 18 });
  const second = makeCutPlan({ id: "part-plywood", materialId: "plywood-8", thicknessMm: 8 });
  const groups = [
    group(first, formatVersion === 3 ? {
      stockSheetSource: {
        sourceId: "atelier-stock:mdf-18",
        revision: "revision-2026-11-18-a"
      }
    } : {}),
    group(second)
  ];
  const result = {
    schemaVersion: 1,
    sourcePartIds: ["part-mdf", "part-plywood"],
    groups,
    ...(formatVersion === 1 ? {} : {
      projectPartSnapshot: {
        schemaVersion: 1,
        parts: [
          { id: "part-mdf", snapshot: '{"id":"part-mdf","materialId":"mdf-18"}' },
          { id: "part-plywood", snapshot: '{"id":"part-plywood","materialId":"plywood-8"}' },
          { id: "excluded-part", snapshot: '{"id":"excluded-part","materialId":"oak"}' }
        ]
      }
    })
  };
  const serialized = serializeProjectSheetCutPlanJson({
    schemaVersion: 1,
    status: "ready",
    result,
    diagnostics: []
  });
  assert.equal(serialized.status, "ready");
  assert.ok(serialized.json);
  assert.equal(JSON.parse(serialized.json).formatVersion, formatVersion);
  return serialized.json;
}

test("JSON v3 provenance kapsamı grup sırasını, kullanıcı değerlerini ve eksik grupları doğru özetler", () => {
  const summary = summarizeProjectSheetCutPlanProvenance(projectJson(3));

  assert.equal(summary.status, "ready");
  assert.equal(summary.totalGroupCount, 2);
  assert.equal(summary.groupsWithProvenance, 1);
  assert.equal(summary.groupsMissingProvenance, 1);
  assert.deepEqual(summary.groups.map((item) => item.provenanceStatus), ["provided", "missing"]);
  assert.deepEqual(summary.groups[0].stockSheetSource, {
    sourceId: "atelier-stock:mdf-18",
    revision: "revision-2026-11-18-a"
  });
  assert.equal(summary.groups[1].stockSheetSource, null);
  assert.deepEqual(summary.groups.map((item) => item.sourcePartIds), [["part-mdf"], ["part-plywood"]]);
  assert.deepEqual(summary.diagnostics, []);
});

test("legacy JSON v1 ve snapshot taşıyan v2 planları eksik provenance olarak sayılır", () => {
  for (const formatVersion of [1, 2]) {
    const summary = summarizeProjectSheetCutPlanProvenance(projectJson(formatVersion));
    assert.equal(summary.status, "ready");
    assert.equal(summary.totalGroupCount, 2);
    assert.equal(summary.groupsWithProvenance, 0);
    assert.equal(summary.groupsMissingProvenance, 2);
    assert.deepEqual(summary.groups.map((item) => item.provenanceStatus), ["missing", "missing"]);
  }
});

test("boş proje empty durumunu ve sıfır kapsam sayılarını korur", () => {
  const serialized = serializeProjectSheetCutPlanJson({
    schemaVersion: 1,
    status: "empty",
    result: { schemaVersion: 1, sourcePartIds: [], groups: [] },
    diagnostics: []
  });
  assert.equal(serialized.status, "empty");
  assert.ok(serialized.json);

  assert.deepEqual(summarizeProjectSheetCutPlanProvenance(serialized.json), {
    schemaVersion: 1,
    status: "empty",
    totalGroupCount: 0,
    groupsWithProvenance: 0,
    groupsMissingProvenance: 0,
    groups: [],
    diagnostics: []
  });
});

test("bozuk JSON blocked döner ve kısmi provenance özeti üretmez", () => {
  const summary = summarizeProjectSheetCutPlanProvenance("{");
  assert.equal(summary.status, "blocked");
  assert.equal(summary.totalGroupCount, 0);
  assert.equal(summary.groupsWithProvenance, 0);
  assert.equal(summary.groupsMissingProvenance, 0);
  assert.deepEqual(summary.groups, []);
  assert.ok(summary.diagnostics.length > 0);
  assert.equal(summarizeProjectSheetCutPlanProvenance(null).status, "blocked");
});
