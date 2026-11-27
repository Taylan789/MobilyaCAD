import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const layout = readFileSync(
  new URL("../src/styles/atelier-home-workbench-layout-001.css", import.meta.url),
  "utf8",
);
const delivery = layout.slice(
  layout.indexOf("/* UI-LAUNCH-EMPTY-PROJECT-CTA-001"),
);

test("the recent-project empty state keeps its existing new-project action", () => {
  assert.match(
    app,
    /<button className="atelier-empty-project" onClick=\{\(\) => startNewProject\(\)\}>[\s\S]*?İlk projen burada başlayacak/,
  );
});

test("the empty-project action uses a compact graphite and steel hierarchy", () => {
  assert.match(delivery, /\.atelier-home \.atelier-empty-project\s*\{[^}]*min-height:\s*72px;[^}]*border-left:\s*2px solid #86abc2 !important;/s);
  assert.match(delivery, /\.atelier-home \.atelier-empty-plus\s*\{[^}]*flex:\s*0 0 36px;[^}]*border:\s*1px solid #607d8f !important;/s);
  assert.match(delivery, /\.atelier-home \.atelier-empty-project small\s*\{[^}]*line-height:\s*1\.45;/s);
  assert.match(delivery, /\.atelier-home \.atelier-empty-project:hover \.atelier-empty-arrow/);
});

test("the empty-project action remains keyboard and accessibility friendly", () => {
  assert.match(delivery, /\.atelier-home \.atelier-empty-project:focus-visible\s*\{[^}]*outline:\s*2px solid #a9c7d8 !important;/s);
  assert.match(delivery, /@media \(max-width:\s*560px\)/);
  assert.match(delivery, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(delivery, /@media \(forced-colors:\s*active\)/);
});
