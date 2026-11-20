import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const entry = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
const boundary = readFileSync(new URL("../src/components/ui/AppErrorBoundary.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/components/ui/AppErrorBoundary.css", import.meta.url), "utf8");

test("the root app is protected by a render-error boundary", () => {
  assert.match(entry, /<AppErrorBoundary>\s*<App\s*\/>\s*<\/AppErrorBoundary>/);
  assert.match(entry, /import \{ AppErrorBoundary \} from ['"]\.\/components\/ui\/AppErrorBoundary['"]/);
});

test("the fallback offers a real reload action and accessible error detail disclosure", () => {
  assert.match(boundary, /role="alert"/);
  assert.match(boundary, /window\.location\.reload\(\)/);
  assert.match(boundary, /<details className="mc-app-error__details">/);
  assert.match(boundary, /<code>\{this\.state\.error\.message\}<\/code>/);
  assert.doesNotMatch(boundary, /error\.stack/);
});

test("error state keeps keyboard focus, forced colors and reduced motion support", () => {
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media \(forced-colors: active\)/);
});
