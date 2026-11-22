import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const sheet = readFileSync(new URL("../src/components/ui/sheet.tsx", import.meta.url), "utf8");

test("sheet sides keep long content within the viewport", () => {
  assert.ok(sheet.includes("data-[side=left]:max-h-[100dvh]"));
  assert.ok(sheet.includes("data-[side=left]:overflow-y-auto"));
  assert.ok(sheet.includes("data-[side=right]:max-h-[100dvh]"));
  assert.ok(sheet.includes("data-[side=right]:overflow-y-auto"));
  assert.ok(sheet.includes("data-[side=top]:max-h-[85dvh]"));
  assert.ok(sheet.includes("data-[side=top]:overflow-y-auto"));
  assert.ok(sheet.includes("data-[side=bottom]:max-h-[85dvh]"));
  assert.ok(sheet.includes("data-[side=bottom]:overflow-y-auto"));
});

test("mobile side sheets use viewport width and top/bottom respect safe areas", () => {
  assert.ok(sheet.includes("data-[side=left]:w-[92vw]"));
  assert.ok(sheet.includes("data-[side=left]:max-w-[420px]"));
  assert.ok(sheet.includes("data-[side=right]:w-[92vw]"));
  assert.ok(sheet.includes("data-[side=right]:max-w-[420px]"));
  assert.ok(sheet.includes("data-[side=top]:pt-[env(safe-area-inset-top)]"));
  assert.ok(sheet.includes("data-[side=bottom]:pb-[env(safe-area-inset-bottom)]"));
});

test("sheet and overlay transitions honor reduced motion", () => {
  assert.ok(sheet.includes("motion-reduce:transition-none"));
});
