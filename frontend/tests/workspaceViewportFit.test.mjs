import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/workspace-viewport-fit.css", import.meta.url), "utf8");

function readLinearClamp(selector, property) {
  const blockStart = css.indexOf(selector);
  assert.notEqual(blockStart, -1, "expected selector " + selector);
  const block = css.slice(blockStart, css.indexOf("}", blockStart));
  const declaration = block.split("\n").find((line) => line.includes(property + ":"));
  const match = declaration?.match(/clamp\((\d+)px,\s*calc\(([\d.]+)vw\s*\+\s*([\d.]+)px\),\s*(\d+)px\)/);
  assert.ok(match, "expected a clamp-based dock width for " + selector);
  return { min: Number(match[1]), vw: Number(match[2]), offset: Number(match[3]), max: Number(match[4]) };
}

function widthAt(rule, viewportWidth) {
  return Math.max(rule.min, Math.min(rule.max, rule.vw * viewportWidth / 100 + rule.offset));
}

test("desktop dock sizing is scoped and overrides the graphite shell without breakpoint jumps", () => {
  assert.match(css, /@media\s*\(min-width:\s*1101px\)\s*and\s*\(max-width:\s*2559px\)/);
  assert.match(css, /@media\s*\(min-width:\s*2560px\)/);
  assert.match(css, /\.cad-app\s+\.cad-sidebar[\s\S]*?flex-basis:/);
  assert.match(css, /\.cad-app\s+\.cad-inspector[\s\S]*?flex-basis:/);
  assert.doesNotMatch(css, /1361|1600|1919/);

  const sidebar = readLinearClamp(".cad-app .cad-sidebar", "flex");
  const inspector = readLinearClamp(".cad-app .cad-inspector", "flex");
  assert.ok(Math.abs(widthAt(sidebar, 1101) - 224) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1101) - 264) < 0.1);
  assert.ok(Math.abs(widthAt(sidebar, 2559) - 300) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 2559) - 360) < 0.1);

  for (let viewportWidth = 1102; viewportWidth <= 2559; viewportWidth += 1) {
    assert.ok(widthAt(sidebar, viewportWidth) >= widthAt(sidebar, viewportWidth - 1));
    assert.ok(widthAt(inspector, viewportWidth) >= widthAt(inspector, viewportWidth - 1));
  }
});

test("the center viewport receives more space at common desktop widths", () => {
  const sidebar = readLinearClamp(".cad-app .cad-sidebar", "flex");
  const inspector = readLinearClamp(".cad-app .cad-inspector", "flex");
  assert.ok(Math.abs(widthAt(sidebar, 1280) - 234.26) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1280) - 276.5) < 0.1);
  assert.ok(Math.abs(widthAt(sidebar, 1440) - 243.38) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1440) - 287.7) < 0.1);
  assert.match(css, /\.cad-app\s+\.cad-workspace-content[\s\S]*?gap:\s*clamp\(7px/);
  assert.match(css, /\.cad-app\s+\.cad-workspace-content[\s\S]*?padding:\s*clamp\(8px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none/s);
});
