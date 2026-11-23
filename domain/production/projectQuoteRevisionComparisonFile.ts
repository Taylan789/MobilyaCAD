import { calculateProjectCostLineTotalMinor } from "./projectCostSummary.ts";
import type {
  ProjectQuoteCostCategory,
  ProjectQuoteRevisionComparison,
  ProjectQuoteRevisionCostLineSnapshot,
  ProjectQuoteRevisionLineChange
} from "./projectQuoteRevision.ts";

export const PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE = "mobilyacad-quote-revision-comparison" as const;

export const PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES = 1_048_576;
export const PROJECT_QUOTE_REVISION_COMPARISON_MAX_LINE_CHANGES = 2_000;

export interface ProjectQuoteRevisionComparisonFile {
  fileType: typeof PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE;
  schemaVersion: 1 | 2 | 3;
  comparison: ProjectQuoteRevisionComparison;
}

export interface ProjectQuoteRevisionComparisonFileSerializationResult {
  status: "ready" | "blocked";
  json: string | null;
  diagnostics: readonly string[];
}

export interface ProjectQuoteRevisionComparisonFileParseResult {
  status: "ready" | "blocked";
  file: ProjectQuoteRevisionComparisonFile | null;
  comparison: ProjectQuoteRevisionComparison | null;
  diagnostics: readonly string[];
}

const envelopeKeys = new Set(["fileType", "schemaVersion", "comparison"]);
const comparisonKeys = new Set([
  "schemaVersion", "projectId", "fromRevisionId", "fromRevisionNumber",
  "toRevisionId", "toRevisionNumber", "currencyCode", "fromGrandTotalMinor",
  "toGrandTotalMinor", "grandTotalDeltaMinor", "categoryDeltasMinor", "lineChanges"
]);
const lineChangeKeys = new Set(["type", "from", "to"]);
const baseLineKeys = new Set([
  "category", "description", "quantity", "unit", "unitPriceMinor",
  "lineTotalMinor", "currencyCode", "sourceReference", "sourceType",
  "sourceId", "tariffId", "sourcePartIds", "edgeDirection",
  "rollCount", "rollLengthMm", "purchasedLengthMm", "furnitureIds",
  "planSourceReference", "priceSourceReference"
]);
const resourceLineKeys = new Set(["resourceType", "resourceId", "resourceUnit"]);
const lineKeysV2 = new Set([...baseLineKeys, ...resourceLineKeys]);
const hardwareMetadataKeys = new Set(["hardwareId", "hardwareUnit", "hardwareFurnitureIds", "hardwareSourceReferences"]);
const requiredHardwareMetadataKeys = new Set(["hardwareId", "hardwareUnit", "hardwareFurnitureIds"]);
const lineKeysV3 = new Set([...lineKeysV2, ...hardwareMetadataKeys]);
const categories: readonly ProjectQuoteCostCategory[] = [
  "material", "hardware", "labor", "operation", "waste", "profit"
];
const categoryKeys = new Set(categories);
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const currencyPattern = /^[A-Z]{3}$/;
const sourceTypes = new Set(["production-consumption", "labor-operation", "quote-adjustment"]);
const edgeDirections = new Set(["top", "bottom", "left", "right"]);
const rollMetadataKeys = new Set([
  "rollCount", "rollLengthMm", "purchasedLengthMm", "furnitureIds",
  "planSourceReference", "priceSourceReference"
]);

type DeepReadonly<T> =
  T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireExactKeys(value: Record<string, unknown>, keys: Set<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(label + " zorunlu alanı eksik: " + key + ".");
    }
  }
}

function requireAllowedKeys(value: Record<string, unknown>, keys: Set<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
  }
}

function requireRequiredKeys(value: Record<string, unknown>, keys: Set<string>, label: string): void {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(label + " zorunlu alanı eksik: " + key + ".");
    }
  }
}

function requireText(value: unknown, label: string, maximum: number): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim() !== value ||
    value.length > maximum
  ) {
    throw new Error(label + " geçerli, boş olmayan metin olmalıdır.");
  }
  return value;
}

