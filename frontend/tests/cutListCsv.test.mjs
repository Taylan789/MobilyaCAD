import test from "node:test";
import assert from "node:assert/strict";

import { calculateCabinetParts } from "../src/engine/cabinetParts.ts";
import { calculateDrawerBoxParts } from "../src/engine/drawerBoxParts.ts";
import { createCutListCsv } from "../src/engine/cutListCsv.ts";

function createPart(overrides = {}) {
  return {
    id: "part-1",
    furnitureId: "furniture-1",
    name: "Test Panel",
    width: 600,
    length: 720,
    thickness: 18,
    quantity: 1,
    edgeBanding: {
      top: false,
      bottom: false,
      left: false,
      right: false
    },
    material: "MDF",
    cncOperations: [],
    grainDirection: "none",
    ...overrides
  };
}

test("birleşik gövde ve çekmece parçaları CSV satırlarına doğru adetlerle yazılır", () => {
  const furniture = {
    id: "kitchen-1",
    name: "Mutfak Modülü",
    type: "kitchen",
    width: 800,
    height: 720,
    depth: 560,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotation: 0,
    materialThickness: 18,
    material: "MDF",
    hasBackPanel: true,
    edgeBanding: true
  };
  const rules = {
    panelThickness: 18,
    backThickness: 6,
    backInstallation: "overlay",
    backInset: 0,
    carcassStyle: "between-sides",
    shelfCount: 1,
    shelfStyle: "adjustable",
    edgeBandThickness: 0.8,
    doorStyle: "full-overlay",
    doorGap: 2,
    doorCount: 0,
    backGrooveDepth: 6
  };
  const noBanding = {
    top: false,
    bottom: false,
    left: false,
    right: false
  };
  const drawerParts = calculateDrawerBoxParts("kitchen-1", "drawer-group-1", {
    outerWidth: 500,
    sideHeight: 120,
    outerDepth: 450,
    sideThickness: 15,
    frontBackThickness: 15,
    bottomThickness: 6,
    visibleFrontWidth: 540,
    visibleFrontHeight: 180,
    visibleFrontThickness: 18,
    quantity: 2,
    material: "MDF",
    bottomFit: "between-sides-and-front-back",
    edgeBanding: {
      sidePanels: { ...noBanding, top: true },
      frontBackPanels: { ...noBanding, left: true },
      bottomPanel: noBanding,
      visibleFrontPanel: { top: true, bottom: true, left: true, right: true }
    },
    grainDirection: {
      sidePanels: "length",
      frontBackPanels: "width",
      bottomPanel: "none",
      visibleFrontPanel: "width"
    }
  });
  const cabinetParts = calculateCabinetParts(furniture, rules);
  const csv = createCutListCsv("Mutfak Modülü", [...cabinetParts, ...drawerParts]);
  const rows = csv.slice(1).split("\r\n");

  assert.equal(csv.startsWith("\uFEFF"), true);
  assert.equal(rows[0], "Mobilya;Parça;Genişlik (mm);Uzunluk (mm);Kalınlık (mm);Adet;Malzeme;Malzeme ID;Bant Üst;Bant Alt;Bant Sol;Bant Sağ;Çekmece Grubu ID;Damar Yönü");
  assert.equal(rows.length, 1 + cabinetParts.length + 4);
  assert.ok(rows.includes("Mutfak Modülü;Çekmece Yan Paneli;120;450;15;4;MDF;;Evet;Hayır;Hayır;Hayır;drawer-group-1;Boy"));
  assert.ok(rows.includes("Mutfak Modülü;Çekmece Ön/Arka Paneli;470;120;15;4;MDF;;Hayır;Hayır;Evet;Hayır;drawer-group-1;En"));
  assert.ok(rows.includes("Mutfak Modülü;Çekmece Tabanı;470;420;6;2;MDF;;Hayır;Hayır;Hayır;Hayır;drawer-group-1;Belirtilmedi"));
  assert.ok(rows.includes("Mutfak Modülü;Çekmece Ön Paneli;540;180;18;2;MDF;;Evet;Evet;Evet;Evet;drawer-group-1;En"));

  const totalQuantity = rows.slice(1).reduce(
    (total, row) => total + Number(row.split(";")[5]),
    0
  );
  assert.equal(totalQuantity, 18);
});

