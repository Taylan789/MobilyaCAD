/**
 * User-defined panel material catalogue.
 * Thickness values are always expressed in millimetres; prices and
 * manufacturing allowances are intentionally outside this data contract.
 */
export interface MaterialCatalogEntry {
  /** Stable, user-controlled identifier used by project references. */
  id: string;
  name: string;
  category: "panel";
  /** Optional human-readable decor label; no colour or supplier standard is inferred. */
  decor?: string;
  thicknessesMm: number[];
  unit: "mm";
}

const materialIdPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMaterialEntry(value: unknown, index: number): MaterialCatalogEntry {
  if (!isRecord(value)) {
    throw new Error(`Malzeme kataloğu ${index + 1}. kaydı geçerli bir nesne olmalıdır.`);
  }

  if (
    typeof value.id !== "string" ||
    value.id.trim() !== value.id ||
    !materialIdPattern.test(value.id)
  ) {
    throw new Error(`Malzeme kataloğu ${index + 1}. kaydında kararlı kimlik geçersiz.`);
  }

  if (typeof value.name !== "string" || value.name.trim() === "") {
    throw new Error(`${value.id} malzemesinin adı boş olamaz.`);
  }

  if (value.category !== "panel") {
    throw new Error(`${value.id} için desteklenmeyen malzeme kategorisi.`);
  }

  if (value.unit !== "mm") {
    throw new Error(`${value.id} kalınlık birimi mm olmalıdır.`);
  }

  if (!Array.isArray(value.thicknessesMm) || value.thicknessesMm.length === 0) {
    throw new Error(`${value.id} için en az bir panel kalınlığı tanımlanmalıdır.`);
  }

  const seenThicknesses = new Set<number>();
  const thicknessesMm: number[] = [];

  for (const thickness of value.thicknessesMm) {
    if (typeof thickness !== "number" || !Number.isFinite(thickness) || thickness <= 0) {
      throw new Error(`${value.id} kalınlıkları sıfırdan büyük ve sonlu mm değerleri olmalıdır.`);
    }
    if (seenThicknesses.has(thickness)) {
      throw new Error(`${value.id} için yinelenen panel kalınlığı bulundu.`);
    }
    seenThicknesses.add(thickness);
    thicknessesMm.push(thickness);
  }

  let decor: string | undefined;
  if (value.decor !== undefined) {
    if (typeof value.decor !== "string") {
      throw new Error(`${value.id} dekor etiketi metin olmalıdır.`);
    }
    const normalizedDecor = value.decor.trim();
    if (normalizedDecor !== "") decor = normalizedDecor;
  }

  return {
    id: value.id,
    name: value.name.trim(),
    category: "panel",
    ...(decor === undefined ? {} : { decor }),
    thicknessesMm: thicknessesMm.sort((first, second) => first - second),
    unit: "mm"
  };
}

/**
 * Validates and normalizes a user-defined panel catalogue.
 * IDs must be unique and stable; panel thicknesses are finite positive mm
 * values. The function never assigns prices, colours, suppliers, or waste.
 */
export function validateMaterialCatalog(value: unknown): MaterialCatalogEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("Malzeme kataloğu bir liste olmalıdır.");
  }

  const seenIds = new Set<string>();
  return value.map((entry, index) => {
    const normalized = normalizeMaterialEntry(entry, index);
    if (seenIds.has(normalized.id)) {
      throw new Error(`Yinelenen malzeme kimliği: ${normalized.id}.`);
    }
    seenIds.add(normalized.id);
    return normalized;
  });
}

/** Resolves only a thickness explicitly declared by the selected material. */
export function resolveMaterialThickness(
  entry: MaterialCatalogEntry,
  thicknessMm: number
): number {
  const [material] = validateMaterialCatalog([entry]);

  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) {
    throw new Error("Panel kalınlığı sıfırdan büyük ve sonlu bir mm değeri olmalıdır.");
  }

  if (!material.thicknessesMm.includes(thicknessMm)) {
    throw new Error(
      `${material.name} için ${thicknessMm} mm kalınlık katalogda tanımlı değil.`
    );
  }

  return thicknessMm;
}