function requireIdentifier(value: unknown, label: string): string {
  const text = requireText(value, label, 128);
  if (!identifierPattern.test(text)) throw new Error(label + " geçersiz.");
  return text;
}

function requireSafeInteger(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(label + " güvenli tam sayı aralığında olmalıdır.");
  }
  return value;
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as unknown as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

function requireSortedIdentifiers(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10_000) {
    throw new Error(label + " 1-10.000 arası kimlik içeren bir liste olmalıdır.");
  }
  const identifiers = value.map((item, index) => requireIdentifier(item, label + " " + (index + 1)));
  if (identifiers.some((id, index) => index > 0 && identifiers[index - 1] >= id)) {
    throw new Error(label + " sıralı ve benzersiz olmalıdır.");
  }
  return identifiers;
}

function requireRollLengthTenths(value: unknown, label: string, maximumMm?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || (maximumMm !== undefined && value > maximumMm)) {
    throw new Error(label + " pozitif, sonlu ve izin verilen mm sınırında olmalıdır.");
  }
  const tenths = Math.round(value * 10);
  if (!Number.isSafeInteger(tenths) || Math.abs(tenths / 10 - value) > 1e-8) {
    throw new Error(label + " en fazla 0.1 mm hassasiyetinde olmalıdır.");
  }
  return tenths;
}

