import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles/atelier-home-hero.css", import.meta.url), "utf8");

const heroStart = app.indexOf('<section className="atelier-welcome">');
const heroEnd = app.indexOf('<section className="atelier-section atelier-start-section"', heroStart);
const hero = app.slice(heroStart, heroEnd);

test("the launch hero fills its secondary column with a decorative cabinet study", () => {
  assert.match(app, /import\s+["']\.\/styles\/atelier-home-hero\.css["']/);
  assert.match(hero, /className="atelier-feature-art" aria-hidden="true"/);
  assert.match(hero, /<svg className="atelier-art-assembly"/);
  assert.match(hero, /atelier-art-caption/);
  assert.doesNotMatch(hero, /\b\d+(?:\.\d+)?\s*(?:mm|cm|in)\b/i);
});

test("hero illustration remains responsive and motion-safe", () => {
  assert.match(styles, /\.atelier-art-assembly/);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*560px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
