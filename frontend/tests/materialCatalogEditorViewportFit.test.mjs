import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/production/MaterialCatalogManagerContainerLayout.css", import.meta.url),
  "utf8",
);

test("desktop material editor stays within the viewport and scrolls its own long form", () => {
  assert.match(component, /import "\.\/MaterialCatalogManagerContainerLayout\.css";/);
  const desktopRail = styles.match(
    /@container material-catalog \(min-width: 1121px\)\s*\{\s*\.mc-material-library__editor\s*\{([^}]*)\}\s*\}/,
  )?.[1] ?? "";
  assert.ok(desktopRail, "wide material panels must own a dedicated editor scroll rail");
  assert.match(desktopRail, /max-height:\s*calc\(100vh - 160px\)/);
  assert.match(desktopRail, /max-height:\s*min\(720px, calc\(100dvh - 160px\)\)/);
  assert.match(desktopRail, /overflow-y:\s*auto/);
  assert.match(desktopRail, /overscroll-behavior-y:\s*contain/);
  assert.match(desktopRail, /scrollbar-gutter:\s*stable/);
  assert.match(desktopRail, /scroll-padding-block:\s*12px/);
});

test("compact material panels keep their existing unconstrained single-column layout", () => {
  const desktopRail = styles.match(
    /@container material-catalog \(min-width: 1121px\)\s*\{\s*\.mc-material-library__editor\s*\{([^}]*)\}\s*\}/,
  )?.[1] ?? "";
  assert.ok(desktopRail);
  assert.match(styles, /@container material-catalog \(max-width: 1120px\)/);
  assert.match(styles, /\.mc-material-library__editor\s*\{\s*position:\s*static;/);
  assert.doesNotMatch(desktopRail, /position:\s*sticky/);
});

test("forced-colors restores the system scrollbar palette for the editor rail", () => {
  const forcedColors = styles.slice(styles.lastIndexOf("@media (forced-colors: active)"));
  assert.match(forcedColors, /\.mc-material-library__editor\s*\{[^}]*scrollbar-color:\s*auto/);
});
