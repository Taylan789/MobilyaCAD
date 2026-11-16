/**
 * Shared domain contract for independent material assignments on cabinet body panels.
 *
 * This module deliberately lives outside frontend/ so the production domain can
 * evolve without colliding with the separately-owned frontend redesign.
 * All thickness values are millimetres and must be explicitly present in the
 * selected material catalogue entry.
 */

export const BODY_PANEL_GROUPS = [
  "leftSide",
  "rightSide",
  "top",
  "bottom",
  "shelf",
  "back",
  "door"
] as const;

export type BodyPanelGroup = (typeof BODY_PANEL_GROUPS)[number];

export type BodyPanelMaterialOverrides = Partial<Record<BodyPanelGroup, string>>;

export interface BodyPanelMaterialCatalogEntry {
  id: string;
  name: string;
  category: "panel";
  thicknessesMm: readonly number[];
  unit: "mm";
}

export interface BodyPanelMaterialPart {
  id: string;
  group: BodyPanelGroup;
  thicknessMm: number;
  material: string;
  materialId?: string;
}

const materialIdPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const partKeyToGroup: Readonly<Record<string, BodyPanelGroup>> = {
  "left-side": "leftSide",
  "right-side": "rightSide",
  top: "top",
  bottom: "bottom",
  shelf: "shelf",
  back: "back",
  door: "door"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBodyPanelGroup(value: string): value is BodyPanelGroup {
  return (BODY_PANEL_GROUPS as readonly string[]).includes(value);
}

function isMaterialId(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && materialIdPattern.test(value);
}

/**
 * Maps the stable part-key suffixes currently emitted by the cabinet
 * construction engine to the shared domain group names. Unknown parts are
 * intentionally not guessed.
 */
export function getBodyPanelGroupFromPartId(
  furnitureId: string,
  partId: string
): BodyPanelGroup | null {
  if (
    typeof furnitureId !== "string" ||
    furnitureId.trim() === "" ||
    typeof partId !== "string" ||
    !partId.startsWith(`${furnitureId}-`)
  ) {
    return null;
  }

  const partKey = partId.slice(furnitureId.length + 1);
  return partKeyToGroup[partKey] ?? null;
}

/** Missing data is valid for legacy project files; malformed supplied data is not. */
export function validateBodyPanelMaterialOverrides(
  value: unknown
): BodyPanelMaterialOverrides {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    throw new Error("Gövde panel malzeme atamaları bir nesne olmalıdır.");
  }

  const normalized: BodyPanelMaterialOverrides = {};
  for (const [group, materialId] of Object.entries(value)) {
    if (!isBodyPanelGroup(group)) {
      throw new Error(`Desteklenmeyen gövde panel grubu: ${group}.`);
    }
    if (!isMaterialId(materialId)) {
      throw new Error(`${group} panel grubu için malzeme kimliği geçersiz.`);
    }
    normalized[group] = materialId;
  }

  return normalized;
}

function normalizeMaterialCatalog(
  value: unknown
): Map<string, { id: string; name: string; thicknessesMm: number[] }> {
  if (!Array.isArray(value)) {
    throw new Error("Panel malzeme kataloğu bir liste olmalıdır.");
  }

  const catalog = new Map<string, { id: string; name: string; thicknessesMm: number[] }>();
  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      throw new Error(`Panel malzeme kataloğunun ${index + 1}. kaydı geçersiz.`);
    }

    const id = entry.id;
    const name = entry.name;
    const thicknesses = entry.thicknessesMm;
    if (!isMaterialId(id)) {
      throw new Error(`Panel malzeme kataloğunun ${index + 1}. kimliği geçersiz.`);
    }
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`${id} panel malzemesinin adı boş olamaz.`);
    }
    if (entry.category !== "panel" || entry.unit !== "mm") {
      throw new Error(`${id} yalnızca mm birimli panel malzemesi olabilir.`);
    }
    if (!Array.isArray(thicknesses) || thicknesses.length === 0) {
      throw new Error(`${id} için en az bir panel kalınlığı tanımlanmalıdır.`);
    }

    const seenThicknesses = new Set<number>();
    const thicknessesMm: number[] = [];
    for (const thickness of thicknesses) {
      if (typeof thickness !== "number" || !Number.isFinite(thickness) || thickness <= 0) {
        throw new Error(`${id} kalınlıkları sıfırdan büyük ve sonlu mm değerleri olmalıdır.`);
      }
      if (seenThicknesses.has(thickness)) {
        throw new Error(`${id} için yinelenen panel kalınlığı bulundu.`);
      }
      seenThicknesses.add(thickness);
      thicknessesMm.push(thickness);
    }

    if (catalog.has(id)) {
      throw new Error(`Yinelenen panel malzeme kimliği: ${id}.`);
    }
    catalog.set(id, { id, name: name.trim(), thicknessesMm });
  }

  return catalog;
}

/**
 * Resolves body-panel overrides without inventing a default material or
 * thickness. A group override wins over the part's existing materialId;
 * otherwise an existing catalogue reference is retained. Legacy free-text
 * parts without a materialId pass through unchanged.
 */
