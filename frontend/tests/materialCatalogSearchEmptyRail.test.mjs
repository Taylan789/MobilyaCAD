import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("../src/components/production/MaterialCatalogManager.tsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/production/MaterialCatalogManagerEmptyState.css", import.meta.url),
  "utf8"
);
const railStyles = styles.split("/* UI-MATERIAL-SEARCH-EMPTY-RAIL-001")[1] ?? "";

test("malzeme arama boş durumu gerçek sorgu ve filtre bağlamını korur", () => {
  const emptyState = componentSource.match(
    /<div className="mc-material-library__empty mc-material-library__empty--search" role="status">([\s\S]*?)<\/div>\s*\) : \(/
  );

  assert.ok(emptyState, "arama sonucu boş durumu mevcut olmalı");
  assert.match(emptyState[1], /Eşleşen malzeme bulunamadı/);
  assert.match(emptyState[1], /searchQuery\.trim\(\)/);
  assert.match(emptyState[1], /activeFilterLabel/);
  assert.match(emptyState[1], /Aktif arama ve filtre/);
  assert.match(emptyState[1], /Filtreleri temizle/);
  assert.match(emptyState[1], /setSearchQuery\(""\)/);
  assert.match(emptyState[1], /setMaterialFilter\("all"\)/);
});

test("arama boş durumu gerçek filtre temizleme eylemini kompakt teknik raya yerleştirir", () => {
  assert.ok(railStyles.length > 0, "teknik arayüz kuralları mevcut olmalı");
  assert.match(
    railStyles,
    /\.mc-material-library__empty\.mc-material-library__empty--search\s*\{[\s\S]*?display:\s*grid;/
  );
  assert.match(railStyles, /min-height:\s*112px;/);
  assert.match(railStyles, /grid-template-columns:\s*32px minmax\(0, 1fr\) auto;/);
  assert.match(railStyles, /grid-column:\s*3;/);
  assert.match(railStyles, /white-space:\s*nowrap;/);
});

test("kompakt malzeme boş durumu container-responsive, reduced-motion ve forced-colors desteğini korur", () => {
  assert.match(
    railStyles,
    /@container material-catalog \(max-width: 560px\)[\s\S]*?grid-template-columns:\s*30px minmax\(0, 1fr\)/
  );
  assert.match(railStyles, /@media \(max-height: 700px\)/);
  assert.match(railStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(railStyles, /@media \(forced-colors: active\)/);
  assert.match(railStyles, /outline:\s*2px solid Highlight/);
});
