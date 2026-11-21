import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/workspace-viewport-fit.css", import.meta.url), "utf8");

function readLinearClamp(selector, property) {
  const pattern = new RegExp(
    selector + "\\s*\\{[^}]*" + property + ":\\s*clamp\\((\\d+)px,\\s*calc\\(([\\d.]+)vw\\s*\+\s*([\d.]+)px\),\\s*(\d+)px\)",
    "s",
  );
  const match = css.match(pattern);
  assert.ok(match, "expected a clamp-based dock width for " + selector);
  return { min: Number(match[1]), vw: Number(match[2]), offset: Number(match[3]), max: Number(match[4]) };
}

function widthAt(rule, viewportWidth) {
  return Math.max(rule.min, Math.min(rule.max, rule.vw * viewportWidth / 100 + rule.offset));
}

test("desktop dock widths scale continuously without the former breakpoint jumps", () => {
  assert.match(css, /@media\s*\(min-width:\s*1101px\)\s*and\s*\(max-width:\s*1919px\)/);
  assert.match(css, /@media\s*\(min-width:\s*1920px\)/);
  assert.doesNotMatch(css, /1361|1600/);

  const sidebar = readLinearClamp("\\.cad-sidebar", "flex");
  const inspector = readLinearClamp("\\.cad-inspector", "flex-basis");

  assert.ok(Math.abs(widthAt(sidebar, 1101) - 232) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1101) - 272) < 0.1);
  assert.ok(Math.abs(widthAt(sidebar, 1919) - 294) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1919) - 352) < 0.1);

  for (let viewportWidth = 1101; viewportWidth <= 1919; viewportWidth += 1) {
    assert.ok(widthAt(sidebar, viewportWidth) >= widthAt(sidebar, viewportWidth - 1) || viewportWidth === 1101);
    assert.ok(widthAt(inspector, viewportWidth) >= widthAt(inspector, viewportWidth - 1) || viewportWidth === 1101);
  }
});

test("spacing, toolbar and inspector controls scale within bounds and reduced-motion remains supported", () => {
  assert.match(css, /gap:\s*clamp\(7px,\s*0\.52vw,\s*10px\)/);
  assert.match(css, /padding:\s*clamp\(8px,\s*0\.63vw,\s*12px\)/);
  assert.match(css, /\.cad-viewport-toolbar[\s\S]*?height:\s*clamp\(48px/);
  assert.match(css, /\.cad-inspector-tab-list button[\s\S]*?height:\s*clamp\(31px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none/s);
});
