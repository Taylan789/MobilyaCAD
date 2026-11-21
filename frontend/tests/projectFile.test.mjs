import test from "node:test";
import assert from "node:assert/strict";
import { parseProjectFile, serializeProjectFile } from "../src/engine/projectFile.ts";
import { removeMaterialCatalogEntry } from "../src/engine/materialCatalog.ts";

const noBanding = () => ({ top: false, bottom: false, left: false, right: false });
const drawerConfig = {
  id: "drawer-group-1",
  spec: {
    outerWidth: 500,
    sideHeight: 140,
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
      sidePanels: noBanding(),
      frontBackPanels: noBanding(),
      bottomPanel: noBanding(),
      visibleFrontPanel: noBanding(),
    },
    grainDirection: {
      sidePanels: "length",
      frontBackPanels: "width",
      bottomPanel: "none",
      visibleFrontPanel: "width",
    },
  },
};

function createFurniture(overrides = {}) {
  return {
    id: "furniture-1",
    catalogId: "kitchen-base",
    name: "Alt modül",
    width: 800,
    height: 720,
    depth: 560,
    position: [0, 0, 0],
    rotation: 0,
    color: "#ffffff",
    doorCount: 2,
    drawerCount: 1,
    shelfCount: 1,
    hasBackPanel: true,
    backThickness: 8,
    edgeBanding: true,
    material: "MDF",
    drawerBoxSpecs: [drawerConfig],
    parts: [{
      id: "part-1",
      name: "Kapak 1",
      type: "door",
      width: 397,
      height: 714,
      depth: 18,
      position: [0, 0, 0],
      rotation: 0,
      color: "#ffffff",
      material: "MDF",
    }],
    ...overrides,
  };
}

const room = { width: 4000, length: 5000, height: 2800 };
const savedAt = "2026-11-15T18:00:00.000Z";
const materialCatalog = [{
  id: "mdf-white",
  name: " MDF ",
  category: "panel",
  decor: " Mat Beyaz ",
  thicknessesMm: [18, 8],
  unit: "mm",
}];

test("JSON v1 kaydet/yükle round-trip mobilya ve çekmece ölçülerini korur", () => {
  const furniture = createFurniture();
  const json = serializeProjectFile(room, [furniture], savedAt);
  const parsed = parseProjectFile(json);

  assert.deepEqual(parsed, {
    format: "MobilyaCAD",
    formatVersion: 1,
    savedAt,
    room: { ...room, unit: "mm" },
    furniture: [furniture],
  });
});

test("eski v1 dosyasında unit ve drawerBoxSpecs bulunmaması geriye uyumludur", () => {
  const { drawerBoxSpecs: _ignored, ...legacyFurniture } = createFurniture();
  const legacyFile = {
    format: "MobilyaCAD",
    formatVersion: 1,
    room,
    furniture: [legacyFurniture],
  };

  const parsed = parseProjectFile(JSON.stringify(legacyFile));

  assert.deepEqual(parsed.room, { ...room, unit: "mm" });
  assert.equal("drawerBoxSpecs" in parsed.furniture[0], false);
});

test("geçersiz JSON, desteklenmeyen sürüm ve milimetre dışı birim reddedilir", () => {
  assert.throws(() => parseProjectFile("{"), /geçerli JSON/);

  const wrongVersion = JSON.parse(serializeProjectFile(room, []));
  wrongVersion.formatVersion = 2;
  assert.throws(() => parseProjectFile(JSON.stringify(wrongVersion)), /uyumlu değil/);

  const wrongUnit = JSON.parse(serializeProjectFile(room, []));
  wrongUnit.room.unit = "cm";
  assert.throws(() => parseProjectFile(JSON.stringify(wrongUnit)), /uyumlu değil/);
});

test("bozuk mobilya geometrisi ve parça verisi proje yüklemesini engeller", () => {
  const invalidFurniture = JSON.parse(serializeProjectFile(room, [createFurniture()]));
  invalidFurniture.furniture[0].width = 0;
  assert.throws(() => parseProjectFile(JSON.stringify(invalidFurniture)), /uyumlu değil/);

  const invalidPart = JSON.parse(serializeProjectFile(room, [createFurniture()]));
  invalidPart.furniture[0].parts[0].position = [0, Number.NaN, 0];
  assert.throws(() => parseProjectFile(JSON.stringify(invalidPart)), /uyumlu değil/);
});

test("bozuk opsiyonel çekmece yapılandırması sessizce atlanmaz", () => {
  const invalidDrawer = JSON.parse(serializeProjectFile(room, [createFurniture()]));
  invalidDrawer.furniture[0].drawerBoxSpecs[0].spec.outerWidth = 0;
  assert.throws(() => parseProjectFile(JSON.stringify(invalidDrawer)), /uyumlu değil/);
});


