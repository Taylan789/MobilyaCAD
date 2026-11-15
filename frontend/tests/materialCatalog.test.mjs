import test from "node:test";
import assert from "node:assert/strict";
import {
  addMaterialCatalogEntry,
  removeMaterialCatalogEntry,
  resolveMaterialThickness,
  updateMaterialCatalogEntry,
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


test("yeni malzeme ekleme mevcut kimlikleri sessizce değiştirmez", () => {
  const [existing] = validateMaterialCatalog([validMaterial]);
  const next = addMaterialCatalogEntry([existing], {
    id: "plywood",
    name: "Kontrplak",
    category: "panel",
    thicknessesMm: [12],
    unit: "mm"
  });

  assert.deepEqual(next.map((material) => material.id), ["mdf-white", "plywood"]);
  assert.throws(
    () => addMaterialCatalogEntry(next, existing),
    /zaten kayıtlı/
  );
});

test("malzeme güncellemesi kararlı kimliği korur", () => {
  const [existing] = validateMaterialCatalog([validMaterial]);
  const updated = updateMaterialCatalogEntry([existing], existing.id, {
    ...existing,
    name: "Yeni MDF",
    thicknessesMm: [18, 15]
  });

  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, existing.id);
  assert.equal(updated[0].name, "Yeni MDF");
  assert.deepEqual(updated[0].thicknessesMm, [15, 18]);
  assert.throws(
    () => updateMaterialCatalogEntry([existing], existing.id, {
      ...existing,
      id: "new-id"
    }),
    /değiştirilemez/
  );
});

test("malzeme silme yalnızca katalogda bulunan kimliği kaldırır", () => {
  const [existing] = validateMaterialCatalog([validMaterial]);
  assert.deepEqual(removeMaterialCatalogEntry([existing], existing.id), []);
  assert.throws(
    () => removeMaterialCatalogEntry([existing], "unknown-material"),
    /bulunamadı/
  );
});
