import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { createProjectSheetCutPlan } from "./projectSheetCutPlan.ts";
import { parseProjectSheetCutPlanJson } from "./projectSheetCutPlanFile.ts";
import { calculateSheetNestingLayout } from "./sheetNestingLayout.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];

function createEdgeBandingByGroup() {
  return Object.fromEntries(BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }]));
}

function createWardrobeRequest() {
  return {
    schemaVersion: 1,
    family: "wardrobe",
    furniture: {
      id: "wardrobe-1",
      widthMm: 1800,
      heightMm: 2200,
      depthMm: 600,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: createEdgeBandingByGroup()
    },
    materials,
    verticalDividers: [{
      id: "center",
      offsetFromInnerLeftMm: 500,
      thicknessMm: 18,
      materialId: "mdf-18",
      edgeBanding: { ...noBanding, left: true, right: true },
      grainDirection: "length"
    }],
    shelves: [{
      id: "lower",
      leftOffsetMm: 0,
      rightOffsetMm: 500,
      heightFromInnerBottomMm: 500,
      frontOffsetMm: 0,
      depthMm: 582,
      thicknessMm: 18,
      materialId: "mdf-18",
      edgeBanding: { ...noBanding, top: true },
      grainDirection: "length"
    }]
  };
}

function createTvUnitRequest() {
  return {
    schemaVersion: 1,
    family: "tv-unit",
    mounting: "floor-standing",
    furniture: {
      id: "tv-1",
      widthMm: 1800,
      heightMm: 420,
      depthMm: 450,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: createEdgeBandingByGroup()
    },
    materials,
    verticalDividers: [{
      id: "center",
      leftOffsetMm: 500,
      bottomOffsetMm: 0,
      heightMm: 384,
      frontOffsetMm: 0,
      depthMm: 432,
      thicknessMm: 18,
      materialId: "mdf-18",
      edgeBanding: { ...noBanding, left: true, right: true },
      grainDirection: "length"
    }],
    shelves: [{
      id: "middle",
      leftOffsetMm: 0,
      rightOffsetMm: 500,
      heightFromInnerBottomMm: 100,
      frontOffsetMm: 0,
      depthMm: 420,
      thicknessMm: 8,
      materialId: "mdf-8",
      edgeBanding: { ...noBanding, top: true, left: true },
      grainDirection: "length"
    }]
  };
}

function snapshotPart(snapshot, id) {
  const entry = snapshot.parts.find((part) => part.id === id);
  assert.ok(entry, id + " proje Part snapshot'ında bulunmalıdır.");
  return JSON.parse(entry.snapshot);
}

