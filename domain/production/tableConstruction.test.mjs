import assert from "node:assert/strict";
import test from "node:test";
import {
  TABLE_PART_GROUPS,
  calculateTableConstruction
} from "./tableConstruction.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };
const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "wood-60", name: "Masif 60", category: "panel", thicknessesMm: [60], unit: "mm" },
  { id: "ply-18", name: "Kontrplak 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-16", name: "MDF Lam 16", category: "panel", thicknessesMm: [16], unit: "mm" }
];

function createRequest(overrides = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    TABLE_PART_GROUPS.map((group) => [group, { ...noBanding }])
  );
  edgeBandingByGroup.top = { ...noBanding, top: true, bottom: true };

  const grainDirectionByGroup = {
    top: "length",
    legs: "none",
    longApron: "length",
    shortApron: "length"
  };

  return {
    schemaVersion: 1,
    family: "table",
    furniture: {
      id: "table-1",
      widthMm: 1200,
      lengthMm: 700,
      heightMm: 750,
      material: "Legacy MDF",
      materialId: "mdf-18",
      ...overrides.furniture
    },
    profile: {
      topThicknessMm: 18,
      legWidthMm: 60,
      legDepthMm: 60,
      legCount: 4,
      materialIdByGroup: { legs: "wood-60" },
      aprons: {
        enabled: true,
        heightMm: 100,
        thicknessMm: 18,
        longApronLengthMm: 1000,
        longApronCount: 2,
        shortApronLengthMm: 500,
        shortApronCount: 2
      },
      edgeBandingByGroup,
      grainDirectionByGroup,
      ...overrides.profile
    },
    materials: overrides.materials ?? materials
  };
}

test("masa motoru açık ölçülerden tabla, ayak ve kayıt parça satırlarını üretir", () => {
  const request = createRequest({
    profile: {
      materialIdByGroup: {
        legs: "wood-60",
        longApron: "ply-18"
      }
    }
  });
  const before = JSON.stringify(request);
  const result = calculateTableConstruction(request);

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.family, "table");
  assert.deepEqual(result.overallDimensionsMm, {
    width: 1200,
    length: 700,
    height: 750
  });
  assert.deepEqual(result.parts.map((part) => part.id), [
    "table-1-top",
    "table-1-legs",
    "table-1-long-apron",
    "table-1-short-apron"
  ]);
  assert.deepEqual(result.parts.map((part) => part.quantity), [1, 4, 2, 2]);
  assert.deepEqual(
    result.parts.map((part) => [part.width, part.length, part.thickness]),
    [
      [1200, 700, 18],
      [60, 732, 60],
      [1000, 100, 18],
      [500, 100, 18]
    ]
  );
  assert.equal(result.parts[0].materialId, "mdf-18");
  assert.equal(result.parts[0].edgeBanding.top, true);
  assert.equal(result.parts[0].grainDirection, "length");
  assert.equal(result.parts[1].materialId, "wood-60");
  assert.equal(result.parts[1].material, "Masif 60");
  assert.equal(result.parts[2].materialId, "ply-18");
  assert.equal(result.parts[3].materialId, "mdf-18");
  assert.equal(result.parts.every((part) => part.furnitureId === "table-1"), true);
  assert.equal(JSON.stringify(request), before);
});

test("kayıtlar kapalıysa yalnızca tabla ve ayak satırları üretilir", () => {
  const result = calculateTableConstruction(createRequest({
    profile: { aprons: { enabled: false } }
  }));

  assert.deepEqual(result.parts.map((part) => part.id), [
    "table-1-top",
    "table-1-legs"
  ]);
});

test("yalnızca açıkça adet verilen uzun kayıt veya kısa kayıt üretilir", () => {
  const result = calculateTableConstruction(createRequest({
    profile: {
      aprons: {
        enabled: true,
        heightMm: 90,
        thicknessMm: 18,
        longApronLengthMm: 900,
        longApronCount: 2,
        shortApronLengthMm: 0,
        shortApronCount: 0
      }
    }
  }));

  assert.deepEqual(result.parts.map((part) => part.id), [
    "table-1-top",
    "table-1-legs",
    "table-1-long-apron"
  ]);
  assert.equal(result.parts[2].quantity, 2);
});

test("parça grubu malzeme override'ı katalog adını ve gerçek kalınlığı kullanır", () => {
  const result = calculateTableConstruction(createRequest({
    profile: {
      materialIdByGroup: {
        top: "ply-18",
        legs: "wood-60"
      }
    }
  }));

  assert.equal(result.parts[0].material, "Kontrplak 18");
  assert.equal(result.parts[0].materialId, "ply-18");
  assert.equal(result.parts[1].material, "Masif 60");
  assert.equal(result.parts[1].materialId, "wood-60");
});

