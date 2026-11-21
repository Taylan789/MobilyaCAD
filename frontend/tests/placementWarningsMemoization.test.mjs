import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scene = readFileSync(new URL("../src/components/viewport/Scene3D.tsx", import.meta.url), "utf8");
const warnings = scene.slice(scene.indexOf("const PlacementWarnings ="), scene.indexOf("export default function Scene3D"));

test("placement warning overlay is memoized independently from selection state", () => {
  assert.match(scene, /import \{ memo, useCallback, useEffect, useMemo, useRef, useState \} from "react"/);
  assert.match(warnings, /const PlacementWarnings = memo\(function PlacementWarnings/);
  assert.doesNotMatch(warnings, /selectedFurnitureId|selectedPartId|focusRequestId|transformMode/);
});

test("placement issue calculation only depends on furniture and room dimensions", () => {
  assert.match(warnings, /useMemo\([\s\S]*calculatePlacementIssues\(furniture, roomWidth, roomLength\)[\s\S]*\[furniture, roomWidth, roomLength\]/);
});

test("issue index is cached from the calculated issue list", () => {
  assert.match(warnings, /const issueById = useMemo\(\(\) => \{[\s\S]*return map;[\s\S]*\}, \[issues\]\);/);
});

test("visible furniture array keeps stable identity until visibility inputs change", () => {
  assert.match(scene, /const visibleFurniture = useMemo\([\s\S]*furniture\.filter\([\s\S]*\[furniture, hiddenFurnitureIds, isolatedFurnitureId\]\s*\);/);
  assert.match(scene, /<PlacementWarnings\s+furniture=\{visibleFurniture\}/);
});
