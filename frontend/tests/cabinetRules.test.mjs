import test from "node:test";
import assert from "node:assert/strict";
import { getCabinetCutListExportBlockReason } from "../src/engine/cabinetRules.ts";
const banding = () => ({ top: false, bottom: false, left: false, right: false });
const config = (id, quantity, overrides = {}) => ({
  id,
  spec: {
    outerWidth: 500, sideHeight: 140, outerDepth: 450,
    sideThickness: 15, frontBackThickness: 15, bottomThickness: 6,
    visibleFrontWidth: 540, visibleFrontHeight: 180, visibleFrontThickness: 18,
    quantity, material: "MDF", bottomFit: "between-sides-and-front-back",
    edgeBanding: { sidePanels: banding(), frontBackPanels: banding(), bottomPanel: banding(), visibleFrontPanel: banding() },
    grainDirection: { sidePanels: "length", frontBackPanels: "width", bottomPanel: "none", visibleFrontPanel: "width" },
    ...overrides
  }
});
test("çekmecesiz modül mevcut CSV akışını engellemez", () => assert.equal(getCabinetCutListExportBlockReason({ drawerCount: 0 }), null));
test("çekmeceli modülde yapılandırma yoksa CSV engellenir", () => assert.match(getCabinetCutListExportBlockReason({ drawerCount: 2 }), /tüm çekmece kutusu ölçülerini/));
test("tanımlı çekmece adedi mobilya adediyle eşleşmezse CSV engellenir", () => assert.match(getCabinetCutListExportBlockReason({ drawerCount: 3, drawerBoxSpecs: [config("group-1", 2)] }), /eşleşmelidir/));
test("bütün çekmeceler geçerli tanımlandığında CSV kilidi açılır", () => assert.equal(getCabinetCutListExportBlockReason({ drawerCount: 3, drawerBoxSpecs: [config("group-1", 2), config("group-2", 1)] }), null));
test("geçersiz türetilmiş iç genişlik CSV'yi engeller", () => assert.match(getCabinetCutListExportBlockReason({ drawerCount: 1, drawerBoxSpecs: [config("group-1", 1, { outerWidth: 30, sideThickness: 20 })] }), /geçerli üretim parçaları/));
test("yinelenen çekmece grubu kimliği CSV'yi engeller", () => assert.match(getCabinetCutListExportBlockReason({ drawerCount: 2, drawerBoxSpecs: [config("same", 1), config("same", 1)] }), /geçersiz/));
test("çekmece adedi sıfırsa çekmece kutusu hesabı gerektirmez", () => assert.equal(getCabinetCutListExportBlockReason({ drawerCount: 0, drawerBoxSpecs: [] }), null));
