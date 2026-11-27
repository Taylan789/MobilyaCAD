import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/components/viewport/ViewportCameraWorkbench.css", import.meta.url),
  "utf8",
);
const scene = readFileSync(
  new URL("../src/components/viewport/Scene3D.tsx", import.meta.url),
  "utf8",
);
const change = css.slice(
  css.lastIndexOf("UI-VIEWPORT-CAMERA-DOCK-CONTAINER-FIT-001"),
);

test("camera dock compacts against the actual canvas width when side docks consume space", () => {
  assert.match(css, /\.cad-viewport\s*\{[^}]*container:\s*cad-viewport\s*\/\s*inline-size\s*;/);

  const tier = change.split("@container cad-viewport (max-width: 760px)")[1]?.split("@container")[0] ?? "";
  assert.match(tier, /max-width:\s*calc\(100% - 16px\)/);
  assert.match(tier, /\.cad-viewport-camera-tools__label\s*\{\s*display:\s*none/);
  assert.match(tier, /\.cad-viewport-camera-tools button\s*\{[^}]*min-height:\s*27px[^}]*font-size:\s*8px/s);
  assert.match(tier, /button svg\s*\{[^}]*width:\s*12px[^}]*height:\s*12px/s);
});

test("narrow canvas keeps every camera action present and scrollable", () => {
  const tier = change.split("@container cad-viewport (max-width: 560px)")[1] ?? "";
  assert.match(tier, /top:\s*48px/);
  assert.match(tier, /max-width:\s*calc\(100% - 12px\)/);
  assert.match(tier, /min-width:\s*30px/);
  assert.match(css, /\.cad-viewport-camera-tools\s*\{[^}]*overflow-x:\s*auto/s);
  assert.doesNotMatch(change, /\.cad-viewport-camera-tools button\s*\{[^}]*display:\s*none/s);
  assert.match(scene, /aria-label="Odayı görünüme sığdır"/);
  assert.match(scene, /aria-label="Perspektif görünüş"/);
  assert.match(scene, /aria-label="Üst görünüş"/);
  assert.match(scene, /aria-label="Ön görünüş"/);
  assert.match(scene, /aria-label="Arka görünüş"/);
  assert.match(scene, /aria-label="Sol görünüş"/);
  assert.match(scene, /aria-label="Sağ görünüş"/);
});

test("camera dock keeps motion and high-contrast fallbacks", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /button:focus-visible/);
});
