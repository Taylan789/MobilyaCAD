import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("left panel tabs expose linked tab and panel semantics with roving focus", () => {
  assert.match(app, /role="tablist"\s+aria-label="Sol panel görünümü"\s+onKeyDown=\{handleLeftPanelTabKeyDown\}/s);
  assert.match(
    app,
    /id="cad-left-panel-catalog-tab"\s+type="button"\s+role="tab"\s+aria-selected=\{leftPanelMode === "catalog"\}\s+aria-controls="cad-left-panel-content"\s+tabIndex=\{leftPanelMode === "catalog" \? 0 : -1\}/s,
  );
  assert.match(
    app,
    /id="cad-left-panel-scene-tab"\s+type="button"\s+role="tab"\s+aria-selected=\{leftPanelMode === "scene"\}\s+aria-controls="cad-left-panel-content"\s+tabIndex=\{leftPanelMode === "scene" \? 0 : -1\}/s,
  );
  assert.match(
    app,
    /id="cad-left-panel-content"\s+role="tabpanel"\s+tabIndex=\{0\}\s+aria-labelledby=\{leftPanelMode === "catalog" \? "cad-left-panel-catalog-tab" : "cad-left-panel-scene-tab"\}/s,
  );
});

test("left panel tabs support arrow, Home, End, and focus transfer", () => {
  assert.match(app, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/);
  assert.match(app, /event\.key === "Home"\)\s*\{\s*nextMode = "catalog"/s);
  assert.match(app, /event\.key === "End"\)\s*\{\s*nextMode = "scene"/s);
  assert.match(app, /event\.preventDefault\(\);\s*setLeftPanelMode\(nextMode\);\s*leftPanelTabRefs\.current\[nextMode\]\?\.focus\(\);/s);
});
