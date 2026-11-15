import test from "node:test";
import assert from "node:assert/strict";

import { calculatePlacementIssues } from "../src/engine/placementValidation.ts";

function furniture(overrides = {}) {
  return {
    id: "furniture-1",
    catalogId: "base-cabinet",
    name: "Alt Dolap",
    width: 600,
    height: 720,
    depth: 600,
    position: [0, 0.36, 0],
    rotation: 0,
    color: "#ffffff",
    doorCount: 2,
    drawerCount: 0,
    shelfCount: 2,
    hasBackPanel: true,
    backThickness: 8,
    edgeBanding: true,
    material: "MDF",
    parts: [],
    ...overrides
  };
}

test("oda içinde ve birbirine değmeyen mobilyalarda sorun üretmez", () => {
  const issues = calculatePlacementIssues([
    furniture(),
    furniture({
      id: "furniture-2",
      name: "Yan Dolap",
      position: [1, 0.36, 0]
    })
  ], 4000, 5000);

  assert.deepEqual(issues, []);
});

test("mobilyalar üst üste geldiğinde çakışmayı bildirir", () => {
  const issues = calculatePlacementIssues([
    furniture(),
    furniture({
      id: "furniture-2",
      name: "İkinci Dolap",
      position: [0.4, 0.36, 0]
    })
  ], 4000, 5000);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].type, "collision");
  assert.deepEqual(issues[0].furnitureIds, ["furniture-1", "furniture-2"]);
});

test("döndürülmüş mobilyalar için gerçek dikdörtgen çakışmasını hesaplar", () => {
  const issues = calculatePlacementIssues([
    furniture({ width: 1000, depth: 300, rotation: 45 }),
    furniture({
      id: "furniture-2",
      name: "Dar Dolap",
      width: 300,
      depth: 1000,
      position: [0.45, 0.36, 0.45],
      rotation: 45
    })
  ], 4000, 5000);

  assert.equal(issues.some((issue) => issue.type === "collision"), true);
});

test("oda sınırını aşan mobilyayı bildirir", () => {
  const issues = calculatePlacementIssues([
    furniture({ position: [1.8, 0.36, 0] })
  ], 4000, 5000);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].type, "outside-room");
  assert.deepEqual(issues[0].furnitureIds, ["furniture-1"]);
});

test("oda kenarına tam oturan mobilyayı sınır ihlali saymaz", () => {
  const issues = calculatePlacementIssues([
    furniture({ position: [1.7, 0.36, 0] })
  ], 4000, 5000);

  assert.deepEqual(issues, []);
});

test("geçersiz oda veya mobilya ölçülerini reddeder", () => {
  assert.throws(
    () => calculatePlacementIssues([], 0, 5000),
    /pozitif olmalıdır/
  );
  assert.throws(
    () => calculatePlacementIssues([furniture({ width: Number.NaN })], 4000, 5000),
    /sonlu sayılar/
  );
});
