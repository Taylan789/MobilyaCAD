import assert from "node:assert/strict";
import test from "node:test";

import { BODY_PANEL_GROUPS } from "./bodyPanelMaterials.ts";
import { calculateCabinetProjectProductionWithDiagnostics } from "./projectProduction.ts";
import {
  calculateProjectEdgeBandingConsumptionSummary,
  calculateProjectMaterialConsumptionSummary
} from "./projectMaterialSummary.ts";
import { calculateProjectPricedConsumptionSummary } from "./projectPricedConsumption.ts";

const noBanding = { top: false, bottom: false, left: false, right: false };

function createCabinetRequest(id, options = {}) {
  const edgeBandingByGroup = Object.fromEntries(
    BODY_PANEL_GROUPS.map((group) => [group, { ...noBanding }])
  );
  if (options.banded === true) {
    edgeBandingByGroup.leftSide = { ...noBanding, top: true };
  }

  const materialId = options.materialId ?? "mdf-18";
  const material = options.material ?? "MDF Lam 18";
  return {
    schemaVersion: 1,
    furniture: {
      id,
      widthMm: options.widthMm ?? 800,
      heightMm: 720,
      depthMm: 560,
      material,
      materialId
    },
    profile: {
      panelThicknessMm: options.panelThicknessMm ?? 18,
      ...(options.panelThicknessMmByGroup === undefined
        ? {}
        : { panelThicknessMmByGroup: options.panelThicknessMmByGroup }),
      carcassStyle: "between-sides",
      backPanel: { enabled: false },
      shelfCount: 0,
      doors: { enabled: false, count: 0 },
      edgeBandingByGroup
    },
    materials: options.materials ?? [
      {
        id: materialId,
        name: material,
        category: "panel",
        thicknessesMm: options.materialThicknessesMm ?? [18],
        unit: "mm"
      }
    ],
    ...(options.panelMaterialOverrides === undefined
      ? {}
      : { panelMaterialOverrides: options.panelMaterialOverrides })
  };
}

function createReport(options = {}) {
  const furniture = options.furnitureRequests ?? [
    createCabinetRequest(options.furnitureId ?? "cab-cost-1", options)
  ];
  return calculateCabinetProjectProductionWithDiagnostics({
    schemaVersion: 1,
    furniture: options.empty === true ? [] : furniture,
    ...(options.hardwareItems === undefined ? {} : { hardwareItems: options.hardwareItems }),
    ...(options.edgeBandingAssignments === undefined
      ? {}
      : { edgeBandingAssignments: options.edgeBandingAssignments })
  });
}

function price(
  resourceType,
  resourceId,
  unit,
  unitPriceMinor,
  currencyCode = "TRY",
  sourceReference,
  thicknessMm
) {
  return {
    resourceType,
    resourceId,
    unit,
    unitPriceMinor,
    currencyCode,
    ...(sourceReference === undefined ? {} : { sourceReference }),
    ...(thicknessMm === undefined ? {} : { thicknessMm })
  };
}

function hardwareItems() {
  return [
    { id: "bom-hinge-a", furnitureId: "cab-cost-1", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.1, unit: "adet" },
    { id: "bom-hinge-b", furnitureId: "cab-cost-1", hardwareId: "hinge-110", name: "Menteşe", quantity: 0.2, unit: "adet" },
    { id: "bom-slide", furnitureId: "cab-cost-1", hardwareId: "slide-set", name: "Ray takımı", quantity: 1.5, unit: "takım" }
  ];
}

