import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" }
];

function createRequest(id, edgeBandingOverrides = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  for (const [group, flags] of Object.entries(edgeBandingOverrides)) {
    edgeBandingByGroup[group] = { ...edgeBandingByGroup[group], ...flags };
  }
  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "Legacy MDF"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials
  };
}

function assertBlocked(report, pattern) {
  assert.equal(report.status, "blocked");
  assert.equal(report.canExport, false);
  assert.equal(report.result, null, "blocked project must not expose partial production Parts");
  assert.ok(report.blockedFurniture.some((item) => item.code === "invalid-edge-banding"));
  if (pattern) {
    assert.match(report.blockedFurniture.map((item) => item.message).join(" "), pattern);
  }
}

test("explicit edge-band assignment preserves Part mapping and blocks unsupported JSON/CSV export", () => {
  const request = createRequest("cab-edge-valid", {
    leftSide: { top: true, right: true },
    top: { left: true }
  });
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [request],
    edgeBandingAssignments: [{
      partId: "cab-edge-valid-left-side",
      edgeBandingId: "pvc-white-1",
      unit: "m"
    }]
  });

  assert.equal(report.status, "ready");
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some((message) => /edgeBandingMaterialId.*edgeBandingUnit/.test(message)));
  assert.ok(report.result);
  const assigned = report.result.parts.find((part) => part.id === "cab-edge-valid-left-side");
  const unassigned = report.result.parts.find((part) => part.id === "cab-edge-valid-top");
  assert.ok(assigned);
  assert.deepEqual(assigned.edgeBanding, { top: true, bottom: false, left: false, right: true });
  assert.equal(assigned.edgeBandingMaterialId, "pvc-white-1");
  assert.equal(assigned.edgeBandingUnit, "m");
  assert.ok(unassigned);
  assert.equal("edgeBandingMaterialId" in unassigned, false);
  assert.equal("edgeBandingUnit" in unassigned, false);
});

test("unknown Part assignment blocks the entire project even when a valid assignment is present", () => {
  const request = createRequest("cab-edge-unknown", {
    leftSide: { top: true },
    rightSide: { bottom: true }
  });
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [request],
    edgeBandingAssignments: [
      { partId: "cab-edge-unknown-left-side", edgeBandingId: "pvc-white-1", unit: "mm" },
      { partId: "missing-part", edgeBandingId: "pvc-white-2", unit: "m" }
    ]
  });

  assertBlocked(report, /proje üretim parçasında bulunamadı/);
});

test("duplicate assignment for one Part blocks without returning a partial result", () => {
  const request = createRequest("cab-edge-duplicate", { leftSide: { top: true } });
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [request],
    edgeBandingAssignments: [
      { partId: "cab-edge-duplicate-left-side", edgeBandingId: "pvc-white-1", unit: "mm" },
      { partId: "cab-edge-duplicate-left-side", edgeBandingId: "pvc-white-2", unit: "m" }
    ]
  });

  assertBlocked(report, /yinelenen kenar bandı ataması/);
});

test("assignment to a Part without any banded outer or opening edge is rejected", () => {
  const request = createRequest("cab-edge-none");
  const report = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [request],
    edgeBandingAssignments: [
      { partId: "cab-edge-none-left-side", edgeBandingId: "pvc-white-1", unit: "mm" }
    ]
  });

  assertBlocked(report, /kenar bandı atanabilecek bantlı kenar bulunmuyor/);
});

test("invalid edge-band ID, unit and extra assignment fields block the project", () => {
  const request = createRequest("cab-edge-invalid", { leftSide: { top: true } });
  const cases = [
    {
      assignment: { partId: "cab-edge-invalid-left-side", edgeBandingId: "PVC White", unit: "mm" },
      message: /katalog kimliği geçersiz/
    },
    {
      assignment: { partId: "cab-edge-invalid-left-side", edgeBandingId: "pvc-white-1", unit: "cm" },
      message: /birimi yalnızca mm veya m/
    },
    {
      assignment: { partId: "cab-edge-invalid-left-side", edgeBandingId: "pvc-white-1", unit: "mm", thicknessMm: 1 },
      message: /desteklenmeyen alan/
    }
  ];

  for (const item of cases) {
    const report = calculateCabinetProjectProductionWithDiagnostics({
      schemaVersion: 1,
      furniture: [request],
      edgeBandingAssignments: [item.assignment]
    });
    assertBlocked(report, item.message);
  }
});
