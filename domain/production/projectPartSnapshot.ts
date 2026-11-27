export interface ProjectPartSnapshotEntry {
  id: string;
  /** Canonical JSON for the complete production Part record. */
  snapshot: string;
}

export interface ProjectPartSnapshot {
  schemaVersion: 1;
  /** Every project Part in original production-report order, including excluded Parts. */
  parts: ProjectPartSnapshotEntry[];
}

export interface ProjectPartSnapshotComparison {
  changed: boolean;
  diagnostics: string[];
}

type RecordValue = Record<string, unknown>;

export const PROJECT_PART_SNAPSHOT_MAX_BYTES = 8 * 1024 * 1024;
export const PROJECT_PART_SNAPSHOT_MAX_DEPTH = 64;

const snapshotSizeLimitMessage = "Proje Part snapshot JSON 8 MiB UTF-8 boyut sınırını aşamaz.";
const snapshotDepthLimitMessage = "Proje Part snapshot en fazla 64 iç içe nesne/dizi seviyesi içerebilir.";
const snapshotEnvelopePrefix = '{"schemaVersion":1,"parts":[';
const snapshotEnvelopeSuffix = "]}";

interface JsonByteBudget {
  bytes: number;
}

function addSnapshotBytes(budget: JsonByteBudget, bytes: number): void {
  if (bytes > PROJECT_PART_SNAPSHOT_MAX_BYTES - budget.bytes) throw new Error(snapshotSizeLimitMessage);
  budget.bytes += bytes;
}

/** UTF-8 byte length of JSON.stringify(value), including its surrounding quotes. */
function jsonStringByteLength(value: string): number {
  if (value.length > PROJECT_PART_SNAPSHOT_MAX_BYTES) return PROJECT_PART_SNAPSHOT_MAX_BYTES + 1;
  let bytes = 2;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x22 || code === 0x5c) bytes += 2;
    else if (code <= 0x1f) bytes += code === 0x08 || code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d ? 2 : 6;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { bytes += 4; index += 1; }
      else bytes += 6;
    } else if (code >= 0xdc00 && code <= 0xdfff) bytes += 6;
    else if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else bytes += 3;
    if (bytes > PROJECT_PART_SNAPSHOT_MAX_BYTES) return PROJECT_PART_SNAPSHOT_MAX_BYTES + 1;
  }
  return bytes;
}

function createSnapshotEnvelopeBudget(): JsonByteBudget {
  return { bytes: snapshotEnvelopePrefix.length };
}

function addSnapshotEntryBytes(budget: JsonByteBudget, id: string, snapshot: string, index: number): void {
  if (index > 0) addSnapshotBytes(budget, 1);
  addSnapshotBytes(budget, 6); // {"id":
  addSnapshotBytes(budget, jsonStringByteLength(id));
  addSnapshotBytes(budget, 12); // ,"snapshot":
  addSnapshotBytes(budget, jsonStringByteLength(snapshot));
  addSnapshotBytes(budget, 1); // }
}

function finishSnapshotEnvelopeBudget(budget: JsonByteBudget): void {
  addSnapshotBytes(budget, snapshotEnvelopeSuffix.length);
}

function record(value: unknown, label: string): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " geçerli bir nesne olmalıdır.");
  }
  return value as RecordValue;
}

function closed(value: RecordValue, allowed: readonly string[], label: string): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== undefined) throw new Error(label + " için desteklenmeyen alan: " + extra + ".");
}

function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

/** Stable JSON with bounded depth and incremental byte accounting. */
function canonicalJson(value: unknown, label: string, budget: JsonByteBudget, ancestors = new Set<object>(), depth = 1): string {
  if (value === null) { addSnapshotBytes(budget, 4); return "null"; }
  if (typeof value === "string") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error(label + " JSON olarak serileştirilemiyor.");
    addSnapshotBytes(budget, jsonStringByteLength(value));
    return serialized;
  }
  if (typeof value === "boolean") {
    const serialized = value ? "true" : "false";
    addSnapshotBytes(budget, serialized.length);
    return serialized;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(label + " sonlu bir sayı taşımalıdır.");
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error(label + " JSON olarak serileştirilemiyor.");
    addSnapshotBytes(budget, serialized.length);
    return serialized;
  }
  if (Array.isArray(value)) {
    if (depth > PROJECT_PART_SNAPSHOT_MAX_DEPTH) throw new Error(snapshotDepthLimitMessage);
    if (ancestors.has(value)) throw new Error(label + " döngüsel veri içeriyor.");
    ancestors.add(value);
    addSnapshotBytes(budget, 2);
    const items: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) addSnapshotBytes(budget, 1);
      items.push(canonicalJson(value[index], label + "[" + index + "]", budget, ancestors, depth + 1));
    }
    ancestors.delete(value);
    return "[" + items.join(",") + "]";
  }
  if (typeof value === "object") {
    if (depth > PROJECT_PART_SNAPSHOT_MAX_DEPTH) throw new Error(snapshotDepthLimitMessage);
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error(label + " yalnızca düz JSON nesneleri içerebilir.");
    if (ancestors.has(value)) throw new Error(label + " döngüsel veri içeriyor.");
    ancestors.add(value);
    const source = value as RecordValue;
    const keys = Object.keys(source).filter((key) => source[key] !== undefined).sort();
    addSnapshotBytes(budget, 2);
    const fields: string[] = [];
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (index > 0) addSnapshotBytes(budget, 1);
      addSnapshotBytes(budget, jsonStringByteLength(key));
      addSnapshotBytes(budget, 1);
      fields.push(JSON.stringify(key) + ":" + canonicalJson(source[key], label + "." + key, budget, ancestors, depth + 1));
    }
    ancestors.delete(value);
    return "{" + fields.join(",") + "}";
  }
  throw new Error(label + " JSON tarafından korunamayan bir değer içeriyor.");
}