test("malzeme m2 ve donanım özgün birimi fiyatlarıyla tek para biriminde maliyet üretir", () => {
  const report = createReport({ hardwareItems: hardwareItems() });
  const explicitPartId = report.result.parts.find((part) => part.furnitureId === "cab-cost-1").id;
  report.result.hardwareItems[0].sourcePartIds = [explicitPartId];
  assert.equal(report.status, "ready");
  assert.equal(report.canExport, false);

  const material = calculateProjectMaterialConsumptionSummary(report.result)[0];
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250, "TRY", "material-list:v1"),
    price("hardware", "hinge-110", "adet", 50, "TRY", "hardware-list:v2"),
    price("hardware", "slide-set", "takım", 250, "TRY", "hardware-list:v2")
  ]);

  assert.equal(summary.status, "ready");
  assert.equal(summary.currencyCode, "TRY");
  assert.equal(summary.requiredLineCount, 3);
  assert.equal(summary.pricedLineCount, 3);
  assert.equal(summary.costSummary.lineCount, 3);
  assert.deepEqual(summary.costSummary.lines.map((line) => line.category), [
    "material", "hardware", "hardware"
  ]);
  assert.equal(summary.costSummary.lines[0].quantity, material.panelAreaM2);
  assert.equal(summary.costSummary.lines[0].unit, "m2");
  assert.equal(summary.costSummary.lines[0].sourceReference, "material-list:v1");
  assert.equal(summary.costSummary.lines[1].quantity, 0.3);
  assert.equal(summary.costSummary.lines[1].unit, "adet");
  assert.equal(summary.costSummary.lines[2].quantity, 1.5);
  assert.equal(summary.costSummary.lines[2].unit, "takım");
  assert.equal(
    summary.costSummary.grandTotalMinor,
    summary.costSummary.lines.reduce((total, line) => total + line.lineTotalMinor, 0)
  );
  assert.deepEqual(summary.missingPrices, []);
  const hingeSource = summary.lineHardwareSources.find((source) => source.hardwareId === "hinge-110");
  assert.deepEqual(hingeSource.sourcePartIds, [explicitPartId]);
});

test("aynı malzeme adı farklı katalog kimliği veya kalınlıkta ayrı fiyat satırları üretir", () => {
  const report = createReport({
    furnitureRequests: [
      createCabinetRequest("cab-material-a", {
        materialId: "mdf-a",
        material: "MDF Lam",
        materialThicknessesMm: [18]
      }),
      createCabinetRequest("cab-material-b", {
        materialId: "mdf-b",
        material: "MDF Lam",
        materialThicknessesMm: [18]
      }),
      createCabinetRequest("cab-thickness", {
        materialId: "mdf-shared",
        material: "MDF Lam",
        materialThicknessesMm: [8, 18],
        panelMaterialOverrides: { top: "mdf-shared" },
        panelThicknessMmByGroup: { top: 8 }
      })
    ]
  });
  assert.equal(report.status, "ready");

  const materialGroups = calculateProjectMaterialConsumptionSummary(report.result);
  assert.deepEqual(
    materialGroups.map((group) => [group.materialId, group.thicknessMm]),
    [
      ["mdf-a", 18],
      ["mdf-b", 18],
      ["mdf-shared", 8],
      ["mdf-shared", 18]
    ]
  );

  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-a", "m2", 1000, "TRY", undefined, 18),
    price("material", "mdf-b", "m2", 2000, "TRY", undefined, 18),
    price("material", "mdf-shared", "m2", 3000, "TRY", undefined, 8),
    price("material", "mdf-shared", "m2", 4000, "TRY", undefined, 18)
  ]);

  assert.equal(summary.status, "ready");
  assert.equal(summary.requiredLineCount, 4);
  assert.deepEqual(
    summary.linePartSources.map((source) => [source.resourceType, source.resourceId, source.unit]),
    [["material", "mdf-a", "m2"], ["material", "mdf-b", "m2"], ["material", "mdf-shared", "m2"], ["material", "mdf-shared", "m2"]]
  );
  assert.equal(summary.pricedLineCount, 4);
  assert.deepEqual(
    summary.costSummary.lines.map((line) => [line.description, line.unitPriceMinor]),
    [
      ["MDF Lam (18 mm; mdf-a)", 1000],
      ["MDF Lam (18 mm; mdf-b)", 2000],
      ["MDF Lam (8 mm; mdf-shared)", 3000],
      ["MDF Lam (18 mm; mdf-shared)", 4000]
    ]
  );
  assert.equal(
    summary.costSummary.grandTotalMinor,
    summary.costSummary.lines.reduce((total, line) => total + line.lineTotalMinor, 0)
  );
  assert.deepEqual(summary.missingPrices, []);
});

