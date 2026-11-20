import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const studioCss = readFileSync(new URL("../src/styles/cad-studio-refinement.css", import.meta.url), "utf8");

test("the production dock separates editable scene parts from the domain cut list", () => {
  assert.match(app, /useState<"parts" \| "cutlist" \| "materials" \| "issues">\("parts"\)/);
  assert.match(app, /const scenePartCount = furniture\.reduce\(\(count, item\) => count \+ item\.parts\.length, 0\)/);
  assert.match(app, /Parçalar <b>\{scenePartCount\}<\/b>/);
  assert.match(app, /Kesim listesi <b>\{productionParts\.length\}<\/b>/);
  assert.match(app, /bottomPanelTab === "cutlist"/);
});

test("scene part rows use existing geometry and focus the corresponding 3D part", () => {
  assert.match(app, /furniture\.flatMap\(\(item\) => item\.parts\.map\(\(part\) => \(/);
  assert.match(app, /focusSceneFurniture\(item\.id, part\.id\)/);
  assert.match(app, /part\.width\} mm/);
  assert.match(app, /part\.height\} mm/);
  assert.match(app, /part\.depth\} mm/);
  assert.match(app, /Sahnede \$\{item\.name\} \/ \$\{part\.name\} parçasını seç/);
});

test("the cut list keeps the existing production parts and CSV export path", () => {
  assert.match(app, /productionParts\.slice\(0, 80\)\.map/);
  assert.match(app, /createProjectCutListCsv\(projectProduction\.furnitureNames, productionParts\)/);
  assert.match(app, /if \(productionParts\.length === 0 \|\| productionExportBlockReason\) return/);
});

test("part selection is keyboard-visible and narrow dock tabs can scroll", () => {
  assert.match(studioCss, /\.cad-dock-part-select:focus-visible/);
  assert.match(studioCss, /@media \(max-width: 760px\)[\s\S]*?\.cad-bottom-dock-header \{[^}]*overflow-x: auto;/);
  assert.match(studioCss, /\.cad-bottom-dock-metrics \{ display: none !important; \}/);
});
