import assert from "node:assert/strict";
import test from "node:test";
import { calculatePerspectiveFitDistance } from "../src/components/viewport/cameraFraming.ts";

test("selection framing widens for a portrait viewport instead of clipping horizontal bounds", () => {
  const bounds = [1400, 900, 600];
  const landscape = calculatePerspectiveFitDistance(bounds, 42, 16 / 9);
  const portrait = calculatePerspectiveFitDistance(bounds, 42, 0.62);

  assert.ok(portrait > landscape);
});

test("larger selected bounds require a proportionally larger camera distance", () => {
  const small = calculatePerspectiveFitDistance([500, 400, 300], 42, 1.6);
  const large = calculatePerspectiveFitDistance([1000, 800, 600], 42, 1.6);

  assert.ok(large > small);
  assert.ok(Math.abs(large / small - 2) < 1e-10);
});

test("room and selection framing retain the one-metre orbit minimum", () => {
  assert.equal(calculatePerspectiveFitDistance([0, 0, 0], 42, 1.6), 1);
  assert.equal(calculatePerspectiveFitDistance([-1, 0, 0], 42, 1.6), 1);
});

test("malformed viewport and bounds values fail to a finite safe distance", () => {
  const distance = calculatePerspectiveFitDistance(
    [Number.NaN, Number.POSITIVE_INFINITY, -400],
    Number.NaN,
    0,
  );

  assert.equal(distance, 1);
  assert.ok(Number.isFinite(distance));
});
