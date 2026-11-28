import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/components/production/ProductionWorkspace.tsx", import.meta.url), "utf8");
const disclosureCss = readFileSync(new URL("../src/components/production/ProductionWorkspaceScopeDisclosure.css", import.meta.url), "utf8");

test("production scope notice is a collapsed native disclosure", () => {
  assert.match(workspace, /<details className="mc-production-studio__scope">/);
  assert.match(workspace, /<summary[\s\S]*?Üretim kapsamı[\s\S]*?<\/summary>/);
  assert.match(workspace, /<p>Bu sürüm kesim listesi,[\s\S]*?<\/p>/);
  assert.doesNotMatch(workspace, /<details[^>]*\bopen\b/);
  assert.match(workspace, /ChevronDown/);
});

test("scope disclosure supports keyboard focus, reduced motion and high contrast", () => {
  assert.match(disclosureCss, /summary:focus-visible/);
  assert.match(disclosureCss, /\.mc-production-studio__scope\[open\]/);
  assert.match(disclosureCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(disclosureCss, /forced-colors:\s*active/);
});
