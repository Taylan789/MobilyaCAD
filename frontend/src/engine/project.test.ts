import { describe, it, expect } from "vitest";
import {
  parseProject,
  serializeProject,
  validateProjectData,
  projectFileName,
  duplicateProjectFurniture,
  CURRENT_PROJECT_VERSION,
  PROJECT_FORMAT
} from "./project";
import type { PlacedFurniture } from "../types/placedFurniture";

function validFurniture(overrides: Record<string, unknown> = {}): PlacedFurniture {
  return {
    id: "f1",
    catalogId: "base-cabinet",
    name: "Test",
    width: 600,
    height: 850,
    depth: 560,
    position: [0, 0.425, 0],
    rotation: 0,
    color: "#fff",
    doorCount: 2,
    drawerCount: 0,
    shelfCount: 2,
    hasBackPanel: true,
    backThickness: 8,
    edgeBanding: true,
    material: "Suntalam",
    parts: [],
    ...overrides
  };
}

const validProject = {
  format: PROJECT_FORMAT,
  formatVersion: CURRENT_PROJECT_VERSION,
  savedAt: "2026-11-14T00:00:00.000Z",
  projectName: "Test Projesi",
  room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
  furniture: [validFurniture()]
};

describe("project", () => {
  it("geçerli projeyi doğrular", () => {
    expect(validateProjectData(validProject).valid).toBe(true);
  });

  it("geçersiz formatı reddeder", () => {
    expect(
      validateProjectData({ ...validProject, format: "Diger" }).valid
    ).toBe(false);
  });

  it("desteklenmeyen sürümü reddeder", () => {
    expect(
      validateProjectData({ ...validProject, formatVersion: 99 }).valid
    ).toBe(false);
  });

  it("geçersiz oda ölçüsünü reddeder", () => {
    expect(
      validateProjectData({
        ...validProject,
        room: { ...validProject.room, width: -5 }
      }).valid
    ).toBe(false);
  });

  it("geçersiz mobilya verisini reddeder", () => {
    expect(
      validateProjectData({
        ...validProject,
        furniture: [validFurniture({ width: 0 })]
      }).valid
    ).toBe(false);
  });

  it("geçersiz parça verisini reddeder", () => {
    expect(
      validateProjectData({
        ...validProject,
        furniture: [
          validFurniture({
            parts: [{ id: "p", name: "x", type: "door", width: -1, height: 1, depth: 1, position: [0, 0, 0], rotation: 0, color: "#fff", material: "x" }]
          })
        ]
      }).valid
    ).toBe(false);
  });

  it("v1 projesini v2'ye taşır", () => {
    const v1 = {
      format: PROJECT_FORMAT,
      formatVersion: 1,
      savedAt: "2026-11-14T00:00:00.000Z",
      room: { width: 4000, length: 5000, height: 2800, unit: "mm" },
      furniture: [validFurniture()]
    };

    const parsed = parseProject(JSON.stringify(v1));
    expect(parsed.formatVersion).toBe(CURRENT_PROJECT_VERSION);
    expect(parsed.projectName).toBe("Projem");
  });

  it("geçersiz JSON metnini hata verir", () => {
    expect(() => parseProject("değil json")).toThrow("Proje dosyası okunamadı.");
  });

  it("desteklenmeyen sürüm metnini hata verir", () => {
    expect(() =>
      parseProject(JSON.stringify({ ...validProject, formatVersion: 99 }))
    ).toThrow("Proje sürümü desteklenmiyor veya geçersiz.");
  });

  it("serileştirme ve geri yükleme döngüsü çalışır", () => {
    const file = serializeProject("Deneme", { width: 4000, length: 5000, height: 2800 }, [
      validFurniture()
    ]);
    const parsed = parseProject(JSON.stringify(file));

    expect(parsed.projectName).toBe("Deneme");
    expect(parsed.room.width).toBe(4000);
    expect(parsed.furniture).toHaveLength(1);
    expect(parsed.formatVersion).toBe(CURRENT_PROJECT_VERSION);
  });

  it("dosya adı güvenli karakterlere dönüşür", () => {
    expect(projectFileName("Proje: Adı/2026")).toBe("Proje- Adı-2026");
    expect(projectFileName("   ")).toBe("mobilyacad-proje");
  });

  it("kopyalama yeni kimlikler üretir", () => {
    const original = [validFurniture({ parts: [
      { id: "p1", name: "Kapak 1", type: "door", width: 100, height: 100, depth: 18, position: [0, 0, 0], rotation: 0, color: "#fff", material: "x" }
    ]})];

    const copy = duplicateProjectFurniture(original);

    expect(copy[0].id).not.toBe(original[0].id);
    expect(copy[0].parts[0].id).not.toBe(original[0].parts[0].id);
    expect(copy[0].name).toBe("Test (Kopya)");
  });
});
