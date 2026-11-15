import test from "node:test";
import assert from "node:assert/strict";
import { isDrawerBoxProjectConfig, isValidDrawerBoxProjectSpecs } from "../src/engine/drawerBoxProject.ts";

const noBanding = () => ({ top: false, bottom: false, left: false, right: false });
function createConfig(overrides = {}) {
  return {
    id: "drawer-group-1",
    spec: {
      outerWidth: 500, sideHeight: 140, outerDepth: 450,
      sideThickness: 15, frontBackThickness: 15, bottomThickness: 6,
      visibleFrontWidth: 540, visibleFrontHeight: 180, visibleFrontThickness: 18,
      quantity: 2, material: "MDF", bottomFit: "between-sides-and-front-back",
      edgeBanding: {
        sidePanels: noBanding(), frontBackPanels: noBanding(),
        bottomPanel: noBanding(), visibleFrontPanel: noBanding()
      },
      grainDirection: {
        sidePanels: "length", frontBackPanels: "width",
        bottomPanel: "none", visibleFrontPanel: "width"
      },
      ...overrides
    }
  };
}

test("eski proje v1 dosyalarında çekmece yapılandırmasının bulunmaması geçerlidir", () => {
  assert.equal(isValidDrawerBoxProjectSpecs(undefined), true);
});
test("geçerli çekmece yapılandırmaları proje v1 verisinde saklanabilir", () => {
  assert.equal(isDrawerBoxProjectConfig(createConfig()), true);
  assert.equal(
    isValidDrawerBoxProjectSpecs([
      createConfig(),
      { ...createConfig({ quantity: 1 }), id: "drawer-group-2" }
    ]),
    true
  );
});
test("boş veya negatif ölçülü çekmece yapılandırması reddedilir", () => {
  assert.equal(isDrawerBoxProjectConfig(createConfig({ outerWidth: 0 })), false);
  assert.equal(isDrawerBoxProjectConfig(createConfig({ sideThickness: -1 })), false);
});
test("kesirli veya negatif çekmece adedi reddedilir", () => {
  assert.equal(isDrawerBoxProjectConfig(createConfig({ quantity: 1.5 })), false);
  assert.equal(isDrawerBoxProjectConfig(createConfig({ quantity: -1 })), false);
});
test("bilinmeyen konstrüksiyon, malzeme ve damar yönü reddedilir", () => {
  assert.equal(isDrawerBoxProjectConfig(createConfig({ bottomFit: "on-top" })), false);
  assert.equal(isDrawerBoxProjectConfig(createConfig({ material: " " })), false);
  const invalid = createConfig();
  invalid.spec.grainDirection.bottomPanel = "diagonal";
  assert.equal(isDrawerBoxProjectConfig(invalid), false);
});
test("eksik kenar bantlama bayrakları reddedilir", () => {
  const invalid = createConfig();
  invalid.spec.edgeBanding.sidePanels = { top: true, bottom: false, left: false };
  assert.equal(isDrawerBoxProjectConfig(invalid), false);
});
test("bozuk opsiyonel yapılandırma içeren proje mobilyası reddedilir", () => {
  assert.equal(isValidDrawerBoxProjectSpecs("invalid"), false);
  assert.equal(isValidDrawerBoxProjectSpecs([createConfig(), { id: "missing-spec" }]), false);
});


test("proje çekmece gruplarında adet pozitif tam sayı olmalıdır", () => {
  assert.equal(isDrawerBoxProjectConfig(createConfig({ quantity: 0 })), false);
});

test("aynı proje içinde çekmece grubu kimlikleri benzersiz olmalıdır", () => {
  assert.equal(
    isValidDrawerBoxProjectSpecs([createConfig(), createConfig()]),
    false
  );
});
