import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/styles/workspace-layout.css", import.meta.url), "utf8");

test("left dock toggle keeps a compact, usable icon rail", () => {
  assert.match(app, /leftDockCollapsed\s*\?\s*" cad-workspace--left-collapsed"/);
  assert.match(app, /aria-label=\{leftDockCollapsed \? "Sol paneli göster" : "Sol paneli gizle"\}/);
  assert.match(
    layout,
    /\.cad-workspace--left-collapsed \.cad-sidebar\s*\{[^}]*flex-basis:\s*56px !important;[^}]*width:\s*56px !important;[^}]*min-width:\s*56px !important;/s,
  );
  assert.match(
    layout,
    /\.cad-workspace--left-collapsed \.studio-sidebar-switch button\s*\{[^}]*width:\s*44px;/s,
  );
});

test("inspector toggle releases its width to the 3D viewport", () => {
  assert.match(app, /inspectorCollapsed\s*\?\s*" inspector-collapsed"/);
  assert.match(app, /aria-label=\{inspectorCollapsed \? "Özellik panelini göster" : "Özellik panelini gizle"\}/);
  assert.match(
    layout,
    /\.cad-workspace-content\.inspector-collapsed > \.cad-inspector\s*\{[^}]*flex-basis:\s*0 !important;[^}]*width:\s*0 !important;[^}]*min-width:\s*0 !important;/s,
  );
  assert.match(
    layout,
    /\.cad-workspace-content\.inspector-collapsed > \.cad-viewport\s*\{[^}]*border-radius:\s*12px;/s,
  );
});

test("desktop panel layout loads before the studio visual refinement layer", () => {
  const layoutImport = main.indexOf("./styles/workspace-layout.css");
  const refinementImport = main.indexOf("./styles/cad-studio-refinement.css");

  assert.notEqual(layoutImport, -1);
  assert.notEqual(refinementImport, -1);
  assert.ok(layoutImport < refinementImport);
  assert.match(layout, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("panel disclosure controls identify their regions and make a collapsed inspector inert", () => {
  assert.match(app, /id="cad-left-dock"\s+role="region"\s+aria-label="Kütüphane ve sahne paneli"/);
  assert.match(app, /aria-expanded=\{!leftDockCollapsed\} aria-controls="cad-left-dock"/);
  assert.match(app, /aria-expanded=\{!inspectorCollapsed\} aria-controls="cad-inspector"/);
  assert.match(
    app,
    /<aside id="cad-inspector" className="cad-inspector" aria-hidden=\{inspectorCollapsed\} inert=\{inspectorCollapsed\}>/,
  );
});
