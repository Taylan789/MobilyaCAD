import assert from "node:assert/strict";
import testRunner from "node:test";

import { getNextToolbarIndex } from "../src/components/viewport/cameraToolbarNavigation.ts";

testRunner("kamera araç çubuğu sağ okla sonraki etkin kontrole ilerler", () => {
  assert.equal(getNextToolbarIndex(0, [0, 1, 2, 6, 7], "next"), 1);
});

testRunner("kamera araç çubuğu devre dışı kontrolleri atlar", () => {
  assert.equal(getNextToolbarIndex(2, [0, 1, 2, 6, 7], "next"), 6);
});

testRunner("kamera araç çubuğu son etkin kontrolden başa döner", () => {
  assert.equal(getNextToolbarIndex(7, [0, 1, 2, 6, 7], "next"), 0);
});

testRunner("kamera araç çubuğu sol okla ilk kontrolden sona döner", () => {
  assert.equal(getNextToolbarIndex(0, [0, 1, 2, 6, 7], "previous"), 7);
});

testRunner("kamera araç çubuğu sol okla önceki etkin kontrole ilerler", () => {
  assert.equal(getNextToolbarIndex(6, [0, 1, 2, 6, 7], "previous"), 2);
});

testRunner("etkin kontrol yoksa mevcut indeks korunur", () => {
  assert.equal(getNextToolbarIndex(4, [], "next"), 4);
});

testRunner("bilinmeyen indeks sağda ilk, solda son etkin kontrole gider", () => {
  assert.equal(getNextToolbarIndex(9, [0, 1, 6], "next"), 0);
  assert.equal(getNextToolbarIndex(9, [0, 1, 6], "previous"), 6);
});
