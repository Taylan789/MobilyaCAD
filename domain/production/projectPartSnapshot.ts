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

/** Stable JSON without object-key-order noise; rejects values JSON cannot preserve safely. */
function canonicalJson(value: unknown, label: string, ancestors = new Set<object>()): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(label + " sonlu bir sayı taşımalıdır.");
    }
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error(label + " JSON olarak serileştirilemiyor.");
    return serialized;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error(label + " döngüsel veri içeriyor.");
    ancestors.add(value);
    const serialized = "[" + value.map((item, index) =>
      canonicalJson(item, label + "[" + index + "]", ancestors)
    ).join(",") + "]";
    ancestors.delete(value);
    return serialized;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(label + " yalnızca düz JSON nesneleri içerebilir.");
    }
    if (ancestors.has(value)) throw new Error(label + " döngüsel veri içeriyor.");
    ancestors.add(value);
    const source = value as RecordValue;
    const keys = Object.keys(source).filter((key) => source[key] !== undefined).sort();
    const serialized = "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(source[key], label + "." + key, ancestors)
    ).join(",") + "}";
    ancestors.delete(value);
    return serialized;
  }
  throw new Error(label + " JSON tarafından korunamayan bir değer içeriyor.");
}

/** Captures all Part fields, not only the selected rectangular parts used by nesting. */
export function createProjectPartSnapshot(parts: readonly unknown[]): ProjectPartSnapshot {
  if (!Array.isArray(parts)) throw new Error("Proje Part snapshot kaynağı bir liste olmalıdır.");
  const seen = new Set<string>();
  const entries = parts.map((rawPart, index) => {
    const part = record(rawPart, "Proje Part snapshot kaydının " + (index + 1) + ". öğesi");
    const id = identifier(part.id, "Proje Part snapshot kimliği");
    if (seen.has(id)) throw new Error("Proje Part snapshot içinde yinelenen kimlik var: " + id + ".");
    seen.add(id);
    return { id, snapshot: canonicalJson(part, id + " Part snapshot") };
  });
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
  const parts = source.parts.map((rawEntry, index) => {
    const entry = record(rawEntry, "Proje Part snapshot kaydının " + (index + 1) + ". öğesi");
    closed(entry, ["id", "snapshot"], "Proje Part snapshot kaydı");
    const id = identifier(entry.id, "Proje Part snapshot kimliği");
    if (seen.has(id)) throw new Error("Proje Part snapshot içinde yinelenen kimlik var: " + id + ".");
    seen.add(id);
    if (typeof entry.snapshot !== "string" || entry.snapshot.trim() === "") {
      throw new Error(id + " Part snapshot içeriği boş olmayan JSON metni olmalıdır.");
    }
    const parsed = record(JSON.parse(entry.snapshot) as unknown, id + " Part snapshot JSON");
    if (parsed.id !== id) throw new Error(id + " Part snapshot içindeki kimlikle eşleşmiyor.");
    if (canonicalJson(parsed, id + " Part snapshot") !== entry.snapshot) {
      throw new Error(id + " Part snapshot kanonik JSON biçiminde değil.");
    }
    return { id, snapshot: entry.snapshot };
  });
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
