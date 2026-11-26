import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCard.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/catalog/FurnitureCatalogCardDragFeedback.css", import.meta.url),
  "utf8",
);

test("the existing catalog drag lifecycle exposes its live source state", () => {
  assert.match(card, /import \{ useState \} from "react"/);
  assert.match(card, /const \[isDragging, setIsDragging\] = useState\(false\)/);
  assert.match(card, /data-dragging=\{isDragging \? "true" : undefined\}/);
  assert.match(card, /setIsDragging\(true\)/);
  assert.match(card, /setIsDragging\(false\)/);
  assert.match(card, /setData\("application\/x-mobilyacad-catalog-id", item\.id\)/);
  assert.match(card, /onClick=\{onAdd\}/);
});

test("dragging gives the source card a clear technical placement status", () => {
  assert.match(card, /import "\.\/FurnitureCatalogCardDragFeedback\.css"/);
  assert.match(styles, /\.cad-catalog-card\.mc-catalog-card\[data-dragging="true"\]/);
  assert.match(styles, /content:\s*"SÜRÜKLENİYOR"/);
  assert.match(styles, /cursor:\s*grabbing/);
  assert.match(styles, /visibility:\s*hidden/);
});

test("drag feedback respects reduced motion and Windows forced colors", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /transition:\s*none !important/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /outline:\s*1px solid Highlight/);
});
