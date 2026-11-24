import type { PlacedFurniture, FurniturePart } from "../types/placedFurniture";
import {
  isValidDrawerBoxProjectSpecs,
  resolveDrawerPanelMaterialAssignments
} from "./drawerBoxProject";
import {
  validateMaterialCatalog,
  type MaterialCatalogEntry
} from "./materialCatalog";
import {
  readProjectQuoteRevisionHistoryFromProjectFile
} from "../../../domain/production/projectQuoteRevisionProjectFile.ts";

export interface ProjectRoomDimensions {
  width: number;
  length: number;
  height: number;
}

interface MobilyaCadProjectFileBase {
  format: "MobilyaCAD";
  savedAt?: string;
  room: ProjectRoomDimensions & { unit: "mm" } & Record<string, unknown>;
  furniture: PlacedFurniture[];
  materials?: MaterialCatalogEntry[];
  [key: string]: unknown;
}

export interface MobilyaCadProjectFileV1 extends MobilyaCadProjectFileBase {
  formatVersion: 1;
}

export interface MobilyaCadProjectFileV2 extends MobilyaCadProjectFileBase {
  formatVersion: 2;
  projectId: string;
  quoteRevisionHistory?: unknown;
}

export type MobilyaCadProjectFile =
  | MobilyaCadProjectFileV1
  | MobilyaCadProjectFileV2;

export interface MobilyaCadProjectFileEnvelope {
  projectId: string;
  metadata: Record<string, unknown>;
  roomMetadata: Record<string, unknown>;
  quoteRevisionHistory: unknown;
}

