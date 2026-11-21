import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("shortcut help moves focus to close action and restores the trigger when dismissed", () => {
  assert.match(app, /id="cad-shortcut-trigger"\s+aria-label="Klavye kısayollarını göster"/);
  assert.match(app, /id="cad-shortcuts-close"\s+aria-label="Kısayol penceresini kapat"/);
  assert.match(
    app,
    /if \(showShortcuts\) \{\s+document\.getElementById\("cad-shortcuts-close"\)\?\.focus\(\);\s+\} else if \(shortcutsWasOpen\.current\) \{\s+document\.getElementById\("cad-shortcut-trigger"\)\?\.focus\(\);/s,
  );
  assert.match(app, /shortcutsWasOpen\.current = showShortcuts;/);
});

test("Escape dismisses shortcut help through the same focus restoration path", () => {
  assert.match(
    app,
    /if \(event\.key === "Escape" && showShortcuts\) \{\s+setShowShortcuts\(false\);/s,
  );
});
