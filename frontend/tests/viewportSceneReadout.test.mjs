import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createViewportSceneReadout,
  formatMillimeterReadout
} from "../src/components/viewport/sceneReadout.ts";

const cabinet = {
  id: "cabinet-1",
  name: "Alt Dolap",
  width: 800,
  height: 720,
  depth: 560,
  parts: [
    {
      id: "shelf-1",
      name: "Raf 1",
      width: 764,
      height: 18,
      depth: 542
    }
  ]
};

const secondCabinet = {
  ...cabinet,
  id: "cabinet-2",
  name: "Üst Dolap"
};

function createReadout(overrides = {}) {
  const furniture = [cabinet, secondCabinet];
  return createViewportSceneReadout({
    furniture,
    visibleFurniture: [cabinet],
    selectedFurnitureId: null,
    selectedPartId: null,
    ...overrides
  });
}

test("readout görünür ve toplam mobilya adetlerini gerçek sahne listesinden alır", () => {
  const readout = createReadout();

  assert.equal(readout.visibleFurnitureCount, 1);
  assert.equal(readout.totalFurnitureCount, 2);
  assert.equal(readout.selection, null);
});

test("seçili parça varsa mobilya yerine parçanın gerçek ölçülerini gösterir", () => {
  const readout = createReadout({
    selectedFurnitureId: "cabinet-1",
    selectedPartId: "shelf-1"
  });

  assert.deepEqual(readout.selection, {
    kind: "part",
    name: "Raf 1",
    dimensions: [764, 18, 542]
  });
});

test("parça seçimi yoksa seçili mobilyanın ölçülerine geri döner", () => {
  const readout = createReadout({
    selectedFurnitureId: "cabinet-1",
    selectedPartId: "stale-part-id"
  });

  assert.deepEqual(readout.selection, {
    kind: "furniture",
    name: "Alt Dolap",
    dimensions: [800, 720, 560]
  });
});

test("gizli veya yalıtım dışında kalan mobilya etkin seçim gibi gösterilmez", () => {
  const readout = createReadout({
    selectedFurnitureId: "cabinet-2",
    selectedPartId: null
  });

  assert.equal(readout.selection, null);
});

test("milimetre readout Türkçe ondalık ve binlik biçimini kullanır", () => {
  assert.equal(formatMillimeterReadout(1234.5), "1.234,5");
  assert.equal(formatMillimeterReadout(18), "18");
});

test("viewport readout mevcut oda ölçüsü overlay'iyle çakışmaz ve etkileşimleri engellemez", async () => {
  const component = await readFile(
    new URL("../src/components/viewport/ViewportSceneReadout.tsx", import.meta.url),
    "utf8"
  );
  const styles = await readFile(
    new URL("../src/components/viewport/ViewportSceneReadout.css", import.meta.url),
    "utf8"
  );

  assert.match(component, /role="status"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /Seçili sahne öğesi ölçüleri/);
  assert.match(styles, /top: 58px/);
  assert.match(styles, /pointer-events: none/);
  assert.match(styles, /@media (max-width: 560px)/);
});
