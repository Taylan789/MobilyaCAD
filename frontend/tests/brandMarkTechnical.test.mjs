import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const logoSource = readFileSync(new URL("../src/components/brand/MobilyaCadLogo.tsx", import.meta.url), "utf8");
const faviconSource = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");

test("brand mark is an accessible, self-contained technical cabinet monogram", () => {
  assert.match(logoSource, /role="img" aria-label="MobilyaCAD Studio"/);
  assert.match(logoSource, /aria-hidden="true"/);
  assert.match(logoSource, /viewBox="0 0 52 52"/);
  assert.match(logoSource, /d="M17 35V18\.5L26 25\.5L35 18\.5V35"/);
  assert.match(logoSource, /stroke="#8FB2C8"/);
  assert.match(logoSource, /stroke="#C39470"/);
  assert.match(logoSource, /descriptor && <small>\{descriptor\}<\/small>/);
  assert.doesNotMatch(logoSource, /<image\b|https?:\/\//);
});

test("site favicon uses the same monogram geometry and palette", () => {
  assert.match(faviconSource, /viewBox="0 0 52 52"/);
  assert.match(faviconSource, /d="M17 35V18\.5L26 25\.5L35 18\.5V35"/);
  assert.match(faviconSource, /#8FB2C8/);
  assert.match(faviconSource, /#C39470/);
  assert.doesNotMatch(faviconSource, /<image\b|https?:\/\//);
});
