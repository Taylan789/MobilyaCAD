import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

function getSearchInputMarkup(id) {
  const start = app.indexOf(`id="${id}"`);
  assert.notEqual(start, -1, `expected ${id} input`);
  const end = app.indexOf("/>", start);
  assert.notEqual(end, -1, `expected ${id} input to close`);
  return app.slice(start, end);
}

test("Escape clears the catalog search without changing the catalog filter", () => {
  const markup = getSearchInputMarkup("cad-catalog-search");
  assert.match(markup, /onKeyDown=\{\(event\) => \{/);
  assert.match(markup, /event\.key === "Escape" && catalogSearch/);
  assert.match(markup, /event\.preventDefault\(\)/);
  assert.match(markup, /setCatalogSearch\(""/);
});

test("Escape clears the scene search and leaves the scene visibility controls intact", () => {
  const markup = getSearchInputMarkup("cad-scene-search");
  assert.match(markup, /onKeyDown=\{\(event\) => \{/);
  assert.match(markup, /event\.key === "Escape" && sceneSearch/);
  assert.match(markup, /event\.preventDefault\(\)/);
  assert.match(markup, /setSceneSearch\(""/);
});
