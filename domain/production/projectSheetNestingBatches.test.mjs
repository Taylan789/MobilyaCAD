import assert from "node:assert/strict";
import test from "node:test";
import { createProjectSheetNestingBatches } from "./projectSheetNestingBatches.ts";
import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { BOOKSHELF_PANEL_GROUPS } from "./bookshelfConstruction.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import { calculateProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";
import { createProjectPartSnapshot, validateProjectPartSnapshot } from "./projectPartSnapshot.ts";

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


function cabinetMaterialConflictRequest(id, materialLabel) {
  const noBanding = { top: false, bottom: false, left: false, right: false };
  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: 800,
      heightMm: 720,
      depthMm: 560,
      material: materialLabel,
      materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup: Object.fromEntries(
        BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
      )
    },
    materials: [{
      id: "mdf-18",
      name: materialLabel,
      category: "panel",
      thicknessesMm: [18],
      unit: "mm"
    }]
  };
}

function bookshelfMaterialConflictRequest(id, materialLabel) {
  const noBanding = { top: false, bottom: false, left: false, right: false };
  return {
    schemaVersion: 1,
    family: "bookshelf",
    furniture: {
      id,
      widthMm: 800,
      heightMm: 2000,
      depthMm: 300,
      material: materialLabel,
      materialId: "mdf-18"
    },
    profile: {
      panelThicknessMm: 18,
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 3,
      edgeBandingByGroup: Object.fromEntries(
        BOOKSHELF_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
      )
    },
    materials: [{
      id: "mdf-18",
      name: materialLabel,
      category: "panel",
      thicknessesMm: [18],
      unit: "mm"
    }]
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
  assert.deepEqual(result.projectPartSnapshot?.parts.map((entry) => entry.id), [
    "mdf-18-side", "plywood-18-shelf", "mdf-8-back"
  ]);
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
  assert.deepEqual(result.projectPartSnapshot?.parts.map((entry) => entry.id), [
    "selected-part", "excluded-cutout", "excluded-other"
  ]);
  assert.match(result.projectPartSnapshot?.parts[1]?.snapshot ?? "", /panelGeometry/);
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
    /Her malzeme\/kalınlık grubu/
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

test("DOM-114 blocked nesting batches retain validated material-conflict source coverage and order", () => {
  const cabinet = cabinetMaterialConflictRequest("cabinet-conflict", "MDF Lam Premium");
  const bookshelf = bookshelfMaterialConflictRequest("bookshelf-conflict", "MDF Lam 18");
  const furniture = [cabinet, bookshelf];
  const before = JSON.stringify(furniture);
  const productionReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture
  });
  assert.equal(productionReport.status, "blocked");
  assert.equal(productionReport.result, null);

  const isolatedParts = furniture.flatMap((requestValue) => {
    const isolated = calculateCabinetProjectProductionWithDiagnostics({
      schemaVersion: 1,
      furniture: [requestValue]
    });
    assert.equal(isolated.status, "ready", isolated.firstError ?? "");
    assert.ok(isolated.result);
    return isolated.result.parts;
  });
  const expectedSources = isolatedParts
    .filter((item) => item.materialId === "mdf-18")
    .map((item) => ({
      furnitureId: item.furnitureId,
      partId: item.id,
      materialLabel: item.material
    }))
    .sort((left, right) =>
      left.furnitureId < right.furnitureId ? -1 :
        left.furnitureId > right.furnitureId ? 1 :
          left.partId < right.partId ? -1 : left.partId > right.partId ? 1 : 0
    );

  const conflict = productionReport.blockedFurniture[0]?.materialIdentityConflict;
  assert.ok(conflict);
  assert.deepEqual(conflict.sources, expectedSources);
  assert.equal(
    new Set(conflict.sources.map((source) => JSON.stringify([source.furnitureId, source.partId]))).size,
    expectedSources.length
  );
  const affectedFurnitureIds = [...new Set(expectedSources.map((source) => source.furnitureId))].sort();
  assert.deepEqual(
    productionReport.blockedFurniture.map((entry) => entry.furnitureId).sort(),
    affectedFurnitureIds
  );
  for (const diagnostic of productionReport.blockedFurniture) {
    assert.deepEqual(diagnostic.materialIdentityConflict, conflict);
  }

  const batches = assertBlocked(
    request(productionReport, []),
    /katalog kimliği farklı adlarla kullanılıyor/
  );
  assert.deepEqual(
    batches.productionDiagnostics,
    productionReport.blockedFurniture.map((entry) => ({
      source: "blockedFurniture",
      furnitureId: entry.furnitureId,
      family: entry.family,
      code: entry.code,
      message: entry.message,
      materialIdentityConflict: entry.materialIdentityConflict
    }))
  );

  const reversedReport = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: [...furniture].reverse()
  });
  assert.deepEqual(reversedReport.blockedFurniture, productionReport.blockedFurniture);
  const reversedBatches = createProjectSheetNestingBatches(request(reversedReport, []));
  assert.deepEqual(reversedBatches.productionDiagnostics, batches.productionDiagnostics);

  const incompleteReport = {
    ...productionReport,
    blockedFurniture: [productionReport.blockedFurniture[0]]
  };
  const incompleteBatches = assertBlocked(
    request(incompleteReport, []),
    /tüm kaynak furniture tanılarını kapsamalıdır/
  );
  assert.equal(incompleteBatches.productionDiagnostics, undefined);
  assert.equal(JSON.stringify(furniture), before);
});
test("DOM-115 blocked mixed-family material-conflict provenance reconciles with isolated material summaries and valid Part snapshots", () => {
  const furniture = [
    cabinetMaterialConflictRequest("cabinet-conflict", "MDF Lam Premium"),
    bookshelfMaterialConflictRequest("bookshelf-conflict", "MDF Lam 18")
  ];
  const before = JSON.stringify(furniture);
  const blockedProduction = calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture
  });
  assert.equal(blockedProduction.status, "blocked");
  assert.equal(blockedProduction.result, null);

  const isolatedReports = furniture.map((requestValue) =>
    calculateCabinetProjectProductionWithDiagnostics({
      schemaVersion: 1,
      furniture: [requestValue]
    })
  );
  const isolatedParts = isolatedReports.flatMap((isolated) => {
    assert.equal(isolated.status, "ready", isolated.firstError ?? "");
    assert.ok(isolated.result);
    return isolated.result.parts;
  });
  const snapshot = validateProjectPartSnapshot(createProjectPartSnapshot(isolatedParts));
  assert.deepEqual(snapshot.parts.map((entry) => entry.id), isolatedParts.map((entry) => entry.id));

  const materialSummaries = isolatedReports.flatMap((isolated) => {
    assert.ok(isolated.result);
    return calculateProjectMaterialConsumptionSummary(isolated.result);
  });
  const conflict = blockedProduction.blockedFurniture[0]?.materialIdentityConflict;
  assert.ok(conflict);
  const matchingSummaries = materialSummaries.filter((summary) => summary.materialId === conflict.materialId);
  assert.ok(matchingSummaries.length > 0);
  const summaryPartIds = [...new Set(matchingSummaries.flatMap((summary) => summary.partIds))].sort();
  const summaryFurnitureIds = [...new Set(matchingSummaries.flatMap((summary) => summary.furnitureIds ?? []))].sort();
  const conflictPartIds = conflict.sources.map((source) => source.partId).sort();
  const conflictFurnitureIds = [...new Set(conflict.sources.map((source) => source.furnitureId))].sort();

  assert.deepEqual(conflictPartIds, summaryPartIds);
  assert.deepEqual(conflictFurnitureIds, summaryFurnitureIds);
  assert.ok(new Set(conflict.sources.map((source) => source.materialLabel)).size > 1);

  const snapshotConflictParts = snapshot.parts
    .map((entry) => JSON.parse(entry.snapshot))
    .filter((part) => part.materialId === conflict.materialId);
  assert.deepEqual(snapshotConflictParts.map((part) => part.id).sort(), summaryPartIds);
  assert.deepEqual(
    [...new Set(snapshotConflictParts.map((part) => part.furnitureId))].sort(),
    summaryFurnitureIds
  );

  const nestingReport = assertBlocked(
    request(blockedProduction, []),
    /katalog kimliği farklı malzeme adlarıyla kullanılıyor/
  );
  assert.equal(nestingReport.projectPartSnapshot, undefined);
  assert.deepEqual(
    nestingReport.productionDiagnostics?.flatMap((diagnostic) =>
      diagnostic.materialIdentityConflict?.sources ?? []
    ).map((source) => source.partId).sort(),
    conflictPartIds
  );
  assert.deepEqual(JSON.stringify(furniture), before);
});

