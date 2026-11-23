import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8",
);

test("catalog detail text is derived only from configured catalog counts", () => {
  assert.match(source, /item\.doorCount \?/);
  assert.match(source, /item\.drawerCount \?/);
  assert.match(source, /item\.shelfCount \?/);
  assert.match(
    source,
    /\{details && \(\s*<span className="mc-catalog-card__details">\{details\}<\/span>\s*\)\}/,
  );
  assert.doesNotMatch(source, /Özel ölçü modülü/);
});

test("removing the empty detail fallback preserves add and drag interactions", () => {
  assert.match(source, /onClick=\{onAdd\}/);
  assert.match(
    source,
    /event\.dataTransfer\.setData\("application\/x-mobilyacad-catalog-id", item\.id\)/,
  );
  assert.match(source, /onDragStart\?\.\(\)/);
  assert.match(source, /onDragEnd=\{onDragEnd\}/);
  assert.match(source, /aria-label=\{`\$\{item\.name\}, \$\{dimensions\} milimetre\. Odaya ekle\.`\}/);
});
