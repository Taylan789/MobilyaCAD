import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const rails = readFileSync(new URL("../public/atelier-start-card-rails.css", import.meta.url), "utf8");

test("the real studio entry links the launch-card refinement stylesheet", () => {
  assert.match(html, /href="\.\/atelier-start-card-rails\.css"/);
  assert.match(rails, /\.atelier-home \.atelier-start-card/);
  assert.match(rails, /\.atelier-home \.atelier-start-card::before/);
  assert.match(rails, /\.atelier-home \.atelier-card-visual/);
});

test("launch cards retain keyboard, responsive, reduced-motion and high-contrast support", () => {
  assert.match(rails, /:focus-visible/);
  assert.match(rails, /@media \(max-width: 920px\)/);
  assert.match(rails, /@media \(max-width: 600px\)/);
  assert.match(rails, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(rails, /@media \(forced-colors: active\)/);
});
