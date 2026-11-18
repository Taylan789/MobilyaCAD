import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

const buildTools = [
  "@tailwindcss/vite",
  "@vitejs/plugin-react",
  "oxlint",
  "shadcn",
  "tailwindcss",
  "typescript",
  "vite",
];

test("frontend build tooling stays outside the production dependency graph", () => {
  for (const name of buildTools) {
    assert.ok(packageJson.devDependencies?.[name], `${name} must be declared as a development dependency`);
    assert.equal(packageJson.dependencies?.[name], undefined, `${name} must not be a runtime dependency`);
    const locked = packageLock.packages[`node_modules/${name}`];
    assert.ok(locked, `${name} must have a lockfile entry`);
    assert.equal(locked.dev, true, `${name} must remain development-only in the lockfile`);
  }
});

test("the picomatch advisory chain remains development-only", () => {
  const protectedPaths = [
    "node_modules/@dotenvx/dotenvx",
    "node_modules/micromatch",
    "node_modules/micromatch/node_modules/picomatch",
    "node_modules/picomatch",
    "node_modules/tinyglobby",
  ];

  for (const path of protectedPaths) {
    const locked = packageLock.packages[path];
    assert.ok(locked, `${path} must remain represented in the lockfile`);
    assert.equal(locked.dev, true, `${path} must not enter the production dependency graph`);
  }
});

test("the 3D runtime remains in production dependencies", () => {
  for (const name of ["@react-three/drei", "@react-three/fiber", "react", "react-dom", "three"]) {
    assert.ok(packageJson.dependencies?.[name], `${name} must remain a runtime dependency`);
    assert.notEqual(packageLock.packages[`node_modules/${name}`]?.dev, true, `${name} must not be classified as development-only`);
  }
});
