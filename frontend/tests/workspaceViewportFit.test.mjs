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

function viewportAt(viewportWidth, sidebar, inspector) {
  const gap = Math.max(6, Math.min(9, viewportWidth * 0.0045));
  const padding = Math.max(6, Math.min(9, viewportWidth * 0.005));
  return viewportWidth - widthAt(sidebar, viewportWidth) - widthAt(inspector, viewportWidth) - gap - 2 * padding;
}

test("desktop dock widths scale continuously and release more width to the model viewport", () => {
  assert.match(css, /@media\s*\(min-width:\s*1101px\)\s*and\s*\(max-width:\s*1919px\)/);
  assert.match(css, /@media\s*\(min-width:\s*1920px\)/);
  assert.doesNotMatch(css, /1361|1600/);

  const sidebar = readLinearClamp(".cad-sidebar", "flex");
  const inspector = readLinearClamp(".cad-inspector", "flex-basis");

  assert.ok(Math.abs(widthAt(sidebar, 1101) - 232) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1101) - 260) < 0.1);
  assert.ok(Math.abs(widthAt(sidebar, 1280) - 232.04) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1280) - 260) < 0.1);
  assert.ok(Math.abs(widthAt(sidebar, 1440) - 242.92) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1440) - 266.56) < 0.1);
  assert.ok(Math.abs(widthAt(sidebar, 1919) - 275.492) < 0.1);
  assert.ok(Math.abs(widthAt(inspector, 1919) - 302) < 0.1);

  const wideDesktop = css.slice(css.indexOf("@media (min-width: 1920px)"));
  assert.match(wideDesktop, /\.cad-sidebar[\s\S]*?flex-basis:\s*276px/);
  assert.match(wideDesktop, /\.cad-inspector[\s\S]*?flex-basis:\s*302px/);

  assert.ok(viewportAt(1280, sidebar, inspector) > 769);
  assert.ok(viewportAt(1440, sidebar, inspector) > 900);

  for (let viewportWidth = 1101; viewportWidth <= 1919; viewportWidth += 1) {
    assert.ok(widthAt(sidebar, viewportWidth) >= widthAt(sidebar, viewportWidth - 1) || viewportWidth === 1101);
    assert.ok(widthAt(inspector, viewportWidth) >= widthAt(inspector, viewportWidth - 1) || viewportWidth === 1101);
  }
});

test("spacing, toolbar and inspector controls scale within bounds and reduced-motion remains supported", () => {
  assert.match(css, /gap:\s*clamp\(6px,\s*0\.45vw,\s*9px\)/);
  assert.match(css, /padding:\s*clamp\(6px,\s*0\.5vw,\s*9px\)/);
  assert.match(css, /\.cad-viewport-toolbar[\s\S]*?height:\s*clamp\(48px/);
  assert.match(css, /\.cad-inspector-tab-list button[\s\S]*?height:\s*clamp\(31px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none/s);
});
