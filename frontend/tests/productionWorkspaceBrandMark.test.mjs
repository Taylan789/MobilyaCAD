import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/production/ProductionWorkspace.tsx", import.meta.url),
  "utf8",
);

test("production workspace uses the original cabinet geometry brand mark", () => {
  const brandSlot = source.match(
    /<span className="mc-production-studio__brand-mark" aria-hidden="true">([\s\S]*?)<\/span>/,
  )?.[1];

  assert.ok(brandSlot, "the production brand slot should remain present");
  assert.match(brandSlot, /<svg\b/);
  assert.match(brandSlot, /viewBox="0 0 24 24"/);
  assert.match(brandSlot, /stroke="currentColor"/);
  assert.match(brandSlot, /focusable="false"/);
  assert.match(
    brandSlot,
    /<path d="M4 6\.25 12 3l8 3\.25v11\.5L12 21l-8-3\.25z" \/>/,
  );
  assert.doesNotMatch(brandSlot, /<button\b|onClick=|tabIndex=/);
  assert.doesNotMatch(source, /\bFactory\b/);
});

test("production wordmark and working navigation remain unchanged", () => {
  assert.match(source, /MOBİLYACAD \/ WORKSPACE/);
  assert.match(source, /ÜRETİM MERKEZİ/);
  assert.match(source, /onSectionChange\("report"\)/);
  assert.match(source, /onSectionChange\("materials"\)/);
  assert.match(source, /onBackToDesign/);
});
