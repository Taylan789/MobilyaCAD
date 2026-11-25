import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(
  new URL("../src/styles/ui-workspace-vertical-rhythm-001.css", import.meta.url),
  "utf8"
);
const app = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8"
);

test("inspector identity rail styles the existing live selection context without adding controls", () => {
  assert.match(app, /className="cad-inspector-header"/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /selectedPart \? "Parça seçili" : selectedFurniture \? "Mobilya seçili" : "Oda düzenleme"/);
  assert.match(styles, /\.cad-app \.cad-inspector > div\[aria-live="polite"\]/);
  assert.match(styles, /border-left:\s*2px solid #82a9c0/);
});

test("inspector identity text stays bounded when object names are long", () => {
  assert.match(styles, /text-overflow:\s*ellipsis/);
  assert.match(styles, /white-space:\s*nowrap/);
  assert.match(styles, /min-width:\s*0 !important/);
});

test("short desktop workspaces use a smaller identity rail", () => {
  assert.match(styles, /@media \(min-width:\s*821px\) and \(max-height:\s*820px\)/);
  assert.match(styles, /min-height:\s*48px !important/);
});

test("identity rail keeps reduced-motion and Windows forced-colors support", () => {
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /forced-colors:\s*active/);
  assert.match(styles, /border-left-color:\s*Highlight/);
  assert.match(styles, /background:\s*Canvas/);
});
