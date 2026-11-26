import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/styles/ui-workspace-vertical-rhythm-001.css", import.meta.url),
  "utf8",
);

test("compact desktop heights reclaim space while keeping the viewport and production dock present", () => {
  const start = css.indexOf(
    "@media (min-width: 821px) and (min-height: 701px) and (max-height: 820px)",
  );
  assert.ok(start >= 0, "the short-desktop range is explicit and excludes mobile widths");
  const block = css.slice(start);
  assert.match(
    block,
    /grid-template-rows:\s*34px 46px minmax\(240px, 1fr\) clamp\(128px, 16vh, 160px\)/,
  );
  assert.match(block, /\.cad-app \.studio-workspace-heading\s*\{[^}]*height:\s*34px/s);
  assert.match(block, /\.cad-app \.cad-viewport-toolbar\s*\{[^}]*height:\s*46px/s);
  assert.match(block, /\.cad-app \.cad-bottom-dock-header\s*\{[^}]*flex:\s*0 0 40px/s);
  assert.match(block, /\.cad-app \.cad-dock-table th,[\s\S]*?padding-block:\s*4px/);
});

test("collapsed production dock remains reachable in the compact-height layout", () => {
  const start = css.indexOf(
    "@media (min-width: 821px) and (min-height: 701px) and (max-height: 820px)",
  );
  const block = css.slice(start);
  assert.match(
    block,
    /\.cad-app \.cad-main-area\.has-collapsed-production-dock\s*\{[^}]*34px 46px minmax\(240px, 1fr\) 58px/s,
  );
  assert.match(
    block,
    /\.cad-app \.cad-bottom-dock\.is-collapsed \.cad-bottom-dock-header\s*\{[^}]*height:\s*100%/s,
  );
});
