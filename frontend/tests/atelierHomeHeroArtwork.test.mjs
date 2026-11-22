import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const artStyles = readFileSync(new URL("../src/styles/atelier-home-hero.css", import.meta.url), "utf8");

test("studio launch hero renders its decorative form in the existing visual column", () => {
  assert.match(app, /atelier-home-hero\.css/);
  assert.match(app, /atelier-feature-art[\s\S]*?aria-hidden="true"/);
  assert.match(app, /atelier-art-grid/);
  assert.match(app, /atelier-cube-front/);
  assert.match(app, /atelier-art-caption/);
  assert.match(app, /atelier-dim atelier-dim-x">X/);
  assert.match(app, /atelier-dim atelier-dim-y">Y/);
  assert.match(app, /atelier-dim atelier-dim-z">Z/);
});

test("launch hero visual is decorative, technical, and adapts to small screens", () => {
  assert.match(artStyles, /radial-gradient/);
  assert.match(artStyles, /\.atelier-cube-front::before/);
  assert.match(artStyles, /\.atelier-cube-front::after/);
  assert.match(artStyles, /@media\s*\(max-width:\s*560px\)/);
  assert.match(artStyles, /@media\s*\(forced-colors:\s*active\)/);
});
