import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const logo = readFileSync(
  new URL("../src/components/brand/MobilyaCadLogo.tsx", import.meta.url),
  "utf8",
);
const favicon = readFileSync(
  new URL("../public/favicon.svg", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/brand/MobilyaCadLogo.css", import.meta.url),
  "utf8",
);

function pathData(source) {
  return Array.from(
    source.matchAll(/<path\b[^>]*\bd="([^"]+)"/g),
    (match) => match[1],
  );
}

test("CAD wordmark and browser favicon share the isometric carcass and drafting dimensions", () => {
  assert.deepEqual(pathData(logo), pathData(favicon));
  assert.equal(pathData(logo).length, 7);
  assert.match(logo, /viewBox="0 0 64 64"/);
  assert.match(favicon, /viewBox="0 0 64 64"/);
  assert.match(logo, /mc-brand-mark__dimension-vertical/);
  assert.match(logo, /mc-brand-mark__dimension-base/);
});

test("brand mark remains a labeled, non-interactive identity element", () => {
  assert.match(logo, /role="img" aria-label="MobilyaCAD Studio"/);
  assert.match(logo, /className="mc-brand__mark" aria-hidden="true"/);
  assert.match(logo, /className="mc-brand__mark-art"/);
  assert.match(logo, /descriptor = "STUDIO"/);
  assert.match(logo, /\{descriptor && <small>\{descriptor\}<\/small>\}/);
});

test("vector mark uses steel-blue drafting lines and supports reduced motion and forced colors", () => {
  assert.match(styles, /shape-rendering: geometricPrecision/);
  assert.match(styles, /mc-brand-mark__dimension-vertical/);
  assert.match(styles, /mc-brand-mark__dimension-base/);
  assert.match(styles, /#8eb5ce/i);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /forced-colors: active/);
  assert.match(styles, /CanvasText/);
  assert.match(styles, /Highlight/);
});