const projectFileKnownKeysV1 = new Set([
  "format",
  "formatVersion",
  "savedAt",
  "room",
  "furniture",
  "materials",
  "quoteRevisionHistory"
]);
const projectFileKnownKeysV2 = new Set([
  ...projectFileKnownKeysV1,
  "projectId"
]);
const roomKnownKeys = new Set(["width", "length", "height", "unit"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyUnknownFields(
  source: Record<string, unknown>,
  knownKeys: ReadonlySet<string>
): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (knownKeys.has(key)) continue;
    Object.defineProperty(copy, key, {
      value: source[key],
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return copy;
}

function createEmptyQuoteRevisionHistory(projectId: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    projectId,
    revisions: []
  };
}

/** Creates the persistent v2 identity and empty quote-history envelope for a new editor project. */
export function createProjectFileEnvelope(
  projectId = crypto.randomUUID()
): MobilyaCadProjectFileEnvelope {
  return {
    projectId,
    metadata: {},
    roomMetadata: {},
    quoteRevisionHistory: createEmptyQuoteRevisionHistory(projectId)
  };
}

/**
 * Extracts the v2 envelope without discarding unknown JSON metadata.
 * A legacy v1 file receives a new stable identity only when the editor migrates it on save.
 */
export function getProjectFileEnvelope(
  project: MobilyaCadProjectFile,
  fallbackProjectId: string
): MobilyaCadProjectFileEnvelope {
  const isV2 = project.formatVersion === 2;
  const projectId = isV2 ? project.projectId : fallbackProjectId;
  const metadata = copyUnknownFields(
    project,
    isV2 ? projectFileKnownKeysV2 : projectFileKnownKeysV1
  );
  const roomMetadata = copyUnknownFields(project.room, roomKnownKeys);
  const quoteRevisionHistory = isV2 &&
    Object.prototype.hasOwnProperty.call(project, "quoteRevisionHistory")
    ? project.quoteRevisionHistory
    : createEmptyQuoteRevisionHistory(projectId);

  return {
    projectId,
    metadata,
    roomMetadata,
    quoteRevisionHistory
  };
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidPosition(value: unknown): value is [number, number, number] {
  return Array.isArray(value) &&
    value.length === 3 &&
    value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate));
}

function isValidFurniturePart(value: unknown): value is FurniturePart {
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

function isValidPlacedFurniture(value: unknown): value is PlacedFurniture {
  if (!isRecord(value)) return false;

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
    (value.materialId === undefined ||
      (typeof value.materialId === "string" && value.materialId.trim() !== "")) &&
    isValidDrawerBoxProjectSpecs(value.drawerBoxSpecs) &&
    Array.isArray(value.parts) &&
    value.parts.every(isValidFurniturePart)
  );
}

function preserveMaterialMetadata(
  source: unknown,
  validated: MaterialCatalogEntry[]
): MaterialCatalogEntry[] {
  if (!Array.isArray(source)) return validated;

  return validated.map((material, index) => {
    const original = source[index];
    if (!isRecord(original)) return material;
    return { ...original, ...material } as MaterialCatalogEntry;
  });
}

function validateProjectMaterialReferences(
  furniture: readonly PlacedFurniture[],
  materials: readonly MaterialCatalogEntry[]
): void {
  const materialById = new Map(materials.map((material) => [material.id, material]));
  for (const item of furniture) {
    if (item.materialId !== undefined && !materialById.has(item.materialId)) {
      throw new Error(
        item.name + ": " + item.materialId + " malzeme kimliği proje kataloğunda bulunamadı."
      );
    }
    for (const config of item.drawerBoxSpecs ?? []) {
      try {
        resolveDrawerPanelMaterialAssignments(config.spec, materials);
      } catch (error) {
        throw new Error(
          item.name + ": çekmece grubu " + config.id + ": " +
          (error instanceof Error ? error.message : "malzeme ataması geçersiz.")
        );
      }
    }
  }
}

/** Serializes v1 for legacy callers, or a validated v2 envelope when persistent identity is supplied. */
export function serializeProjectFile(
  room: ProjectRoomDimensions,
  furniture: PlacedFurniture[],
  savedAt = new Date().toISOString(),
  materials?: readonly MaterialCatalogEntry[],
  envelope?: MobilyaCadProjectFileEnvelope
): string {
  const validatedMaterials = materials === undefined
    ? undefined
    : validateMaterialCatalog(materials);
  try {
    validateProjectMaterialReferences(furniture, validatedMaterials ?? []);
  } catch (error) {
    throw new Error(
      "Proje malzeme referansı geçersiz: " +
      (error instanceof Error ? error.message : "katalog kimliği doğrulanamadı.")
    );
  }

  const serializedMaterials = materials === undefined
    ? undefined
    : preserveMaterialMetadata(materials, validatedMaterials ?? []);

  if (!envelope) {
    const project: MobilyaCadProjectFileV1 = {
      format: "MobilyaCAD",
      formatVersion: 1,
      savedAt,
      room: {
        width: room.width,
        length: room.length,
        height: room.height,
        unit: "mm",
      },
      furniture,
      ...(serializedMaterials === undefined ? {} : { materials: serializedMaterials }),
    };

    return JSON.stringify(project, null, 2);
  }

  const project: MobilyaCadProjectFileV2 = {
    ...envelope.metadata,
    format: "MobilyaCAD",
    formatVersion: 2,
    projectId: envelope.projectId,
    savedAt,
    room: {
      ...envelope.roomMetadata,
      width: room.width,
      length: room.length,
      height: room.height,
      unit: "mm",
    },
    furniture,
    ...(serializedMaterials === undefined ? {} : { materials: serializedMaterials }),
    quoteRevisionHistory: envelope.quoteRevisionHistory ??
      createEmptyQuoteRevisionHistory(envelope.projectId)
  };

  const quoteHistoryRead = readProjectQuoteRevisionHistoryFromProjectFile(project);
  if (quoteHistoryRead.status === "blocked") {
    throw new Error(
      "Proje teklif geçmişi geçersiz: " +
      (quoteHistoryRead.diagnostics[0] ?? "JSON v2 proje zarfı doğrulanamadı.")
    );
  }

  return JSON.stringify(project, null, 2);
}

/**
 * Parses and validates MobilyaCAD JSON v1/v2 files.
 * V1 remains a legacy format; the editor migrates it to v2 with a stable projectId on save.
 * V2 quote history and unknown top-level/nested JSON metadata are retained for round-trip.
 */
export function parseProjectFile(content: string): MobilyaCadProjectFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Proje dosyası geçerli JSON değil.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Dosya MobilyaCAD proje formatıyla uyumlu değil.");
  }

  const quoteHistoryRead = readProjectQuoteRevisionHistoryFromProjectFile(parsed);
  if (quoteHistoryRead.status === "blocked") {
    throw new Error(
      "Proje dosyası uyumlu değil: " +
      (quoteHistoryRead.diagnostics[0] ?? "JSON zarfı doğrulanamadı.")
    );
  }

  const formatVersion = parsed.formatVersion;
  if (formatVersion !== 1 && formatVersion !== 2) {
    throw new Error("Dosya MobilyaCAD proje formatıyla uyumlu değil.");
  }

  const room = parsed.room;
  const validRoom =
    isRecord(room) &&
    typeof room.width === "number" &&
    Number.isFinite(room.width) &&
    room.width >= 100 &&
    typeof room.length === "number" &&
    Number.isFinite(room.length) &&
    room.length >= 100 &&
    typeof room.height === "number" &&
    Number.isFinite(room.height) &&
    room.height >= 100 &&
    (room.unit === undefined || room.unit === "mm");

  const validFurniture =
    Array.isArray(parsed.furniture) &&
    parsed.furniture.every(isValidPlacedFurniture);

  let materials: MaterialCatalogEntry[] | undefined;
  if (parsed.materials !== undefined) {
    try {
      const validatedMaterials = validateMaterialCatalog(parsed.materials);
      materials = preserveMaterialMetadata(parsed.materials, validatedMaterials);
    } catch {
      throw new Error("Proje malzeme kataloğu geçersiz; kimlik, kalınlık ve mm birimini kontrol et.");
    }
  }

  if (validFurniture) {
    try {
      validateProjectMaterialReferences(parsed.furniture as PlacedFurniture[], materials ?? []);
    } catch {
      throw new Error(
        "Proje malzeme referansı geçersiz; mobilya kimliğinin katalogda bulunduğunu kontrol et."
      );
    }
  }

  if (
    parsed.format !== "MobilyaCAD" ||
    !validRoom ||
    !validFurniture ||
    (formatVersion === 2 && quoteHistoryRead.projectId === null)
  ) {
    throw new Error("Dosya MobilyaCAD proje formatıyla uyumlu değil.");
  }

  const metadata = copyUnknownFields(
    parsed,
    formatVersion === 2 ? projectFileKnownKeysV2 : projectFileKnownKeysV1
  );
  const roomMetadata = copyUnknownFields(room, roomKnownKeys);
  const normalizedRoom = {
    ...roomMetadata,
    width: room.width as number,
    length: room.length as number,
    height: room.height as number,
    unit: "mm" as const,
  };
  const validSavedAt = typeof parsed.savedAt === "string"
    ? { savedAt: parsed.savedAt }
    : {};

  const common = {
    ...metadata,
    format: "MobilyaCAD" as const,
    ...validSavedAt,
    room: normalizedRoom,
    furniture: parsed.furniture as PlacedFurniture[],
    ...(materials === undefined ? {} : { materials }),
  };

  if (formatVersion === 2) {
    return {
      ...common,
      formatVersion: 2,
      projectId: parsed.projectId as string,
      ...(Object.prototype.hasOwnProperty.call(parsed, "quoteRevisionHistory")
        ? { quoteRevisionHistory: parsed.quoteRevisionHistory }
        : {})
    };
  }

  return {
    ...common,
    formatVersion: 1,
  };
}
