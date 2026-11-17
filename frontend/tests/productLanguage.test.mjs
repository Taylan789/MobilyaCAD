import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("stüdyo açılışı mevcut olmayan parametrik yetenekleri vaat etmez", () => {
  assert.doesNotMatch(appSource, /parametr[iİ]k/i);
  assert.match(appSource, /ŞEMATİK MODÜL/);
  assert.match(appSource, /ŞEMATİK GÖRSEL — ÖLÇÜLER TEMSİLİ/);
  assert.match(appSource, /3D MODELLEME ORTAMI/);
});
