import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("starting the CAD workspace is immediate and does not simulate loading", () => {
  const startWorkspace = app.match(
    /function startWorkspace\(\)\s*\{([\s\S]*?)\n\s*\}/,
  );

  assert.ok(startWorkspace, "workspace entry action must remain explicit");
  assert.match(startWorkspace[1], /setWorkspaceOpen\(true\)/);
  assert.doesNotMatch(startWorkspace[1], /setTimeout|workspaceLoading|setWorkspaceLoading/);
  assert.doesNotMatch(app, /workspaceLoading|setWorkspaceLoading|setTimeout/);
});

test("opening a project enters the workspace only after a successful JSON load", () => {
  assert.match(
    app,
    /loadProject\(event\)\.then\(\(loaded\) => \{ if \(loaded\) startWorkspace\(\); \}\)/,
  );
});
