import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/ui/dropdown-menu.tsx", import.meta.url),
  "utf8"
);
const surface = readFileSync(
  new URL("../src/components/ui/dropdown-menu-cad-surface.css", import.meta.url),
  "utf8"
);

test("CAD dropdown panels use a defined graphite surface and motion-safe entrance", () => {
  assert.match(component, /rounded-md border border-border\/80 bg-popover/);
  assert.match(component, /shadow-lg ring-1 ring-foreground\/10/);
  assert.match(component, /motion-reduce:animate-none motion-reduce:duration-0/);
  assert.match(surface, /inset 0 1px 0/);
  assert.match(surface, /@media \(prefers-reduced-motion: reduce\)/);
});

test("mouse and keyboard highlighting is explicit for every actionable menu row", () => {
  const highlightedRows = component.match(/data-\[highlighted\]:bg-primary\/15/g) ?? [];
  assert.equal(highlightedRows.length, 4);
  assert.match(surface, /\[data-slot="dropdown-menu-item"\]\[data-highlighted\]/);
  assert.match(surface, /\[data-slot="dropdown-menu-sub-trigger"\]\[data-highlighted\]/);
  assert.match(surface, /\[data-slot="dropdown-menu-checkbox-item"\]\[data-highlighted\]/);
  assert.match(surface, /\[data-slot="dropdown-menu-radio-item"\]\[data-highlighted\]/);
});

test("checked states and command shortcuts remain visibly distinct", () => {
  assert.match(surface, /\[data-slot="dropdown-menu-checkbox-item"\]\[data-checked\]/);
  assert.match(surface, /\[data-slot="dropdown-menu-radio-item"\]\[data-checked\]/);
  assert.match(component, /rounded-sm border border-border\/80 bg-secondary\/70 px-1\.5 py-0\.5 font-mono/);
});

test("Windows forced-colors mode retains system menu, focus, and separator contrast", () => {
  assert.match(surface, /@media \(forced-colors: active\)/);
  assert.match(surface, /background: Canvas;/);
  assert.match(surface, /color: CanvasText;/);
  assert.match(surface, /outline: 1px solid Highlight;/);
  assert.match(surface, /color: HighlightText;/);
});
