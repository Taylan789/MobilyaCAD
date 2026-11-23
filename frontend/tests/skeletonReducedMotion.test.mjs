import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";


const source = readFileSync(new URL("../src/components/ui/skeleton.tsx", import.meta.url), "utf8");

test("skeleton loading placeholder is decorative to assistive technology", () => {
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /data-slot="skeleton"/);
});

test("skeleton pulse is only animated when motion is allowed", () => {
  assert.match(source, /motion-safe:animate-pulse/);
  assert.match(source, /motion-reduce:animate-none/);
  assert.match(source, /rounded-md bg-muted/);
});
