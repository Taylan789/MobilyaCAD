import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/styles/ui-inspector-layout-001.css", import.meta.url), "utf8");
const roomStart = app.indexOf('<TabsContent value="room"');
const furnitureStart = app.indexOf('<TabsContent value="furniture"', roomStart);
assert.ok(roomStart >= 0 && furnitureStart > roomStart, "expected the real room inspector tab");
const roomMarkup = app.slice(roomStart, furnitureStart);

test("room dimensions keep their real width, length and height inputs in X/Z/Y order", () => {
  const width = roomMarkup.indexOf('id="room-width"');
  const length = roomMarkup.indexOf('id="room-length"');
  const height = roomMarkup.indexOf('id="room-height"');
  assert.ok(width >= 0 && width < length && length < height, "expected width → length → height order");
  assert.match(roomMarkup, /<Label htmlFor="room-width">Genişlik<\/Label>/);
  assert.match(roomMarkup, /<Label htmlFor="room-length">Uzunluk<\/Label>/);
  assert.match(roomMarkup, /<Label htmlFor="room-height">Yükseklik<\/Label>/);
  assert.match(css, /\.cad-property-section:first-child > \.cad-field:nth-child\(2\) > label::after\s*\{\s*content:\s*"X \/ PLAN"/);
  assert.match(css, /\.cad-property-section:first-child > \.cad-field:nth-child\(3\) > label::after\s*\{\s*content:\s*"Z \/ PLAN"/);
  assert.match(css, /\.cad-property-section:first-child > \.cad-field:nth-child\(4\) > label::after\s*\{\s*content:\s*"Y \/ DÜŞEY"/);
});

test("plan dimensions stay side-by-side and elevation is a distinct full-width row", () => {
  assert.match(css, /\.cad-property-section:first-child > \.cad-field:nth-child\(2\)[\s\S]*?\.cad-field:nth-child\(3\)/);
  assert.match(css, /\.cad-property-section:first-child > \.cad-field:nth-child\(4\)\s*\{[^}]*grid-column:\s*1 \/ -1/);
  assert.match(css, /border-left:\s*2px solid #91b4c9/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
});

test("room dimension register remains responsive and supports reduced motion and forced colors", () => {
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*?grid-column:\s*1/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /CanvasText/);
});
