import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/ui-workspace-vertical-rhythm-001.css", import.meta.url), "utf8");

test("desktop CAD shell allocates separate rows to project context, viewport tools, canvas and production dock", () => {
  const collapseImport = app.indexOf('import "./styles/cad-production-dock-collapse-001.css";');
  const rhythmImport = app.indexOf('import "./styles/ui-workspace-vertical-rhythm-001.css";');
  assert.ok(collapseImport >= 0, "existing production dock collapse stylesheet remains imported");
  assert.ok(rhythmImport > collapseImport, "vertical rhythm overrides load after the existing dock styles");

  assert.match(app, /className="studio-workspace-heading"/);
  assert.match(app, /className="cad-viewport-toolbar"/);
  assert.match(app, /className=\{\`cad-workspace-content/);
  assert.match(app, /className=\{\`cad-bottom-dock/);

  const desktopStart = css.indexOf("@media (min-width: 821px)");
  assert.ok(desktopStart >= 0, "desktop layout is isolated from the compact/mobile shell");
  const desktop = css.slice(desktopStart, css.indexOf("\n}", desktopStart) + 2);
  assert.match(desktop, /\.cad-app \.cad-main-area\s*\{[^}]*display:\s*grid/s);
  assert.match(desktop, /grid-template-rows:\s*36px 50px minmax\(220px, 1fr\) clamp\(146px, 18vh, 196px\)/);
  assert.match(desktop, /\.cad-app \.cad-workspace-content\s*\{[^}]*grid-row:\s*3/s);
  assert.match(desktop, /\.cad-app \.cad-bottom-dock\s*\{[^}]*grid-row:\s*4/s);
});

test("the production dock collapse state now has a real compact grid track and keeps its existing hidden body behavior", () => {
  assert.match(app, /setBottomDockCollapsed\(\(current\) => !current\)/);
  assert.match(app, /hidden=\{bottomDockCollapsed\}/);
  assert.match(css, /\.cad-app \.cad-main-area\.has-collapsed-production-dock\s*\{[^}]*grid-template-rows:\s*36px 50px minmax\(220px, 1fr\) 66px/s);
  assert.match(css, /\.cad-app \.cad-bottom-dock\.is-collapsed \.cad-bottom-dock-header\s*\{[^}]*height:\s*100%/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.doesNotMatch(css, /@media \(max-width:\s*820px\)/, "desktop grid overrides must not replace the compact/mobile layout");
});
