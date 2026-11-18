import assert from "node:assert/strict";
import test from "node:test";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";

function part(overrides = {}) {
  return {
    id: "part-1",
    furnitureId: "furniture-1",
    name: "Sol yan",
    width: 500,
    length: 700,
    thickness: 18,
    quantity: 2,
    material: "MDF",
    materialId: "mdf-18",
    grainDirection: "length",
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    ...overrides
  };
}

function report(parts, overrides = {}) {
  return {
    schemaVersion: 1,
    status: "ready",
    canExport: true,
    isEmpty: false,
    supportedFurniture: [{ furnitureId: "furniture-1", family: "cabinet" }],
    unsupportedFurniture: [],
    blockedFurniture: [],
    projectErrors: [],
    exportBlockers: [],
    firstError: null,
    result: {
      schemaVersion: 1,
      furniture: [{ furnitureId: "furniture-1", innerDimensionsMm: { width: 1000, height: 700, depth: 500 } }],
      parts
    },
    ...overrides
  };
}

function sheet(materialId = "mdf-18", thicknessMm = 18, grainDirection = "length", overrides = {}) {
  return {
    materialId,
    widthMm: 2800,
    lengthMm: 2070,
    thicknessMm,
    grainDirection,
    ...overrides
  };
}

function stock(sheetValue, kerfMm = 3.2, overrides = {}) {
  return { sheet: sheetValue, kerfMm, ...overrides };
}

function request(productionReport, stockSheets, overrides = {}) {
  return {
    schemaVersion: 1,
    productionReport,
    stockSheets,
    ...overrides
  };
}

function assertBlocked(value, expectedMessage) {
  const result = createProjectSheetNestingBatches(value);
  assert.equal(result.status, "blocked");
  assert.equal(result.result, null);
  assert.ok(result.diagnostics.length > 0);
  if (expectedMessage) {
    assert.match(result.diagnostics.join(" "), expectedMessage);
  }
  return result;
}

test("malzeme ve kalınlık grupları ayrı kullanıcı levha/kerf tanımlarıyla proje sırasını ve adetleri korur", () => {
  const productionReport = report([
    part({ id: "mdf-18-side" }),
    part({
      id: "plywood-18-shelf",
      material: "Kontrplak",
      materialId: "plywood-18",
      grainDirection: "width",
      quantity: 3
    }),
    part({ id: "mdf-8-back", thickness: 8, quantity: 1 })
  ]);

  const result = createProjectSheetNestingBatches(request(productionReport, [
    stock(sheet("mdf-18", 18, "length"), 3.2),
    stock(sheet("plywood-18", 18, "width"), 4),
    stock(sheet("mdf-18", 8, "length"), 2.4)
  ]));

  assert.equal(result.status, "ready");
  assert.deepEqual(result.sourcePartIds, [
    "mdf-18-side",
    "plywood-18-shelf",
    "mdf-8-back"
  ]);
  assert.deepEqual(result.excludedPartIds, []);
  assert.deepEqual(
    result.result?.batches.map((batch) => [batch.materialId, batch.thicknessMm]),
    [["mdf-18", 18], ["plywood-18", 18], ["mdf-18", 8]]
  );
  assert.deepEqual(
    result.result?.batches.map((batch) => batch.sourcePartIds),
    [["mdf-18-side"], ["plywood-18-shelf"], ["mdf-8-back"]]
  );
  assert.deepEqual(
    result.result?.batches.map((batch) => batch.batch.kerfMm),
    [3.2, 4, 2.4]
  );
  assert.deepEqual(
    result.result?.batches.map((batch) => batch.batch.totalPieceCount),
    [2, 3, 1]
  );
});