test("JSON v1 isteğe bağlı kullanıcı malzeme kataloğunu round-trip sırasında korur", () => {
  const json = serializeProjectFile(room, [createFurniture()], savedAt, materialCatalog);
  const parsed = parseProjectFile(json);

  assert.deepEqual(parsed.materials, [{
    id: "mdf-white",
    name: "MDF",
    category: "panel",
    decor: "Mat Beyaz",
    thicknessesMm: [8, 18],
    unit: "mm",
  }]);
});

test("proje yükleyicisi geçersiz malzeme birimini ve yinelenen kimliği reddeder", () => {
  const wrongUnit = JSON.parse(
    serializeProjectFile(room, [], savedAt, materialCatalog)
  );
  wrongUnit.materials[0].unit = "cm";
  assert.throws(
    () => parseProjectFile(JSON.stringify(wrongUnit)),
    /malzeme kataloğu geçersiz/
  );

  const duplicateId = JSON.parse(
    serializeProjectFile(room, [], savedAt, materialCatalog)
  );
  duplicateId.materials.push({ ...duplicateId.materials[0], name: "Başka dekor" });
  assert.throws(
    () => parseProjectFile(JSON.stringify(duplicateId)),
    /malzeme kataloğu geçersiz/
  );
});

test("mobilya malzeme kimliği proje JSON v1 round-trip sırasında korunur", () => {
  const furniture = createFurniture({ materialId: "mdf-white" });
  const parsed = parseProjectFile(
    serializeProjectFile(room, [furniture], savedAt, materialCatalog)
  );
  assert.equal(parsed.furniture[0].materialId, "mdf-white");
});

test("katalogda bulunmayan veya kataloğu olmayan mobilya malzeme referansı reddedilir", () => {
  assert.throws(
    () => serializeProjectFile(
      room,
      [createFurniture({ materialId: "missing-material" })],
      savedAt,
      materialCatalog
    ),
    /malzeme referansı geçersiz/
  );
  assert.throws(
    () => serializeProjectFile(
      room,
      [createFurniture({ materialId: "mdf-white" })],
      savedAt
    ),
    /malzeme referansı geçersiz/
  );

  const invalidReference = JSON.parse(
    serializeProjectFile(room, [createFurniture()], savedAt, materialCatalog)
  );
  invalidReference.furniture[0].materialId = "missing-material";
  assert.throws(
    () => parseProjectFile(JSON.stringify(invalidReference)),
    /malzeme referansı geçersiz/
  );
});

test("çekmece grubu katalog malzemesi JSON v1 round-trip sırasında korunur", () => {
  const drawerMaterial = { id: "drawer-mdf", name: "Çekmece MDF", category: "panel", thicknessesMm: [6, 15, 18], unit: "mm" };
  const furniture = createFurniture({ drawerBoxSpecs: [{ ...drawerConfig, spec: { ...drawerConfig.spec, materialId: "drawer-mdf" } }] });
  const parsed = parseProjectFile(serializeProjectFile(room, [furniture], savedAt, [...materialCatalog, drawerMaterial]));
  assert.equal(parsed.furniture[0].drawerBoxSpecs[0].spec.materialId, "drawer-mdf");
  assert.equal(parsed.furniture[0].drawerBoxSpecs[0].spec.material, "MDF");
});

test("çekmece malzeme referansı ve dört panel kalınlığı proje kataloğunda doğrulanır", () => {
  const drawerMaterial = { id: "drawer-mdf", name: "Çekmece MDF", category: "panel", thicknessesMm: [6, 15, 18], unit: "mm" };
  const furniture = createFurniture({ drawerBoxSpecs: [{ ...drawerConfig, spec: { ...drawerConfig.spec, materialId: "drawer-mdf" } }] });
  assert.throws(() => serializeProjectFile(room, [furniture], savedAt, materialCatalog), /çekmece grubu.*malzeme kimliği.*bulunamadı/);
  assert.throws(() => serializeProjectFile(room, [furniture], savedAt, [{ ...drawerMaterial, thicknessesMm: [6, 15] }]), /18 mm kalınlık katalogda tanımlı değil/);
  const invalidReference = JSON.parse(serializeProjectFile(room, [createFurniture()], savedAt, [...materialCatalog, drawerMaterial]));
  invalidReference.furniture[0].drawerBoxSpecs[0].spec.materialId = "missing-drawer-material";
  assert.throws(() => parseProjectFile(JSON.stringify(invalidReference)), /malzeme referansı geçersiz/);
});

test("projede kullanılan malzeme katalogdan silinemez", () => {
  assert.throws(
    () => removeMaterialCatalogEntry(materialCatalog, "mdf-white", ["mdf-white"]),
    /tarafından kullanılıyor/
  );
});
