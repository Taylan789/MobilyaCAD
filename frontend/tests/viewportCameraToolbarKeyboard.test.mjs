import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scene = readFileSync(
  new URL("../src/components/viewport/Scene3D.tsx", import.meta.url),
  "utf8",
);
const toolbarStart = scene.indexOf('className="cad-viewport-camera-tools"');
const toolbarEnd = scene.indexOf("</div>", toolbarStart);
const toolbar = scene.slice(toolbarStart, toolbarEnd);

test("viewport camera toolbar uses roving focus and keyboard navigation", () => {
  assert.match(scene, /function handleCameraToolbarKeyDown\(event: KeyboardEvent<HTMLDivElement>\)/);
  assert.match(scene, /querySelectorAll<HTMLButtonElement>\("button:not\(:disabled\)"\)/);
  assert.match(scene, /buttons\[nextIndex\]\?\.focus\(\)/);
  assert.match(scene, /event\.preventDefault\(\)/);
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
    assert.ok(scene.includes('key === "' + key + '"' + '), "missing keyboard support for " + key);
  }
  assert.match(toolbar, /onKeyDown=\{handleCameraToolbarKeyDown\}/);
});

test("each enabled toolbar control can become its single tab stop", () => {
  assert.equal((toolbar.match(/<button/g) ?? []).length, 8);
  for (let index = 0; index < 8; index += 1) {
    const tabIndex = index === 7
      ? "tabIndex={selectedFurnitureId && cameraToolbarFocusIndex === 7 ? 0 : -1}"
      : "tabIndex={cameraToolbarFocusIndex === " + index + " ? 0 : -1}";
    assert.ok(scene.includes(tabIndex), "missing roving tab index for toolbar control " + index);
    assert.ok(
      scene.includes("onFocus={() => setCameraToolbarFocusIndex(" + index + ")}"),
      "missing focus tracking for toolbar control " + index,
    );
  }
  assert.match(scene, /if \(!selectedFurnitureId && cameraToolbarFocusIndex === 7\)/);
});
