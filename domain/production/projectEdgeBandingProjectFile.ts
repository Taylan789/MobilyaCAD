export const PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD = "edgeBandingAssignments" as const;

export type ProjectEdgeBandingFileEdge = "top" | "bottom" | "left" | "right";
export type ProjectEdgeBandingFileUnit = "mm" | "m";

export interface ProjectEdgeBandingFileAssignment {
  partId: string;
  edgeBandingId: string;
  unit: ProjectEdgeBandingFileUnit;
  /** Available only in MobilyaCAD project JSON v2; absent means legacy whole-Part assignment. */
  edge?: ProjectEdgeBandingFileEdge;
}

export interface ProjectEdgeBandingProjectFileReadResult {
  status: "legacy" | "empty" | "ready" | "blocked";
  projectVersion: 1 | 2 | null;
  assignments: readonly ProjectEdgeBandingFileAssignment[] | null;
  diagnostics: readonly string[];
}

export interface ProjectEdgeBandingProjectFileUpdateResult {
  status: "ready" | "empty" | "blocked";
  project: Readonly<Record<string, unknown>> | null;
  assignments: readonly ProjectEdgeBandingFileAssignment[] | null;
  diagnostics: readonly string[];
}

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;
const partIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const edgeBandingIdPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const projectIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const assignmentKeysV1 = new Set(["partId", "edgeBandingId", "unit"]);
const assignmentKeysV2 = new Set(["partId", "edge", "edgeBandingId", "unit"]);
const MAX_ASSIGNMENTS = 10000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function freezeAssignments(value: ProjectEdgeBandingFileAssignment[]): readonly ProjectEdgeBandingFileAssignment[] {
  return Object.freeze(value.map((item) => Object.freeze({ ...item })));
}

function blockedRead(message: string): ProjectEdgeBandingProjectFileReadResult {
  return Object.freeze({
    status: "blocked" as const,
    projectVersion: null,
    assignments: null,
    diagnostics: Object.freeze([message])
  });
}

function blockedUpdate(message: string): ProjectEdgeBandingProjectFileUpdateResult {
  return Object.freeze({
    status: "blocked" as const,
    project: null,
    assignments: null,
    diagnostics: Object.freeze([message])
  });
}

function inspectProjectEnvelope(value: unknown):
  | { version: 1 | 2; project: Record<string, unknown> }
  | { error: string } {
  if (!isRecord(value)) return { error: "MobilyaCAD proje dosyası geçerli bir nesne olmalıdır." };
  if (value.format !== "MobilyaCAD") return { error: "Dosya MobilyaCAD proje formatıyla uyumlu değil." };
  if (value.formatVersion !== 1 && value.formatVersion !== 2) {
    return { error: "Kenar bandı uzantısı yalnızca MobilyaCAD proje JSON v1 veya v2 zarfını destekler." };
  }
  if (value.formatVersion === 2) {
    const projectId = value.projectId;
    if (
      typeof projectId !== "string" ||
      projectId.trim() === "" ||
      projectId.trim() !== projectId ||
      !projectIdPattern.test(projectId)
    ) {
      return { error: "Proje JSON v2, kenar bandı uzantısı için kararlı ve geçerli projectId içermelidir." };
    }
  }
  return { version: value.formatVersion, project: value };
}

