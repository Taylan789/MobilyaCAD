import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/components/ui/button-cad-surface.css", import.meta.url), "utf8");

test("persistent CAD button state is limited to enabled, non-link buttons", () => {
  assert.ok(styles.includes('.cad-button-surface[aria-pressed="true"]:not(:disabled):not([aria-disabled="true"]):not([data-cad-variant="link"])'));
});

test("pressed surfaces are defined for the primary, outline, secondary, ghost and destructive variants", () => {
  for (const variant of ["default", "outline", "secondary", "ghost", "destructive"]) {
    assert.ok(styles.includes(`.cad-button-surface[data-cad-variant="${variant}"][aria-pressed="true"]`));
  }
  assert.ok(styles.includes('.cad-button-surface[data-cad-variant="ghost"][aria-pressed="true"]'));
  assert.match(styles, /background-color:\s*color-mix/);
});

test("momentary pressed state has a tactile inset without affecting disabled buttons", () => {
  assert.ok(styles.includes('.cad-button-surface:active:not(:disabled):not([aria-disabled="true"])'));
  assert.match(styles, /inset 0 2px 3px/);
});