test("0.1 mm kalınlık normalizasyonu aynı malzeme grubunu kararlı biçimde birleştirir", () => {
  const productionReport = report([
    part({ id: "part-a", thickness: 18 }),
    part({ id: "part-b", thickness: 18.04, quantity: 1 })
  ]);

  const result = createProjectSheetNestingBatches(request(productionReport, [
    stock(sheet("mdf-18", 18))
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.result?.batches.length, 1);
  assert.deepEqual(result.result?.batches[0].sourcePartIds, ["part-a", "part-b"]);
  assert.equal(result.result?.batches[0].batch.parts[1].thicknessMm, 18);
  assert.equal(result.result?.batches[0].batch.totalPieceCount, 3);
});

test("açık Part seçimi dışarıdaki kesitli ve farklı malzemeli parçaları excludedPartIds içinde korur", () => {
  const productionReport = report([
    part({ id: "selected-part" }),
    part({
      id: "excluded-cutout",
      materialId: "plywood-18",
      material: "Kontrplak",
      panelGeometry: { schemaVersion: 1, cutouts: [] }
    }),
    part({ id: "excluded-other", thickness: 8 })
  ]);

  const result = createProjectSheetNestingBatches(request(
    productionReport,
    [stock(sheet("mdf-18", 18))],
    { partIds: ["selected-part"] }
  ));

  assert.equal(result.status, "ready");
  assert.deepEqual(result.sourcePartIds, ["selected-part"]);
  assert.deepEqual(result.excludedPartIds, ["excluded-cutout", "excluded-other"]);
  assert.equal(result.result?.batches.length, 1);
});

test("seçili malzeme/kalınlık gruplarından biri için levha tanımı eksikse tüm sonuç blocked olur", () => {
  const productionReport = report([
    part({ id: "mdf-part" }),
    part({ id: "plywood-part", materialId: "plywood-18", material: "Kontrplak" })
  ]);

  assertBlocked(
    request(productionReport, [stock(sheet("mdf-18", 18))]),
    /plywood-18 \/ 18 mm grubu için kullanıcı tarafından tanımlanmış levha/
  );
});

test("aynı malzeme ve normalize kalınlık için yinelenen levha tanımı reddedilir", () => {
  const productionReport = report([part()]);

  assertBlocked(
    request(productionReport, [
      stock(sheet("mdf-18", 18)),
      stock(sheet("mdf-18", 18.04), 4)
    ]),
    /yinelenen levha tanımı/
  );
});

test("seçili Part grubuna karşılık gelmeyen fazladan levha tanımı sessizce yok sayılmaz", () => {
  const productionReport = report([part()]);

  assertBlocked(
    request(productionReport, [
      stock(sheet("mdf-18", 18)),
      stock(sheet("plywood-18", 18))
    ]),
    /seçili Part gruplarından hiçbirine karşılık gelmiyor/
  );
});

test("legacy Part damar yönü yalnızca kendi grubundaki açık kullanıcı eşlemesiyle tamamlanır", () => {
  const productionReport = report([
    part({ grainDirection: undefined })
  ]);

  const result = createProjectSheetNestingBatches(request(productionReport, [
    stock(sheet("mdf-18", 18, "length"), 3.2, {
      grainDirectionsByPartId: { "part-1": "width" }
    })
  ]));

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.result?.batches[0].batch.parts[0].allowedRotationsDeg,
    [90]
  );
});

test("bir grubun damar override eşlemesi başka gruba ait Part ID kullanamaz", () => {
  const productionReport = report([
    part({ id: "mdf-part" }),
    part({
      id: "plywood-part",
      materialId: "plywood-18",
      material: "Kontrplak",
      grainDirection: "width"
    })
  ]);

  assertBlocked(
    request(productionReport, [
      stock(sheet("mdf-18", 18), 3.2, {
        grainDirectionsByPartId: { "plywood-part": "length" }
      }),
      stock(sheet("plywood-18", 18, "width"))
    ]),
    /seçili batch içinde olmayan parça kimliğini içeriyor/
  );
});

test("tek bir seçili kesitli Part bütün grouped result'ı bloklar ve kısmi batch döndürmez", () => {
  const productionReport = report([
    part({ id: "rectangular-part" }),
    part({
      id: "cutout-part",
      materialId: "plywood-18",
      material: "Kontrplak",
      panelGeometry: { schemaVersion: 1, cutouts: [] }
    })
  ]);

  assertBlocked(request(productionReport, [
    stock(sheet("mdf-18", 18)),
    stock(sheet("plywood-18", 18))
  ]), /panel kesit geometrisi/);
});

test("yanlış levha malzeme/kalınlık anahtarı eksik ve kullanılmayan tanım olarak reddedilir", () => {
  const productionReport = report([part()]);

  assertBlocked(
    request(productionReport, [stock(sheet("mdf-18", 19))]),
    /kullanıcı tarafından tanımlanmış levha|karşılık gelmiyor/
  );
});

test("yinelenen, bilinmeyen ve boş Part seçimleri reddedilir", () => {
  const productionReport = report([part()]);

  assertBlocked(
    request(productionReport, [stock(sheet("mdf-18", 18))], {
      partIds: ["part-1", "part-1"]
    }),
    /yinelenen parça kimliği/
  );
  assertBlocked(
    request(productionReport, [stock(sheet("mdf-18", 18))], {
      partIds: ["missing"]
    }),
    /bulunmayan parça kimliğini/
  );
  assertBlocked(
    request(productionReport, [stock(sheet("mdf-18", 18))], {
      partIds: []
    }),
    /boş olmayan/
  );
});

test("boş levha tanımı, boş proje Part listesi ve yinelenen kaynak Part ID engellenir", () => {
  assertBlocked(
    request(report([part()]), []),
    /Her malzeme/kalınlık grubu/
  );
  assertBlocked(
    request(report([]), [stock(sheet("mdf-18", 18))]),
    /projede üretim parçası bulunmuyor/
  );
  assertBlocked(
    request(report([part({ id: "same" }), part({ id: "same" })]), [
      stock(sheet("mdf-18", 18))
    ]),
    /yinelenen parça kimliği/
  );
});