test("katalogda bulunmayan malzeme veya parça kalınlığı reddedilir", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: { materialIdByGroup: { top: "mdf-16", legs: "wood-60" } }
    })),
    /18 mm kalınlık katalogda tanımlı değil/
  );
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: { materialIdByGroup: { legs: "unknown-60" } }
    })),
    /katalogda bulunamadı/
  );
});

test("masa toplam yüksekliği tabla kalınlığından büyük olmalıdır", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      furniture: { heightMm: 18 }
    })),
    /Masa ayağı yüksekliği/
  );
});

test("kayıt yüksekliği hesaplanan ayak yüksekliğini aşamaz", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: {
        aprons: {
          enabled: true,
          heightMm: 733,
          thicknessMm: 18,
          longApronLengthMm: 900,
          longApronCount: 2,
          shortApronLengthMm: 0,
          shortApronCount: 0
        }
      }
    })),
    /Kayıt yüksekliği masa ayağı yüksekliğini aşamaz/
  );
});

test("etkin kayıtta en az bir pozitif adet ve kullanılmayan yönde sıfır uzunluk gerekir", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: {
        aprons: {
          enabled: true,
          heightMm: 100,
          thicknessMm: 18,
          longApronLengthMm: 0,
          longApronCount: 0,
          shortApronLengthMm: 0,
          shortApronCount: 0
        }
      }
    })),
    /en az bir güvenli parça adedi/
  );
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: {
        aprons: {
          enabled: true,
          heightMm: 100,
          thicknessMm: 18,
          longApronLengthMm: 900,
          longApronCount: 0,
          shortApronLengthMm: 500,
          shortApronCount: 1
        }
      }
    })),
    /adedi sıfırken/
  );
});

test("ölçüler, adetler, aile ve bilinmeyen alanlar doğrulanır", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      furniture: { widthMm: 0 }
    })),
    /Masa tablası genişliği/
  );
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: { legCount: 1.5 }
    })),
    /Masa ayağı adedi/
  );
  assert.throws(
    () => calculateTableConstruction({ ...createRequest(), family: "cabinet" }),
    /açıkça table/
  );
  assert.throws(
    () => calculateTableConstruction({
      ...createRequest(),
      profile: { ...createRequest().profile, guessedJoinery: true }
    }),
    /desteklenmeyen alan/
  );
});

test("kenar bantlama ve damar yönü her gerçek masa parça grubu için açıkça verilmelidir", () => {
  const missingBanding = createRequest();
  delete missingBanding.profile.edgeBandingByGroup.legs;
  assert.throws(
    () => calculateTableConstruction(missingBanding),
    /legs kenar bantlama ayarları/
  );

  const invalidGrain = createRequest();
  invalidGrain.profile.grainDirectionByGroup.legs = "diagonal";
  assert.throws(
    () => calculateTableConstruction(invalidGrain),
    /damar yönü geçersiz/
  );
});

test("üretilmeyen kayıt grubu için malzeme override'ı sessizce saklanmaz", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: {
        aprons: { enabled: false },
        materialIdByGroup: { longApron: "ply-18" }
      }
    })),
    /parçası üretilmediğinden malzeme ataması yapılamaz/
  );
});

test("malzeme kataloğunda yinelenen kimlik veya kalınlık reddedilir", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      materials: [...materials, materials[0]]
    })),
    /Yinelenen panel malzeme kimliği/
  );
  assert.throws(
    () => calculateTableConstruction(createRequest({
      materials: [
        { id: "bad", name: "Bad", category: "panel", thicknessesMm: [18, 18], unit: "mm" }
      ],
      furniture: { materialId: "bad" }
    })),
    /yinelenen panel kalınlığı/
  );
});

test("toplam parça adedi güvenli tam sayı sınırını aşamaz", () => {
  assert.throws(
    () => calculateTableConstruction(createRequest({
      profile: {
        legCount: Number.MAX_SAFE_INTEGER,
        aprons: {
          enabled: true,
          heightMm: 100,
          thicknessMm: 18,
          longApronLengthMm: 900,
          longApronCount: 1,
          shortApronLengthMm: 0,
          shortApronCount: 0
        }
      }
    })),
    /toplam parça adedi güvenli sayı sınırını aşıyor/
  );
});
