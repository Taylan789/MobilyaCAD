import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8"
);

test("live viewport axes switch to a two-column register at 521–560px canvas width", () => {
  const marker = "UI-VIEWPORT-READOUT-CONTAINER-521-560-001";
  const markerIndex = styles.indexOf(marker);
  assert.notEqual(markerIndex, -1, "the focused viewport density rule must exist");

  const rule = styles.slice(markerIndex);
  assert.match(
    rule,
    /@container cad-viewport \(min-width: 521px\) and \(max-width: 560px\)/
  );
  assert.match(rule, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(rule, /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(3\)[\s\S]*?grid-column: 1 \/ -1/);
});

test("the narrow-canvas register keeps all three real axis values in the layout", () => {
  const markerIndex = styles.indexOf("UI-VIEWPORT-READOUT-CONTAINER-521-560-001");
  const rule = styles.slice(markerIndex);
  assert.match(rule, /nth-child\(3\) > span[\s\S]*?grid-column: 1/);
  assert.match(rule, /nth-child\(3\) > strong[\s\S]*?grid-column: 2/);
  assert.match(rule, /nth-child\(3\) > small[\s\S]*?grid-column: 3/);
});
