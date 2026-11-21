import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/workspace-viewport-fit.css", import.meta.url), "utf8");


test("desktop viewport fit gives the 3D workspace more room at compact and standard desktop sizes", () => {
  assert.match(css, /@media\\s*\\(min-width:\\s*1101px\\)\\s*and\\s*\\(max-width:\\s*1360px\\)/);
  assert.match(css, /\\.cad-sidebar\\s*\\{[^}]*min-width:\\s*232px/s);
  assert.match(css, /\\.cad-inspector\\s*\\{[^}]*min-width:\\s*272px/s);
  assert.match(css, /\\.cad-workspace-content\\s*\\{[^}]*gap:\\s*7px[^}]*padding:\\s*8px/s);
  assert.match(css, /\\.cad-viewport-toolbar\\s*\\{[^}]*height:\\s*48px/s);
  assert.match(css, /@media\\s*\\(min-width:\\s*1361px\\)\\s*and\\s*\\(max-width:\\s*1599px\\)/);
  assert.match(css, /min-width:\\s*270px/);
  assert.match(css, /min-width:\\s*330px/);
});


test("large desktops stay balanced and reduced-motion users get transition-free panels", () => {
  assert.match(css, /@media\\s*\\(min-width:\\s*1600px\\)/);
  assert.match(css, /min-width:\\s*294px/);
  assert.match(css, /min-width:\\s*352px/);
  assert.match(css, /@media\\s*\\(prefers-reduced-motion:\\s*reduce\\)[\\s\\S]*?\\.cad-inspector[\\s\\S]*?transition:\\s*none/s);
});
