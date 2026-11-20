import type { ProjectMaterialConsumptionSummary } from "./projectMaterialSummary.ts";

export const PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_TYPE = "mobilyacad-material-consumption-summary" as const;
export const PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_UNITS = Object.freeze({
  thicknessMm: "mm",
  panelAreaM2: "m2",
  volumeM3: "m3",
  edgeBandingLengthMm: "mm"
} as const);

export interface ProjectMaterialConsumptionSummaryFile {
  fileType: typeof PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_TYPE;
  schemaVersion: 1;
  units: typeof PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_UNITS;
  materials: ProjectMaterialConsumptionSummary[];
}

export interface ProjectMaterialConsumptionSummaryFileSerializationResult {
  status: "ready" | "blocked";
  json: string | null;
  diagnostics: readonly string[];
}

export interface ProjectMaterialConsumptionSummaryFileParseResult {
  status: "ready" | "blocked";
  file: ProjectMaterialConsumptionSummaryFile | null;
  materials: readonly ProjectMaterialConsumptionSummary[] | null;
  diagnostics: readonly string[];
}

const envelopeKeys = new Set(["fileType", "schemaVersion", "units", "materials"]);
const unitKeys = new Set(["thicknessMm", "panelAreaM2", "volumeM3", "edgeBandingLengthMm"]);
const summaryKeys = new Set([
  "material", "materialId", "thicknessMm", "partLineCount", "totalQuantity",
  "partIds", "panelAreaM2", "volumeM3", "edgeBanding"
]);
const edgeBandingKeys = new Set(["widthEdgesLengthMm", "lengthEdgesLengthMm", "totalLengthMm", "edgeCount"]);
const materialIdPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const maxJsonLength = 5_000_000;
const maxMaterialGroups = 1_000;
const maxPartIds = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireExactKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
  }
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.trim() !== value || value.length > maxLength) {
    throw new Error(label + " boş olmayan, kenar boşluğu içermeyen ve en fazla " + maxLength + " karakterlik metin olmalıdır.");
  }
  return value;
}

function requireFinite(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(label + " sonlu ve en az " + minimum + " olmalıdır.");
  }
  return value;
}

function requireSafeInteger(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(label + " en az " + minimum + " olan güvenli bir tam sayı olmalıdır.");
  }
  return value;
}

