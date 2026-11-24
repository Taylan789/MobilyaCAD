import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(
  new URL("../src/styles/cad-production-dock-collapse-001.css", import.meta.url),
  "utf8"
);

test("production dock exposes an accessible collapse control and hides its content", () => {
  assert.match(app, /const \[bottomDockCollapsed, setBottomDockCollapsed\] = useState\(false\)/);
  assert.match(app, /aria-label=\{bottomDockCollapsed \? "Üretim masasını genişlet" : "Üretim masasını daralt"\}/);
  assert.match(app, /aria-expanded=\{!bottomDockCollapsed\}/);
  assert.match(app, /aria-controls="cad-bottom-dock-body"/);
  assert.match(app, /onClick=\{\(\) => setBottomDockCollapsed\(\(current\) => !current\)\}/);
  assert.match(app, /id="cad-bottom-dock-body" className="cad-bottom-dock-body" hidden=\{bottomDockCollapsed\}/);
  assert.match(stylesheet, /\.cad-bottom-dock-body\[hidden\][\s\S]*?display: none !important/);
});

test("selecting a production tab reopens the dock and new projects reset it", () => {
  const tabHandlers = app.match(
    /onClick=\{\(\) => \{ setBottomPanelTab\("(?:parts|materials|issues)"\); setBottomDockCollapsed\(false\); \}\}/g
  );
  assert.equal(tabHandlers?.length, 3);
  assert.match(app, /setInspectorCollapsed\(false\);\s*setBottomDockCollapsed\(false\);/);
});

test("collapsed desktop dock returns vertical space while retaining accessibility fallbacks", () => {
  assert.match(stylesheet, /grid-template-rows: 38px 62px minmax\(0, 1fr\) 64px/);
  assert.match(stylesheet, /flex: 0 0 64px !important/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesheet, /@media \(forced-colors: active\)/);
  assert.match(stylesheet, /@media \(min-width: 761px\) and \(max-width: 900px\)/);
});
