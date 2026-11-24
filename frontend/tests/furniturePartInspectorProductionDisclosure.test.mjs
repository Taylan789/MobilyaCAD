import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/workspace/FurniturePartInspector.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/workspace/FurniturePartInspector.css", import.meta.url),
  "utf8",
);

test("production scope stays visible as a native, initially collapsed disclosure", () => {
  const disclosure = component.match(/<details className="cad-part-production-note">([\s\S]*?)<\/details>/);
  assert.ok(disclosure, "production scope must use a native details element");
  assert.match(disclosure[1], /<summary>[\s\S]*?ÜRETİM KAPSAMI[\s\S]*?<\/summary>/);
  assert.doesNotMatch(disclosure[0], /<details[^>]*\bopen\b/);
  assert.match(
    disclosure[1],
    /Kesim listesi şu anda desteklenen mobilya konstrüksiyon kurallarından hesaplanır\. Bu görsel parça düzenlemeleri üretim kesim ölçülerini değiştirmez\./,
  );
  assert.match(disclosure[1], /<ChevronDown aria-hidden="true" \/>/);
});

test("production scope disclosure has keyboard focus and a clear expanded state", () => {
  assert.match(styles, /details\.cad-part-production-note/);
  assert.match(styles, /cad-part-production-note\[open\] > summary/);
  assert.match(styles, /summary:focus-visible/);
  assert.match(styles, /cursor: pointer/);
  assert.match(component, /Kesim listesi şu anda desteklenen mobilya konstrüksiyon kurallarından hesaplanır/);
});

test("production scope disclosure respects reduced motion and forced colors", () => {
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /transition: none/);
  assert.match(styles, /@media \(forced-colors: active\)/);
  assert.match(styles, /CanvasText/);
  assert.match(styles, /outline-color: Highlight/);
});