function compareText(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function compareMaterialGroups(
  first: ProjectMaterialConsumptionSummary,
  second: ProjectMaterialConsumptionSummary
): number {
  return first.material.localeCompare(second.material, "tr") ||
    (first.materialId ?? "").localeCompare(second.materialId ?? "") ||
    first.thicknessMm - second.thicknessMm;
}

function roundToTenth(value: number): number {
  return Math.round((value + Number.EPSILON * 10) * 10) / 10;
}

function validateMaterialSummary(
  value: unknown,
  index: number,
  seenPartIds: Set<string>
): ProjectMaterialConsumptionSummary {
  const label = "Malzeme özetinin " + (index + 1) + ". grubu";
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  requireExactKeys(value, summaryKeys, label);

  const material = requireText(value.material, label + " malzeme adı", 256);
  const materialId = value.materialId;
  if (materialId !== undefined && (typeof materialId !== "string" || !materialId.trim() || materialId.trim() !== materialId || !materialIdPattern.test(materialId))) {
    throw new Error(label + " malzeme katalog kimliği geçersiz.");
  }
  const thicknessMm = requireFinite(value.thicknessMm, label + " kalınlığı (mm)", 0);
  if (thicknessMm === 0) throw new Error(label + " kalınlığı sıfırdan büyük olmalıdır.");

  if (!Array.isArray(value.partIds) || value.partIds.length === 0 || value.partIds.length > maxPartIds) {
    throw new Error(label + " Part kimlikleri boş olmayan ve sınır içinde bir liste olmalıdır.");
  }
  const partIds: string[] = [];
  const localPartIds = new Set<string>();
  for (const [partIndex, rawId] of value.partIds.entries()) {
    const partId = requireText(rawId, label + " Part kimliği " + (partIndex + 1), 128);
    if (localPartIds.has(partId)) throw new Error(label + " yinelenen Part kimliği içeriyor: " + partId + ".");
    if (seenPartIds.has(partId)) throw new Error("Birden fazla malzeme grubunda aynı Part kimliği bulunuyor: " + partId + ".");
    if (partIds.length > 0 && compareText(partIds[partIds.length - 1], partId) > 0) {
      throw new Error(label + " Part kimlikleri sıralı olmalıdır.");
    }
    localPartIds.add(partId);
    seenPartIds.add(partId);
    if (seenPartIds.size > maxPartIds) throw new Error("Malzeme özetindeki toplam Part kimliği " + maxPartIds + " sınırını aşıyor.");
    partIds.push(partId);
  }

  const partLineCount = requireSafeInteger(value.partLineCount, label + " Part satır sayısı", 1);
  if (partLineCount !== partIds.length) throw new Error(label + " Part satır sayısı kimlik listesiyle uyuşmalıdır.");
  const totalQuantity = requireSafeInteger(value.totalQuantity, label + " toplam adet", partLineCount);
  const panelAreaM2 = requireFinite(value.panelAreaM2, label + " net alan (m2)", 0);
  if (panelAreaM2 === 0) throw new Error(label + " net alanı sıfırdan büyük olmalıdır.");
  const volumeM3 = requireFinite(value.volumeM3, label + " net hacim (m3)", 0);

  const expectedVolumeM3 = panelAreaM2 * thicknessMm / 1000;
  const volumeToleranceM3 = (thicknessMm / 1000) * 0.0000005 + 0.0000000005 + 1e-12;
  if (!Number.isFinite(expectedVolumeM3) || Math.abs(volumeM3 - expectedVolumeM3) > volumeToleranceM3) {
    throw new Error(label + " net hacmi alan ve kalınlıkla uyuşmuyor.");
  }

  if (!isRecord(value.edgeBanding)) throw new Error(label + " kenar bantlama özeti geçerli bir nesne olmalıdır.");
  requireExactKeys(value.edgeBanding, edgeBandingKeys, label + " kenar bantlama özeti");
  const widthEdgesLengthMm = requireFinite(value.edgeBanding.widthEdgesLengthMm, label + " genişlik yönü bant uzunluğu (mm)", 0);
  const lengthEdgesLengthMm = requireFinite(value.edgeBanding.lengthEdgesLengthMm, label + " uzunluk yönü bant uzunluğu (mm)", 0);
  const totalLengthMm = requireFinite(value.edgeBanding.totalLengthMm, label + " toplam bant uzunluğu (mm)", 0);
  const edgeCount = requireSafeInteger(value.edgeBanding.edgeCount, label + " bantlı kenar adedi", 0);
  const expectedBandLengthMm = roundToTenth(widthEdgesLengthMm + lengthEdgesLengthMm);
  if (!Number.isFinite(expectedBandLengthMm) || Math.abs(totalLengthMm - expectedBandLengthMm) > 0.1 + 1e-9) {
    throw new Error(label + " toplam bant uzunluğu yönsel alt toplamlarla uyuşmuyor.");
  }
  if ((edgeCount === 0) !== (totalLengthMm === 0)) {
    throw new Error(label + " bantlı kenar adedi ve toplam uzunluğu uyuşmuyor.");
  }

  return {
    material,
    ...(materialId === undefined ? {} : { materialId }),
    thicknessMm,
    partLineCount,
    totalQuantity,
    partIds,
    panelAreaM2,
    volumeM3,
    edgeBanding: { widthEdgesLengthMm, lengthEdgesLengthMm, totalLengthMm, edgeCount }
  };
}

function validateMaterialSummaries(value: unknown): ProjectMaterialConsumptionSummary[] {
  if (!Array.isArray(value) || value.length > maxMaterialGroups) {
    throw new Error("Malzeme özetleri liste olmalı ve " + maxMaterialGroups + " grup sınırını aşmamalıdır.");
  }
  const seenPartIds = new Set<string>();
  const groupIdentities = new Set<string>();
  const summaries = value.map((entry, index) => validateMaterialSummary(entry, index, seenPartIds));
  if (seenPartIds.size > maxPartIds) throw new Error("Malzeme özetindeki toplam Part kimliği " + maxPartIds + " sınırını aşıyor.");
  for (let index = 0; index < summaries.length; index += 1) {
    const current = summaries[index];
    const identity = JSON.stringify([current.materialId ?? null, current.material, current.thicknessMm]);
    if (groupIdentities.has(identity)) throw new Error("Yinelenen malzeme/kalınlık grubu bulunuyor.");
    groupIdentities.add(identity);
    if (index > 0 && compareMaterialGroups(summaries[index - 1], current) > 0) {
      throw new Error("Malzeme özet grupları sabit sıralı olmalıdır.");
    }
  }
  return summaries;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function blockedSerialization(message: string): ProjectMaterialConsumptionSummaryFileSerializationResult {
  return Object.freeze({ status: "blocked" as const, json: null, diagnostics: Object.freeze([message]) });
}

function blockedParse(message: string): ProjectMaterialConsumptionSummaryFileParseResult {
  return Object.freeze({ status: "blocked" as const, file: null, materials: null, diagnostics: Object.freeze([message]) });
}

function stripFurnitureIds(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((entry) => {
    if (!isRecord(entry)) return entry;
    const summary = { ...entry };
    delete summary.furnitureIds;
    return summary;
  });
}

/** Serializes an exact material-consumption summary; no waste, yield or prices are inferred. */
export function serializeProjectMaterialConsumptionSummaryFile(
  value: unknown
): ProjectMaterialConsumptionSummaryFileSerializationResult {
  try {
    const materials = validateMaterialSummaries(stripFurnitureIds(value));
    const file: ProjectMaterialConsumptionSummaryFile = {
      fileType: PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_TYPE,
      schemaVersion: 1,
      units: PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_UNITS,
      materials
    };
    const json = JSON.stringify(file);
    if (json.length > maxJsonLength) throw new Error("Malzeme tüketim JSON dosyası 5 MB sınırını aşıyor.");
    return Object.freeze({ status: "ready" as const, json, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization(error instanceof Error ? error.message : String(error));
  }
}

/** Parses the strict material-consumption JSON v1 envelope and checks summary arithmetic and provenance. */
export function parseProjectMaterialConsumptionSummaryFile(
  jsonValue: unknown
): ProjectMaterialConsumptionSummaryFileParseResult {
  if (typeof jsonValue !== "string") return blockedParse("Malzeme tüketim dosyası JSON metni olmalıdır.");
  if (jsonValue.length > maxJsonLength) return blockedParse("Malzeme tüketim JSON dosyası 5 MB sınırını aşıyor.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue) as unknown;
  } catch {
    return blockedParse("Malzeme tüketim dosyası geçerli JSON içermiyor.");
  }
  if (!isRecord(parsed)) return blockedParse("Malzeme tüketim dosya zarfı geçerli bir nesne olmalıdır.");
  try {
    requireExactKeys(parsed, envelopeKeys, "Malzeme tüketim dosyası");
    if (parsed.fileType !== PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_TYPE) {
      throw new Error("Dosya türü MobilyaCAD malzeme tüketim özeti değildir.");
    }
    if (parsed.schemaVersion !== 1) throw new Error("Desteklenmeyen malzeme tüketim JSON sürümü.");
    if (!isRecord(parsed.units)) throw new Error("Malzeme tüketim JSON birim zarfı geçerli değildir.");
    requireExactKeys(parsed.units, unitKeys, "Malzeme tüketim JSON birimleri");
    const units = parsed.units;
    if (
      units.thicknessMm !== "mm" ||
      units.panelAreaM2 !== "m2" ||
      units.volumeM3 !== "m3" ||
      units.edgeBandingLengthMm !== "mm"
    ) {
      throw new Error("Malzeme tüketim JSON birimleri desteklenen v1 sözleşmesiyle uyuşmuyor.");
    }
    const materials = validateMaterialSummaries(parsed.materials);
    const file = deepFreeze({
      fileType: PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_TYPE,
      schemaVersion: 1 as const,
      units: PROJECT_MATERIAL_CONSUMPTION_SUMMARY_FILE_UNITS,
      materials
    });
    return Object.freeze({ status: "ready" as const, file, materials, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : String(error));
  }
}
