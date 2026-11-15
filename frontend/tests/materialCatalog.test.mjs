import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveMaterialThickness,
  validateMaterialCatalog
} from "../src/engine/materialCatalog.ts";

const validMaterial = {
  id: "mdf-white",
  name: " MDF ",
  category: "panel",
  decor: "  Mat Beyaz  ",
  thicknessesMm: [18, 8, 12],
  unit: "mm"
};

test("malzeme kaydı metinleri normalize eder ve kalınlıkları mm olarak sıralar", () => {
  assert.deepEqual(validateMaterialCatalog([validMaterial]), [{
    id: "mdf-white",
    name: "MDF",
    category: "panel",
    decor: "Mat Beyaz",
    thicknessesMm: [8, 12, 18],
    unit: "mm"
  }]);
});

test("malzeme kimliği kararlı biçimde tanımlanır ve katalogda benzersizdir", () => {
  assert.throws(
    () => validateMaterialCatalog([validMaterial, { ...validMaterial, name: "Başka MDF" }]),
    /Yinelenen malzeme kimliği/
  );
  assert.throws(
    () => validateMaterialCatalog([{ ...validMaterial, id: "MDF Beyaz" }]),
    /kararlı kimlik/
  );
  assert.throws(
    () => validateMaterialCatalog([{ ...validMaterial, id: " mdf-white" }]),
    /kararlı kimlik/
  );
});

test("bilinmeyen birim, boş kalınlık listesi ve geçersiz veya yinelenen kalınlık reddedilir", () => {
  assert.throws(
    () => validateMaterialCatalog([{ ...validMaterial, unit: "cm" }]),
    /birimi mm/
  );
  assert.throws(
    () => validateMaterialCatalog([{ ...validMaterial, thicknessesMm: [] }]),
    /en az bir panel kalınlığı/
  );
  assert.throws(
    () => validateMaterialCatalog([{ ...validMaterial, thicknessesMm: [18, 18] }]),
    /yinelenen panel kalınlığı/
  );
  assert.throws(
    () => validateMaterialCatalog([{ ...validMaterial, thicknessesMm: [18, 0] }]),
    /sıfırdan büyük/
  );
});

test("malzeme yalnızca katalogda açıkça bulunan panel kalınlığını çözer", () => {
  const [material] = validateMaterialCatalog([validMaterial]);
  assert.equal(resolveMaterialThickness(material, 12), 12);
  assert.throws(
    () => resolveMaterialThickness(material, 15),
    /katalogda tanımlı değil/
  );
  assert.throws(
    () => resolveMaterialThickness(material, Number.POSITIVE_INFINITY),
    /sonlu bir mm değeri/
  );
});
