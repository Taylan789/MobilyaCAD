// Proje şeması: doğrulama ve sürüm geçişi.
// Sürüm 1: eski parça tabanlı format (PlacedFurniture + parts).
// Sürüm 2: yapılandırma tabanlı format (config tek kaynak doğrusu).

import type { FurnitureConfig } from "../types/furnitureModel";
import { createDefaultConfig } from "../types/furnitureModel";
import type { FurnitureType } from "../types/furnitureModel";

export const PROJECT_FORMAT = "MobilyaCAD";
export const CURRENT_PROJECT_VERSION = 2;

export interface ProjectRoom {
  width: number;
  length: number;
  height: number;
  unit: "mm";
}

export interface ProjectFurnitureV2 {
  id: string;
  catalogId: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  config: FurnitureConfig;
}

export interface ProjectV2 {
  format: "MobilyaCAD";
  formatVersion: 2;
  savedAt: string;
  room: ProjectRoom;
  furniture: ProjectFurnitureV2[];
  materials?: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: ProjectV2;
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
      (coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)
    )
  );
}

const VALID_TYPES: FurnitureType[] = [
  "kitchen",
  "wardrobe",
  "desk",
  "tv-unit",
  "bookcase",
  "bathroom",
  "custom"
];

// Yapılandırma alanlarını güvenli sınırlar içinde normalize eder.
function sanitizeConfig(raw: unknown): FurnitureConfig {
  const fallback = createDefaultConfig("custom");
  if (!isRecord(raw)) return fallback;

  const numberOr = (value: unknown, or: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : or;

  const intOr = (value: unknown, or: number): number =>
    Number.isInteger(value) && (value as number) >= 0
      ? (value as number)
      : or;

  const type =
    typeof raw.type === "string" && VALID_TYPES.includes(raw.type as FurnitureType)
      ? (raw.type as FurnitureType)
      : "custom";

  return {
    ...fallback,
    ...raw,
    type,
    width: numberOr(raw.width, fallback.width),
    height: numberOr(raw.height, fallback.height),
    depth: numberOr(raw.depth, fallback.depth),
    panelThickness: numberOr(raw.panelThickness, fallback.panelThickness),
    backThickness: numberOr(raw.backThickness, fallback.backThickness),
    frontThickness: numberOr(raw.frontThickness, fallback.frontThickness),
    backInset: numberOr(raw.backInset, 0),
    backGrooveDepth: numberOr(raw.backGrooveDepth, fallback.backGrooveDepth),
    doorCount: intOr(raw.doorCount, 0),
    drawerCount: intOr(raw.drawerCount, 0),
    shelfCount: intOr(raw.shelfCount, 0),
    dividerCount: intOr(raw.dividerCount, 0),
    doorGap: numberOr(raw.doorGap, fallback.doorGap),
    plinthHeight: numberOr(raw.plinthHeight, 0),
    worktopThickness: numberOr(raw.worktopThickness, fallback.worktopThickness),
    worktopOverhang: numberOr(raw.worktopOverhang, fallback.worktopOverhang),
    edgeBandThickness: numberOr(raw.edgeBandThickness, fallback.edgeBandThickness),
    drawerBottomThickness: numberOr(
      raw.drawerBottomThickness,
      fallback.drawerBottomThickness
    )
  };
}

// Sürüm 1 projesini sürüm 2'ye yükseltir.
export function migrateProjectV1(raw: Record<string, unknown>): ProjectV2 {
  const legacyFurniture = Array.isArray(raw.furniture) ? raw.furniture : [];

  const furniture: ProjectFurnitureV2[] = legacyFurniture.map(
    (item: unknown) => {
      const record = isRecord(item) ? item : {};
      const counts = {
        doorCount: Number.isInteger(record.doorCount)
          ? (record.doorCount as number)
          : 2,
        drawerCount: Number.isInteger(record.drawerCount)
          ? (record.drawerCount as number)
          : 0,
        shelfCount: Number.isInteger(record.shelfCount)
          ? (record.shelfCount as number)
          : 2
      };

      return {
        id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
        catalogId:
          typeof record.catalogId === "string" ? record.catalogId : "unknown",
        name: typeof record.name === "string" ? record.name : "Geçersiz Mobilya",
        color: typeof record.color === "string" ? record.color : "#d9d2c5",
        position: isValidPosition(record.position) ? record.position : [0, 0, 0],
        rotation:
          typeof record.rotation === "number" && Number.isFinite(record.rotation)
            ? record.rotation
            : 0,
        config: {
          ...createDefaultConfig("custom"),
          ...counts,
          width: isPositiveNumber(record.width) ? record.width : 600,
          height: isPositiveNumber(record.height) ? record.height : 850,
          depth: isPositiveNumber(record.depth) ? record.depth : 560,
          material:
            typeof record.material === "string" ? record.material : "Suntalam",
          hasBackPanel:
            typeof record.hasBackPanel === "boolean" ? record.hasBackPanel : true,
          backThickness: isPositiveNumber(record.backThickness)
            ? record.backThickness
            : 8,
          edgeBanding:
            typeof record.edgeBanding === "boolean" ? record.edgeBanding : true
        }
      };
    }
  );

  const room = isRecord(raw.room) ? raw.room : {};

  return {
    format: PROJECT_FORMAT,
    formatVersion: CURRENT_PROJECT_VERSION,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString(),
    room: {
      width: isPositiveNumber(room.width) ? room.width : 4000,
      length: isPositiveNumber(room.length) ? room.length : 5000,
      height: isPositiveNumber(room.height) ? room.height : 2800,
      unit: "mm"
    },
    furniture
  };
}

// Ham JSON'yu doğrular; geçerli ise normalize edilmiş sürüm 2 proje döndürür.
export function validateAndLoadProject(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: ["Proje bir JSON nesnesi değil."] };
  }

  if (input.format !== PROJECT_FORMAT) {
    return { ok: false, errors: ["Dosya MobilyaCAD proje formatıyla uyumlu değil."] };
  }

  const version = input.formatVersion;

  if (version === 1) {
    try {
      return { ok: true, errors: [], data: migrateProjectV1(input) };
    } catch {
      return { ok: false, errors: ["Sürüm 1 projesi yükseltilemedi."] };
    }
  }

  if (version !== CURRENT_PROJECT_VERSION) {
    return {
      ok: false,
      errors: [
        `Desteklenmeyen proje sürümü: ${String(version)}. Beklenen: ${CURRENT_PROJECT_VERSION}.`
      ]
    };
  }

  const room = input.room;
  if (
    !isRecord(room) ||
    !isPositiveNumber(room.width) ||
    !isPositiveNumber(room.length) ||
    !isPositiveNumber(room.height) ||
    room.unit !== "mm"
  ) {
    return { ok: false, errors: ["Oda ölçüleri geçersiz."] };
  }

  if (!Array.isArray(input.furniture)) {
    return { ok: false, errors: ["Mobilya listesi geçersiz."] };
  }

  const errors: string[] = [];
  const furniture: ProjectFurnitureV2[] = [];

  input.furniture.forEach((item: unknown, index: number) => {
    if (!isRecord(item)) {
      errors.push(`Mobilya ${index + 1}: geçersiz kayıt.`);
      return;
    }
    if (typeof item.id !== "string" || item.id.length === 0) {
      errors.push(`Mobilya ${index + 1}: geçersiz kimlik.`);
      return;
    }
    furniture.push({
      id: item.id,
      catalogId: typeof item.catalogId === "string" ? item.catalogId : "unknown",
      name: typeof item.name === "string" ? item.name : "Adsız Mobilya",
      color: typeof item.color === "string" ? item.color : "#d9d2c5",
      position: isValidPosition(item.position) ? item.position : [0, 0, 0],
      rotation:
        typeof item.rotation === "number" && Number.isFinite(item.rotation)
          ? item.rotation
          : 0,
      config: sanitizeConfig(item.config)
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    data: {
      format: PROJECT_FORMAT,
      formatVersion: CURRENT_PROJECT_VERSION,
      savedAt: typeof input.savedAt === "string" ? input.savedAt : new Date().toISOString(),
      room: {
        width: room.width,
        length: room.length,
        height: room.height,
        unit: "mm"
      },
      furniture
    }
  };
}

// Projeyi indirilebilir JSON metnine dönüştürür.
export function serializeProject(project: ProjectV2): string {
  return JSON.stringify(project, null, 2);
}
