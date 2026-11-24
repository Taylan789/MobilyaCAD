import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/ui-production-dock-empty-state-001.css", import.meta.url), "utf8");

test("an empty scene is not reported as a successful production validation", () => {
  const issuesPanel = app.slice(app.indexOf('<div className="cad-dock-issues">'));
  assert.match(issuesPanel, /furniture\.length === 0/);
  assert.match(issuesPanel, /VERİ BEKLENİYOR/);
  assert.match(issuesPanel, /Henüz kontrol edilecek mobilya yok/);
  assert.match(issuesPanel, /Üretim uyarısı bulunmuyor/);
  assert.doesNotMatch(issuesPanel, /Mevcut proje üretim kontrollerinden temiz geçti/);
});

test("production dock empty states are announced and use a compact technical hierarchy", () => {
  assert.match(app, /cad-dock-empty--waiting" role="status"/);
  assert.match(app, /cad-dock-empty--clear" role="status"/);
  assert.match(css, /border-left:\s*2px solid/);
  assert.match(css, /@media \(max-width:\s*700px\)/);
  assert.match(css, /@media \(forced-colors:\s*active\)/);
});
