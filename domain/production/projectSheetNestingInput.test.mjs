import assert from "node:assert/strict";
import test from "node:test";
import { createProjectSheetNestingInput } from "./projectSheetNestingInput.ts";

const sheet = {
  materialId: "mdf-18",
  widthMm: 2800,
  lengthMm: 2070,
  thicknessMm: 18,
  grainDirection: "length"
};

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

function request(productionReport, overrides = {}) {
  return {
    schemaVersion: 1,
    productionReport,
    sheet,
    kerfMm: 3.2,
    ...overrides
  };
}

function assertBlocked(value, expectedMessage) {
  const result = createProjectSheetNestingInput(value);
  assert.equal(result.status, "blocked");
  assert.equal(result.result, null);
  assert.ok(result.diagnostics.length > 0);
  if (expectedMessage) assert.match(result.diagnostics[0], expectedMessage);
  return result;
}

test("proje Part kimliği, mm ölçüleri, malzeme ve quantity nesting girdisine aynen taşınır", () => {
  const result = createProjectSheetNestingInput(request(report([part()])));

  assert.equal(result.status, "ready");
  assert.deepEqual(result.sourcePartIds, ["part-1"]);
  assert.deepEqual(result.excludedPartIds, []);
  assert.equal(result.result?.parts[0].id, "part-1");
  assert.equal(result.result?.parts[0].widthMm, 500);
  assert.equal(result.result?.parts[0].lengthMm, 700);
  assert.equal(result.result?.parts[0].thicknessMm, 18);
  assert.equal(result.result?.parts[0].materialId, "mdf-18");
  assert.equal(result.result?.parts[0].quantity, 2);
  assert.equal(result.result?.totalPieceCount, 2);
  assert.equal(result.result?.kerfMm, 3.2);
});

test("birden fazla malzemeli projede açık Part seçimi tek malzeme batch'i oluşturur ve dışarıda kalan ID'leri bildirir", () => {
  const productionReport = report([
    part({ id: "mdf-part" }),
    part({
      id: "plywood-part",
      material: "Kontrplak",
      materialId: "plywood-18"
    })
  ]);

  const result = createProjectSheetNestingInput(request(productionReport, {
    partIds: ["mdf-part"]
  }));

  assert.equal(result.status, "ready");
  assert.deepEqual(result.sourcePartIds, ["mdf-part"]);
  assert.deepEqual(result.excludedPartIds, ["plywood-part"]);
  assert.equal(result.result?.parts.length, 1);
});

test("açık grain yönü olmayan legacy Part için kullanıcı eşlemesi zorunludur", () => {
  const productionReport = report([part({ grainDirection: undefined })]);

  assertBlocked(request(productionReport), /damar yönü açıkça belirtilmelidir/);

  const result = createProjectSheetNestingInput(request(productionReport, {
    grainDirectionsByPartId: { "part-1": "width" }
  }));
  assert.equal(result.status, "ready");
  assert.equal(result.result?.parts[0].grainDirection, "width");
  assert.deepEqual(result.result?.parts[0].allowedRotationsDeg, [90]);
});

test("seçili batch içindeki malzeme veya kalınlık uyuşmazlığı tüm sonucu bloklar", () => {
  const materialMismatch = createProjectSheetNestingInput(request(report([
    part(),
    part({ id: "other-material", materialId: "plywood-18" })
  ])));
  assert.equal(materialMismatch.status, "blocked");
  assert.equal(materialMismatch.result, null);

  const thicknessMismatch = createProjectSheetNestingInput(request(report([
    part(),
    part({ id: "other-thickness", thickness: 8 })
  ])));
  assert.equal(thicknessMismatch.status, "blocked");
  assert.equal(thicknessMismatch.result, null);
});

test("kesitli panel geometry nesting batch'ine alınmaz", () => {
  assertBlocked(
    request(report([part({ panelGeometry: { schemaVersion: 1, cutouts: [] } })])),
    /panel kesit geometrisi/
  );
});

test("blocked veya empty proje üretim raporundan nesting girdisi üretilmez", () => {
  assertBlocked(
    request(report([part()], { status: "blocked", firstError: "Proje ölçüsü geçersiz." })),
    /Proje ölçüsü geçersiz/
  );
  assertBlocked(
    request(report([part()], { status: "empty" })),
    /ready durumunda değil/
  );
});

test("yinelenen, bilinmeyen veya boş Part seçimi reddedilir", () => {
  const productionReport = report([part()]);
  assertBlocked(request(productionReport, { partIds: ["part-1", "part-1"] }), /yinelenen/);
  assertBlocked(request(productionReport, { partIds: ["missing"] }), /bulunmayan/);
  assertBlocked(request(productionReport, { partIds: [] }), /boş olmayan/);
});

test("seçili batch dışındaki grain override kimliği reddedilir", () => {
  const productionReport = report([
    part(),
    part({ id: "excluded-part" })
  ]);
  assertBlocked(
    request(productionReport, {
      partIds: ["part-1"],
      grainDirectionsByPartId: { "excluded-part": "length" }
    }),
    /seçili batch içinde olmayan/
  );
});

test("grain ve sheet envelope kısıtları mevcut nesting validator tarafından uygulanır", () => {
  assertBlocked(
    request(report([part({ width: 2100, length: 2500 })])),
    /levha sınırlarına sığmıyor/
  );
});
