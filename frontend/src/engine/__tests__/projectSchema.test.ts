import { describe, expect, it } from "vitest";
import {
  CURRENT_PROJECT_VERSION,
  migrateProjectV1,
  serializeProject,
  validateAndLoadProject
} from "../projectSchema";
import { createDefaultConfig } from "../../types/furnitureModel";

describe("projectSchema", () => {
  const validV2 = {
    format: "MobilyaCAD",
    formatVersion: 2,
    savedAt: "2026-11-14T00:00:00.000Z",
    room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
    furniture: [
      {
        id: "f1",
        catalogId: "base-cabinet",
        name: "Alt Mutfak Dolabı",
        color: "#d9d2c5",
        position: [0, 0.425, 0],
        rotation: 0,
        config: createDefaultConfig("kitchen", {
          width: 600,
          height: 850,
          depth: 560,
          doorCount: 2
        })
      }
    ]
  };

  it("geçerli sürüm 2 projesini kabul etmelidir", () => {
    const result = validateAndLoadProject(validV2);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data!.furniture).toHaveLength(1);
    expect(result.data!.furniture[0].config.doorCount).toBe(2);
  });

  it("serileştirme → yükleme döngüsünü korumalıdır", () => {
    const json = serializeProject(validV2);
    const result = validateAndLoadProject(JSON.parse(json));
    expect(result.ok).toBe(true);
    expect(result.data!.room.width).toBe(4000);
  });

  it("desteklenmeyen sürümü reddetmelidir", () => {
    const result = validateAndLoadProject({
      ...validV2,
      formatVersion: 99
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Desteklenmeyen proje sürümü");
  });

  it("yanlış formatı reddetmelidir", () => {
    const result = validateAndLoadProject({ format: "Baska", formatVersion: 2 });
    expect(result.ok).toBe(false);
  });

  it("geçersiz oda ölçülerini reddetmelidir", () => {
    const result = validateAndLoadProject({
      ...validV2,
      room: { width: -100, length: 5000, height: 2800, unit: "mm" }
    });
    expect(result.ok).toBe(false);
  });

  it("geçersiz mobilya kayıtlarını hata olarak raporlamalıdır", () => {
    const result = validateAndLoadProject({
      ...validV2,
      furniture: [{ id: 123 }]
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("sürüm 1 projesini sürüm 2'ye yükseltmelidir", () => {
    const v1 = {
      format: "MobilyaCAD",
      formatVersion: 1,
      savedAt: "2026-11-01T00:00:00.000Z",
      room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
      furniture: [
        {
          id: "legacy-1",
          catalogId: "base-cabinet",
          name: "Eski Dolap",
          width: 600,
          height: 850,
          depth: 560,
          position: [0, 0.425, 0],
          rotation: 0,
          color: "#d9d2c5",
          doorCount: 2,
          drawerCount: 0,
          shelfCount: 2,
          hasBackPanel: true,
          backThickness: 8,
          edgeBanding: true,
          material: "Suntalam",
          parts: []
        }
      ]
    };

    const result = validateAndLoadProject(v1);
    expect(result.ok).toBe(true);
    expect(result.data!.formatVersion).toBe(CURRENT_PROJECT_VERSION);
    const migrated = result.data!.furniture[0];
    expect(migrated.config.width).toBe(600);
    expect(migrated.config.doorCount).toBe(2);
    expect(migrated.config.shelfCount).toBe(2);
    expect(migrated.config.material).toBe("Suntalam");
    expect(migrated.config.hasBackPanel).toBe(true);
  });

  it("migrateProjectV1 eksik alanları varsayılanlarla tamamlamalıdır", () => {
    const migrated = migrateProjectV1({
      format: "MobilyaCAD",
      formatVersion: 1,
      room: {},
      furniture: [{}]
    });
    expect(migrated.room.width).toBe(4000);
    expect(migrated.furniture[0].config.width).toBe(600);
    expect(migrated.furniture[0].name).toBe("Geçersiz Mobilya");
  });

  it("yapılandırma sanitasyonu güvenli sınırlar içinde normalize etmelidir", () => {
    const migrated = migrateProjectV1({
      format: "MobilyaCAD",
      formatVersion: 1,
      room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
      furniture: [
        {
          id: "x",
          width: 600,
          height: 850,
          depth: 560,
          position: [0, 0, 0],
          rotation: 0,
          doorCount: -3,
          shelfCount: 2.5,
          material: 42
        }
      ]
    });
    const config = migrated.furniture[0].config;
    expect(config.doorCount).toBe(0);
    expect(config.shelfCount).toBe(2);
    expect(config.material).toBe("Suntalam");
  });

  it("tamamen geçersiz girdiyi reddetmelidir", () => {
    expect(validateAndLoadProject(null).ok).toBe(false);
    expect(validateAndLoadProject("metin").ok).toBe(false);
    expect(validateAndLoadProject([]).ok).toBe(false);
  });
});