test("gardırop ve TV özel raf/bölücü alanları tam proje Part snapshot JSON v2 round-trip boyunca korunur", () => {
  const productionReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [createWardrobeRequest(), createTvUnitRequest()]
  });

  assert.equal(productionReport.status, "ready", productionReport.firstError ?? "Proje üretimi hazır olmalı.");
  assert.equal(productionReport.canExport, true);
  assert.ok(productionReport.result);
  const productionParts = productionReport.result.parts;

  const selectedPartIds = ["wardrobe-1-shelf-lower", "tv-1-shelf-middle"];
  const batches = createProjectSheetNestingBatches({
    schemaVersion: 1,
    productionReport,
    partIds: selectedPartIds,
    stockSheets: [
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
          materialId: "mdf-8",
          widthMm: 1200,
          lengthMm: 1000,
          thicknessMm: 8,
          grainDirection: "length"
        },
        kerfMm: 3
      }
    ]
  });

  assert.equal(batches.status, "ready", batches.diagnostics.join(" "));
  assert.ok(batches.result);
  assert.ok(batches.projectPartSnapshot);
  assert.deepEqual(batches.sourcePartIds, selectedPartIds);
  assert.ok(batches.excludedPartIds.includes("wardrobe-1-vertical-divider-center"));
  assert.ok(batches.excludedPartIds.includes("tv-1-vertical-divider-center"));

  const layoutReports = batches.result.batches.map((group) => ({
    groupId: JSON.stringify([group.materialId, Math.round(group.thicknessMm * 10)]),
    layoutReport: calculateSheetNestingLayout(group.batch)
  }));
  const cutPlan = createProjectSheetCutPlan({
    schemaVersion: 1,
    batchReport: batches,
    layoutReports
  });

  assert.equal(cutPlan.status, "ready", cutPlan.diagnostics.join(" "));
  assert.ok(cutPlan.json);
  const parsed = parseProjectSheetCutPlanJson(cutPlan.json);
  assert.equal(parsed.status, "ready", parsed.diagnostics.join(" "));
  assert.ok(parsed.result?.projectPartSnapshot);
  assert.deepEqual(parsed.result.projectPartSnapshot, batches.projectPartSnapshot);
  assert.deepEqual(parsed.result.sourcePartIds, selectedPartIds);
  assert.equal(parsed.result.projectPartSnapshot.parts.length, productionParts.length);

  const snapshot = parsed.result.projectPartSnapshot;
  const wardrobeDivider = snapshotPart(snapshot, "wardrobe-1-vertical-divider-center");
  assert.deepEqual({
    materialId: wardrobeDivider.materialId,
    thickness: wardrobeDivider.thickness,
    quantity: wardrobeDivider.quantity,
    width: wardrobeDivider.width,
    length: wardrobeDivider.length,
    offsetFromInnerLeftMm: wardrobeDivider.offsetFromInnerLeftMm,
    grainDirection: wardrobeDivider.grainDirection,
    edgeBanding: wardrobeDivider.edgeBanding
  }, {
    materialId: "mdf-18",
    thickness: 18,
    quantity: 1,
    width: 582,
    length: 2164,
    offsetFromInnerLeftMm: 500,
    grainDirection: "length",
    edgeBanding: { top: false, bottom: false, left: true, right: true }
  });

  const wardrobeShelf = snapshotPart(snapshot, "wardrobe-1-shelf-lower");
  assert.deepEqual({
    materialId: wardrobeShelf.materialId,
    thickness: wardrobeShelf.thickness,
    quantity: wardrobeShelf.quantity,
    width: wardrobeShelf.width,
    length: wardrobeShelf.length,
    leftOffsetMm: wardrobeShelf.leftOffsetMm,
    rightOffsetMm: wardrobeShelf.rightOffsetMm,
    heightFromInnerBottomMm: wardrobeShelf.heightFromInnerBottomMm,
    frontOffsetMm: wardrobeShelf.frontOffsetMm,
    grainDirection: wardrobeShelf.grainDirection,
    edgeBanding: wardrobeShelf.edgeBanding
  }, {
    materialId: "mdf-18",
    thickness: 18,
    quantity: 1,
    width: 582,
    length: 500,
    leftOffsetMm: 0,
    rightOffsetMm: 500,
    heightFromInnerBottomMm: 500,
    frontOffsetMm: 0,
    grainDirection: "length",
    edgeBanding: { top: true, bottom: false, left: false, right: false }
  });

  const tvDivider = snapshotPart(snapshot, "tv-1-vertical-divider-center");
  assert.deepEqual({
    materialId: tvDivider.materialId,
    thickness: tvDivider.thickness,
    quantity: tvDivider.quantity,
    width: tvDivider.width,
    length: tvDivider.length,
    leftOffsetMm: tvDivider.leftOffsetMm,
    bottomOffsetMm: tvDivider.bottomOffsetMm,
    heightMm: tvDivider.heightMm,
    frontOffsetMm: tvDivider.frontOffsetMm,
    depthMm: tvDivider.depthMm,
    grainDirection: tvDivider.grainDirection,
    edgeBanding: tvDivider.edgeBanding
  }, {
    materialId: "mdf-18",
    thickness: 18,
    quantity: 1,
    width: 432,
    length: 384,
    leftOffsetMm: 500,
    bottomOffsetMm: 0,
    heightMm: 384,
    frontOffsetMm: 0,
    depthMm: 432,
    grainDirection: "length",
    edgeBanding: { top: false, bottom: false, left: true, right: true }
  });

  const tvShelf = snapshotPart(snapshot, "tv-1-shelf-middle");
  assert.deepEqual({
    materialId: tvShelf.materialId,
    thickness: tvShelf.thickness,
    quantity: tvShelf.quantity,
    width: tvShelf.width,
    length: tvShelf.length,
    leftOffsetMm: tvShelf.leftOffsetMm,
    rightOffsetMm: tvShelf.rightOffsetMm,
    heightFromInnerBottomMm: tvShelf.heightFromInnerBottomMm,
    frontOffsetMm: tvShelf.frontOffsetMm,
    grainDirection: tvShelf.grainDirection,
    edgeBanding: tvShelf.edgeBanding
  }, {
    materialId: "mdf-8",
    thickness: 8,
    quantity: 1,
    width: 420,
    length: 500,
    leftOffsetMm: 0,
    rightOffsetMm: 500,
    heightFromInnerBottomMm: 100,
    frontOffsetMm: 0,
    grainDirection: "length",
    edgeBanding: { top: true, bottom: false, left: true, right: false }
  });
});
