import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("mobile panel visibility follows the compact viewport breakpoint", () => {
  assert.match(
    app,
    /const \[isCompactViewport, setIsCompactViewport\] = useState\([\s\S]*?window\.matchMedia\("\(max-width: 760px\)"\)\.matches\s*\);/,
  );
  assert.match(app, /mediaQuery\.addEventListener\("change", syncCompactViewport\)/);
  assert.match(app, /mediaQuery\.removeEventListener\("change", syncCompactViewport\)/);
  assert.match(
    app,
    /const mobileCatalogHidden = isCompactViewport && mobilePanel !== "catalog";/,
  );
  assert.match(
    app,
    /const mobileInspectorHidden =\s*inspectorCollapsed \|\| \(isCompactViewport && mobilePanel !== "inspector"\);/,
  );
});

test("off-canvas mobile panels cannot receive focus while closed", () => {
  assert.match(
    app,
    /<Sidebar\s+id="cad-left-dock"[\s\S]*?aria-hidden=\{mobileCatalogHidden\}\s+inert=\{mobileCatalogHidden\}/,
  );
  assert.match(
    app,
    /<aside id="cad-inspector" className="cad-inspector" aria-hidden=\{mobileInspectorHidden\} inert=\{mobileInspectorHidden\}>/,
  );
});

test("mobile panel controls announce their expanded state and controlled region", () => {
  assert.match(
    app,
    /setMobilePanel\(mobilePanel === "catalog" \? null : "catalog"\)\} aria-pressed=\{mobilePanel === "catalog"\} aria-expanded=\{mobilePanel === "catalog"\} aria-controls="cad-left-dock"/,
  );
  assert.match(
    app,
    /setMobilePanel\(mobilePanel === "inspector" \? null : "inspector"\)\} aria-pressed=\{mobilePanel === "inspector"\} aria-expanded=\{mobilePanel === "inspector"\} aria-controls="cad-inspector"/,
  );
});