test("CSV ayırıcı, tırnak ve satır sonu içeren alanları güvenli biçimde kaçırır", () => {
  const csv = createCutListCsv('Mutfak; "Özel"\nProje', [
    createPart({
      name: 'Panel "A"; ön',
      material: "MDF;\n18 mm"
    })
  ]);

  assert.ok(csv.includes('"Mutfak; ""Özel""\nProje";"Panel ""A""; ön";600;720;18;1;"MDF;\n18 mm"'));
  assert.ok(csv.endsWith("Hayır;Hayır;Hayır;Hayır"));
});

test("CSV sayısal ölçüleri yerelleştirmeden milimetre değerleri olarak korur", () => {
  const csv = createCutListCsv("Özel Modül", [
    createPart({ width: 100.25, length: 240.5 })
  ]);

  assert.ok(csv.includes("Özel Modül;Test Panel;100.25;240.5;18;1;MDF;"));
});

test("CSV katalog malzeme kimliğini ayrı sütunda taşır", () => {
  const csv = createCutListCsv("Modül", [
    createPart({ materialId: "mdf-white" })
  ]);
  assert.ok(csv.includes("Malzeme;Malzeme ID;Bant Üst"));
  assert.ok(csv.includes(";MDF;mdf-white;Hayır"));
});

test("boş mobilya adı veya parça listesi dışa aktarılamaz", () => {
  assert.throws(() => createCutListCsv(" ", [createPart()]), /mobilya adı/);
  assert.throws(() => createCutListCsv("Modül", []), /en az bir parça/);
});

test("geçersiz parça ölçüsü, adedi veya malzemesi dışa aktarılmaz", () => {
  assert.throws(
    () => createCutListCsv("Modül", [createPart({ width: 0 })]),
    /ölçüleri pozitif/
  );
  assert.throws(
    () => createCutListCsv("Modül", [createPart({ quantity: 1.5 })]),
    /pozitif tam sayı/
  );
  assert.throws(
    () => createCutListCsv("Modül", [createPart({ material: " " })]),
    /malzemesi belirtilmelidir/
  );
});


test("standart dikdörtgen CSV başlığı mevcut sütun sırasını korur", () => {
  const csv = createCutListCsv("Modül", [createPart()]);
  const header = csv.replace(/^\uFEFF/, "").split("\r\n")[0];
  assert.equal(
    header,
    "Mobilya;Parça;Genişlik (mm);Uzunluk (mm);Kalınlık (mm);Adet;Malzeme;Malzeme ID;Bant Üst;Bant Alt;Bant Sol;Bant Sağ"
  );
});
test("CSV kesitli panel geometrisini kayıpsız taşıyamadığı için dışa aktarımı engeller", () => {
  assert.throws(
    () => createCutListCsv("Modül", [createPart({ panelGeometry: { schemaVersion: 1 } })]),
    /kesitli panel geometrisi CSV biçiminde korunamadığı/i
  );
});

test("CSV per-edge katalog ataması, CNC operasyonu ve üretim notunda fail-closed davranır", () => {
  assert.throws(
    () => createCutListCsv("Modül", [createPart({
      edgeBandingByEdge: { top: { edgeBandingId: "band-white", unit: "mm" } }
    })]),
    /kenar bandı katalog ataması CSV biçiminde korunamadığı/i
  );
  assert.throws(
    () => createCutListCsv("Modül", [createPart({
      edgeBandingMaterialId: "band-white",
      edgeBandingUnit: "m"
    })]),
    /kenar bandı katalog ataması CSV biçiminde korunamadığı/i
  );
  assert.throws(
    () => createCutListCsv("Modül", [createPart({
      cncOperations: [{ id: "op-1" }]
    })]),
    /CNC operasyonları CSV biçiminde korunamadığı/i
  );
  assert.throws(
    () => createCutListCsv("Modül", [createPart({ productionNote: "Kesim yönünü koru" })]),
    /üretim notu CSV biçiminde korunamadığı/i
  );
});