function validateLine(value: unknown, currencyCode: string, allowResourceIdentity: boolean, allowHardwareBom: boolean): ProjectQuoteRevisionCostLineSnapshot {
  if (!isRecord(value)) throw new Error("Teklif fark satırı geçerli bir nesne olmalıdır.");
  requireAllowedKeys(value, allowHardwareBom ? lineKeysV3 : allowResourceIdentity ? lineKeysV2 : baseLineKeys, "Teklif fark satırı");
  requireRequiredKeys(value, new Set([
    "category", "description", "quantity", "unit", "unitPriceMinor",
    "lineTotalMinor", "currencyCode", "sourceType", "sourceId"
  ]), "Teklif fark satırı");

  if (typeof value.category !== "string" || !categoryKeys.has(value.category as ProjectQuoteCostCategory)) {
    throw new Error("Teklif fark satırı kategorisi desteklenmiyor.");
  }
  const category = value.category as ProjectQuoteCostCategory;
  const description = requireText(value.description, "Satır açıklaması", 512);
  if (typeof value.quantity !== "number" || !Number.isFinite(value.quantity) || value.quantity <= 0) {
    throw new Error("Satır miktarı pozitif ve sonlu olmalıdır.");
  }
  const unit = requireText(value.unit, "Satır birimi", 32);
  const unitPriceMinor = requireSafeInteger(value.unitPriceMinor, "Satır birim fiyatı");
  const lineTotalMinor = requireSafeInteger(value.lineTotalMinor, "Satır toplamı");
  if (value.currencyCode !== currencyCode) throw new Error("Teklif satır para birimi karşılaştırma para birimiyle uyuşmuyor.");
  if (typeof value.sourceType !== "string" || !sourceTypes.has(value.sourceType)) {
    throw new Error("Teklif satırı kaynak türü desteklenmiyor.");
  }
  const sourceType = value.sourceType as ProjectQuoteRevisionCostLineSnapshot["sourceType"];
  const sourceId = requireIdentifier(value.sourceId, "Satır kaynak kimliği");
  const sourceReference = value.sourceReference === undefined
    ? undefined
    : requireText(value.sourceReference, "Satır fiyat/kaynak referansı", 512);
  const tariffId = value.tariffId === undefined
    ? undefined
    : requireIdentifier(value.tariffId, "Satır tarife kimliği");
  let sourcePartIds: string[] | undefined;
  if (value.sourcePartIds !== undefined) {
    if (!Array.isArray(value.sourcePartIds)) throw new Error("Satır kaynak Part ID listesi olmalıdır.");
    sourcePartIds = value.sourcePartIds.map((id, index) => requireIdentifier(id, "Kaynak Part ID " + (index + 1)));
    if (sourcePartIds.some((id, index) => index > 0 && sourcePartIds![index - 1] >= id)) {
      throw new Error("Kaynak Part ID listesi sıralı ve benzersiz olmalıdır.");
    }
  }
  const edgeDirection = value.edgeDirection === undefined
    ? undefined
    : requireText(value.edgeDirection, "Kenar yönü", 16);
  if (edgeDirection !== undefined && (!edgeDirections.has(edgeDirection) || category !== "material")) {
    throw new Error("Kenar yönü yalnızca desteklenen material satırlarında kullanılabilir.");
  }
  const hasResourceMetadata = [...resourceLineKeys].some(key => Object.prototype.hasOwnProperty.call(value, key));
  let resourceType: ProjectQuoteRevisionCostLineSnapshot["resourceType"] | undefined;
  let resourceId: string | undefined;
  let resourceUnit: string | undefined;
  if (hasResourceMetadata) {
    if (!allowResourceIdentity) throw new Error("Katalog kaynak metadata'sı yalnızca JSON v2 satırlarında kullanılabilir.");
    requireRequiredKeys(value, resourceLineKeys, "Katalog kaynak metadata'sı");
    if (value.resourceType !== "material" && value.resourceType !== "edge-banding") {
      throw new Error("Katalog kaynak türü material veya edge-banding olmalıdır.");
    }
    resourceType = value.resourceType;
    resourceId = requireIdentifier(value.resourceId, "Katalog kaynak kimliği");
    resourceUnit = requireText(value.resourceUnit, "Katalog kaynak birimi", 32);
    if (category !== "material" || resourceUnit !== unit) {
      throw new Error("Katalog kaynak türü/birimi teklif satırı kategori ve birimiyle uyuşmalıdır.");
    }
  }

  const hasHardwareMetadata = [...hardwareMetadataKeys].some(key => Object.prototype.hasOwnProperty.call(value, key));
  let hardwareId: string | undefined;
  let hardwareUnit: string | undefined;
  let hardwareFurnitureIds: string[] | undefined;
  let hardwareSourceReferences: string[] | undefined;
  if (hasHardwareMetadata) {
    if (!allowHardwareBom) throw new Error("Donanım BOM metadata yalnızca JSON v3 satırlarında kullanılabilir.");
    if (category !== "hardware" || sourceType !== "production-consumption") {
      throw new Error("Donanım BOM metadata yalnızca production-consumption hardware satırlarında kullanılabilir.");
    }
    requireRequiredKeys(value, requiredHardwareMetadataKeys, "Donanım BOM metadata");
    hardwareId = requireIdentifier(value.hardwareId, "Donanım BOM kimliği");
    hardwareUnit = requireText(value.hardwareUnit, "Donanım BOM birimi", 32);
    if (hardwareUnit !== unit) throw new Error("Donanım BOM birimi maliyet satırı birimiyle uyuşmalıdır.");
    hardwareFurnitureIds = requireSortedIdentifiers(value.hardwareFurnitureIds, "Donanım BOM mobilya kimlikleri");
    if (value.hardwareSourceReferences !== undefined) {
      hardwareSourceReferences = requireSortedIdentifiers(value.hardwareSourceReferences, "Donanım BOM kaynak referansları");
    }
  }

  const hasRollMetadata = [...rollMetadataKeys].some(key => Object.prototype.hasOwnProperty.call(value, key));
  let rollCount: number | undefined;
  let rollLengthMm: number | undefined;
  let purchasedLengthMm: number | undefined;
  let furnitureIds: string[] | undefined;
  let planSourceReference: string | undefined;
  let priceSourceReference: string | undefined;
  if (unit === "rulo") {
    if (category !== "material" || sourceType !== "production-consumption" || edgeDirection !== undefined) {
      throw new Error("Rulo maliyet satırı yön taşımayan production-consumption material satırı olmalıdır.");
    }
    if (sourcePartIds === undefined || sourcePartIds.length === 0) {
      throw new Error("Rulo maliyet satırı kaynak Part kimlikleriyle eşleşmelidir.");
    }
    rollCount = requireSafeInteger(value.rollCount, "Kenar bandı rulo adedi", 1);
    if (value.quantity !== rollCount) throw new Error("Kenar bandı rulo adedi quantity ile uyuşmalıdır.");
    const rollLengthTenths = requireRollLengthTenths(value.rollLengthMm, "Kenar bandı rulo uzunluğu", 10_000_000);
    const purchasedLengthTenths = requireRollLengthTenths(value.purchasedLengthMm, "Kenar bandı satın alınan uzunluğu");
    const expectedPurchasedLengthTenths = rollLengthTenths * rollCount;
    if (!Number.isSafeInteger(expectedPurchasedLengthTenths) || purchasedLengthTenths !== expectedPurchasedLengthTenths) {
      throw new Error("Kenar bandı satın alınan uzunluğu rulo adedi ve rulo uzunluğuyla uyuşmuyor.");
    }
    rollLengthMm = rollLengthTenths / 10;
    purchasedLengthMm = purchasedLengthTenths / 10;
    furnitureIds = requireSortedIdentifiers(value.furnitureIds, "Rulo mobilya kimlikleri");
    planSourceReference = value.planSourceReference === undefined
      ? undefined
      : requireText(value.planSourceReference, "Rulo plan kaynak referansı", 256);
    priceSourceReference = value.priceSourceReference === undefined
      ? undefined
      : requireText(value.priceSourceReference, "Rulo fiyat kaynak referansı", 256);
  } else if (hasRollMetadata) {
    throw new Error("Rulo metadata yalnızca rulo birimli maliyet satırlarında kullanılabilir.");
  }

  const calculated = calculateProjectCostLineTotalMinor(value.quantity, unitPriceMinor, "Teklif fark satırı");
  if (calculated !== lineTotalMinor) throw new Error("Satır toplamı miktar ve birim fiyatla uyuşmuyor.");

  return {
    category,
    description,
    quantity: value.quantity,
    unit,
    unitPriceMinor,
    lineTotalMinor,
    currencyCode,
    ...(sourceReference === undefined ? {} : { sourceReference }),
    sourceType,
    sourceId,
    ...(resourceType === undefined ? {} : { resourceType }),
    ...(resourceId === undefined ? {} : { resourceId }),
    ...(resourceUnit === undefined ? {} : { resourceUnit }),
    ...(hardwareId === undefined ? {} : { hardwareId }),
    ...(hardwareUnit === undefined ? {} : { hardwareUnit }),
    ...(hardwareFurnitureIds === undefined ? {} : { hardwareFurnitureIds }),
    ...(hardwareSourceReferences === undefined ? {} : { hardwareSourceReferences }),
    ...(tariffId === undefined ? {} : { tariffId }),
    ...(sourcePartIds === undefined ? {} : { sourcePartIds }),
    ...(edgeDirection === undefined ? {} : { edgeDirection: edgeDirection as ProjectQuoteRevisionCostLineSnapshot["edgeDirection"] }),
    ...(rollCount === undefined ? {} : { rollCount }),
    ...(rollLengthMm === undefined ? {} : { rollLengthMm }),
    ...(purchasedLengthMm === undefined ? {} : { purchasedLengthMm }),
    ...(furnitureIds === undefined ? {} : { furnitureIds }),
    ...(planSourceReference === undefined ? {} : { planSourceReference }),
    ...(priceSourceReference === undefined ? {} : { priceSourceReference })
  };
}

