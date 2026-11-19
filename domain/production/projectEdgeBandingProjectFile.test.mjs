import assert from "node:assert/strict";
import test from "node:test";
import {
  PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD,
  readProjectEdgeBandingAssignmentsFromProjectFile,
  updateProjectEdgeBandingAssignmentsInProjectFile
} from "./projectEdgeBandingProjectFile.ts";

function createV1Project(overrides = {}) {
  return {
    format: "MobilyaCAD",
    formatVersion: 1,
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: [],
    ...overrides
  };
}

function createV2Project(overrides = {}) {
  return {
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: "project-42",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [],
    materials: [],
    ...overrides
  };
}

function assertBlocked(result, pattern) {
  assert.equal(result.status, "blocked");
  assert.equal(result.project, null);
  assert.equal(result.assignments, null);
  assert.ok(result.diagnostics.length > 0);
  if (pattern) assert.match(result.diagnostics.join(" "), pattern);
}

test("legacy v1 without the extension is read without mutation", () => {
  const project = createV1Project();
  const read = readProjectEdgeBandingAssignmentsFromProjectFile(project);
  assert.equal(read.status, "legacy");
  assert.equal(read.projectVersion, 1);
  assert.equal(read.assignments, null);
  assert.equal(PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD in project, false);
});

test("legacy v1 whole-Part assignments update and JSON round-trip without directional fields", () => {
  const project = createV1Project();
  const assignments = [
    { partId: "part-left", edgeBandingId: "pvc-default", unit: "m" },
    { partId: "part-top", edgeBandingId: "pvc-top", unit: "mm" }
  ];
  const updated = updateProjectEdgeBandingAssignmentsInProjectFile(project, assignments);
  assert.equal(updated.status, "ready");
  assert.ok(updated.project);
  assert.equal(PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD in project, false);
  assert.deepEqual(updated.project.room, project.room);
  const parsed = JSON.parse(JSON.stringify(updated.project));
  const read = readProjectEdgeBandingAssignmentsFromProjectFile(parsed);
  assert.equal(read.status, "ready");
  assert.deepEqual(read.assignments, assignments);
  assert.equal("edge" in read.assignments[0], false);
});

test("v1 directional assignment writes are blocked and original project remains untouched", () => {
  const project = createV1Project();
  assertBlocked(
    updateProjectEdgeBandingAssignmentsInProjectFile(project, [
      { partId: "part-left", edge: "top", edgeBandingId: "pvc-top", unit: "m" }
    ]),
    /desteklenmeyen alan: edge/
  );
  assert.equal(PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD in project, false);
});

test("v1 directional extension read blocks instead of silently discarding the edge", () => {
  const read = readProjectEdgeBandingAssignmentsFromProjectFile(createV1Project({
    edgeBandingAssignments: [{ partId: "part-left", edge: "top", edgeBandingId: "pvc-top", unit: "m" }]
  }));
  assert.equal(read.status, "blocked");
  assert.equal(read.assignments, null);
  assert.match(read.diagnostics[0], /desteklenmeyen alan: edge/);
});

test("v2 preserves whole-Part fallback and per-edge overrides through project JSON round-trip", () => {
  const project = createV2Project({ quoteRevisionHistory: { schemaVersion: 1, projectId: "project-42", revisions: [] } });
  const assignments = [
    { partId: "part-left", edgeBandingId: "pvc-default", unit: "mm" },
    { partId: "part-left", edge: "top", edgeBandingId: "pvc-top", unit: "m" },
    { partId: "part-left", edge: "right", edgeBandingId: "pvc-right", unit: "mm" },
    { partId: "part-top", edge: "left", edgeBandingId: "pvc-left", unit: "m" }
  ];
  const updated = updateProjectEdgeBandingAssignmentsInProjectFile(project, assignments);
  assert.equal(updated.status, "ready");
  assert.ok(updated.project);
  assert.equal(project.edgeBandingAssignments, undefined);
  assert.deepEqual(updated.project.quoteRevisionHistory, project.quoteRevisionHistory);
  const read = readProjectEdgeBandingAssignmentsFromProjectFile(JSON.parse(JSON.stringify(updated.project)));
  assert.equal(read.status, "ready");
  assert.equal(read.projectVersion, 2);
  assert.deepEqual(read.assignments, assignments);
});

test("v2 missing extension is empty and can be written as an empty list", () => {
  const project = createV2Project();
  const read = readProjectEdgeBandingAssignmentsFromProjectFile(project);
  assert.equal(read.status, "empty");
  assert.deepEqual(read.assignments, []);
  const updated = updateProjectEdgeBandingAssignmentsInProjectFile(project, []);
  assert.equal(updated.status, "empty");
  assert.ok(updated.project);
  assert.deepEqual(updated.project.edgeBandingAssignments, []);
  assert.equal(project.edgeBandingAssignments, undefined);
});

test("strict validation blocks duplicate keys, invalid IDs/units, unsupported edge and extra fields", () => {
  const project = createV2Project();
  const cases = [
    {
      assignments: [
        { partId: "part-left", edge: "top", edgeBandingId: "pvc-a", unit: "mm" },
        { partId: "part-left", edge: "top", edgeBandingId: "pvc-b", unit: "m" }
      ],
      message: /yinelenen kenar bandı ataması/
    },
    {
      assignments: [{ partId: " part-left", edgeBandingId: "pvc-a", unit: "mm" }],
      message: /parça kimliği geçersiz/
    },
    {
      assignments: [{ partId: "part-left", edgeBandingId: "PVC A", unit: "mm" }],
      message: /katalog kimliği geçersiz/
    },
    {
      assignments: [{ partId: "part-left", edgeBandingId: "pvc-a", unit: "cm" }],
      message: /birimi yalnızca mm veya m/
    },
    {
      assignments: [{ partId: "part-left", edge: "front", edgeBandingId: "pvc-a", unit: "mm" }],
      message: /yönü top, bottom, left veya right/
    },
    {
      assignments: [{ partId: "part-left", edge: "top", edgeBandingId: "pvc-a", unit: "mm", thicknessMm: 1 }],
      message: /desteklenmeyen alan: thicknessMm/
    }
  ];
  for (const item of cases) assertBlocked(updateProjectEdgeBandingAssignmentsInProjectFile(project, item.assignments), item.message);
  assert.equal(project.edgeBandingAssignments, undefined);
});

test("v2 requires stable projectId; unknown project versions and malformed JSON envelopes block", () => {
  assertBlocked(
    updateProjectEdgeBandingAssignmentsInProjectFile(createV2Project({ projectId: undefined }), []),
    /kararlı ve geçerli projectId/
  );
  assert.equal(
    readProjectEdgeBandingAssignmentsFromProjectFile(createV2Project({ formatVersion: 3 })).status,
    "blocked"
  );
  assert.equal(
    readProjectEdgeBandingAssignmentsFromProjectFile("{").status,
    "blocked"
  );
});
