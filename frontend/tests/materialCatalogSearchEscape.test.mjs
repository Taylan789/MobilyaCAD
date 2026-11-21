import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manager = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8",
);

function getMaterialSearchInput() {
  const label = 'aria-label="Malzeme kataloğunda ara"';
  const labelIndex = manager.indexOf(label);
  assert.notEqual(labelIndex, -1, "expected material catalog search input");

  const start = manager.lastIndexOf("<Input", labelIndex);
  const end = manager.indexOf("/>", labelIndex);
  assert.notEqual(start, -1, "expected material search Input");
  assert.notEqual(end, -1, "expected material search Input to close");
  return manager.slice(start, end);
}

test("Escape clears a non-empty material search and prevents default", () => {
  const input = getMaterialSearchInput();
  assert.match(input, /onKeyDown=\{\(event\) => \{/);
  assert.match(input, /event\.key === "Escape" && searchQuery/);
  assert.match(input, /event\.preventDefault\(\)/);
  assert.match(input, /setSearchQuery\(""/);
});

test("material search Escape handler stays scoped to the search input", () => {
  const input = getMaterialSearchInput();
  assert.match(input, /aria-label="Malzeme kataloğunda ara"/);
  assert.doesNotMatch(input, /setMaterialFilter/);
});
