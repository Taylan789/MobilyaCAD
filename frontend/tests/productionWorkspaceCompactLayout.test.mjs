import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentUrl = new URL("../src/components/production/ProductionWorkspace.tsx", import.meta.url);
const stylesheetUrl = new URL("../src/components/production/ProductionWorkspaceResponsive.css", import.meta.url);
const component = readFileSync(componentUrl, "utf8");
const stylesheet = readFileSync(stylesheetUrl, "utf8");

test("compact production workspace stylesheet loads after the base component styles", () => {
  assert.match(
    component,
    /import "\.\/ProductionWorkspace\.css";\s*import "\.\/ProductionWorkspaceResponsive\.css";/
  );
});

test("medium desktop widths reserve more room for the production report", () => {
  assert.match(stylesheet, /@media\s*\(min-width:\s*1101px\)\s*and\s*\(max-width:\s*1360px\)/);
  assert.match(stylesheet, /grid-template-columns:\s*214px\s+minmax\(0,\s*1fr\)/);
});

test("short desktop viewports use a denser rail and content header", () => {
  assert.match(stylesheet, /@media\s*\(min-width:\s*821px\)\s*and\s*\(max-height:\s*860px\)/);
  assert.match(stylesheet, /min-height:\s*52px/);
  assert.match(stylesheet, /@media\s*\(min-width:\s*821px\)\s*and\s*\(max-height:\s*760px\)/);
});

test("keyboard focus and reduced-motion preferences remain explicit", () => {
  assert.match(stylesheet, /\.mc-production-studio button:focus-visible/);
  assert.match(stylesheet, /outline:\s*2px solid/);
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /animation:\s*none/);
});
