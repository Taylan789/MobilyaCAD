import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(
  new URL("../src/components/brand/MobilyaCadLogo.tsx", import.meta.url),
  "utf8",
);
const favicon = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");

function extractPaths(svg) {
  return [...svg.matchAll(/<path\\b[^>]*\\bd="([^"]+)"[^>]*\\/>/g)].map((match) => match[1]);
}

test("brand lockup keeps its accessible name and decorative vector mark", () => {
  assert.match(component, /role="img" aria-label="MobilyaCAD Studio"/);
  assert.match(component, /mc-brand__mark[^>]*aria-hidden="true"/);
  assert.match(component, /<svg viewBox="0 0 52 52" fill="none" focusable="false">/);
  assert.match(component, /MOBİLYA<span>CAD<\\/span>/);
  assert.match(component, /descriptor && <small>\\{descriptor\\}<\\/small>/);
  assert.doesNotMatch(component, /<button\\b|onClick=|tabIndex=/);
});

test("favicon and in-app mark use the same vector paths", () => {
  const componentPaths = extractPaths(component);
  const faviconPaths = extractPaths(favicon);

  assert.equal(componentPaths.length, 5, "the cabinet mark should retain its five path strokes");
  assert.deepEqual(faviconPaths, componentPaths);
  assert.match(favicon, /viewBox="0 0 52 52"/);
  assert.match(favicon, /<circle cx="26" cy="27.2" r="1.6" fill="#E1B48F"\\/>/);
});

test("brand mark keeps the steel-blue and copper accent palette", () => {
  for (const source of [component, favicon]) {
    assert.match(source, /#17222B/);
    assert.match(source, /#8FB2C8/);
    assert.match(source, /#C39470/);
    assert.match(source, /#E1B48F/);
  }
});
