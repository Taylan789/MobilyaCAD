import assert from "node:assert/strict";
import test from "node:test";
import {
  PROJECT_PART_SNAPSHOT_MAX_BYTES,
  PROJECT_PART_SNAPSHOT_MAX_DEPTH,
  compareProjectPartSnapshots,
  createProjectPartSnapshot,
  validateProjectPartSnapshot
} from "./projectPartSnapshot.ts";

test("Part snapshot nesne anahtarı sırasından bağımsız kanonik JSON üretir", () => {
  const first = createProjectPartSnapshot([{
    id: "part-1", width: 500, edgeBanding: { top: true, left: false }
  }]);
  const reordered = createProjectPartSnapshot([{
    edgeBanding: { left: false, top: true }, width: 500, id: "part-1"
  }]);
  assert.deepEqual(compareProjectPartSnapshots(first, reordered), { changed: false, diagnostics: [] });
  assert.equal(first.parts[0].snapshot, '{"edgeBanding":{"left":false,"top":true},"id":"part-1","width":500}');
});

test("tam proje snapshot karşılaştırması ekleme, silme, sıra ve seçilmemiş Part değişimini yakalar", () => {
  const original = createProjectPartSnapshot([
    { id: "selected", width: 500 }, { id: "excluded", width: 300 }
  ]);
  const added = compareProjectPartSnapshots(original, createProjectPartSnapshot([
    { id: "selected", width: 500 }, { id: "excluded", width: 300 }, { id: "new-part", width: 200 }
  ]));
  assert.equal(added.changed, true);
  assert.match(added.diagnostics.join(" "), /yeni Part eklendi/);
  const removed = compareProjectPartSnapshots(original, createProjectPartSnapshot([
    { id: "selected", width: 500 }
  ]));
  assert.match(removed.diagnostics.join(" "), /Part silindi/);
  const reordered = compareProjectPartSnapshots(original, createProjectPartSnapshot([
    { id: "excluded", width: 300 }, { id: "selected", width: 500 }
  ]));
  assert.match(reordered.diagnostics.join(" "), /sırası değişmiş/);
  const changedExcluded = compareProjectPartSnapshots(original, createProjectPartSnapshot([
    { id: "selected", width: 500 }, { id: "excluded", width: 301 }
  ]));
  assert.match(changedExcluded.diagnostics.join(" "), /excluded üretim Part snapshot'ı değişmiş/);
});



test("Part snapshot content diagnostics follow current production order after saved order changes", () => {
  const saved = createProjectPartSnapshot([
    { id: "selected", width: 500 },
    { id: "first-excluded", width: 300 },
    { id: "second-excluded", width: 200 }
  ]);
  const current = createProjectPartSnapshot([
    { id: "selected", width: 500 },
    { id: "first-excluded", width: 301 },
    { id: "second-excluded", width: 201 }
  ]);
  const reorderedSaved = {
    ...saved,
    parts: [...saved.parts].reverse()
  };

  const comparison = compareProjectPartSnapshots(reorderedSaved, current);
  assert.deepEqual(comparison.diagnostics, [
    "Proje Part sırası değişmiş.",
    "first-excluded üretim Part snapshot'ı değişmiş.",
    "second-excluded üretim Part snapshot'ı değişmiş."
  ]);
});

test("bozuk, yinelenen veya kanonik olmayan Part snapshot kayıtları reddedilir", () => {
  assert.throws(() => createProjectPartSnapshot([{ id: "same" }, { id: "same" }]), /yinelenen kimlik/);
  assert.throws(() => validateProjectPartSnapshot({
    schemaVersion: 1, parts: [{ id: "part-1", snapshot: '{"width":500,"id":"part-1"}' }]
  }), /kanonik JSON/);
  assert.throws(() => validateProjectPartSnapshot({
    schemaVersion: 1, parts: [{ id: "part-1", snapshot: '{"id":"other"}' }]
  }), /kimlikle eşleşmiyor/);
});


test("DOM-209 Part snapshot UTF-8 envelope limit accepts the exact boundary and rejects one byte over", () => {
  const baseline = createProjectPartSnapshot([{ id: "part-size", payload: "" }]);
  const baselineBytes = new TextEncoder().encode(JSON.stringify(baseline)).byteLength;
  const exactPayloadLength = PROJECT_PART_SNAPSHOT_MAX_BYTES - baselineBytes;
  const exact = createProjectPartSnapshot([{ id: "part-size", payload: "x".repeat(exactPayloadLength) }]);

  assert.equal(new TextEncoder().encode(JSON.stringify(exact)).byteLength, PROJECT_PART_SNAPSHOT_MAX_BYTES);
  assert.deepEqual(validateProjectPartSnapshot(exact), exact);
  assert.throws(() => createProjectPartSnapshot([{ id: "part-size", payload: "x".repeat(exactPayloadLength + 1) }]), /8 MiB UTF-8/);

  const oversizedPartJson = JSON.stringify({ id: "part-size", payload: "x".repeat(exactPayloadLength + 1) });
  assert.throws(() => validateProjectPartSnapshot({
    schemaVersion: 1,
    parts: [{ id: "part-size", snapshot: oversizedPartJson }]
  }), /8 MiB UTF-8/);
});

test("DOM-209 Part snapshot accepts 64 nested containers and rejects the 65th", () => {
  function nestedObject(levels) {
    let value = "leaf";
    for (let index = 0; index < levels; index += 1) value = { next: value };
    return value;
  }
  const exact = createProjectPartSnapshot([{
    id: "part-depth",
    nested: nestedObject(PROJECT_PART_SNAPSHOT_MAX_DEPTH - 1)
  }]);
  assert.deepEqual(validateProjectPartSnapshot(exact), exact);
  assert.throws(() => createProjectPartSnapshot([{
    id: "part-depth",
    nested: nestedObject(PROJECT_PART_SNAPSHOT_MAX_DEPTH)
  }]), /64 iç içe/);

  const tooDeepJson = JSON.stringify({
    id: "part-depth",
    nested: nestedObject(PROJECT_PART_SNAPSHOT_MAX_DEPTH)
  });
  assert.throws(() => validateProjectPartSnapshot({
    schemaVersion: 1,
    parts: [{ id: "part-depth", snapshot: tooDeepJson }]
  }), /64 iç içe/);
});
