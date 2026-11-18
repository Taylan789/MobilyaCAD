import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const buildOnlyPackages = ["@tailwindcss/vite", "shadcn", "tailwindcss"];

test("Vite and CSS tooling stay in the build dependency graph", () => {
  for (const name of buildOnlyPackages) {
    assert.equal(manifest.dependencies?.[name], undefined, `${name} must not ship as a runtime dependency`);
    assert.ok(manifest.devDependencies?.[name], `${name} must remain available to the build`);
    assert.equal(lock.packages[""].dependencies?.[name], undefined);
    assert.equal(lock.packages[""].devDependencies?.[name], manifest.devDependencies[name]);
  }

  assert.equal(manifest.devDependencies.vite, "^8.3.6");
});
