import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("bozuk, yinelenen veya kanonik olmayan Part snapshot kayıtları reddedilir", () => {
  assert.throws(() => createProjectPartSnapshot([{ id: "same" }, { id: "same" }]), /yinelenen kimlik/);
  assert.throws(() => validateProjectPartSnapshot({
    schemaVersion: 1, parts: [{ id: "part-1", snapshot: '{"width":500,"id":"part-1"}' }]
  }), /kanonik JSON/);
  assert.throws(() => validateProjectPartSnapshot({
    schemaVersion: 1, parts: [{ id: "part-1", snapshot: '{"id":"other"}' }]
  }), /kimlikle eşleşmiyor/);
});
