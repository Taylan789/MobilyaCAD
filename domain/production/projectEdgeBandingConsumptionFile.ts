import type { ProjectEdgeBandingConsumptionSummary } from "./projectMaterialSummary.ts";

export const PROJECT_EDGE_BANDING_CONSUMPTION_FILE_TYPE = "mobilyacad-edge-banding-consumption-summary" as const;
export const PROJECT_EDGE_BANDING_CONSUMPTION_FILE_UNITS = Object.freeze({ totalLengthMm: "mm", totalQuantity: "group.unit" } as const);

export interface ProjectEdgeBandingConsumptionFile {
  fileType: typeof PROJECT_EDGE_BANDING_CONSUMPTION_FILE_TYPE;
  schemaVersion: 1;
  units: typeof PROJECT_EDGE_BANDING_CONSUMPTION_FILE_UNITS;
  groups: ProjectEdgeBandingConsumptionSummary[];
}
export interface ProjectEdgeBandingConsumptionFileSerializationResult { status: "ready" | "blocked"; json: string | null; diagnostics: readonly string[] }
export interface ProjectEdgeBandingConsumptionFileParseResult {
  status: "ready" | "blocked"; file: ProjectEdgeBandingConsumptionFile | null;
  groups: readonly ProjectEdgeBandingConsumptionSummary[] | null; diagnostics: readonly string[];
}

