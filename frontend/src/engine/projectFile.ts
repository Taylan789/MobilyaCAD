import type { PlacedFurniture, FurniturePart } from "../types/placedFurniture";
import { isValidDrawerBoxProjectSpecs } from "./drawerBoxProject";
import { validateMaterialCatalog, type MaterialCatalogEntry } from "./materialCatalog";

export interface ProjectRoomDimensions {
  width: number;
  length: number;
  height: number;
}

export interface MobilyaCadProjectFileV1 {
  format: "MobilyaCAD";
  formatVersion: 1;
  savedAt?: string;
  room: ProjectRoomDimensions & { unit: "mm" };
  furniture: PlacedFurniture[];
  materials?: MaterialCatalogEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    isValidDrawerBoxProjectSpecs(value.drawerBoxSpecs) &&
    Array.isArray(value.parts) &&
    value.parts.every(isValidFurniturePart)
  );
}

/** Serializes the current editor state using the existing, versioned JSON v1 contract. */
export function serializeProjectFile(
  room: ProjectRoomDimensions,
  furniture: PlacedFurniture[],
  savedAt = new Date().toISOString(),
  materials?: readonly MaterialCatalogEntry[]
): string {
  const validatedMaterials = materials === undefined
    ? undefined
    : validateMaterialCatalog(materials);
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
    ...(validatedMaterials === undefined ? {} : { materials: validatedMaterials }),
  };

  return JSON.stringify(project, null, 2);
}

/**
 * Parses and validates a MobilyaCAD JSON v1 file.
 * Older v1 files without a room unit or drawerBoxSpecs remain compatible;
 * dimensions are interpreted as millimetres, as in the original editor.
 */
export function parseProjectFile(content: string): MobilyaCadProjectFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Proje dosyası geçerli JSON değil.");
  }

  if (!isRecord(parsed)) {
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
      materials = validateMaterialCatalog(parsed.materials);
    } catch {
      throw new Error("Proje malzeme kataloğu geçersiz; kimlik, kalınlık ve mm birimini kontrol et.");
    }
  }

  if (
    parsed.format !== "MobilyaCAD" ||
    parsed.formatVersion !== 1 ||
    !validRoom ||
    !validFurniture
  ) {
    throw new Error("Dosya MobilyaCAD proje formatıyla uyumlu değil.");
  }

  const validSavedAt = typeof parsed.savedAt === "string"
    ? { savedAt: parsed.savedAt }
    : {};

  return {
    format: "MobilyaCAD",
    formatVersion: 1,
    ...validSavedAt,
    room: {
      width: room.width as number,
      length: room.length as number,
      height: room.height as number,
      unit: "mm",
    },
    furniture: parsed.furniture as PlacedFurniture[],
    ...(materials === undefined ? {} : { materials }),
  };
}
