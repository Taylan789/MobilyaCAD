import assert from "node:assert/strict";
import test from "node:test";

import { getFurnitureCatalogCardDetails } from "../src/components/catalog/furnitureCatalogCardDetails.ts";

test("katalog kartı yalnızca tanımlı kapak, çekmece ve raf adetlerini gösterir", () => {
  assert.equal(
    getFurnitureCatalogCardDetails({ doorCount: 2, drawerCount: 1, shelfCount: 3 }),
    "2 kapak · 1 çekmece · 3 raf"
  );
});

test("sıfır adetler ayrıntı metnine eklenmez", () => {
  assert.equal(
    getFurnitureCatalogCardDetails({ doorCount: 0, drawerCount: 0, shelfCount: 0 }),
    ""
  );
});

test("adet alanları tanımlanmamış katalog öğesi için uydurma açıklama üretmez", () => {
  assert.equal(getFurnitureCatalogCardDetails({}), "");
});

test("kısmi adet bilgisi yalnızca mevcut alanı gösterir", () => {
  assert.equal(getFurnitureCatalogCardDetails({ drawerCount: 4 }), "4 çekmece");
});
