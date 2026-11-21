import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.css", import.meta.url),
  "utf8",
);

test("material inventory keeps live counts in the header and filter controls", () => {
  assert.match(component, /mc-material-library__record-count/);
  assert.match(component, /materials\.length\.toLocaleString\("tr-TR"\)\} KAYIT/);
  assert.match(component, /aria-label="Malzeme kullanım filtresi"/);
  assert.match(component, /Kullanılan\s*<span>\{usedMaterialCount\}<\/span>/);
  assert.match(component, /Atanmamış\s*<span>\{unusedMaterialCount\}<\/span>/);
});

test("material inventory avoids dashboard metric cards and their responsive rules", () => {
  assert.doesNotMatch(component, /mc-material-library__metrics|mc-material-library__metric/);
  assert.doesNotMatch(styles, /mc-material-library__metrics|mc-material-library__metric/);
  assert.match(styles, /mc-material-library__workspace/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(styles, /@media \(max-width: 520px\)/);
});
