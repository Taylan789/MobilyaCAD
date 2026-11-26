import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createProjectCutListCsv,
  createCutListCsv,
  parseProjectCutListCsv
} from "../src/engine/cutListCsv.ts";
import { mapDomainProductionReport } from "../src/engine/projectProduction.ts";

function createPart(overrides = {}) {
  return {
    id: "part-1",
    furnitureId: "furniture-1",
    name: "Yan Panel",
    width: 600,
    length: 720,
    thickness: 18,
    quantity: 1,
    edgeBanding: { top: false, bottom: false, left: false, right: false },
    material: "MDF",
    cncOperations: [],
    grainDirection: "none",
    ...overrides
  };
}

test("project CSV round-trip preserves stable IDs, millimetre values, quantity and supported metadata", () => {
  const first = createPart({
    id: "part-left",
    name: 'Yan; "A"\nSol',
    width: 100.25,
    length: 720.5,
    quantity: 2,
    material: 'MDF; "Mat"\nBeyaz',
    materialId: "mdf-white",
    edgeBanding: { top: true, bottom: false, left: true, right: false },
    drawerGroupId: "drawer-group-1",
    grainDirection: "length",
    productionNote: 'Kesim; "A"\nDamarı koru'
  });
  const second = createPart({
    id: "part-right",
    furnitureId: "furniture-2",
    name: "Sağ Yan",
    width: 599.75,
    length: 720,
    quantity: 3,
    material: "Kontrplak",
    grainDirection: "none"
  });
  const furnitureNames = new Map([
    ["furniture-1", 'Alt; "modül"\n800'],
    ["furniture-2", "Üst modül"]
  ]);

  const csv = createProjectCutListCsv(furnitureNames, [first, second]);
  const parsed = parseProjectCutListCsv(csv);

  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv.split("\r\n", 1)[0], /Mobilya ID;Parça;Parça ID/);
  assert.deepEqual(parsed, [
    { furnitureName: 'Alt; "modül"\n800', part: first },
    { furnitureName: "Üst modül", part: second }
  ]);
});

test("project CSV rejects cross-section panels and unsupported production metadata", () => {
  const names = new Map([["furniture-1", "Alt modül"]]);

  assert.throws(
    () => createProjectCutListCsv(names, [createPart({ panelGeometry: { schemaVersion: 1 } })]),
    /kesitli panel geometrisi CSV biçiminde korunamadığı/i
  );
  assert.throws(
    () => createProjectCutListCsv(names, [createPart({
      edgeBandingByEdge: { top: { edgeBandingId: "band-white", unit: "mm" } }
    })]),
    /kenar bandı katalog ataması CSV biçiminde korunamadığı/i
  );
  assert.throws(
    () => createProjectCutListCsv(names, [createPart({
      cncOperations: [{ id: "operation-1" }]
    })]),
    /CNC operasyonları CSV biçiminde korunamadığı/i
  );
});

test("project CSV requires unique part identity and parser rejects unsupported or incomplete schemas", () => {
  const names = new Map([["furniture-1", "Alt modül"]]);
  assert.throws(
    () => createProjectCutListCsv(names, [createPart(), createPart({ id: "part-1" })]),
    /parça kimlikleri geçerli ve benzersiz/i
  );

  const legacySingleFurnitureCsv = createCutListCsv("Alt modül", [createPart()]);
  assert.throws(
    () => parseProjectCutListCsv(legacySingleFurnitureCsv),
    /Mobilya ID/
  );

  const validCsv = createProjectCutListCsv(names, [createPart()]);
  assert.throws(
    () => parseProjectCutListCsv(validCsv.replace("Parça ID", "Parça ID;PanelGeometry")),
    /desteklenmeyen sütun/
  );
  assert.throws(
    () => parseProjectCutListCsv(validCsv.replace("part-1", "")),
    /Parça ID geçerli bir kimlik/
  );
});

test("domain export blockers remain authoritative while calculated parts stay inspectable", () => {
  const blocker = "Kesitli panel geometrisi mevcut; JSON v1/CSV dışa aktarımı kayıpsız değil.";
  const domainPart = createPart({
    panelGeometry: { schemaVersion: 1, cutouts: [] }
  });
  const report = {
    schemaVersion: 1,
    status: "ready",
    canExport: false,
    isEmpty: false,
    supportedFurniture: [{ furnitureId: "furniture-1", family: "cabinet" }],
    unsupportedFurniture: [],
    blockedFurniture: [],
    projectErrors: [],
    exportBlockers: [blocker],
    firstError: null,
    result: { schemaVersion: 1, furniture: [], parts: [domainPart] }
  };

  const mapped = mapDomainProductionReport(report, new Map([["furniture-1", "Alt modül"]]));

  assert.equal(mapped.canExport, false);
  assert.equal(mapped.parts.length, 1);
  assert.equal(mapped.exportBlockReason, blocker);
  assert.deepEqual(mapped.exportBlockers, [blocker]);
  assert.equal(mapped.domainReport, report);
  assert.throws(
    () => createProjectCutListCsv(mapped.furnitureNames, mapped.parts),
    /kesitli panel geometrisi CSV biçiminde korunamadığı/i
  );

  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const overview = readFileSync(
    new URL("../src/components/production/ProductionOverview.tsx", import.meta.url),
    "utf8"
  );
  assert.match(app, /const productionExportBlockReason = projectProduction\.exportBlockReason;/);
  assert.match(app, /if \(productionParts\.length === 0 \|\| productionExportBlockReason\) return;/);
  assert.match(overview, /const canExport = production\.canExport && production\.parts\.length > 0;/);
  assert.match(overview, /disabled=\{!canExport\}/);
});
