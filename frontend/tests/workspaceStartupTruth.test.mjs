import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { openWorkspaceImmediately } from "../src/components/workspace/workspaceStartup.ts";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8"
);

test("kapalı çalışma alanı çağrı sırasında hemen açılır", () => {
  let isOpen = false;
  let openCalls = 0;

  openWorkspaceImmediately(isOpen, () => {
    openCalls += 1;
    isOpen = true;
  });

  assert.equal(isOpen, true);
  assert.equal(openCalls, 1);
});

test("açık çalışma alanı ikinci kez açılmaz", () => {
  let openCalls = 0;

  openWorkspaceImmediately(true, () => {
    openCalls += 1;
  });

  assert.equal(openCalls, 0);
});

test("uygulama açılışında sahte yükleniyor ekranı veya yapay zamanlayıcı yoktur", () => {
  assert.match(appSource, /openWorkspaceImmediately\(workspaceOpen/);
  assert.doesNotMatch(appSource, /workspaceLoading|cad-loading-screen|setTimeout/);
});