test("çoklu kalınlıkta kalınlık belirtmeyen legacy fiyat hiçbir gruba uygulanmaz", () => {
  const report = createReport({
    materialId: "mdf-shared",
    material: "MDF Lam",
    materialThicknessesMm: [8, 18],
    panelMaterialOverrides: { top: "mdf-shared" },
    panelThicknessMmByGroup: { top: 8 }
  });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-shared", "m2", 1250)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.currencyCode, null);
  assert.equal(summary.requiredLineCount, 2);
  assert.equal(summary.pricedLineCount, 0);
  assert.deepEqual(
    summary.missingPrices.map((issue) => [issue.thicknessMm, issue.legacyPriceAvailable]),
    [[8, true], [18, true]]
  );
});

test("eksik bir donanım fiyatı toplamı hazır göstermez ve kısmi toplam döndürmez", () => {
  const report = createReport({ hardwareItems: hardwareItems() });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250),
    price("hardware", "hinge-110", "adet", 50)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.currencyCode, null);
  assert.equal(summary.requiredLineCount, 3);
  assert.equal(summary.pricedLineCount, 2);
  assert.deepEqual(summary.missingPrices.map((issue) => [
    issue.code, issue.resourceType, issue.resourceId, issue.requiredUnit
  ]), [["missing-price", "hardware", "slide-set", "takım"]]);
});

test("aynı donanım kimliği için farklı birim fiyatı eşleşme sayılmaz", () => {
  const report = createReport({ hardwareItems: [hardwareItems()[0]] });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250),
    price("hardware", "hinge-110", "paket", 400)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.missingPrices[0].code, "unit-mismatch");
  assert.deepEqual(summary.missingPrices[0].availableUnits, ["paket"]);
  assert.equal(summary.missingPrices[0].requiredUnit, "adet");
});

test("legacy parçada katalog kimliği yoksa malzeme fiyatı tahmin edilmez", () => {
  const report = createReport();
  const result = {
    ...report.result,
    parts: report.result.parts.map((part) => {
      const { materialId, ...legacyPart } = part;
      return legacyPart;
    })
  };
  const legacyReport = { ...report, result };
  const summary = calculateProjectPricedConsumptionSummary(legacyReport, [
    price("material", "mdf-18", "m2", 1250)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.missingPrices[0].code, "missing-resource-id");
  assert.equal(summary.missingPrices[0].resourceId, null);
});

test("kenar bantlama kimliği bulunmadığı için panel fiyatı olsa da toplam tamamlanmaz", () => {
  const report = createReport({ banded: true });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.ok(summary.missingPrices.some((issue) =>
    issue.code === "unpriced-edge-banding" &&
    issue.resourceType === "edge-banding" &&
    issue.resourceId === null &&
    issue.requiredUnit === "mm" &&
    issue.quantity > 0
  ));
});

test("kenar bandı katalog kimliği ve açık metre birimi fiyatlı tüketim toplamına katılır", () => {
  const report = createReport({
    banded: true,
    edgeBandingAssignments: [{
      partId: "cab-cost-1-left-side",
      edgeBandingId: "pvc-white-1",
      unit: "m"
    }]
  });
  assert.equal(report.status, "ready");
  assert.equal(report.canExport, false);
  assert.ok(report.exportBlockers.some((message) => /edgeBandingMaterialId/.test(message)));

  const edgeBanding = calculateProjectEdgeBandingConsumptionSummary(report.result);
  assert.equal(edgeBanding.length, 1);
  assert.equal(edgeBanding[0].edgeBandingId, "pvc-white-1");
  assert.equal(edgeBanding[0].unit, "m");
  assert.equal(edgeBanding[0].totalQuantity, edgeBanding[0].totalLengthMm / 1000);
  assert.ok(edgeBanding[0].totalQuantity > 0);

  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250, "TRY"),
    price("edge-banding", "pvc-white-1", "m", 18, "TRY", "edge-band-catalog:v1")
  ]);
  assert.equal(summary.status, "ready");
  assert.equal(summary.requiredLineCount, 2);
  assert.equal(summary.pricedLineCount, 2);
  const bandLine = summary.costSummary.lines.find((line) => line.category === "material" &&
    line.description === "Kenar bandı pvc-white-1");
  assert.ok(bandLine);
  assert.equal(bandLine.unit, "m");
  assert.equal(bandLine.quantity, edgeBanding[0].totalQuantity);
  assert.equal(bandLine.unitPriceMinor, 18);
  assert.equal(bandLine.sourceReference, "edge-band-catalog:v1");
});

