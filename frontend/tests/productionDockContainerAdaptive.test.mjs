import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/styles/cad-production-dock-collapse-001.css", import.meta.url),
  "utf8"
);
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const marker = "UI-PRODUCTION-DOCK-CONTAINER-ADAPTIVE-001";
const adaptive = styles.slice(styles.indexOf(marker));

test("production dock compacts from its actual available width", () => {
  assert.notEqual(styles.indexOf(marker), -1);
  assert.match(adaptive, /\.cad-bottom-dock\s*\{[^}]*container-type:\s*inline-size;[^}]*container-name:\s*cad-production-dock;/s);
  assert.match(adaptive, /@container cad-production-dock \(max-width:\s*860px\)/);
  assert.match(adaptive, /\.cad-bottom-dock-metrics\s*\{\s*display:\s*none;/s);
  assert.match(adaptive, /\.cad-bottom-dock-tabs\s*\{[^}]*min-width:\s*0;[^}]*flex:\s*1 1 auto;/s);
});

test("the existing three production tabs remain visible in compact layouts", () => {
  assert.match(adaptive, /@container cad-production-dock \(max-width:\s*560px\)/);
  assert.match(adaptive, /\.cad-bottom-dock-tabs button\s*\{[^}]*flex:\s*1 1 0;/s);
  assert.match(adaptive, /@container cad-production-dock \(max-width:\s*420px\)/);
  assert.match(app, /aria-label="Alt panel sekmeleri"/);
  for (const label of ["Parça listesi", "Malzeme özeti", "Kontroller"]) {
    assert.ok(app.includes(label), `missing existing production tab: ${label}`);
  }
});

test("the existing collapse action and accessibility support are preserved", () => {
  assert.match(app, /aria-expanded=\{!bottomDockCollapsed\}/);
  assert.match(app, /aria-controls="cad-bottom-dock-body"/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
});
