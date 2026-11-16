import assert from "node:assert/strict";
import test from "node:test";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetConstruction } from "./cabinetConstruction.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "ply-18", name: "Kontrplak 18", category: "panel", thicknessesMm: [18], unit: "mm" }
];

const noBanding = { top: false, bottom: false, left: false, right: false };
const edgeBandingByGroup = Object.fromEntries(
  BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
);
edgeBandingByGroup.shelf = { ...noBanding, top: true };
edgeBandingByGroup.door = { top: true, bottom: true, left: true, right: true };

function createRequest(overrides = {}) {
  const profileOverrides = overrides.profile ?? {};
  return {
    schemaVersion: 1,
    furniture: {
      id: "cab-1",
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: "Eski malzeme adı",
      ...overrides.furniture
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: true, thicknessMm: 8, installation: "overlay" },
      shelfCount: 2,
      doors: { enabled: true, count: 2, style: "full-overlay", gapMm: 2 },
      edgeBandingByGroup: {
        ...edgeBandingByGroup,
        ...(profileOverrides.edgeBandingByGroup ?? {})
      },
      ...profileOverrides
    },
    materials: overrides.materials ?? materials,
    ...(overrides.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: overrides.panelMaterialOverrides })
  };
}

test("between-sides profili mm ölçülerini ve temel gövde parça ağacını üretir", () => {
  const result = calculateCabinetConstruction(createRequest());

  assert.deepEqual(result.innerDimensionsMm, { width: 764, height: 720, depth: 542 });
  assert.deepEqual(result.parts.map((part) => part.id), [
    "cab-1-left-side",
    "cab-1-right-side",
    "cab-1-top",
    "cab-1-bottom",
    "cab-1-shelf",
    "cab-1-door",
    "cab-1-back"
  ]);
  assert.equal(result.parts.find((part) => part.id === "cab-1-shelf")?.quantity, 2);
  assert.equal(result.parts.find((part) => part.id === "cab-1-door")?.width, 397);
  assert.equal(result.parts.find((part) => part.id === "cab-1-door")?.length, 716);
  assert.equal(result.parts.find((part) => part.id === "cab-1-back")?.thickness, 8);
});

test("over-sides profili yan panel ve iç yüksekliği iki panel kalınlığı kadar azaltır", () => {
  const result = calculateCabinetConstruction(createRequest({
    profile: { carcassStyle: "over-sides" }
  }));

  assert.equal(result.innerDimensionsMm.height, 684);
  assert.equal(result.parts.find((part) => part.id === "cab-1-left-side")?.length, 684);
});

test("kanallı arkalık profili kanal derinliğini iç derinlikten düşer", () => {
  const result = calculateCabinetConstruction(createRequest({
    profile: {
      backPanel: {
        enabled: true,
        thicknessMm: 8,
        installation: "grooved",
        grooveDepthMm: 6
      }
    }
  }));

  assert.equal(result.innerDimensionsMm.depth, 536);
  assert.equal(result.parts.find((part) => part.id === "cab-1-back")?.width, 776);
  assert.equal(result.parts.find((part) => part.id === "cab-1-back")?.length, 732);
});

test("içten arkalık montajı arkalık kalınlığı ve açık inset payını düşer", () => {
  const result = calculateCabinetConstruction(createRequest({
    profile: {
      backPanel: {
        enabled: true,
        thicknessMm: 6,
        installation: "inset",
        insetMm: 5
      }
    }
  }));

  assert.equal(result.innerDimensionsMm.depth, 531);
  assert.equal(result.parts.find((part) => part.id === "cab-1-back")?.width, 764);
  assert.equal(result.parts.find((part) => part.id === "cab-1-back")?.thickness, 6);
});

test("arkalık kapalı profilde arkalık parçası ve arkalık derinlik payı üretilmez", () => {
  const result = calculateCabinetConstruction(createRequest({
    profile: { backPanel: { enabled: false } }
  }));

  assert.equal(result.innerDimensionsMm.depth, 542);
  assert.equal(result.parts.some((part) => part.id === "cab-1-back"), false);
});