test("atanmış kenar bandı fiyatında birim uyuşmazlığı ve eksik fiyat toplamı engeller", () => {
  const report = createReport({
    banded: true,
    edgeBandingAssignments: [{
      partId: "cab-cost-1-left-side",
      edgeBandingId: "pvc-white-1",
      unit: "m"
    }]
  });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250),
    price("edge-banding", "pvc-white-1", "mm", 1)
  ]);

  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  assert.equal(summary.missingPrices.length, 1);
  assert.equal(summary.missingPrices[0].code, "unit-mismatch");
  assert.equal(summary.missingPrices[0].resourceType, "edge-banding");
  assert.equal(summary.missingPrices[0].resourceId, "pvc-white-1");
  assert.equal(summary.missingPrices[0].requiredUnit, "m");
  assert.deepEqual(summary.missingPrices[0].availableUnits, ["mm"]);
});

test("olmayan parça, bantlanmamış parça ve yinelenen kenar bandı ataması projeyi bloklar", () => {
  const validAssignment = {
    partId: "cab-cost-1-left-side",
    edgeBandingId: "pvc-white-1",
    unit: "m"
  };
  const invalidReports = [
    createReport({
      banded: true,
      edgeBandingAssignments: [{ ...validAssignment, partId: "missing-part" }]
    }),
    createReport({
      banded: true,
      edgeBandingAssignments: [{ ...validAssignment, partId: "cab-cost-1-top" }]
    }),
    createReport({
      banded: true,
      edgeBandingAssignments: [validAssignment, validAssignment]
    }),
    createReport({
      banded: true,
      edgeBandingAssignments: [{ ...validAssignment, edgeBandingId: "PVC WHITE" }]
    })
  ];

  for (const report of invalidReports) {
    assert.equal(report.status, "blocked");
    assert.equal(report.result, null);
    assert.equal(report.canExport, false);
    assert.ok(report.blockedFurniture.some((entry) => entry.code === "invalid-edge-banding"));
  }
});

test("fiyatı bulunan satırlarda farklı para birimleri tek toplamı bloklar", () => {
  const report = createReport({ hardwareItems: [hardwareItems()[0]] });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250, "TRY"),
    price("hardware", "hinge-110", "adet", 50, "USD")
  ]);

  assert.equal(summary.status, "blocked");
  assert.equal(summary.costSummary, null);
  assert.match(summary.diagnostics[0], /farklı para birimleri/);
});

test("yinelenen fiyat anahtarı, geçersiz fiyat ve bilinmeyen alan reddedilir", () => {
  const report = createReport();
  const invalidTables = [
    [
      price("material", "mdf-18", "m2", 100),
      price("material", "mdf-18", "m2", 200)
    ],
    [
      price("material", "mdf-18", "m2", 100, "TRY", undefined, 18),
      price("material", "mdf-18", "m2", 200, "TRY", undefined, 18)
    ],
    [price("material", "mdf-18", "m2", 100, "TRY", undefined, 18.05)],
    [price("hardware", "hinge-110", "adet", 100, "TRY", undefined, 18)],
    [price("material", "mdf-18", "m2", -1)],
    [price("material", "mdf-18", "m2", 100, "try")],
    [{ ...price("material", "mdf-18", "m2", 100), guessed: true }]
  ];

  for (const table of invalidTables) {
    const summary = calculateProjectPricedConsumptionSummary(report, table);
    assert.equal(summary.status, "blocked");
    assert.equal(summary.costSummary, null);
    assert.equal(summary.diagnostics.length, 1);
  }
});

test("bozuk üretim raporu veya geçersiz üretim sonucu fiyatlandırılmaz", () => {
  const blockedReport = createReport({ widthMm: 0 });
  assert.equal(blockedReport.status, "blocked");

  const blocked = calculateProjectPricedConsumptionSummary(blockedReport, []);
  const malformed = calculateProjectPricedConsumptionSummary({
    schemaVersion: 1,
    status: "ready",
    result: { schemaVersion: 2, furniture: [], parts: [] }
  }, []);

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.costSummary, null);
  assert.equal(malformed.status, "blocked");
  assert.equal(malformed.costSummary, null);
});