/** Captures all Part fields, not only the selected rectangular parts used by nesting. */
export function createProjectPartSnapshot(parts: readonly unknown[]): ProjectPartSnapshot {
  if (!Array.isArray(parts)) throw new Error("Proje Part snapshot kaynağı bir liste olmalıdır.");
  const seen = new Set<string>();
  const budget = createSnapshotEnvelopeBudget();
  const entries: ProjectPartSnapshotEntry[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = record(parts[index], "Proje Part snapshot kaydının " + (index + 1) + ". öğesi");
    const id = identifier(part.id, "Proje Part snapshot kimliği");
    if (seen.has(id)) throw new Error("Proje Part snapshot içinde yinelenen kimlik var: " + id + ".");
    seen.add(id);
    const snapshot = canonicalJson(part, id + " Part snapshot", { bytes: 0 });
    addSnapshotEntryBytes(budget, id, snapshot, index);
    entries.push({ id, snapshot });
  }
  finishSnapshotEnvelopeBudget(budget);
  return { schemaVersion: 1, parts: entries };
}

/** Validates the canonical, versioned Part snapshot stored in a project cut-plan file. */
export function validateProjectPartSnapshot(value: unknown): ProjectPartSnapshot {
  const source = record(value, "Proje Part snapshot");
  closed(source, ["schemaVersion", "parts"], "Proje Part snapshot");
  if (source.schemaVersion !== 1 || !Array.isArray(source.parts)) {
    throw new Error("Proje Part snapshot geçerli bir v1 kayıt listesi taşımalıdır.");
  }
  const seen = new Set<string>();
  const budget = createSnapshotEnvelopeBudget();
  const parts: ProjectPartSnapshotEntry[] = [];
  for (let index = 0; index < source.parts.length; index += 1) {
    const entry = record(source.parts[index], "Proje Part snapshot kaydının " + (index + 1) + ". öğesi");
    closed(entry, ["id", "snapshot"], "Proje Part snapshot kaydı");
    const id = identifier(entry.id, "Proje Part snapshot kimliği");
    if (seen.has(id)) throw new Error("Proje Part snapshot içinde yinelenen kimlik var: " + id + ".");
    seen.add(id);
    if (typeof entry.snapshot !== "string" || entry.snapshot.trim() === "") {
      throw new Error(id + " Part snapshot içeriği boş olmayan JSON metni olmalıdır.");
    }
    addSnapshotEntryBytes(budget, id, entry.snapshot, index);
    const parsed = record(JSON.parse(entry.snapshot) as unknown, id + " Part snapshot JSON");
    if (parsed.id !== id) throw new Error(id + " Part snapshot içindeki kimlikle eşleşmiyor.");
    if (canonicalJson(parsed, id + " Part snapshot", { bytes: 0 }) !== entry.snapshot) {
      throw new Error(id + " Part snapshot kanonik JSON biçiminde değil.");
    }
    parts.push({ id, snapshot: entry.snapshot });
  }
  finishSnapshotEnvelopeBudget(budget);
  return { schemaVersion: 1, parts };
}

/** Compares all Part IDs, project order, and every serialized production field. */
export function compareProjectPartSnapshots(expectedValue: unknown, actualValue: unknown): ProjectPartSnapshotComparison {
  const expected = validateProjectPartSnapshot(expectedValue);
  const actual = validateProjectPartSnapshot(actualValue);
  const expectedIds = expected.parts.map((part) => part.id);
  const actualIds = actual.parts.map((part) => part.id);
  const expectedSet = new Set(expectedIds);
  const actualSet = new Set(actualIds);
  const diagnostics: string[] = [];
  const added = actualIds.filter((id) => !expectedSet.has(id));
  const removed = expectedIds.filter((id) => !actualSet.has(id));
  if (added.length > 0) diagnostics.push("Proje üretim snapshot'ına yeni Part eklendi: " + added.join(", ") + ".");
  if (removed.length > 0) diagnostics.push("Proje üretim snapshot'ından Part silindi: " + removed.join(", ") + ".");
  if (expectedIds.length === actualIds.length && expectedIds.some((id, index) => id !== actualIds[index])) {
    diagnostics.push("Proje Part sırası değişmiş.");
  }
  const actualById = new Map(actual.parts.map((part) => [part.id, part.snapshot]));
  for (const expectedPart of expected.parts) {
    const actualSnapshot = actualById.get(expectedPart.id);
    if (actualSnapshot !== undefined && actualSnapshot !== expectedPart.snapshot) {
      diagnostics.push(expectedPart.id + " üretim Part snapshot'ı değişmiş.");
    }
  }
  return { changed: diagnostics.length > 0, diagnostics };
}