test("gövde panel grupları ayrı katalog malzemesi alır ve kendi kalınlıklarını korur", () => {
  const result = calculateCabinetConstruction(createRequest({
    panelMaterialOverrides: {
      leftSide: "ply-18",
      shelf: "mdf-18",
      back: "mdf-8"
    }
  }));

  assert.equal(result.parts.find((part) => part.id === "cab-1-left-side")?.materialId, "ply-18");
  assert.equal(result.parts.find((part) => part.id === "cab-1-left-side")?.material, "Kontrplak 18");
  assert.equal(result.parts.find((part) => part.id === "cab-1-shelf")?.materialId, "mdf-18");
  assert.equal(result.parts.find((part) => part.id === "cab-1-back")?.materialId, "mdf-8");
  assert.equal(result.parts.find((part) => part.id === "cab-1-back")?.thickness, 8);
});

test("parça kalınlığı seçilen malzeme kataloğunda yoksa hesaplama reddedilir", () => {
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      panelMaterialOverrides: { leftSide: "mdf-8" }
    })),
    /18 mm kalınlık katalogda tanımlı değil/
  );
});

test("parçası olmayan bir grup için bile bilinmeyen override kimliği reddedilir", () => {
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      profile: {
        backPanel: { enabled: false },
        shelfCount: 0,
        doors: { enabled: false, count: 0 }
      },
      panelMaterialOverrides: { back: "missing-panel" }
    })),
    /back panel grubu için missing-panel malzeme kimliği katalogda bulunamadı/
  );
});

test("sıfır raf ve kapak açıkça tanımlandığında ilgili parça satırları üretilmez", () => {
  const result = calculateCabinetConstruction(createRequest({
    profile: {
      shelfCount: 0,
      doors: { enabled: false, count: 0 }
    }
  }));

  assert.equal(result.parts.some((part) => part.id === "cab-1-shelf"), false);
  assert.equal(result.parts.some((part) => part.id === "cab-1-door"), false);
  assert.equal(result.parts.length, 5);
});

test("geçersiz dış ölçüler, adetler ve şema sürümü reddedilir", () => {
  assert.throws(
    () => calculateCabinetConstruction(createRequest({ furniture: { widthMm: 0 } })),
    /Dolap genişliği/
  );
  assert.throws(
    () => calculateCabinetConstruction(createRequest({ profile: { shelfCount: 1.5 } })),
    /Raf adedi/
  );
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      profile: { doors: { enabled: true, count: -1, style: "inset", gapMm: 2 } }
    })),
    /Kapak adedi/
  );
  assert.throws(
    () => calculateCabinetConstruction({ ...createRequest(), schemaVersion: 2 }),
    /şema sürümü/
  );
});

test("kenar bantlama bayrakları eksiksiz boolean olmalıdır", () => {
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      profile: {
        edgeBandingByGroup: {
          ...edgeBandingByGroup,
          shelf: { ...noBanding, top: "evet" }
        }
      }
    })),
    /boolean olmalıdır/
  );
  const missingGroup = { ...edgeBandingByGroup };
  delete missingGroup.back;
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      profile: { edgeBandingByGroup: missingGroup }
    })),
    /back kenar bantlama/
  );
});

test("kapak açıklığı kullanılabilir ölçüyü aşarsa geçersiz kapak ölçüsü reddedilir", () => {
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      profile: {
        doors: { enabled: true, count: 2, style: "inset", gapMm: 400 }
      }
    })),
    /Kapak ölçüleri geçersiz/
  );
});

test("varsayılan materialId bütün gövde parçalarında katalog kalınlığına göre doğrulanır", () => {
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      furniture: { materialId: "mdf-18" }
    })),
    /8 mm kalınlık katalogda tanımlı değil/
  );
});

test("kanal veya inset parametresi ilgili montaj türünde açıkça verilmelidir", () => {
  assert.throws(
    () => calculateCabinetConstruction(createRequest({
      profile: {
        backPanel: { enabled: true, thicknessMm: 8, installation: "grooved" }
      }
    })),
    /Arkalık kanal derinliği/
  );
});
