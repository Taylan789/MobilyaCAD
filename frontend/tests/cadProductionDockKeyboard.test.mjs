import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("production dock tabs have linked tab-panel semantics and a single roving tab stop", () => {
  for (const tab of ["parts", "materials", "issues"]) {
    assert.match(app, new RegExp(`id="cad-bottom-tab-${tab}"`));
    assert.match(app, new RegExp(`aria-controls="cad-bottom-dock-panel"`));
    assert.match(app, new RegExp(`tabIndex=\\{bottomPanelTab === "${tab}" \\? 0 : -1\\}`));
  }

  assert.match(
    app,
    /id="cad-bottom-dock-panel" role="tabpanel" aria-labelledby=\{\`cad-bottom-tab-\$\{bottomPanelTab\}\`\} tabIndex=\{0\}/,
  );
});

test("production dock tabs support arrow wrapping and Home/End focus transfer", () => {
  assert.match(app, /function handleBottomPanelKeyDown\s*\(/);
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
    assert.match(app, new RegExp(`case "${key}":`));
  }
  assert.match(app, /default:\s*return;/);
  assert.match(app, /event\.preventDefault\(\);/);
  assert.match(app, /querySelectorAll<HTMLButtonElement>\('\[role="tab"\]'\)/);
  assert.match(app, /\.focus\(\)/);
});
