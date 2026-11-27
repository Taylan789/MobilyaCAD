import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/workspace/ProjectHomeFileNote.css", import.meta.url), "utf8");

test("the home screen does not advertise a recent-project list that is not persisted", () => {
  const navigation = app.match(/<nav className="atelier-home-nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const fileSection = app.match(/<section className="atelier-bottom-row">[\s\S]*?<\/section>/)?.[0] ?? "";

  assert.match(navigation, /href="#recent">Dosya ile devam et<\/a>/);
  assert.doesNotMatch(navigation, /Son projeler/);
  assert.match(fileSection, /atelier-file-history-note/);
  assert.match(fileSection, /Son projeler listesi otomatik tutulmaz/);
  assert.doesNotMatch(fileSection, /atelier-empty-project|İlk projen burada başlayacak/);
});

test("the existing JSON open flow remains connected to project parsing", () => {
  assert.match(app, /htmlFor="atelier-open-project">Proje dosyası aç/);
  assert.match(app, /id="atelier-open-project" type="file" accept="\.json,application\/json"/);
  assert.match(app, /loadProject\(event\)\.then\(\(loaded\) => \{ if \(loaded\) startWorkspace\(\); \}\)/);
  assert.match(app, /const project = parseProjectFile\(await file\.text\(\)\)/);
  assert.match(app, /setDocumentSource\("imported"\)/);
});

test("the project-file note stays compact and responsive", () => {
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /\.atelier-file-history-note__badge/);
  assert.match(styles, /@media \(max-width: 520px\)/);
});
