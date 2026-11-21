import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebar = readFileSync(new URL("../src/components/ui/sidebar.tsx", import.meta.url), "utf8");
const finish = readFileSync(new URL("../src/components/ui/sidebar-cad-finish.css", import.meta.url), "utf8");

test("CAD sidebar loads a scoped technical finish without changing panel behavior", () => {
  assert.match(sidebar, /import ["']\.\/sidebar-cad-finish\.css["']/);
  assert.match(finish, /\.cad-sidebar \[data-slot=["']sidebar-inner["']]/);
  assert.match(finish, /repeating-linear-gradient/);
  assert.match(finish, /data-active=["']true["']/);
  assert.match(finish, /studio-sidebar-switch button\.active/);
});

test("CAD sidebar keeps focus, reduced-motion and forced-colors cues", () => {
  assert.match(finish, /focus-visible/);
  assert.match(finish, /prefers-reduced-motion:\s*reduce/);
  assert.match(finish, /forced-colors:\s*active/);
  assert.match(finish, /Highlight/);
});
