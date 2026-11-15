import test from "node:test";
import assert from "node:assert/strict";

import { calculateDrawerBoxParts } from "../src/engine/drawerBoxParts.ts";

const noBanding = () => ({
  top: false,
  bottom: false,
  left: false,
  right: false
});

function createSpec(overrides = {}) {
  return {
    outerWidth: 500,
    sideHeight: 140,
    outerDepth: 450,
    sideThickness: 15,
    frontBackThickness: 15,
    bottomThickness: 6,
    visibleFrontWidth: 540,
    visibleFrontHeight: 180,
    visibleFrontThickness: 18,
    quantity: 3,
    material: "MDF",
    bottomFit: "between-sides-and-front-back",
    edgeBanding: {
      sidePanels: noBanding(),
      frontBackPanels: noBanding(),
      bottomPanel: noBanding(),
      visibleFrontPanel: noBanding()
    },
    grainDirection: {
      sidePanels: "length",
      frontBackPanels: "width",
      bottomPanel: "none",
      visibleFrontPanel: "width"
    },
    ...overrides
  };
}

test("çekmece kutusu parçaları açık ölçülerden ve adet çarpanından hesaplanır", () => {
  const parts = calculateDrawerBoxParts(
    "furniture-1",
    "drawer-set-1",
    createSpec()
  );

  assert.deepEqual(
    parts.map(({ name, width, length, thickness, quantity }) => ({
      name,
      width,
      length,
      thickness,
      quantity
    })),
    [
      {
        name: "Çekmece Yan Paneli",
        width: 140,
        length: 450,
        thickness: 15,
        quantity: 6
      },
      {
        name: "Çekmece Ön/Arka Paneli",
        width: 470,
        length: 140,
        thickness: 15,
        quantity: 6
      },
      {
        name: "Çekmece Tabanı",
        width: 470,
        length: 420,
        thickness: 6,
        quantity: 3
      },
      {
        name: "Çekmece Ön Paneli",
        width: 540,
        length: 180,
        thickness: 18,
        quantity: 3
      }
    ]
  );
});

test("görünür çekmece ön paneli ölçüleri kutu boşluğundan tahmin edilmez", () => {
  const parts = calculateDrawerBoxParts(
    "furniture-1",
    "drawer-set-1",
    createSpec({ visibleFrontWidth: 517.5, visibleFrontHeight: 176.5 })
  );

  assert.equal(parts[3].width, 517.5);
  assert.equal(parts[3].length, 176.5);
});

test("sıfır çekmece adedi parça üretmez", () => {
  const parts = calculateDrawerBoxParts(
    "furniture-1",
    "drawer-set-1",
    createSpec({ quantity: 0, outerWidth: 0 })
  );

  assert.deepEqual(parts, []);
});

test("kesirli veya negatif çekmece adedi reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxParts("furniture-1", "drawer-set-1", createSpec({ quantity: 1.5 })),
    /pozitif tam sayı/
  );
  assert.throws(
    () => calculateDrawerBoxParts("furniture-1", "drawer-set-1", createSpec({ quantity: -1 })),
    /pozitif tam sayı/
  );
});

test("yan panel kalınlıkları kutu genişliğini tüketirse hesap reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxParts(
      "furniture-1",
      "drawer-set-1",
      createSpec({ outerWidth: 30 })
    ),
    /iç genişliği/
  );
});

test("ön ve arka panel kalınlıkları kutu derinliğini tüketirse hesap reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxParts(
      "furniture-1",
      "drawer-set-1",
      createSpec({ outerDepth: 30 })
    ),
    /taban uzunluğu/
  );
});

test("kenar bantlama ve damar yönü her parça grubu için açıkça korunur", () => {
  const frontBanding = {
    top: true,
    bottom: true,
    left: false,
    right: false
  };
  const parts = calculateDrawerBoxParts(
    "furniture-1",
    "drawer-set-1",
    createSpec({
      edgeBanding: {
        ...createSpec().edgeBanding,
        visibleFrontPanel: frontBanding
      }
    })
  );

  assert.deepEqual(parts[3].edgeBanding, frontBanding);
  assert.equal(parts[3].grainDirection, "width");
  assert.equal(parts[0].grainDirection, "length");
});

test("eksik kenar bantlama bayrakları ve geçersiz damar yönü reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxParts(
      "furniture-1",
      "drawer-set-1",
      createSpec({
        edgeBanding: {
          ...createSpec().edgeBanding,
          bottomPanel: { top: true, bottom: false, left: false }
        }
      })
    ),
    /kenar bantlama ayarı geçersiz/
  );

  assert.throws(
    () => calculateDrawerBoxParts(
      "furniture-1",
      "drawer-set-1",
      createSpec({
        grainDirection: {
          ...createSpec().grainDirection,
          bottomPanel: "diagonal"
        }
      })
    ),
    /damar yönü geçersiz/
  );
});

test("bilinmeyen taban konstrüksiyonu ve boş malzeme reddedilir", () => {
  assert.throws(
    () => calculateDrawerBoxParts(
      "furniture-1",
      "drawer-set-1",
      createSpec({ bottomFit: "on-top" })
    ),
    /Desteklenmeyen/
  );

  assert.throws(
    () => calculateDrawerBoxParts(
      "furniture-1",
      "drawer-set-1",
      createSpec({ material: "  " })
    ),
    /malzemesi belirtilmelidir/
  );
});
