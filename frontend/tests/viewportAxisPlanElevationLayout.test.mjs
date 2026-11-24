import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8"
);

test("compact desktop viewport groups X/Z plan dimensions in two columns", () => {
  assert.match(
    css,
    /@media \(min-width: 761px\) and \(max-width: 900px\) and \(min-height: 661px\)/
  );
  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/s
  );
});

test("compact desktop viewport gives Y elevation a full-width horizontal register", () => {
  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(3\)\s*\{[^}]*grid-column: 1 \/ -1;[^}]*grid-template-columns: minmax\(0, 1fr\) auto auto/s
  );
  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(3\) > span\s*\{\s*grid-column: 1;\s*grid-row: 1;/s
  );
  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(3\) > strong\s*\{\s*grid-column: 2;\s*grid-row: 1;/s
  );
  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(3\) > small\s*\{\s*grid-column: 3;\s*grid-row: 1;/s
  );
});
