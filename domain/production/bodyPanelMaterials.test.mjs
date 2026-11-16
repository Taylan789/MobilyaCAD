import assert from "node:assert/strict";
import test from "node:test";
import {
  getBodyPanelGroupFromPartId,
  resolveBodyPanelMaterialAssignments,
  resolveCabinetBodyPanelParts,
  validateBodyPanelMaterialOverrides
} from "./bodyPanelMaterials.ts";

const materials = [
  { id: "mdf-18", name: "MDF Lam 18", category: "panel", thicknessesMm: [18], unit: "mm" },
  { id: "mdf-8", name: "MDF Lam 8", category: "panel", thicknessesMm: [8], unit: "mm" },
  { id: "ply-25", name: "Kontrplak 25", category: "panel", thicknessesMm: [25], unit: "mm" },
  { id: "ply-18", name: "Kontrplak 18", category: "panel", thicknessesMm: [18], unit: "mm" }
];

const part = (id, group, thicknessMm, materialId = "mdf-18") => ({
  id,
  group,
  thicknessMm,
  material: "Eski malzeme adı",
  ...(materialId === null ? {} : { materialId }),
  quantity: 2
});

test("legacy override alanı olmaması geçerlidir; açık grup kimlikleri korunur", () => {
  assert.deepEqual(validateBodyPanelMaterialOverrides(undefined), {});
  assert.deepEqual(
    validateBodyPanelMaterialOverrides({ leftSide: "ply-25", shelf: "mdf-8" }),
    { leftSide: "ply-25", shelf: "mdf-8" }
  );
});

test("bilinmeyen grup ve hatalı katalog kimliği reddedilir", () => {
  assert.throws(
    () => validateBodyPanelMaterialOverrides({ carcass: "mdf-18" }),
    /Desteklenmeyen gövde panel grubu/
  );
  assert.throws(
    () => validateBodyPanelMaterialOverrides({ top: " Mdf-18" }),
    /malzeme kimliği geçersiz/
  );
});

test("her gövde panel grubu kendi override malzemesini alır ve diğerleri varsayılanı korur", () => {
  const parts = [
    part("cab-1-left-side", "leftSide", 25),
    part("cab-1-right-side", "rightSide", 18),
    part("cab-1-top", "top", 8),
    part("cab-1-bottom", "bottom", 18),
    part("cab-1-shelf", "shelf", 8),
    part("cab-1-back", "back", 8),
    part("cab-1-door", "door", 18)
  ];

  const resolved = resolveBodyPanelMaterialAssignments(
    parts,
    { leftSide: "ply-25", top: "mdf-8", shelf: "mdf-8", back: "mdf-8" },
    materials
  );

  assert.deepEqual(
    resolved.map(({ materialId, material }) => [materialId, material]),
    [
      ["ply-25", "Kontrplak 25"],
      ["mdf-18", "MDF Lam 18"],
      ["mdf-8", "MDF Lam 8"],
      ["mdf-18", "MDF Lam 18"],
      ["mdf-8", "MDF Lam 8"],
      ["mdf-8", "MDF Lam 8"],
      ["mdf-18", "MDF Lam 18"]
    ]
  );
  assert.equal(resolved[0].quantity, 2);
});

test("legacy serbest metin malzeme, katalog kimliği olmadan değiştirilmez", () => {
  const legacyPart = part("cab-legacy-top", "top", 18, null);
  const [resolved] = resolveBodyPanelMaterialAssignments([legacyPart], {}, materials);

  assert.deepEqual(resolved, legacyPart);
  assert.equal("materialId" in resolved, false);
});

test("bulunmayan override katalog kimliği üretim hesabına alınmaz", () => {
  assert.throws(
    () => resolveBodyPanelMaterialAssignments(
      [part("cab-top", "top", 18)],
      { top: "missing-panel" },
      materials
    ),
    /malzeme kimliği katalogda bulunamadı/
  );
});

test("override malzemesinde tanımlı olmayan parça kalınlığı reddedilir", () => {
  assert.throws(
    () => resolveBodyPanelMaterialAssignments(
      [part("cab-shelf", "shelf", 18)],
      { shelf: "mdf-8" },
      materials
    ),
    /18 mm kalınlık katalogda tanımlı değil/
  );
});

