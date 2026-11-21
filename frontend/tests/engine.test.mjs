import test from "node:test";
import assert from "node:assert/strict";

import {
  addMeasurements,
  roundMeasurement,
  subtractMeasurements,
  validateMeasurement
} from "../src/engine/measurement.ts";
import { calculateCabinetInnerDimensions } from "../src/engine/cabinetGeometry.ts";
import { calculateCabinetParts } from "../src/engine/cabinetParts.ts";
import {
  getCabinetCutListExportBlockReason,
  resolveCabinetConstructionRules
} from "../src/engine/cabinetRules.ts";

const furniture = {
  id: "test-cabinet",
  name: "Test Dolabı",
  type: "wardrobe",
  width: 800,
  height: 720,
  depth: 560,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotation: 0,
  materialThickness: 18
};

function createRules(overrides = {}) {
  return {
    panelThickness: 18,
    backThickness: 6,
    backInstallation: "overlay",
    backInset: 0,
    carcassStyle: "between-sides",
    shelfCount: 2,
    shelfStyle: "adjustable",
    edgeBandThickness: 0.8,
    doorStyle: "full-overlay",
    doorGap: 2,
    doorCount: 2,
    backGrooveDepth: 6,
    ...overrides
  };
}

test("ölçü yardımcıları milimetre değerlerini doğru yuvarlar ve toplar", () => {
  assert.equal(roundMeasurement(12.26), 12.3);
  assert.equal(addMeasurements(10.25, 2.25), 12.5);
  assert.equal(subtractMeasurements(10, 3.26), 6.7);
});

test("negatif ölçü farkı hata üretir", () => {
  assert.throws(() => subtractMeasurements(2, 3), /negatif/);
});

test("sıfır, negatif ve sonlu olmayan ölçüler reddedilir", () => {
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => validateMeasurement(value, "Test"));
  }
});

test("between-sides dolap iç ölçülerini doğru hesaplar", () => {
  const result = calculateCabinetInnerDimensions(furniture, createRules());
  assert.deepEqual(result, { width: 764, height: 720, depth: 542 });
});

test("over-sides konstrüksiyonunda iç yükseklik iki panel kalınlığı kadar azalır", () => {
  const result = calculateCabinetInnerDimensions(
    furniture,
    createRules({ carcassStyle: "over-sides" })
  );
  assert.equal(result.height, 684);
});

test("kanallı arkalık montajı iç derinlikten kanal payını düşer", () => {
  const result = calculateCabinetInnerDimensions(
    furniture,
    createRules({ backInstallation: "grooved" })
  );
  assert.equal(result.depth, 536);
});

test("içten arkalık montajı arkalık kalınlığı ve inset payını düşer", () => {
  const result = calculateCabinetInnerDimensions(
    furniture,
    createRules({ backInstallation: "inset", backInset: 5 })
  );
  assert.equal(result.depth, 531);
});

test("geçersiz iç ölçüler hata üretir", () => {
  assert.throws(
    () => calculateCabinetInnerDimensions(
      { ...furniture, width: 30 },
      createRules()
    ),
    /iç ölçüleri geçersiz/
  );
});

test("dolap parça listesinde yan, üst, alt, raf, kapak ve arkalık bulunur", () => {
  const parts = calculateCabinetParts(furniture, createRules());
  assert.deepEqual(
    parts.map((part) => part.name),
    ["Sol Yan Panel", "Sağ Yan Panel", "Üst Tabla", "Alt Tabla", "Raf", "Dolap Kapağı", "Arkalık"]
  );
});

test("raf adedi parça miktarına yansıtılır ve ön kenar bantlanır", () => {
  const parts = calculateCabinetParts(furniture, createRules());
  const shelf = parts.find((part) => part.name === "Raf");
  assert.ok(shelf);
  assert.equal(shelf.quantity, 2);
  assert.equal(shelf.edgeBanding.top, true);
});

test("iki kapak için kapak parçası miktarı ve ölçüleri hesaplanır", () => {
  const parts = calculateCabinetParts(furniture, createRules());
  const door = parts.find((part) => part.name === "Dolap Kapağı");
  assert.ok(door);
  assert.equal(door.quantity, 2);
  assert.equal(door.width, 397);
  assert.equal(door.length, 716);
});

test("raf sayısı negatif veya tam sayı değilse reddedilir", () => {
  assert.throws(
    () => calculateCabinetParts(furniture, createRules({ shelfCount: -1 })),
    /Raf sayısı geçersiz/
  );
  assert.throws(
    () => calculateCabinetParts(furniture, createRules({ shelfCount: 1.5 })),
    /Raf sayısı geçersiz/
  );
});

test("kapak sayısı sıfır olduğunda kapak parçası oluşturulmaz", () => {
  const parts = calculateCabinetParts(furniture, createRules({ doorCount: 0 }));
  assert.equal(parts.some((part) => part.name === "Dolap Kapağı"), false);
});

test("negatif kapak sayısı reddedilir", () => {
  assert.throws(
    () => calculateCabinetParts(furniture, createRules({ doorCount: -1 })),
    /Kapak sayısı geçersiz/
  );
});

test("seçili mobilyanın kapak, raf ve arkalık adetleri kesim hesabına aktarılır", () => {
  const selectedRules = resolveCabinetConstructionRules(createRules(), {
    doorCount: 0,
    shelfCount: 5,
    backThickness: 12
  });
  const parts = calculateCabinetParts(
    {
      ...furniture,
      material: "MDF",
      hasBackPanel: true,
      backThickness: 12,
      edgeBanding: true
    },
    selectedRules
  );

  assert.equal(parts.find((part) => part.name === "Raf")?.quantity, 5);
  assert.equal(parts.some((part) => part.name === "Dolap Kapağı"), false);
  assert.equal(parts.find((part) => part.name === "Arkalık")?.thickness, 12);
});

test("arkalıksız ve kenar bandsız mobilyada arkalık payı ve bantlama uygulanmaz", () => {
  const noBackFurniture = {
    ...furniture,
    material: "MDF",
    hasBackPanel: false,
    edgeBanding: false
  };
  const inner = calculateCabinetInnerDimensions(noBackFurniture, createRules());
  const parts = calculateCabinetParts(noBackFurniture, createRules());

  assert.equal(inner.depth, 542);
  assert.equal(parts.some((part) => part.name === "Arkalık"), false);
  assert.ok(parts.every((part) => part.material === "MDF"));
  assert.ok(parts.every((part) =>
    Object.values(part.edgeBanding).every((isBanded) => !isBanded)
  ));
});

test("çekmeceli modüllerin eksik parça listesi CSV olarak dışa aktarılamaz", () => {
  assert.match(
    getCabinetCutListExportBlockReason({ drawerCount: 2 }) ?? "",
    /çekmece/i
  );
  assert.equal(getCabinetCutListExportBlockReason({ drawerCount: 0 }), null);
});

test("çok küçük kapak ölçüleri hesaplama hatası üretir", () => {
  assert.throws(
    () => calculateCabinetParts(
      { ...furniture, width: 30, height: 30 },
      createRules({ doorGap: 10 })
    )
  );
});
