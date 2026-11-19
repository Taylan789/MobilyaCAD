import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const workbenchStyles = readFileSync(
  new URL("../src/styles/workbench.css", import.meta.url),
  "utf8"
);

test("scene tree empty states keep their existing real actions", () => {
  assert.match(
    appSource,
    /className="studio-tree-empty">[\\s\\S]*?<strong>Sahne henüz boş<\\/strong>[\\s\\S]*?<button type="button" onClick=\\{\\(\\) => setLeftPanelMode\\("catalog"\\)\\}>Kütüphaneyi aç<\\/button>/
  );
  assert.match(
    appSource,
    /className="studio-tree-empty studio-tree-empty-search" role="status"/
  );
  assert.ok(
    appSource.includes('onClick={() => setSceneSearch("")}>Aramayı temizle'),
    "search empty state must keep its existing clear-search action"
  );
});

test("scene tree empty states use compact graphite and steel styling", () => {
  assert.match(workbenchStyles, /\\.studio-tree-empty\\s*\\{[^}]*min-height:\\s*164px/s);
  assert.match(workbenchStyles, /\\.studio-tree-empty\\s*\\{[^}]*border:\\s*1px dashed #4b6573/s);
  assert.match(workbenchStyles, /\\.studio-tree-empty > button:hover\\s*\\{/);
  assert.match(workbenchStyles, /\\.studio-tree-empty > button:focus-visible\\s*\\{/);
  assert.match(workbenchStyles, /@media\\s*\\(max-width:\\s*820px\\)/);
  assert.match(workbenchStyles, /@media\\s*\\(prefers-reduced-motion:\\s*reduce\\)/);
  assert.match(workbenchStyles, /@media\\s*\\(forced-colors:\\s*active\\)/);
});
