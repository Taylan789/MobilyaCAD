import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const workspaceStyles = readFileSync(
  new URL("../src/styles/ui-workspace-vertical-rhythm-001.css", import.meta.url),
  "utf8"
);

test("the inspector keeps its real no-selection guidance without adding a fake action", () => {
  const emptyBranch = appSource.match(
    /<div className="cad-inspector-empty">([\s\S]*?)<\/div>\s*\)\s*}/
  );

  assert.ok(emptyBranch, "the existing no-selection state remains in the inspector");
  assert.match(emptyBranch[1], /<Box\s*\/>/);
  assert.match(emptyBranch[1], /<strong>Mobilya seçilmedi<\/strong>/);
  assert.match(emptyBranch[1], /3D sahneden veya[\s\S]*?bir mobilya seç/);
  assert.doesNotMatch(emptyBranch[1], /<button\b/i);
});

test("the no-selection state becomes a compact technical identity rail", () => {
  assert.match(
    workspaceStyles,
    /\.cad-app \.cad-inspector \.cad-inspector-empty \{[\s\S]*?min-height: 112px !important;/
  );
  assert.match(workspaceStyles, /grid-template-columns: 34px minmax\(0, 1fr\) !important;/);
  assert.match(workspaceStyles, /border-left: 2px solid #82a9c0 !important;/);
  assert.match(workspaceStyles, /text-align: left !important;/);
});

test("the inspector empty state preserves compact, reduced-motion and forced-colors behavior", () => {
  assert.match(workspaceStyles, /@media \(max-width: 760px\)[\s\S]*?\.cad-inspector-empty/);
  assert.match(workspaceStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.cad-inspector-empty/);
  assert.match(workspaceStyles, /@media \(forced-colors: active\)[\s\S]*?\.cad-inspector-empty/);
  assert.match(workspaceStyles, /border-left: 3px solid Highlight !important;/);
});
