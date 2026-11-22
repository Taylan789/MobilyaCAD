import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const component = readFileSync(resolve(here, "../src/components/production/ProductionWorkspace.tsx"), "utf8");
const styles = readFileSync(resolve(here, "../src/components/production/ProductionWorkspaceRailDensity.css"), "utf8");

test("production workspace loads its compact rail layer", () => {
  assert.match(component, /ProductionWorkspaceRailDensity\.css/);
});

test("project scope rail reduces vertical gaps and card padding", () => {
  assert.match(styles, /\.mc-production-studio__rail\s*\{[^}]*gap:\s*15px/s);
  assert.match(styles, /\.mc-production-studio__project\s*\{[^}]*gap:\s*8px/s);
  assert.match(styles, /\.mc-production-studio__project\s*\{[^}]*padding:\s*10px/s);
});

test("live project counts stay readable and aligned", () => {
  assert.match(styles, /\.mc-production-studio__project-total strong\s*\{[^}]*font-size:\s*23px/s);
  assert.match(styles, /\.mc-production-studio__project-row\s*\{[^}]*align-items:\s*center/s);
  assert.match(styles, /\.mc-production-studio__project-row\s*\{[^}]*padding-top:\s*6px/s);
});

test("scope notice is compact without removing its copy", () => {
  assert.match(styles, /\.mc-production-studio__scope\s*\{[^}]*padding:\s*9px/s);
  assert.match(styles, /\.mc-production-studio__scope p\s*\{[^}]*line-height:\s*1\.45/s);
});

test("rail spacing adapts across desktop, tablet, and mobile widths", () => {
  assert.match(styles, /@media\s*\(max-width:\s*1100px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*820px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*560px\)/);
});

test("rail remains accessible in reduced-motion and forced-color modes", () => {
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(styles, /border:\s*1px solid CanvasText/);
});
