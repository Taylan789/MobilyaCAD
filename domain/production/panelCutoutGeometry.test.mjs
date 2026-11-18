import assert from "node:assert/strict";
import test from "node:test";

import { calculatePanelCutoutGeometry } from "./panelCutoutGeometry.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createCutout(overrides = {}) {
  const { edgeBanding = {}, ...rest } = overrides;
  return {
    id: "sink-opening",
    xMm: 100,
    yMm: 100,
    widthMm: 400,
    lengthMm: 300,
    ...rest,
    edgeBanding: { ...noBanding, ...edgeBanding }
  };
}

function createRequest(overrides = {}) {
  const { outerEdgeBanding = {}, ...rest } = overrides;
  return {
    schemaVersion: 1,
    widthMm: 1000,
    lengthMm: 600,
    thicknessMm: 18,
    outerEdgeBanding: { ...noBanding, ...outerEdgeBanding },
    cutouts: [],
    ...rest
  };
}

test("dikdörtgen açıklık net alanı, hacmi, iç çevreyi ve iki kenar bandı grubunu hesaplar", () => {
  const result = calculatePanelCutoutGeometry(createRequest({
    outerEdgeBanding: { top: true, bottom: true, right: true },
    cutouts: [createCutout({ edgeBanding: { top: true, left: true } })]
  }));

  assert.equal(result.outerFaceAreaMm2, 600000);
  assert.equal(result.cutoutAreaMm2, 120000);
  assert.equal(result.netFaceAreaMm2, 480000);
  assert.equal(result.netVolumeMm3, 8640000);
  assert.equal(result.outerPerimeterMm, 3200);
  assert.equal(result.cutoutPerimeterMm, 1400);
  assert.deepEqual(result.edgeBanding, {
    outerLengthMm: 2600,
    cutoutLengthMm: 700,
    totalLengthMm: 3300,
    outerEdgeCount: 3,
    cutoutEdgeCount: 2,
    totalEdgeCount: 5
  });
});

test("ölçü ve konumları 0.1 mm çözünürlüğe normalize eder", () => {
  const result = calculatePanelCutoutGeometry(createRequest({
    widthMm: 1000.26,
    lengthMm: 600.24,
    thicknessMm: 18.04,
    cutouts: [createCutout({
      xMm: 100.26,
      yMm: 50.24,
      widthMm: 200.26,
      lengthMm: 100.24
    })]
  }));

  assert.deepEqual([result.widthMm, result.lengthMm, result.thicknessMm], [1000.3, 600.2, 18]);
  assert.deepEqual(
    [result.cutouts[0].xMm, result.cutouts[0].yMm, result.cutouts[0].widthMm, result.cutouts[0].lengthMm],
    [100.3, 50.2, 200.3, 100.2]
  );
});

test("açıklık listesi boşsa dikdörtgen panelin alanı ve hacmi korunur", () => {
  const result = calculatePanelCutoutGeometry(createRequest());
  assert.equal(result.netFaceAreaMm2, 600000);
  assert.equal(result.netVolumeMm3, 10800000);
  assert.equal(result.cutoutPerimeterMm, 0);
  assert.equal(result.edgeBanding.totalLengthMm, 0);
});

test("birbirinden ayrık birden fazla açıklığın alanı ve çevresi toplanır", () => {
  const result = calculatePanelCutoutGeometry(createRequest({
    cutouts: [
      createCutout({ id: "sink", xMm: 100, yMm: 100, widthMm: 200, lengthMm: 200 }),
      createCutout({ id: "cable", xMm: 500, yMm: 100, widthMm: 100, lengthMm: 100 })
    ]
  }));
  assert.equal(result.cutoutAreaMm2, 50000);
  assert.equal(result.netFaceAreaMm2, 550000);
  assert.equal(result.cutoutPerimeterMm, 1200);
});


test("50.000 ayrık panel açıklığı sweep-line doğrulamasında alan ve geometriyi korur", () => {
  const cutouts = [];
  for (let index = 0; index < 50_000; index += 1) {
    const column = index % 250;
    const row = Math.floor(index / 250);
    cutouts.push(createCutout({
      id: "opening-" + index,
      xMm: 1 + column * 4,
      yMm: 1 + row * 4,
      widthMm: 1,
      lengthMm: 1
    }));
  }

  const result = calculatePanelCutoutGeometry(createRequest({
    widthMm: 1000,
    lengthMm: 1000,
    cutouts
  }));

  assert.equal(result.cutouts.length, 50_000);
  assert.equal(result.cutoutAreaMm2, 50_000);
  assert.equal(result.netFaceAreaMm2, 950_000);
});

