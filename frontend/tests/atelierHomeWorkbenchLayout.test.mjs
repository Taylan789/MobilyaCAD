import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/atelier-home-workbench-layout-001.css", import.meta.url), "utf8");

test("desktop launcher arranges the existing welcome, start actions and recent-project empty state as a two-column workbench", () => {
  const appImport = entry.indexOf("import App from './App.tsx'");
  const layoutImport = entry.indexOf("import './styles/atelier-home-workbench-layout-001.css'");
  assert.ok(appImport >= 0, "the existing React app remains the entry point");
  assert.ok(layoutImport > appImport, "launcher layout overrides load after App styles");

  assert.match(app, /className="atelier-welcome"/);
  assert.match(app, /className="atelier-section atelier-start-section"/);
  assert.match(app, /className="atelier-bottom-row"/);
  assert.match(app, /onClick=\{\(\) => startNewProject\(\)\}/);
  assert.match(app, /loadProject\(event\)/);

  assert.match(css, /@media \(min-width: 1101px\) and \(min-height: 720px\)/);
  assert.match(css, /grid-template-columns: minmax\(320px, 0\.72fr\) minmax\(0, 1\.28fr\)/);
  assert.match(css, /grid-row: 1 \/ span 2/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});

test("launcher does not reserve the missing hero-art column and adapts when the art component exists", () => {
  assert.match(css, /\.atelier-welcome:has\(\.atelier-feature-art\)/);
  assert.match(css, /@media \(min-width: 821px\) and \(max-width: 1100px\)/);
  assert.match(css, /flex-direction: column/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.doesNotMatch(css, /\.cad-viewport|\.cad-inspector|\.cad-statusbar/);
});

test("short desktop launcher compacts the existing project actions without changing their behavior", () => {
  assert.match(css, /@media \\(min-width: 1101px\\) and \\(min-height: 720px\\) and \\(max-height: 820px\\)/);
  assert.match(css, /\\.atelier-welcome \\{\\s*padding: 20px 22px !important;/);
  assert.match(css, /\\.atelier-start-card \\{\\s*min-height: 144px !important;\\s*padding: 10px !important;/);
  assert.match(css, /\\.atelier-card-visual \\{\\s*min-height: 58px !important;/);
  assert.match(css, /\\.atelier-empty-project \\{\\s*min-height: 60px !important;/);
  assert.match(css, /@media \\(prefers-reduced-motion: reduce\\)/);
  assert.match(css, /@media \\(forced-colors: active\\)/);
});
