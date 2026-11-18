import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const shortcutsCss = readFileSync(
  new URL("../src/components/workspace/KeyboardShortcuts.css", import.meta.url),
  "utf8",
);
const dialog = app.match(/<section\s+id="cad-shortcuts-dialog"[\s\S]*?<\/section>/)?.[0] ?? "";
const handlerStart = app.indexOf("function handleWorkspaceShortcut(event: KeyboardEvent) {");
const handlerEnd = app.indexOf("\n    window.addEventListener", handlerStart);
const shortcutHandler = handlerStart >= 0 && handlerEnd > handlerStart
  ? app.slice(handlerStart, handlerEnd)
  : "";

test("command reference only advertises shortcuts wired to workspace actions", () => {
  assert.match(app, /import "\.\/components\/workspace\/KeyboardShortcuts\.css";/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-labelledby="cad-shortcuts-title"/);

  for (const label of [
    "Ctrl / ⌘ N",
    "Ctrl / ⌘ K",
    "Ctrl / ⌘ S",
    "Ctrl / ⌘ O",
    "Taşıma aracını seç",
    "Boyutlandırma aracını seç",
    "Döndürme aracını seç",
    "Bu yardımı aç / kapat",
  ]) {
    assert.ok(dialog.includes(label), `Missing command reference entry: ${label}`);
  }

  for (const mapping of [
    /hasModifier && key === "n"/,
    /hasModifier && key === "k"/,
    /hasModifier && key === "s"/,
    /hasModifier && key === "o"/,
    /key === "1"\) setTransformMode\("translate"\)/,
    /key === "2"\) setTransformMode\("scale"\)/,
    /key === "3"\) setTransformMode\("rotate"\)/,
    /event\.key === "\?"\) setShowShortcuts/,
  ]) {
    assert.match(shortcutHandler, mapping);
  }
});

test("command reference stays scrollable with its heading anchored in short viewports", () => {
  const responsiveRules = shortcutsCss.slice(
    shortcutsCss.indexOf("/* UI-COMMAND-REFERENCE-RESPONSIVE-001"),
  );

  assert.match(responsiveRules, /max-height:\s*min\(560px, calc\(100vh - 104px\)\)/);
  assert.match(responsiveRules, /overflow-y:\s*auto/);
  assert.match(responsiveRules, /overscroll-behavior:\s*contain/);
  assert.match(responsiveRules, /\.cad-shortcuts-panel__header\s*\{[^}]*position:\s*sticky/s);
  assert.match(responsiveRules, /@media \(max-height: 680px\)/);
  assert.match(responsiveRules, /@media \(max-width: 720px\)[\s\S]*?env\(safe-area-inset-bottom/);
});

test("keycaps, focus indicators and accessibility modes remain explicit", () => {
  const responsiveRules = shortcutsCss.slice(
    shortcutsCss.indexOf("/* UI-COMMAND-REFERENCE-RESPONSIVE-001"),
  );

  assert.match(responsiveRules, /\.cad-shortcuts-list kbd\s*\{[^}]*min-width:\s*42px/s);
  assert.match(responsiveRules, /\.cad-shortcuts-panel button:focus-visible/);
  assert.match(responsiveRules, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(responsiveRules, /@media \(forced-colors: active\)/);
});
