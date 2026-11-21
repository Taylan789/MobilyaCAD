import test from "node:test";
import assert from "node:assert/strict";

import { createPlacedFurniture } from "../src/types/placedFurniture.ts";

const catalogItem = {
  id: "test-cabinet",
  name: "Test Dolabı",
  type: "wardrobe",
  width: 800,
  height: 1800,
  depth: 500,
  color: "#a77b55",
  category: "Dolap"
};

function countPartsByType(parts, type) {
  return parts.filter((part) => part.type === type).length;
}

test("varsayılan kapak ve raf adetleri oluşturulan parçalarla eşleşir", () => {
  const placed = createPlacedFurniture(catalogItem, [0, 0, 0]);

  assert.equal(placed.doorCount, 2);
  assert.equal(placed.drawerCount, 0);
  assert.equal(placed.shelfCount, 2);
  assert.equal(countPartsByType(placed.parts, "door"), placed.doorCount);
  assert.equal(countPartsByType(placed.parts, "drawer"), placed.drawerCount);
  assert.equal(countPartsByType(placed.parts, "shelf"), placed.shelfCount);
});

test("katalogdaki sıfır adet değerleri varsayılanla değiştirilmez", () => {
  const placed = createPlacedFurniture({
    ...catalogItem,
    doorCount: 0,
    drawerCount: 0,
    shelfCount: 0
  }, [0, 0, 0]);

  assert.equal(placed.doorCount, 0);
  assert.equal(placed.drawerCount, 0);
  assert.equal(placed.shelfCount, 0);
  assert.equal(placed.parts.length, 0);
});

test("özel kapak, çekmece ve raf adetleri parça listesine aynen yansır", () => {
  const placed = createPlacedFurniture({
    ...catalogItem,
    doorCount: 3,
    drawerCount: 2,
    shelfCount: 4
  }, [0, 0, 0]);

  assert.equal(countPartsByType(placed.parts, "door"), 3);
  assert.equal(countPartsByType(placed.parts, "drawer"), 2);
  assert.equal(countPartsByType(placed.parts, "shelf"), 4);
  assert.equal(placed.parts.length, 9);
});
