import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/styles/workbench.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const compactRule = css.slice(css.lastIndexOf("/* UI-SCENE-TREE-DENSITY-001"));

test("desktop scene tree rows compact without losing part labels or material detail", () => {
  assert.match(compactRule, /@media\\s*\\(min-width:\\s*1101px\\)/);
  assert.match(compactRule, /\\.studio-tree-object-parts\\s*\\{[^}]*gap:\\s*1px/s);
  assert.match(compactRule, /\\.studio-tree-part\\s*\\{[^}]*min-height:\\s*34px/s);
  assert.match(compactRule, /padding:\\s*3px\\s+6px/);
  assert.match(compactRule, /\\.studio-tree-part-type-icon\\s*\\{[^}]*flex:\\s*0\\s+0\\s+14px/s);
  assert.match(compactRule, /\\.studio-tree-part-copy\\s*\\{[^}]*gap:\\s*2px/s);
  assert.match(compactRule, /\\.studio-tree-part-material\\s*\\{[^}]*gap:\\s*3px/s);
});

test("compact scene rows retain the existing selected-part focus action", () => {
  assert.match(app, /studio-tree-part selected/);
  assert.match(app, /focusSceneFurniture\\(item\\.id, part\\.id\\)/);
  assert.match(css, /\\.studio-tree-part\\.selected\\s*\\{[^}]*box-shadow:\\s*inset 2px 0 0 #8eb5ce/s);
});