function comparisonLineIdentity(line: ProjectQuoteRevisionCostLineSnapshot): string {
  return JSON.stringify([
    line.category,
    line.edgeDirection === undefined ? line.description : null,
    line.edgeDirection ?? null,
    line.unit,
    line.sourceType,
    line.sourceId,
    line.tariffId ?? null,
    line.sourcePartIds ?? [],
    line.resourceType ?? null,
    line.resourceId ?? null,
    line.resourceUnit ?? null,
    line.furnitureIds ?? []
  ]);
}

function requireUniqueComparisonLineIdentity(
  line: ProjectQuoteRevisionCostLineSnapshot,
  identities: Set<string>,
  label: string
): void {
  const identity = comparisonLineIdentity(line) + JSON.stringify(line);
  if (identities.has(identity)) throw new Error(label + " aynı teklif satır snapshot'ı yineleniyor.");
  identities.add(identity);
}

function sameOptionalArray(left: readonly string[] | undefined, right: readonly string[] | undefined): boolean {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function sameChangedLineIdentity(
  from: ProjectQuoteRevisionCostLineSnapshot,
  to: ProjectQuoteRevisionCostLineSnapshot
): boolean {
  return (
    from.category === to.category &&
    from.unit === to.unit &&
    from.sourceType === to.sourceType &&
    from.sourceId === to.sourceId &&
    from.tariffId === to.tariffId &&
    sameOptionalArray(from.sourcePartIds, to.sourcePartIds) &&
    from.edgeDirection === to.edgeDirection &&
    sameOptionalArray(from.furnitureIds, to.furnitureIds) &&
    from.resourceType === to.resourceType &&
    from.resourceId === to.resourceId &&
    from.resourceUnit === to.resourceUnit &&
    (from.edgeDirection !== undefined || from.description === to.description)
  );
}

function validateComparison(value: unknown, allowResourceIdentity: boolean, allowHardwareBom: boolean): ProjectQuoteRevisionComparison {
  if (!isRecord(value)) throw new Error("Teklif revizyon karşılaştırması geçerli bir nesne olmalıdır.");
  requireExactKeys(value, comparisonKeys, "Teklif revizyon karşılaştırması");
  if (value.schemaVersion !== 1) throw new Error("Desteklenmeyen teklif karşılaştırma sürümü.");
  const projectId = requireIdentifier(value.projectId, "Proje kimliği");
  const fromRevisionId = requireIdentifier(value.fromRevisionId, "Başlangıç revizyon kimliği");
  const toRevisionId = requireIdentifier(value.toRevisionId, "Hedef revizyon kimliği");
  const fromRevisionNumber = requireSafeInteger(value.fromRevisionNumber, "Başlangıç revizyon numarası", 1);
  const toRevisionNumber = requireSafeInteger(value.toRevisionNumber, "Hedef revizyon numarası", 1);
  if (toRevisionNumber <= fromRevisionNumber || fromRevisionId === toRevisionId) {
    throw new Error("Hedef revizyon başlangıç revizyonundan daha yeni olmalıdır.");
  }
  const currencyCode = requireText(value.currencyCode, "Teklif para birimi", 3);
  if (!currencyPattern.test(currencyCode)) throw new Error("Teklif para birimi üç büyük harfli kod olmalıdır.");
  const fromGrandTotalMinor = requireSafeInteger(value.fromGrandTotalMinor, "Başlangıç genel toplamı");
  const toGrandTotalMinor = requireSafeInteger(value.toGrandTotalMinor, "Hedef genel toplamı");
  const grandTotalDeltaMinor = requireSafeInteger(value.grandTotalDeltaMinor, "Genel toplam farkı", Number.MIN_SAFE_INTEGER);
  const expectedGrandDelta = toGrandTotalMinor - fromGrandTotalMinor;
  if (!Number.isSafeInteger(expectedGrandDelta) || grandTotalDeltaMinor !== expectedGrandDelta) {
    throw new Error("Genel toplam farkı revizyon toplamlarıyla uyuşmuyor.");
  }

  if (!isRecord(value.categoryDeltasMinor)) throw new Error("Kategori farkları geçerli bir nesne olmalıdır.");
  requireExactKeys(value.categoryDeltasMinor, categoryKeys, "Kategori farkları");
  const categoryDeltasMinor = {} as Record<ProjectQuoteCostCategory, number>;
  const categoryLineDeltas = new Map<ProjectQuoteCostCategory, bigint>(categories.map((category) => [category, 0n]));
  let categoryGrandDelta = 0n;
  for (const category of categories) {
    const delta = requireSafeInteger(value.categoryDeltasMinor[category], category + " kategori farkı", Number.MIN_SAFE_INTEGER);
    categoryDeltasMinor[category] = delta;
    categoryGrandDelta += BigInt(delta);
  }
  if (categoryGrandDelta !== BigInt(grandTotalDeltaMinor)) {
    throw new Error("Kategori farkları genel toplam farkıyla uyuşmuyor.");
  }

  if (!Array.isArray(value.lineChanges)) throw new Error("Teklif satır farkları listesi olmalıdır.");
  if (value.lineChanges.length > PROJECT_QUOTE_REVISION_COMPARISON_MAX_LINE_CHANGES) {
    throw new Error("Teklif satır farkları en fazla 2.000 kayıt içerebilir.");
  }
  const fromIdentities = new Set<string>();
  const toIdentities = new Set<string>();
  const lineChanges: ProjectQuoteRevisionLineChange[] = value.lineChanges.map((entry, index) => {
    if (!isRecord(entry)) throw new Error("Teklif satır farkı " + (index + 1) + " geçerli bir nesne olmalıdır.");
    requireExactKeys(entry, lineChangeKeys, "Teklif satır farkı");
    if (entry.type !== "added" && entry.type !== "removed" && entry.type !== "changed") {
      throw new Error("Teklif satır fark türü desteklenmiyor.");
    }
    const type = entry.type;
    if (type === "added" && (entry.from !== null || entry.to === null)) {
      throw new Error("Eklenen satır yalnızca hedef revizyonda bulunmalıdır.");
    }
    if (type === "removed" && (entry.from === null || entry.to !== null)) {
      throw new Error("Kaldırılan satır yalnızca başlangıç revizyonunda bulunmalıdır.");
    }
    if (type === "changed" && (entry.from === null || entry.to === null)) {
      throw new Error("Değişen satır her iki revizyonda da bulunmalıdır.");
    }
    const from = entry.from === null ? null : validateLine(entry.from, currencyCode, allowResourceIdentity, allowHardwareBom);
    const to = entry.to === null ? null : validateLine(entry.to, currencyCode, allowResourceIdentity, allowHardwareBom);
    if (from !== null) requireUniqueComparisonLineIdentity(from, fromIdentities, "Başlangıç");
    if (to !== null) requireUniqueComparisonLineIdentity(to, toIdentities, "Hedef");
    if (type === "changed" && from !== null && to !== null && !sameChangedLineIdentity(from, to)) {
      throw new Error("Değişen satırın kaynak, kategori, birim, yön veya Part kimliği sabit kalmalıdır.");
    }
    const category = (from ?? to)?.category;
    if (category === undefined) throw new Error("Satır farkı kategori içermiyor.");
    const delta = (to === null ? 0n : BigInt(to.lineTotalMinor)) - (from === null ? 0n : BigInt(from.lineTotalMinor));
    categoryLineDeltas.set(category, (categoryLineDeltas.get(category) ?? 0n) + delta);
    return { type, from, to };
  });

  for (const category of categories) {
    if (categoryLineDeltas.get(category) !== BigInt(categoryDeltasMinor[category])) {
      throw new Error(category + " satır farkları kategori toplam farkıyla uyuşmuyor.");
    }
  }

  return {
    schemaVersion: 1,
    projectId,
    fromRevisionId,
    fromRevisionNumber,
    toRevisionId,
    toRevisionNumber,
    currencyCode,
    fromGrandTotalMinor,
    toGrandTotalMinor,
    grandTotalDeltaMinor,
    categoryDeltasMinor,
    lineChanges
  };
}

function blockedSerialization(message: string): ProjectQuoteRevisionComparisonFileSerializationResult {
  return Object.freeze({ status: "blocked" as const, json: null, diagnostics: Object.freeze([message]) });
}

function blockedParse(message: string): ProjectQuoteRevisionComparisonFileParseResult {
  return Object.freeze({ status: "blocked" as const, file: null, comparison: null, diagnostics: Object.freeze([message]) });
}

/** Serializes a fully validated revision comparison; currency, units and source metadata remain exact. */
export function serializeProjectQuoteRevisionComparisonFile(
  resultValue: unknown
): ProjectQuoteRevisionComparisonFileSerializationResult {
  if (!isRecord(resultValue)) return blockedSerialization("Teklif karşılaştırma sonucu geçerli bir nesne olmalıdır.");
  try {
    requireExactKeys(resultValue, new Set(["status", "comparison", "diagnostics"]), "Teklif karşılaştırma sonucu");
    if (resultValue.status !== "ready") throw new Error("Yalnızca hazır teklif karşılaştırmaları JSON'a aktarılabilir.");
    if (!Array.isArray(resultValue.diagnostics) || resultValue.diagnostics.length !== 0) {
      throw new Error("Hazır teklif karşılaştırması tanı/engel içermemelidir.");
    }
    const comparison = validateComparison(resultValue.comparison, true, true);
    const hasHardwareBomMetadata = comparison.lineChanges.some(change =>
      [change.from, change.to].some(line => line !== null && [...hardwareMetadataKeys].some(key => Object.prototype.hasOwnProperty.call(line, key)))
    );
    const file: ProjectQuoteRevisionComparisonFile = {
      fileType: PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE,
      schemaVersion: hasHardwareBomMetadata ? 3 : 2,
      comparison
    };
    const json = JSON.stringify(file);
    if (typeof json !== "string") throw new Error("Teklif karşılaştırması JSON metnine dönüştürülemedi.");
    if (json.length > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES ||
      new TextEncoder().encode(json).byteLength > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES) {
      throw new Error("Teklif karşılaştırma JSON dosyası 1 MiB sınırını aşamaz.");
    }
    return Object.freeze({ status: "ready" as const, json, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedSerialization(error instanceof Error ? error.message : String(error));
  }
}

/** Parses strict legacy JSON v1, resource-aware JSON v2, or hardware-BOM-aware JSON v3 comparison envelopes. */
export function parseProjectQuoteRevisionComparisonFile(
  jsonValue: unknown
): ProjectQuoteRevisionComparisonFileParseResult {
  if (typeof jsonValue !== "string") return blockedParse("Teklif karşılaştırma dosyası JSON metni olmalıdır.");
  if (jsonValue.length > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES ||
    new TextEncoder().encode(jsonValue).byteLength > PROJECT_QUOTE_REVISION_COMPARISON_FILE_MAX_BYTES) {
    return blockedParse("Teklif karşılaştırma JSON dosyası 1 MiB sınırını aşamaz.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonValue) as unknown;
  } catch {
    return blockedParse("Teklif karşılaştırma dosyası geçerli JSON içermiyor.");
  }
  if (!isRecord(parsed)) return blockedParse("Teklif karşılaştırma dosya zarfı geçerli bir nesne olmalıdır.");
  try {
    requireExactKeys(parsed, envelopeKeys, "Teklif karşılaştırma dosyası");
    if (parsed.fileType !== PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE) {
      throw new Error("Dosya türü MobilyaCAD teklif karşılaştırması değildir.");
    }
    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2 && parsed.schemaVersion !== 3) throw new Error("Desteklenmeyen teklif karşılaştırma JSON sürümü.");
    const schemaVersion = parsed.schemaVersion as 1 | 2 | 3;
    const comparison = deepFreeze(validateComparison(parsed.comparison, schemaVersion >= 2, schemaVersion === 3));
    const file = deepFreeze({
      fileType: PROJECT_QUOTE_REVISION_COMPARISON_FILE_TYPE,
      schemaVersion,
      comparison
    });
    return Object.freeze({ status: "ready" as const, file, comparison, diagnostics: Object.freeze([]) });
  } catch (error) {
    return blockedParse(error instanceof Error ? error.message : String(error));
  }
}
