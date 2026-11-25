import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(
  new URL("../src/styles/ui-workspace-panel-toggle-labels-001.css", import.meta.url),
  "utf8"
);

test("desktop viewport panel toggles show the dock purpose beside each icon", () => {
  assert.match(
    app,
    /aria-controls="cad-left-dock"[^>]*<PanelLeft \/><span className="studio-panel-toggle__label" aria-hidden="true">SOL PANEL<\/span>/
  );
  assert.match(
    app,
    /aria-controls="cad-inspector"[^>]*<PanelRight \/><span className="studio-panel-toggle__label" aria-hidden="true">ÖZELLİKLER<\/span>/
  );
});

test("panel labels keep the existing live collapse state and remain compact below 1100px", () => {
  assert.match(app, /aria-pressed={!leftDockCollapsed} aria-expanded={!leftDockCollapsed} aria-controls="cad-left-dock"/);
  assert.match(app, /aria-pressed={!inspectorCollapsed} aria-expanded={!inspectorCollapsed} aria-controls="cad-inspector"/);
  assert.match(styles, /@media \(max-width: 1100px\)[\s\S]*?\.studio-panel-toggle__label\s*\{\s*display: none !important;/);
  assert.match(styles, /@media \(forced-colors: active\)[\s\S]*?\.studio-panel-toggle:focus-visible/);
});