export function resolveBodyPanelMaterialAssignments<T extends BodyPanelMaterialPart>(
  parts: readonly T[],
  overrides: unknown,
  materials: readonly BodyPanelMaterialCatalogEntry[]
): T[] {
  if (!Array.isArray(parts)) {
    throw new Error("Gövde panel parçaları bir liste olmalıdır.");
  }

  const normalizedOverrides = validateBodyPanelMaterialOverrides(overrides);
  const catalog = normalizeMaterialCatalog(materials);

  for (const [group, materialId] of Object.entries(normalizedOverrides)) {
    if (!catalog.has(materialId)) {
      throw new Error(
        `${group} panel grubu için ${materialId} malzeme kimliği katalogda bulunamadı.`
      );
    }
  }

  const seenPartIds = new Set<string>();

  return parts.map((part, index) => {
    if (!isRecord(part)) {
      throw new Error(`Gövde panel parçalarının ${index + 1}. kaydı geçersiz.`);
    }
    if (typeof part.id !== "string" || part.id.trim() === "") {
      throw new Error(`Gövde panel parçalarının ${index + 1}. kimliği eksik.`);
    }
    if (seenPartIds.has(part.id)) {
      throw new Error(`Yinelenen gövde panel parça kimliği: ${part.id}.`);
    }
    seenPartIds.add(part.id);

    if (typeof part.group !== "string" || !isBodyPanelGroup(part.group)) {
      throw new Error(`${part.id} için gövde panel grubu geçersiz.`);
    }
    if (
      typeof part.thicknessMm !== "number" ||
      !Number.isFinite(part.thicknessMm) ||
      part.thicknessMm <= 0
    ) {
      throw new Error(`${part.id} kalınlığı pozitif ve sonlu bir mm değeri olmalıdır.`);
    }
    if (typeof part.material !== "string" || part.material.trim() === "") {
      throw new Error(`${part.id} için legacy malzeme adı boş olamaz.`);
    }
    if (part.materialId !== undefined && !isMaterialId(part.materialId)) {
      throw new Error(`${part.id} malzeme kimliği geçersiz.`);
    }

    const materialId = normalizedOverrides[part.group] ?? part.materialId;
    if (materialId === undefined) return { ...part } as unknown as T;

    const material = catalog.get(materialId);
    if (!material) {
      throw new Error(`${part.id} için ${materialId} malzeme kimliği katalogda bulunamadı.`);
    }
    if (!material.thicknessesMm.includes(part.thicknessMm)) {
      throw new Error(
        `${part.id}: ${material.name} için ${part.thicknessMm} mm kalınlık katalogda tanımlı değil.`
      );
    }

    return {
      ...part,
      material: material.name,
      materialId
    } as T;
  });
}


/** Minimal shape of the existing production Part rows; no frontend type import is required. */
export interface CabinetBodyPanelPartLike {
  id: string;
  furnitureId: string;
  thickness: number;
  material: string;
  materialId?: string;
}

/**
 * Applies the shared body-panel material contract to known cabinet Part rows.
 *
 * Stable part IDs are mapped explicitly. Unknown rows and rows belonging to
 * other furniture instances pass through unchanged; no drawer/hardware/CNC
 * part is guessed to be a carcass panel. Original Part fields and mm thickness
 * values are preserved.
 */
export function resolveCabinetBodyPanelParts<T extends CabinetBodyPanelPartLike>(
  furnitureId: string,
  parts: readonly T[],
  overrides: unknown,
  materials: readonly BodyPanelMaterialCatalogEntry[]
): T[] {
  if (typeof furnitureId !== "string" || furnitureId.trim() === "" || furnitureId.trim() !== furnitureId) {
    throw new Error("Gövde panel malzeme çözümlemesi için geçerli mobilya kimliği gereklidir.");
  }
  if (!Array.isArray(parts)) {
    throw new Error("Gövde panel parçaları bir liste olmalıdır.");
  }

  const recognized: Array<{ index: number; part: T; group: BodyPanelGroup }> = [];
  for (const [index, part] of parts.entries()) {
    if (typeof part !== "object" || part === null || Array.isArray(part)) {
      throw new Error(`Gövde panel parçalarının ${index + 1}. kaydı geçersiz.`);
    }
    const record = part as unknown as Record<string, unknown>;
    if (
      typeof record.furnitureId !== "string" ||
      record.furnitureId.trim() === "" ||
      typeof record.id !== "string" ||
      record.id.trim() === ""
    ) {
      throw new Error(`Gövde panel parçalarının ${index + 1}. mobilya/parça kimliği eksik.`);
    }
    if (record.furnitureId !== furnitureId) continue;

    const group = getBodyPanelGroupFromPartId(furnitureId, record.id);
    if (group === null) continue;
    recognized.push({ index, part, group });
  }

  const resolved = resolveBodyPanelMaterialAssignments(
    recognized.map(({ part, group }) => ({
      id: part.id,
      group,
      thicknessMm: part.thickness,
      material: part.material,
      ...(part.materialId === undefined ? {} : { materialId: part.materialId })
    })),
    overrides,
    materials
  );

  const assignments = new Map(
    recognized.map(({ index }, resolvedIndex) => {
      const part = resolved[resolvedIndex];
      return [
        index,
        {
          material: part.material,
          ...(part.materialId === undefined ? {} : { materialId: part.materialId })
        }
      ] as const;
    })
  );

  return parts.map((part, index) => {
    const assignment = assignments.get(index);
    if (!assignment) return part;
    return {
      ...part,
      material: assignment.material,
      ...(assignment.materialId === undefined ? {} : { materialId: assignment.materialId })
    };
  });
}