const envelopeKeys = new Set(["fileType", "schemaVersion", "units", "groups"]);
const unitKeys = new Set(["totalLengthMm", "totalQuantity"]);
const groupKeys = new Set(["edgeBandingId", "unit", "edge", "partLineCount", "totalQuantity", "totalLengthMm", "edgeCount", "partIds", "furnitureIds"]);
const edges = ["top", "bottom", "left", "right"] as const;
const bandIdPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const maxJsonLength = 5_000_000, maxGroups = 1_000, maxIds = 10_000;
type Edge = typeof edges[number];

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
}
function textValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value || value.length > 128) throw new Error(label + " geçersiz.");
  return value;
}
function finite(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) throw new Error(label + " geçersiz.");
  return value;
}
function integer(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error(label + " geçersiz.");
  return value;
}
function compareText(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function roundTenth(n: number): number { return Math.round((n + Number.EPSILON * 10) * 10) / 10; }
function roundFour(n: number): number { return Math.round((n + Number.EPSILON * 10) * 10_000) / 10_000; }
function compareGroups(a: ProjectEdgeBandingConsumptionSummary, b: ProjectEdgeBandingConsumptionSummary): number {
  return (a.edgeBandingId ?? "").localeCompare(b.edgeBandingId ?? "") || a.unit.localeCompare(b.unit) ||
    (a.edge === undefined ? -1 : edges.indexOf(a.edge)) - (b.edge === undefined ? -1 : edges.indexOf(b.edge));
}

function validateGroup(value: unknown, index: number, partSet: Set<string>, furnitureSet: Set<string>): ProjectEdgeBandingConsumptionSummary {
  const label = "Kenar bandı grubu " + (index + 1);
  if (!isRecord(value)) throw new Error(label + " nesne olmalıdır.");
  exactKeys(value, groupKeys, label);
  const id = value.edgeBandingId;
  if (id !== null && (typeof id !== "string" || id.trim() !== id || !bandIdPattern.test(id))) throw new Error(label + " katalog kimliği geçersiz.");
  if (value.unit !== "mm" && value.unit !== "m") throw new Error(label + " birimi yalnızca mm veya m olabilir.");
  const edge = value.edge;
  if (edge !== undefined && (typeof edge !== "string" || !edges.includes(edge as Edge))) throw new Error(label + " yönü geçersiz.");

  if (!Array.isArray(value.partIds) || value.partIds.length < 1 || value.partIds.length > maxIds) throw new Error(label + " Part listesi geçersiz.");
  const partIds: string[] = [], localParts = new Set<string>();
  for (const raw of value.partIds) {
    const partId = textValue(raw, label + " Part kimliği");
    if (localParts.has(partId)) throw new Error(label + " yinelenen Part kimliği içeriyor.");
    if (partIds.length && compareText(partIds[partIds.length - 1], partId) > 0) throw new Error(label + " Part kimlikleri sıralı olmalıdır.");
    localParts.add(partId); partIds.push(partId); partSet.add(partId);
    if (partSet.size > maxIds) throw new Error("Toplam Part kimliği 10.000 sınırını aşıyor.");
  }
  if (!Array.isArray(value.furnitureIds) || value.furnitureIds.length < 1 || value.furnitureIds.length > maxIds) throw new Error(label + " mobilya listesi geçersiz.");
  const furnitureIds: string[] = [], localFurniture = new Set<string>();
  for (const raw of value.furnitureIds) {
    const furnitureId = textValue(raw, label + " mobilya kimliği");
    if (localFurniture.has(furnitureId)) throw new Error(label + " yinelenen mobilya kimliği içeriyor.");
    if (furnitureIds.length && compareText(furnitureIds[furnitureIds.length - 1], furnitureId) > 0) throw new Error(label + " mobilya kimlikleri sıralı olmalıdır.");
    localFurniture.add(furnitureId); furnitureIds.push(furnitureId); furnitureSet.add(furnitureId);
    if (furnitureSet.size > maxIds) throw new Error("Toplam mobilya kimliği 10.000 sınırını aşıyor.");
  }
  const partLineCount = integer(value.partLineCount, label + " Part satır sayısı", 1);
  if (partLineCount !== partIds.length) throw new Error(label + " Part satır sayısı kimlik listesiyle uyuşmuyor.");
  const edgeCount = integer(value.edgeCount, label + " kenar adedi", partLineCount);
  const totalLengthMm = finite(value.totalLengthMm, label + " mm uzunluğu", 0.1);
  if (roundTenth(totalLengthMm) !== totalLengthMm) throw new Error(label + " mm uzunluğu 0,1 hassasiyetinde olmalıdır.");
  const totalQuantity = finite(value.totalQuantity, label + " miktarı", 0);
  const expected = value.unit === "mm" ? roundTenth(totalLengthMm) : roundFour(totalLengthMm / 1000);
  if (expected <= 0 || Math.abs(totalQuantity - expected) > 1e-9) throw new Error(label + " miktarı mm/m hesabıyla uyuşmuyor.");
  return { edgeBandingId: id as string | null, unit: value.unit, ...(edge === undefined ? {} : { edge: edge as Edge }), partLineCount, totalQuantity, totalLengthMm, edgeCount, partIds, furnitureIds };
}
function validateGroups(value: unknown): ProjectEdgeBandingConsumptionSummary[] {
  if (!Array.isArray(value) || value.length > maxGroups) throw new Error("Kenar bandı grupları liste olmalı ve 1.000 sınırını aşmamalıdır.");
  const keys = new Set<string>(), partSet = new Set<string>(), furnitureSet = new Set<string>(), groups: ProjectEdgeBandingConsumptionSummary[] = [];
  for (const [index, raw] of value.entries()) {
    const group = validateGroup(raw, index, partSet, furnitureSet);
    const key = JSON.stringify([group.edgeBandingId, group.unit, group.edge ?? null]);
    if (keys.has(key)) throw new Error("Yinelenen kenar bandı grup kimliği.");
    keys.add(key);
    if (groups.length && compareGroups(groups[groups.length - 1], group) > 0) throw new Error("Kenar bandı grupları kanonik sırada olmalıdır.");
    groups.push(group);
  }
  return groups;
}
function failSerialize(message: string): ProjectEdgeBandingConsumptionFileSerializationResult { return { status: "blocked", json: null, diagnostics: [message] }; }
function failParse(message: string): ProjectEdgeBandingConsumptionFileParseResult { return { status: "blocked", file: null, groups: null, diagnostics: [message] }; }

/** Measured directional consumption only; no roll, waste or price is inferred. */
export function serializeProjectEdgeBandingConsumptionFile(groups: readonly ProjectEdgeBandingConsumptionSummary[]): ProjectEdgeBandingConsumptionFileSerializationResult {
  try {
    const file: ProjectEdgeBandingConsumptionFile = { fileType: PROJECT_EDGE_BANDING_CONSUMPTION_FILE_TYPE, schemaVersion: 1, units: PROJECT_EDGE_BANDING_CONSUMPTION_FILE_UNITS, groups: validateGroups(groups) };
    const json = JSON.stringify(file);
    return json.length > maxJsonLength ? failSerialize("Kenar bandı JSON dosyası 5 MB sınırını aşıyor.") : { status: "ready", json, diagnostics: [] };
  } catch (error) { return failSerialize(error instanceof Error ? error.message : "Kenar bandı tüketimi doğrulanamadı."); }
}

/** Strict JSON v1 parser; unsupported or malformed input returns no partial groups. */
export function parseProjectEdgeBandingConsumptionFile(input: unknown): ProjectEdgeBandingConsumptionFileParseResult {
  if (typeof input !== "string") return failParse("JSON girdi metin olmalıdır.");
  if (input.length > maxJsonLength) return failParse("Kenar bandı JSON girdisi 5 MB sınırını aşıyor.");
  let value: unknown;
  try { value = JSON.parse(input); } catch { return failParse("Kenar bandı girdisi geçerli JSON değil."); }
  try {
    if (!isRecord(value)) throw new Error("Dosya nesne olmalıdır.");
    exactKeys(value, envelopeKeys, "Kenar bandı dosyası");
    if (value.fileType !== PROJECT_EDGE_BANDING_CONSUMPTION_FILE_TYPE) throw new Error("Dosya türü desteklenmiyor.");
    if (value.schemaVersion !== 1) throw new Error("JSON şema sürümü desteklenmiyor.");
    if (!isRecord(value.units)) throw new Error("Birimler nesne olmalıdır.");
    exactKeys(value.units, unitKeys, "Birimler");
    if (value.units.totalLengthMm !== "mm" || value.units.totalQuantity !== "group.unit") throw new Error("Birim sözleşmesi desteklenmiyor.");
    const groups = validateGroups(value.groups);
    const file: ProjectEdgeBandingConsumptionFile = { fileType: PROJECT_EDGE_BANDING_CONSUMPTION_FILE_TYPE, schemaVersion: 1, units: PROJECT_EDGE_BANDING_CONSUMPTION_FILE_UNITS, groups };
    return { status: "ready", file, groups: file.groups, diagnostics: [] };
  } catch (error) { return failParse(error instanceof Error ? error.message : "JSON doğrulanamadı."); }
}