test("boş proje boş durum döndürür ve fiyat tablosu olmayan tüketim eksik kalır", () => {
  const empty = calculateProjectPricedConsumptionSummary(createReport({ empty: true }), []);
  const report = createReport();
  const missing = calculateProjectPricedConsumptionSummary(report, []);

  assert.equal(empty.status, "empty");
  assert.equal(empty.costSummary, null);
  assert.equal(missing.status, "incomplete");
  assert.equal(missing.costSummary, null);
  assert.equal(missing.pricedLineCount, 0);
  assert.equal(missing.missingPrices[0].code, "missing-price");
});

test("açık sıfır fiyat geçerli kabul edilir; ücretsiz fiyat varsayılmaz", () => {
  const summary = calculateProjectPricedConsumptionSummary(createReport(), [
    price("material", "mdf-18", "m2", 0, "TRY", "approved-zero-price")
  ]);

  assert.equal(summary.status, "ready");
  assert.equal(summary.costSummary.grandTotalMinor, 0);
  assert.equal(summary.costSummary.lines[0].unitPriceMinor, 0);
  assert.equal(summary.costSummary.lines[0].sourceReference, "approved-zero-price");
});

test("maliyet motorunun altı ondalık miktar sınırını aşan donanım miktarı toplamı bloklar", () => {
  const report = createReport({
    hardwareItems: [{
      id: "bom-fine-quantity",
      furnitureId: "cab-cost-1",
      hardwareId: "micro-part",
      name: "Hassas miktarlı parça",
      quantity: 0.0000001,
      unit: "adet"
    }]
  });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250),
    price("hardware", "micro-part", "adet", 1)
  ]);

  assert.equal(summary.status, "blocked");
  assert.equal(summary.costSummary, null);
  assert.match(summary.diagnostics[0], /en fazla 6/);
});

test("directional edge-band costs retain direction, exact unit, quantity and Part provenance", () => {
  const report = createReport({
    banded: true,
    edgeBandingAssignments: [{
      partId: "cab-cost-1-left-side",
      edge: "top",
      edgeBandingId: "pvc-top",
      unit: "m"
    }]
  });
  assert.equal(report.status, "ready");
  const summary = calculateProjectEdgeBandingConsumptionSummary(report.result);
  assert.deepEqual(summary.map(({ edgeBandingId, unit, edge, totalLengthMm, totalQuantity, edgeCount, partIds }) =>
    [edgeBandingId, unit, edge, totalLengthMm, totalQuantity, edgeCount, partIds]
  ), [
    ["pvc-top", "m", "top", 560, 0.56, 1, ["cab-cost-1-left-side"]]
  ]);

  const pricedSummary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250, "TRY"),
    price("edge-banding", "pvc-top", "m", 18, "TRY", "edge-band-catalog:v1")
  ]);
  assert.equal(pricedSummary.status, "ready");
  assert.equal(pricedSummary.requiredLineCount, 2);
  const line = pricedSummary.costSummary.lines.find((item) => item.description === "Kenar bandı pvc-top (üst kenar)");
  assert.ok(line);
  assert.equal(line.unit, "m");
  assert.equal(line.quantity, 0.56);
  assert.equal(line.unitPriceMinor, 18);
  assert.deepEqual(
    pricedSummary.linePartSources.find((source) => source.costLineId === line.id)?.sourcePartIds,
    ["cab-cost-1-left-side"]
  );
});

test("directional edge-band missing price issues retain the edge and reject unit mismatch", () => {
  const report = createReport({
    banded: true,
    edgeBandingAssignments: [{
      partId: "cab-cost-1-left-side",
      edge: "top",
      edgeBandingId: "pvc-top",
      unit: "m"
    }]
  });
  const summary = calculateProjectPricedConsumptionSummary(report, [
    price("material", "mdf-18", "m2", 1250, "TRY"),
    price("edge-banding", "pvc-top", "mm", 1, "TRY")
  ]);
  assert.equal(summary.status, "incomplete");
  assert.equal(summary.costSummary, null);
  const issue = summary.missingPrices.find((item) => item.resourceId === "pvc-top");
  assert.ok(issue);
  assert.equal(issue.edge, "top");
  assert.equal(issue.requiredUnit, "m");
  assert.deepEqual(issue.availableUnits, ["mm"]);
  assert.match(issue.description, /üst kenar/);
});
