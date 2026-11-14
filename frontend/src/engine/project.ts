import type { PlacedFurniture } from "../types/placedFurniture";

// MobilyaCAD proje dosyası şeması.
// formatVersion proje formatı sürümünü belirtir;
// eski sürümler migrate edilerek yüklenir.
export const PROJECT_FORMAT = "MobilyaCAD";
export const CURRENT_PROJECT_VERSION = 2;

export interface ProjectRoom {
  width: number;
  length: number;
  height: number;
  unit: "mm";
}

export interface ProjectFile {
  format: "MobilyaCAD";
  formatVersion: number;
  savedAt: string;
  projectName: string;
  room: ProjectRoom;
  furniture: PlacedFurniture[];
}

export interface ProjectValidationResult {
  valid: boolean;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidPosition(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(
      coordinate => typeof coordinate === "number" && Number.isFinite(coordinate)
    )
  );
}

function isValidPart(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    ["door", "drawer", "shelf", "panel"].includes(String(value.type)) &&
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.height) &&
    isPositiveNumber(value.depth) &&
    isValidPosition(value.position) &&
    typeof value.rotation === "number" &&
    Number.isFinite(value.rotation) &&
    typeof value.color === "string" &&
    typeof value.material === "string"
  );
}

function isValidFurniture(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const parts = value.parts;
  const validParts =
    Array.isArray(parts) && parts.every(isValidPart);

  return (
    typeof value.id === "string" &&
    typeof value.catalogId === "string" &&
    typeof value.name === "string" &&
    isPositiveNumber(value.width) &&
    isPositiveNumber(value.height) &&
    isPositiveNumber(value.depth) &&
    isValidPosition(value.position) &&
    typeof value.rotation === "number" &&
    Number.isFinite(value.rotation) &&
    typeof value.color === "string" &&
    Number.isInteger(value.doorCount) &&
    Number(value.doorCount) >= 0 &&
    Number.isInteger(value.drawerCount) &&
    Number(value.drawerCount) >= 0 &&
    Number.isInteger(value.shelfCount) &&
    Number(value.shelfCount) >= 0 &&
    typeof value.hasBackPanel === "boolean" &&
    isPositiveNumber(value.backThickness) &&
    typeof value.edgeBanding === "boolean" &&
    typeof value.material === "string" &&
    validParts
  );
}

// Proje verisini doğrulayan tek giriş noktası.
// İçe aktarma ve otomatik kaydetme kurtarması aynı doğrulamayı kullanır.
export function validateProjectData(data: unknown): ProjectValidationResult {
  if (!isRecord(data)) {
    return { valid: false, error: "Proje verisi geçersiz biçimde." };
  }

  if (data.format !== PROJECT_FORMAT) {
    return { valid: false, error: "Dosya MobilyaCAD proje formatıyla uyumlu değil." };
  }

  if (
    typeof data.formatVersion !== "number" ||
    !Number.isInteger(data.formatVersion) ||
    data.formatVersion < 1 ||
    data.formatVersion > CURRENT_PROJECT_VERSION
  ) {
    return {
      valid: false,
      error: "Proje sürümü desteklenmiyor veya geçersiz."
    };
  }

  const room = data.room;

  if (!isRecord(room)) {
    return { valid: false, error: "Oda verisi eksik." };
  }

  if (
    !isPositiveNumber(room.width) ||
    !isPositiveNumber(room.length) ||
    !isPositiveNumber(room.height)
  ) {
    return { valid: false, error: "Oda ölçüleri geçersiz." };
  }

  if (!Array.isArray(data.furniture)) {
    return { valid: false, error: "Mobilya verisi eksik." };
  }

  if (!data.furniture.every(isValidFurniture)) {
    return { valid: false, error: "Mobilya verisi geçersiz." };
  }

  return { valid: true };
}

// v1 projesini güncel sürüme taşır.
function migrateV1ToV2(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...data,
    formatVersion: CURRENT_PROJECT_VERSION,
    projectName:
      typeof data.projectName === "string" ? data.projectName : "Projem"
  };
}

// JSON metnini doğrulayan ve güncel sürüme taşıyan proje yükleyicisi.
export function parseProject(text: string): ProjectFile {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Proje dosyası okunamadı.");
  }

  const validation = validateProjectData(data);

  if (!validation.valid) {
    throw new Error(validation.error ?? "Proje dosyası geçersiz.");
  }

  let project = data as Record<string, unknown>;

  if (project.formatVersion === 1) {
    project = migrateV1ToV2(project);
  }

  return project as unknown as ProjectFile;
}

// Mevcut sahneyi proje dosyasına çevirir.
export function serializeProject(
  projectName: string,
  room: { width: number; length: number; height: number },
  furniture: PlacedFurniture[]
): ProjectFile {
  return {
    format: PROJECT_FORMAT,
    formatVersion: CURRENT_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    projectName,
    room: {
      width: room.width,
      length: room.length,
      height: room.height,
      unit: "mm"
    },
    furniture
  };
}

// Proje adı güvenli bir dosya adı parçası haline getirir.
export function projectFileName(projectName: string): string {
  const safe = projectName
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim()
    .slice(0, 60);

  return safe.length > 0 ? safe : "mobilyacad-proje";
}

// Projeyi kopyalar; mobilya ve parça kimlikleri yenilenir.
export function duplicateProjectFurniture(
  furniture: PlacedFurniture[]
): PlacedFurniture[] {
  return furniture.map(item => ({
    ...item,
    id: crypto.randomUUID(),
    name: `${item.name} (Kopya)`,
    parts: item.parts.map(part => ({
      ...part,
      id: crypto.randomUUID()
    }))
  }));
}
