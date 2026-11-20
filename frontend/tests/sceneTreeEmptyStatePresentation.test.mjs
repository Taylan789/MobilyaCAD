import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const workbenchStyles = readFileSync(
  new URL("../src/styles/workbench.css", import.meta.url),
  "utf8"
);

test("scene tree empty states keep their existing real actions", () => {
  assert.ok(appSource.includes('<strong>Sahne henüz boş</strong>'));
  assert.ok(
    appSource.includes('onClick={() => setLeftPanelMode("catalog")}>Kütüphaneyi aç')
  );
  assert.ok(
    appSource.includes('className="studio-tree-empty studio-tree-empty-search" role="status"')
  );
  assert.ok(
    appSource.includes('onClick={() => setSceneSearch("")}>Aramayı temizle')
  );
});

test("scene tree empty states use compact graphite and steel styling", () => {
  assert.ok(workbenchStyles.includes(".studio-tree-empty {"));
  assert.ok(workbenchStyles.includes("min-height: 164px !important;"));
  assert.ok(workbenchStyles.includes("border: 1px dashed #4b6573 !important;"));
  assert.ok(workbenchStyles.includes(".studio-tree-empty > button:hover {"));
  assert.ok(workbenchStyles.includes(".studio-tree-empty > button:focus-visible {"));
  assert.ok(workbenchStyles.includes("@media (max-width: 820px)"));
  assert.ok(workbenchStyles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(workbenchStyles.includes("@media (forced-colors: active)"));
});