function validateAssignments(
  value: unknown,
  version: 1 | 2
): { assignments: readonly ProjectEdgeBandingFileAssignment[] | null; diagnostics: readonly string[] } {
  if (!Array.isArray(value)) {
    return { assignments: null, diagnostics: Object.freeze(["Kenar bandı atamaları bir liste olmalıdır."]) };
  }
  if (value.length > MAX_ASSIGNMENTS) {
    return { assignments: null, diagnostics: Object.freeze(["Kenar bandı atama listesi 10000 kayıt sınırını aşamaz."]) };
  }

  const seen = new Set<string>();
  const assignments: ProjectEdgeBandingFileAssignment[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index];
    if (!isRecord(entry)) {
      return { assignments: null, diagnostics: Object.freeze(["Kenar bandı atamasının " + (index + 1) + ". kaydı geçerli bir nesne olmalıdır."]) };
    }
    const allowed = version === 1 ? assignmentKeysV1 : assignmentKeysV2;
    const unknownKey = Object.keys(entry).find((key) => !allowed.has(key));
    if (unknownKey !== undefined) {
      return { assignments: null, diagnostics: Object.freeze(["Kenar bandı atamasında desteklenmeyen alan: " + unknownKey + "."]) };
    }
    const partId = entry.partId;
    if (typeof partId !== "string" || partId.trim() === "" || partId.trim() !== partId || !partIdPattern.test(partId)) {
      return { assignments: null, diagnostics: Object.freeze(["Kenar bandı atamasının parça kimliği geçersiz."]) };
    }
    const edgeBandingId = entry.edgeBandingId;
    if (
      typeof edgeBandingId !== "string" ||
      edgeBandingId.trim() === "" ||
      edgeBandingId.trim() !== edgeBandingId ||
      !edgeBandingIdPattern.test(edgeBandingId)
    ) {
      return { assignments: null, diagnostics: Object.freeze([partId + " kenar bandı katalog kimliği geçersiz."]) };
    }
    if (entry.unit !== "mm" && entry.unit !== "m") {
      return { assignments: null, diagnostics: Object.freeze([partId + " kenar bandı birimi yalnızca mm veya m olabilir."]) };
    }
    let edge: ProjectEdgeBandingFileEdge | undefined;
    if (version === 2 && entry.edge !== undefined) {
      if (typeof entry.edge !== "string" || !(EDGE_KEYS as readonly string[]).includes(entry.edge)) {
        return { assignments: null, diagnostics: Object.freeze([partId + " kenar bandı yönü top, bottom, left veya right olmalıdır."]) };
      }
      edge = entry.edge as ProjectEdgeBandingFileEdge;
    }
    const key = JSON.stringify([partId, edge ?? null]);
    if (seen.has(key)) {
      return {
        assignments: null,
        diagnostics: Object.freeze([partId + (edge ? " " + edge : "") + " için yinelenen kenar bandı ataması."])
      };
    }
    seen.add(key);
    assignments.push({ partId, edgeBandingId, unit: entry.unit, ...(edge === undefined ? {} : { edge }) });
  }
  return { assignments: freezeAssignments(assignments), diagnostics: Object.freeze([]) };
}

function resultStatus(assignments: readonly ProjectEdgeBandingFileAssignment[]): "empty" | "ready" {
  return assignments.length === 0 ? "empty" : "ready";
}

/**
 * Reads the edge-band extension from a project envelope without changing unrelated fields.
 * JSON v1 accepts whole-Part assignments only; JSON v2 also accepts directional overrides.
 * Geometry/Part existence checks remain the production aggregator's responsibility.
 */
export function readProjectEdgeBandingAssignmentsFromProjectFile(
  projectValue: unknown
): ProjectEdgeBandingProjectFileReadResult {
  const envelope = inspectProjectEnvelope(projectValue);
  if ("error" in envelope) return blockedRead(envelope.error);
  const hasAssignments = Object.prototype.hasOwnProperty.call(
    envelope.project,
    PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD
  );
  if (!hasAssignments && envelope.version === 1) {
    return Object.freeze({
      status: "legacy" as const,
      projectVersion: 1,
      assignments: null,
      diagnostics: Object.freeze([])
    });
  }
  const rawAssignments = hasAssignments
    ? envelope.project[PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD]
    : [];
  const validated = validateAssignments(rawAssignments, envelope.version);
  if (validated.assignments === null) return blockedRead(validated.diagnostics[0] ?? "Kenar bandı atamaları doğrulanamadı.");
  return Object.freeze({
    status: resultStatus(validated.assignments),
    projectVersion: envelope.version,
    assignments: validated.assignments,
    diagnostics: Object.freeze([])
  });
}

/**
 * Updates only the edge-band extension on an existing project envelope.
 * JSON v1 rejects directional assignments; callers must explicitly migrate to v2.
 * The input project and nested source fields are never mutated.
 */
export function updateProjectEdgeBandingAssignmentsInProjectFile(
  projectValue: unknown,
  assignmentsValue: unknown
): ProjectEdgeBandingProjectFileUpdateResult {
  const envelope = inspectProjectEnvelope(projectValue);
  if ("error" in envelope) return blockedUpdate(envelope.error);
  const validated = validateAssignments(assignmentsValue, envelope.version);
  if (validated.assignments === null) {
    return blockedUpdate(validated.diagnostics[0] ?? "Kenar bandı atamaları doğrulanamadı.");
  }
  const project = Object.freeze({
    ...envelope.project,
    [PROJECT_EDGE_BANDING_ASSIGNMENTS_FIELD]: validated.assignments
  });
  return Object.freeze({
    status: resultStatus(validated.assignments),
    project,
    assignments: validated.assignments,
    diagnostics: Object.freeze([])
  });
}
