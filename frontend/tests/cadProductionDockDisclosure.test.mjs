import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const refinement = readFileSync(new URL("../src/styles/cad-studio-refinement.css", import.meta.url), "utf8");

test("production dock exposes an accessible disclosure control", () => {
  assert.match(app, /bottomPanelCollapsed, setBottomPanelCollapsed/);
  assert.match(app, /cad-bottom-dock\$\{bottomPanelCollapsed \? " cad-bottom-dock--collapsed" : ""\}/);
  assert.match(app, /aria-label=\{bottomPanelCollapsed \? "Üretim masasını genişlet" : "Üretim masasını daralt"\}/);
  assert.match(app, /aria-expanded=\{!bottomPanelCollapsed\} aria-controls="cad-bottom-dock-body"/);
  assert.match(app, /setBottomPanelCollapsed\(\(current\) => !current\)/);
});

test("collapsed dock hides and removes the report body from keyboard navigation", () => {
  assert.match(app, /id="cad-bottom-dock-body" className="cad-bottom-dock-body" aria-hidden=\{bottomPanelCollapsed\} inert=\{bottomPanelCollapsed\}/);
  assert.match(refinement, /\.cad-bottom-dock--collapsed \.cad-bottom-dock-body \{ display: none !important; \}/);
  assert.match(refinement, /\.cad-main-area\.cad-main-area--dock-collapsed\s*\{[^}]*51px !important;/s);
});

test("collapsed dock preserves compact desktop and reduced-motion styling", () => {
  assert.match(refinement, /@media \(min-width: 761px\) and \(max-width: 1360px\)[\s\S]*?cad-main-area--dock-collapsed[\s\S]*?51px !important;/);
  assert.match(refinement, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?cad-bottom-dock-toggle svg \{ transition: none !important; \}/);
  assert.match(refinement, /@media \(forced-colors: active\)[\s\S]*?cad-bottom-dock-toggle/);
});
