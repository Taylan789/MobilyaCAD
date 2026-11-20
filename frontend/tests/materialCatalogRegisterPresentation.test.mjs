import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8",
);
const styles = await readFile(
  new URL("../src/components/production/MaterialCatalogManager.css", import.meta.url),
  "utf8",
);

test("material usage summary is a compact semantic register, not KPI cards", () => {
  assert.match(component, /<dl className="mc-material-library__register" aria-label="Malzeme kullanım özeti">/);
  assert.match(component, /<dt>PROJEDE KULLANILAN<\/dt>\s*<dd>\{usedMaterialCount\.toLocaleString\("tr-TR"\)\}<\/dd>/);
  assert.match(component, /<dt>ATANMAMIŞ<\/dt>\s*<dd>\{unusedMaterialCount\.toLocaleString\("tr-TR"\)\}<\/dd>/);
  assert.doesNotMatch(component, /mc-material-library__metrics|mc-material-library__metric/);
  assert.doesNotMatch(styles, /\.mc-material-library__metrics|\.mc-material-library__metric/);
});

test("material register counts remain derived from current project references", () => {
  assert.match(
    component,
    /const usedMaterialCount = materials\.filter\(\(material\) =>[\s\S]*?referencedMaterialIds\.has\(material\.id\)\s*\)\.length;/,
  );
  assert.match(component, /const unusedMaterialCount = materials\.length - usedMaterialCount;/);
  assert.match(component, /aria-label="Malzeme kullanım özeti"/);
});

test("material editing, usage navigation, responsive layout, and reduced motion remain wired", () => {
  assert.match(component, /addMaterialCatalogEntry\(materials, entry\)/);
  assert.match(component, /updateMaterialCatalogEntry\(materials, editingId, entry\)/);
  assert.match(component, /removeMaterialCatalogEntry\(materials, id, \[\.\.\.referencedMaterialIds\]\)/);
  assert.match(component, /onSelectUsage\(usage\.furnitureId, usage\.partId \?\? null\)/);
  assert.match(styles, /@media \(max-width: 520px\)[\s\S]*?\.mc-material-library__register/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