test("yinelenen malzeme kimliği ve geçersiz kalınlık kataloğu reddedilir", () => {
  assert.throws(
    () => resolveBodyPanelMaterialAssignments(
      [part("cab-top", "top", 18)],
      {},
      [...materials, materials[0]]
    ),
    /Yinelenen panel malzeme kimliği/
  );
  assert.throws(
    () => resolveBodyPanelMaterialAssignments(
      [part("cab-top", "top", 18)],
      {},
      [{ ...materials[0], thicknessesMm: [18, 18] }]
    ),
    /yinelenen panel kalınlığı/
  );
});

test("parça kimlikleri benzersiz olmalı ve hatalı grup reddedilmelidir", () => {
  assert.throws(
    () => resolveBodyPanelMaterialAssignments(
      [part("cab-top", "top", 18), part("cab-top", "top", 18)],
      {},
      materials
    ),
    /Yinelenen gövde panel parça kimliği/
  );
  assert.throws(
    () => resolveBodyPanelMaterialAssignments(
      [{ ...part("cab-unknown", "top", 18), group: "carcass" }],
      {},
      materials
    ),
    /gövde panel grubu geçersiz/
  );
});

test("mevcut parça anahtarları yalnızca bilinen gövde gruplarına eşlenir", () => {
  assert.equal(getBodyPanelGroupFromPartId("cab-1", "cab-1-left-side"), "leftSide");
  assert.equal(getBodyPanelGroupFromPartId("cab-1", "cab-1-right-side"), "rightSide");
  assert.equal(getBodyPanelGroupFromPartId("cab-1", "cab-1-shelf"), "shelf");
  assert.equal(getBodyPanelGroupFromPartId("cab-1", "cab-1-drawer-front"), null);
  assert.equal(getBodyPanelGroupFromPartId("cab-1", "other-top"), null);
});


test("parça listesinde ilgili grup olmasa da her override katalog referansı doğrulanır", () => {
  assert.throws(
    () => resolveBodyPanelMaterialAssignments([], { back: "missing-panel" }, materials),
    /back panel grubu için missing-panel malzeme kimliği katalogda bulunamadı/
  );
  assert.deepEqual(
    resolveBodyPanelMaterialAssignments([], { back: "mdf-8" }, materials),
    []
  );
});

test("gerçek Part satırları yalnızca hedef mobilyanın bilinen gövde panellerine uygulanır", () => {
  const productionParts = [
    {
      id: "cab-1-left-side",
      furnitureId: "cab-1",
      name: "Sol Yan Panel",
      width: 560,
      length: 720,
      thickness: 18,
      quantity: 1,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    {
      id: "cab-1-drawer-front",
      furnitureId: "cab-1",
      name: "Çekmece Önü",
      width: 500,
      length: 180,
      thickness: 18,
      quantity: 1,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    },
    {
      id: "cab-2-left-side",
      furnitureId: "cab-2",
      name: "Diğer Dolap Sol Yan",
      width: 560,
      length: 720,
      thickness: 18,
      quantity: 1,
      material: "MDF Lam 18",
      materialId: "mdf-18"
    }
  ];

  const resolved = resolveCabinetBodyPanelParts(
    "cab-1",
    productionParts,
    { leftSide: "ply-18" },
    materials
  );

  assert.equal(resolved[0].materialId, "ply-18");
  assert.equal(resolved[0].material, "Kontrplak 18");
  assert.equal(resolved[0].thickness, 18);
  assert.equal("group" in resolved[0], false);
  assert.equal("thicknessMm" in resolved[0], false);
  assert.deepEqual(resolved[1], productionParts[1]);
  assert.deepEqual(resolved[2], productionParts[2]);
});

test("Part adapter boş veya boşluklu mobilya kimliğini reddeder", () => {
  assert.throws(
    () => resolveCabinetBodyPanelParts(" ", [], {}, materials),
    /geçerli mobilya kimliği/
  );
  assert.throws(
    () => resolveCabinetBodyPanelParts("cab-1", [{ id: "cab-1-top" }], {}, materials),
    /mobilya\/parça kimliği eksik/
  );
});