test("açıklık dış sınıra temas edemez veya panel dışına taşamaz", () => {
  for (const cutout of [
    createCutout({ xMm: 0 }),
    createCutout({ yMm: 0 }),
    createCutout({ xMm: 700, widthMm: 300 }),
    createCutout({ yMm: 400, lengthMm: 200 }),
    createCutout({ xMm: 900, widthMm: 200 }),
    createCutout({ yMm: 550, lengthMm: 100 })
  ]) {
    assert.throws(
      () => calculatePanelCutoutGeometry(createRequest({ cutouts: [cutout] })),
      /dış sınıra temas etmeden tamamen panel içinde olmalıdır/
    );
  }
});

test("birbiriyle alan kesişimi olan açıklıklar reddedilir", () => {
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({
      cutouts: [
        createCutout({ id: "sink", xMm: 100, yMm: 100, widthMm: 300, lengthMm: 200 }),
        createCutout({ id: "cable", xMm: 200, yMm: 150, widthMm: 100, lengthMm: 100 })
      ]
    })),
    /çakışamaz veya birbirine temas edemez/
  );
});

test("kenar veya köşe teması olan iki açıklık reddedilir", () => {
  for (const second of [
    createCutout({ id: "second", xMm: 300, yMm: 100, widthMm: 100, lengthMm: 100 }),
    createCutout({ id: "second", xMm: 300, yMm: 300, widthMm: 100, lengthMm: 100 })
  ]) {
    assert.throws(
      () => calculatePanelCutoutGeometry(createRequest({
        cutouts: [
          createCutout({ id: "first", xMm: 100, yMm: 100, widthMm: 200, lengthMm: 200 }),
          second
        ]
      })),
      /çakışamaz veya birbirine temas edemez/
    );
  }
});

test("açıklık kimlikleri benzersiz olmalıdır", () => {
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({
      cutouts: [
        createCutout({ id: "sink" }),
        createCutout({ id: "sink", xMm: 600, widthMm: 100, lengthMm: 100 })
      ]
    })),
    /Yinelenen panel açıklığı kimliği/
  );
});

test("panel ölçüleri ve açıklık ölçüleri sonlu ve pozitif olmalıdır", () => {
  for (const widthMm of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.04]) {
    assert.throws(
      () => calculatePanelCutoutGeometry(createRequest({ widthMm })),
      /Panel genişliği/
    );
  }
  for (const thicknessMm of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => calculatePanelCutoutGeometry(createRequest({ thicknessMm })),
      /Panel kalınlığı/
    );
  }
  for (const cutout of [
    createCutout({ widthMm: 0 }),
    createCutout({ lengthMm: -1 }),
    createCutout({ widthMm: Number.NaN })
  ]) {
    assert.throws(
      () => calculatePanelCutoutGeometry(createRequest({ cutouts: [cutout] })),
      /genişliği|uzunluğu/
    );
  }
});

test("dış ve iç kenar bantlama bayraklarının tamamı açıkça boolean olmalıdır", () => {
  const missingOuterEdge = createRequest();
  missingOuterEdge.outerEdgeBanding = { top: true, bottom: false, left: false };
  assert.throws(
    () => calculatePanelCutoutGeometry(missingOuterEdge),
    /right kenarı açıkça boolean/
  );
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({
      cutouts: [createCutout({ edgeBanding: { top: "yes" } })]
    })),
    /top kenarı açıkça boolean/
  );
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({
      outerEdgeBanding: { top: false, bottom: false, left: false, right: false, front: true }
    })),
    /desteklenmeyen alan: front/
  );
});

test("desteklenmeyen şema sürümü ve alanlar reddedilir", () => {
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({ schemaVersion: 2 })),
    /şema sürümü/
  );
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({ guessedSinkClearanceMm: 20 })),
    /desteklenmeyen alan/
  );
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({
      cutouts: [createCutout({ guessedCornerRadiusMm: 5 })]
    })),
    /desteklenmeyen alan/
  );
});

test("hesaplama çağrısı kaynak isteği ve iç kenar ayarlarını değiştirmez", () => {
  const request = createRequest({
    outerEdgeBanding: { top: true },
    cutouts: [createCutout({ edgeBanding: { left: true } })]
  });
  const before = JSON.stringify(request);
  calculatePanelCutoutGeometry(request);
  assert.equal(JSON.stringify(request), before);
});

test("0.1 mm normalizasyonu taşarsa hesaplama reddedilir", () => {
  assert.throws(
    () => calculatePanelCutoutGeometry(createRequest({ widthMm: 1e308 })),
    /normalizasyon aralığını aşıyor/
  );
});
