import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8"
);
const scene = readFileSync(
  new URL("../src/components/viewport/Scene3D.tsx", import.meta.url),
  "utf8"
);

test("live room width, length, and height map to the actual X, Z, and Y scene axes", () => {
  const widthLabel = scene.indexOf("<span>GENİŞLİK</span>");
  const lengthLabel = scene.indexOf("<span>UZUNLUK</span>");
  const heightLabel = scene.indexOf("<span>YÜKSEKLİK</span>");

  assert.ok(widthLabel >= 0 && lengthLabel > widthLabel && heightLabel > lengthLabel);
  assert.ok(scene.indexOf('{width.toLocaleString("tr-TR")}', widthLabel) > widthLabel);
  assert.ok(scene.indexOf('{length.toLocaleString("tr-TR")}', lengthLabel) > lengthLabel);
  assert.ok(scene.indexOf('{height.toLocaleString("tr-TR")}', heightLabel) > heightLabel);

  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(1\) > span::before\s*\{[^}]*content:\s*"X"/s
  );
  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(2\) > span::before\s*\{[^}]*content:\s*"Z"/s
  );
  assert.match(
    css,
    /\.cad-viewport-dimension-readout__dimensions > div:nth-child\(3\) > span::before\s*\{[^}]*content:\s*"Y"/s
  );
});

test("dimension register has distinct 1440x900 and 1280x800 desktop density rules", () => {
  assert.match(css, /@media \(min-width: 1321px\) and \(min-height: 821px\)/);
  assert.match(css, /width: min\(312px, calc\(100% - 24px\)\)/);
  assert.match(css, /@media \(min-width: 761px\) and \(max-width: 1320px\) and \(min-height: 661px\)/);
  assert.match(css, /width: min\(274px, calc\(100% - 20px\)\)/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
});

test("dimension register keeps reduced-motion and Windows forced-colors support", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /color: Highlight/);
  assert.match(css, /background: Canvas/);
});
