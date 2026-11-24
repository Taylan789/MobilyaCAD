import { calculateProjectCostLineTotalMinor } from "./projectCostSummary.ts";
import type { ProjectCostLine, ProjectCostLineEdgeDirection } from "./projectCostSummary.ts";
import type { ProjectQuoteLineSource } from "./projectQuoteSummary.ts";
import type {
  ProjectQuotePricingSnapshot,
  ProjectQuoteStockSheetGroupSnapshot
} from "./projectQuotePricingSnapshot.ts";

type DeepReadonly<T> =
  T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export interface ProjectQuoteRevisionReference {
  projectId: string;
  revisionId: string;
  revisionNumber: number;
  createdAt: string;
}

export interface ProjectQuoteRevision {
  schemaVersion: 1;
  /** Present on new revisions; absent on legacy v1 records. */
  sourceIntegrityVersion?: 1;
  projectId: string;
  revisionId: string;
  revisionNumber: number;
  createdAt: string;
  previousRevisionId: string | null;
  pricingSnapshot: DeepReadonly<ProjectQuotePricingSnapshot>;
}

export interface ProjectQuoteRevisionResult {
  status: "ready" | "blocked";
  revision: DeepReadonly<ProjectQuoteRevision> | null;
  diagnostics: readonly string[];
}
export interface ProjectQuoteRevisionHistory {
  schemaVersion: 1;
  projectId: string;
  revisions: readonly DeepReadonly<ProjectQuoteRevision>[];
}

export interface ProjectQuoteRevisionHistoryResult {
  status: "ready" | "empty" | "blocked";
  history: DeepReadonly<ProjectQuoteRevisionHistory> | null;
  diagnostics: readonly string[];
}

const inputKeys = new Set([
  "projectId",
  "revisionId",
  "revisionNumber",
  "createdAt",
  "previousRevision",
  "pricingSnapshot",
  "sourceIntegrityVersion"
]);
export const PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS = 2_000;

const historyInputKeys = new Set(["schemaVersion", "projectId", "revisions"]);
const appendInputKeys = new Set(["revisionId", "createdAt", "pricingSnapshot"]);
const revisionEnvelopeKeys = new Set([
  "schemaVersion",
  "projectId",
  "revisionId",
  "revisionNumber",
  "createdAt",
  "previousRevisionId",
  "pricingSnapshot",
  "sourceIntegrityVersion"
]);
const referenceKeys = new Set(["projectId", "revisionId", "revisionNumber", "createdAt"]);
const snapshotKeys = new Set([
  "schemaVersion",
  "quotedOn",
  "consumptionPriceList",
  "laborOperationTariffList",
  "quoteSummary",
  "materialCostBasis"
]);
const materialCostBasisKeys = new Set([
  "schemaVersion",
  "basis",
  "currencyCode",
  "panelMaterialCostMinor",
  "edgeBandingCostMinor",
  "materialCategoryTotalMinor",
  "categoryTotalsMinor",
  "grandTotalMinor",
  "materialSourceCount",
  "stockSheetGroups"
]);
const stockSheetGroupKeys = new Set([
  "groupId",
  "materialId",
  "thicknessMm",
  "sourcePartIds",
  "sheetCount",
  "pricePerSheetMinor",
  "stockSheetCostMinor",
  "currencyCode",
  "sourceReference"
]);
const catalogKeys = new Set(["catalogId", "version", "effectiveFrom", "effectiveTo"]);
const summaryKeys = new Set([
  "status",
  "currencyCode",
  "requiredLineCount",
  "pricedLineCount",
  "missingPrices",
  "missingTariffs",
  "diagnostics",
  "lineSources",
  "costSummary"
]);
const costSummaryKeys = new Set([
  "status",
  "currencyCode",
  "lineCount",
  "lines",
  "categoryTotalsMinor",
  "grandTotalMinor"
]);
const costLineKeys = new Set([
  "id",
  "category",
  "description",
  "quantity",
  "unit",
  "unitPriceMinor",
  "currencyCode",
  "sourceReference",
  "lineTotalMinor",
  "edgeDirection"
]);
const sourceKeys = new Set([
  "costLineId", "sourceType", "sourceId", "tariffId", "sourcePartIds",
  "hardwareId", "hardwareUnit", "hardwareFurnitureIds", "hardwareSourceReferences",
  "resourceType", "resourceId", "unit", "edgeDirection", "rollCount", "rollLengthMm",
  "purchasedLengthMm", "furnitureIds", "planSourceReference", "priceSourceReference"
]);
const hardwareMetadataKeys = new Set([
  "hardwareId", "hardwareUnit", "hardwareFurnitureIds", "hardwareSourceReferences"
]);
const requiredHardwareMetadataKeys = new Set([
  "hardwareId", "hardwareUnit", "hardwareFurnitureIds"
]);
const rollMetadataKeys = new Set([
  "rollCount", "rollLengthMm", "purchasedLengthMm", "furnitureIds",
  "planSourceReference", "priceSourceReference"
]);
const costCategories = ["material", "hardware", "labor", "operation", "waste", "profit"];
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;
const currencyPattern = /^[A-Z]{3}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Copies untrusted revision API input using data descriptors only.
 * Null-prototype records prevent inherited getters from participating in validation.
 */
function cloneRevisionInput(
  value: unknown,
  ancestors = new WeakSet<object>(),
  depth = 0
): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean" || value === undefined) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Teklif revizyon girdisi JSON uyumlu olmayan sayısal değer içeriyor.");
    return value;
  }
  if (typeof value !== "object") throw new Error("Teklif revizyon girdisi JSON uyumlu olmayan değer içeriyor.");
  if (depth >= 64) throw new Error("Teklif revizyon girdisi en fazla 64 iç içe nesne/dizi seviyesi içerebilir.");
  if (ancestors.has(value)) throw new Error("Teklif revizyon girdisi döngüsel veri içeriyor.");
  ancestors.add(value);

  let cloned: unknown;
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    const ownNames = Object.getOwnPropertyNames(value);
    if (
      Object.getPrototypeOf(value) !== Array.prototype ||
      Object.getOwnPropertySymbols(value).length !== 0 ||
      keys.length !== value.length ||
      ownNames.length !== value.length + 1
    ) throw new Error("Teklif revizyon girdisi JSON dışı dizi alanı içeriyor.");
    const copy: unknown[] = new Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new Error("Teklif revizyon girdisi JSON dışı dizi alanı içeriyor.");
      }
      Object.defineProperty(copy, String(index), {
        value: cloneRevisionInput(descriptor.value, ancestors, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    cloned = copy;
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Teklif revizyon girdisi düz JSON nesneleri içermelidir.");
    }
    const keys = Object.keys(value);
    if (Object.getOwnPropertyNames(value).length !== keys.length || Object.getOwnPropertySymbols(value).length !== 0) {
      throw new Error("Teklif revizyon girdisi JSON dışı nesne alanı içeriyor.");
    }
    const copy = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new Error("Teklif revizyon girdisi JSON dışı nesne alanı içeriyor.");
      }
      Object.defineProperty(copy, key, {
        value: cloneRevisionInput(descriptor.value, ancestors, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    cloned = copy;
  }
  ancestors.delete(value);
  return cloned;
}

function requireOnlyKeys(value: Record<string, unknown>, keys: Set<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) {
      throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
    }
  }
}

function requireText(value: unknown, label: string, maxLength: number): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim() !== value ||
    value.length > maxLength
  ) {
    throw new Error(label + " boş olmayan, kenar boşluğu içermeyen ve en fazla " + maxLength + " karakterlik metin olmalıdır.");
  }
  return value;
}

function requireIdentifier(value: unknown, label: string): string {
  const identifier = requireText(value, label, 128);
  if (!identifierPattern.test(identifier)) {
    throw new Error(label + " geçersiz.");
  }
  return identifier;
}

function requireEdgeDirection(value: unknown, label: string): ProjectCostLineEdgeDirection {
  if (value !== "top" && value !== "bottom" && value !== "left" && value !== "right") {
    throw new Error(label + " top, bottom, left veya right olmalıdır.");
  }
  return value;
}


function requireSafeInteger(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(label + " en az " + minimum + " olan güvenli bir tam sayı olmalıdır.");
  }
  return value;
}


function requireRollLengthTenths(value: unknown, label: string, maxMm?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || (maxMm !== undefined && value > maxMm)) {
    throw new Error(label + " pozitif, sonlu ve izin verilen mm sınırında olmalıdır.");
  }
  const tenths = Math.round(value * 10);
  if (!Number.isSafeInteger(tenths) || Math.abs(tenths / 10 - value) > 1e-8) {
    throw new Error(label + " en fazla 0.1 mm hassasiyetinde olmalıdır.");
  }
  return tenths;
}

function validateSortedIdentifiers(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10000) {
    throw new Error(label + " 1-10.000 arası kimlik içeren bir liste olmalıdır.");
  }
  let previous: string | undefined;
  for (const raw of value) {
    const id = requireIdentifier(raw, label + " kimliği");
    if (previous !== undefined && previous >= id) throw new Error(label + " sıralı ve benzersiz olmalıdır.");
    previous = id;
  }
}

function requireDateOnly(value: unknown, label: string): string {
  if (typeof value !== "string" || !datePattern.test(value) || value.startsWith("0000-")) {
    throw new Error(label + " YYYY-MM-DD biçiminde geçerli bir takvim tarihi olmalıdır.");
  }
  const parsed = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(label + " geçerli bir takvim tarihi olmalıdır.");
  }
  return value;
}

function requireDateTime(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(label + " saat dilimi içeren ISO 8601 tarih-saat olmalıdır.");
  }
  const match = dateTimePattern.exec(value);
  if (!match) {
    throw new Error(label + " saat dilimi içeren ISO 8601 tarih-saat olmalıdır.");
  }
  requireDateOnly(match[1], label + " tarihi");
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
  if (
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59 ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(label + " geçerli bir tarih-saat olmalıdır.");
  }
  return value;
}

function validateCatalogVersion(
  value: unknown,
  label: string,
  quotedOn: string
): void {
  if (!isRecord(value)) {
    throw new Error(label + " katalog sürümü nesnesi olmalıdır.");
  }
  requireOnlyKeys(value, catalogKeys, label);
  requireIdentifier(value.catalogId, label + " katalog kimliği");
  requireText(value.version, label + " sürümü", 64);
  const effectiveFrom = requireDateOnly(value.effectiveFrom, label + " başlangıç tarihi");
  const effectiveTo = value.effectiveTo === undefined
    ? undefined
    : requireDateOnly(value.effectiveTo, label + " bitiş tarihi");
  if (effectiveTo !== undefined && effectiveTo < effectiveFrom) {
    throw new Error(label + " bitiş tarihi başlangıç tarihinden önce olamaz.");
  }
  if (quotedOn < effectiveFrom || (effectiveTo !== undefined && quotedOn > effectiveTo)) {
    throw new Error(label + " sürümü teklif tarihinde geçerli değildir.");
  }
}

function validateQuoteSummary(value: unknown, strictSourceIntegrity = false, allowEmpty = false): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("Teklif snapshot özeti geçerli bir nesne olmalıdır.");
  }
  requireOnlyKeys(value, summaryKeys, "Teklif snapshot özeti");
  if (value.status === "empty" && allowEmpty) {
    const requiredLineCount = requireSafeInteger(value.requiredLineCount, "Boş teklif gerekli satır sayısı", 0);
    const pricedLineCount = requireSafeInteger(value.pricedLineCount, "Boş teklif fiyatlı satır sayısı", 0);
    if (
      value.currencyCode !== null ||
      requiredLineCount !== 0 ||
      pricedLineCount !== 0 ||
      !Array.isArray(value.missingPrices) || value.missingPrices.length !== 0 ||
      !Array.isArray(value.missingTariffs) || value.missingTariffs.length !== 0 ||
      !Array.isArray(value.diagnostics) || value.diagnostics.length !== 0 ||
      !Array.isArray(value.lineSources) || value.lineSources.length !== 0 ||
      value.costSummary !== null
    ) {
      throw new Error("Boş teklif snapshot'ı sıfır satır, para birimi olmayan ve maliyet özeti bulunmayan tutarlı bir zarf olmalıdır.");
    }
    return;
  }
  if (value.status !== "ready") {
    throw new Error("Yalnızca hazır teklif maliyet snapshot'ı revizyona alınabilir.");
  }
  const currencyCode = requireText(value.currencyCode, "Teklif para birimi", 3);
  if (!currencyPattern.test(currencyCode)) {
    throw new Error("Teklif para birimi üç büyük harfli kod olmalıdır.");
  }
  const requiredLineCount = requireSafeInteger(value.requiredLineCount, "Gerekli teklif satırı", 1);
  const pricedLineCount = requireSafeInteger(value.pricedLineCount, "Fiyatlanmış teklif satırı", 1);
  if (pricedLineCount !== requiredLineCount) {
    throw new Error("Teklif snapshot'ında tüm gerekli satırlar fiyatlanmış olmalıdır.");
  }
  if (
    !Array.isArray(value.missingPrices) ||
    value.missingPrices.length !== 0 ||
    !Array.isArray(value.missingTariffs) ||
    value.missingTariffs.length !== 0 ||
    !Array.isArray(value.diagnostics) ||
    value.diagnostics.length !== 0
  ) {
    throw new Error("Hazır teklif snapshot'ı eksik fiyat, tarife veya tanı içermemelidir.");
  }
  if (!Array.isArray(value.lineSources) || value.lineSources.length !== requiredLineCount) {
    throw new Error("Teklif snapshot kaynak eşlemesi satır sayısıyla uyuşmuyor.");
  }
  if (!isRecord(value.costSummary)) {
    throw new Error("Teklif snapshot maliyet özeti bulunamadı.");
  }

  const costSummary = value.costSummary;
  requireOnlyKeys(costSummary, costSummaryKeys, "Maliyet özeti");
  if (
    costSummary.status !== "ready" ||
    costSummary.currencyCode !== currencyCode ||
    costSummary.lineCount !== requiredLineCount ||
    !Array.isArray(costSummary.lines) ||
    costSummary.lines.length !== requiredLineCount ||
    !isRecord(costSummary.categoryTotalsMinor)
  ) {
    throw new Error("Teklif snapshot maliyet satırları veya para birimi tutarlı değil.");
  }

  const categoryTotals = costSummary.categoryTotalsMinor;
  if (
    Object.keys(categoryTotals).length !== costCategories.length ||
    costCategories.some((category) => !Object.prototype.hasOwnProperty.call(categoryTotals, category))
  ) {
    throw new Error("Maliyet kategori toplamları eksik veya desteklenmeyen alan içeriyor.");
  }

  const categorySums = new Map<string, bigint>(costCategories.map((category) => [category, 0n]));
  const lineIds = new Set<string>();
  const sourceIdentities = new Set<string>();
  let lineTotalSum = 0n;

  for (let index = 0; index < requiredLineCount; index += 1) {
    const line = costSummary.lines[index];
    const source = value.lineSources[index];
    if (!isRecord(line) || !isRecord(source)) {
      throw new Error("Teklif snapshot satırları geçerli nesneler olmalıdır.");
    }
    requireOnlyKeys(line, costLineKeys, "Maliyet satırı");
    requireOnlyKeys(source, sourceKeys, "Teklif kaynak eşlemesi");

    const lineId = requireIdentifier(line.id, "Maliyet satırı kimliği");
    if (lineIds.has(lineId)) {
      throw new Error("Teklif snapshot maliyet satırı kimlikleri yinelenemez.");
    }
    lineIds.add(lineId);

    const edgeDirection = line.edgeDirection === undefined
      ? undefined
      : requireEdgeDirection(line.edgeDirection, "Maliyet satırı kenar yönü");
    if (edgeDirection !== undefined && line.category !== "material") {
      throw new Error("Kenar yönü yalnızca material maliyet satırlarında kullanılabilir.");
    }
    if (
      line.currencyCode !== currencyCode ||
      typeof line.category !== "string" ||
      !costCategories.includes(line.category) ||
      typeof line.description !== "string" ||
      line.description.trim() === "" ||
      typeof line.unit !== "string" ||
      line.unit.trim() === "" ||
      typeof line.quantity !== "number" ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0
    ) {
      throw new Error("Teklif snapshot maliyet satırı alanları geçersiz.");
    }

    const unitPriceMinor = requireSafeInteger(line.unitPriceMinor, "Birim fiyat", 0);
    const lineTotalMinor = requireSafeInteger(line.lineTotalMinor, "Satır toplamı", 0);
    const expectedLineTotalMinor = calculateProjectCostLineTotalMinor(
      line.quantity,
      unitPriceMinor,
      "Teklif snapshot satırı " + lineId
    );
    if (lineTotalMinor !== expectedLineTotalMinor) {
      throw new Error("Teklif snapshot satır toplamı miktar ve birim fiyatın yarım-yukarı yuvarlanmış sonucuyla uyuşmuyor.");
    }
    lineTotalSum += BigInt(lineTotalMinor);
    categorySums.set(line.category, (categorySums.get(line.category) ?? 0n) + BigInt(lineTotalMinor));

    if (source.costLineId !== lineId) {
      throw new Error("Teklif kaynak eşlemesi maliyet satırı kimliğiyle uyuşmuyor.");
    }
    const sourceId = requireIdentifier(source.sourceId, "Teklif kaynak kimliği");
    if (source.sourceType !== "production-consumption" && source.sourceType !== "labor-operation" && source.sourceType !== "quote-adjustment") {
      throw new Error("Teklif kaynak türü desteklenmiyor.");
    }
    if (line.unit === "rulo" && source.resourceType !== "edge-banding") {
      throw new Error("Rulo birimi yalnızca edge-banding kaynaklı material satırlarında kullanılabilir.");
    }
    if (edgeDirection !== undefined && source.sourceType !== "production-consumption") {
      throw new Error("Kenar yönü yalnızca üretim tüketimi satırlarında kullanılabilir.");
    }
    if (edgeDirection !== undefined && (!Array.isArray(source.sourcePartIds) || source.sourcePartIds.length === 0)) {
      throw new Error("Yönlü kenar bandı satırı kaynak Part kimlikleriyle eşleşmelidir.");
    }
    if (source.resourceType !== undefined) {
      if (source.sourceType !== "production-consumption") {
        throw new Error("Kaynak malzeme/kenar bandı kimliği yalnızca üretim tüketimi satırlarında kullanılabilir.");
      }
      if (source.resourceType !== "material" && source.resourceType !== "edge-banding") {
        throw new Error("Teklif kaynak malzeme türü desteklenmiyor.");
      }
      requireIdentifier(source.resourceId, "Teklif kaynak malzeme kimliği");
      const unit = requireText(source.unit, "Teklif kaynak malzeme birimi", 32);
      if (unit !== line.unit) {
        throw new Error("Teklif kaynak malzeme birimi maliyet satırı birimiyle uyuşmuyor.");
      }
      const sourceEdgeDirection = source.edgeDirection === undefined
        ? undefined
        : requireEdgeDirection(source.edgeDirection, "Teklif kaynak kenar yönü");
      const hasRollMetadata = [...rollMetadataKeys].some(key =>
        Object.prototype.hasOwnProperty.call(source, key)
      );
      if (source.resourceType === "material") {
        if (line.category !== "material" || unit !== "m2" || edgeDirection !== undefined || sourceEdgeDirection !== undefined || hasRollMetadata) {
          throw new Error("Panel malzeme kaynak kimliği m2 birimiyle, yön ve rulo metadata olmadan eşleşmelidir.");
        }
        if (strictSourceIntegrity && (!Array.isArray(source.sourcePartIds) || source.sourcePartIds.length === 0)) {
          throw new Error("Panel malzeme kaynak Part kimlikleriyle eşleşmelidir.");
        }
      } else if (unit === "rulo") {
        if (line.category !== "material" || edgeDirection !== undefined || sourceEdgeDirection !== undefined) {
          throw new Error("Rulo kenar bandı satırı yön taşımayan material maliyet satırı olmalıdır.");
        }
        const rollCount = requireSafeInteger(source.rollCount, "Kenar bandı rulo adedi", 1);
        const rollLengthTenths = requireRollLengthTenths(source.rollLengthMm, "Kenar bandı rulo uzunluğu", 10_000_000);
        const purchasedLengthTenths = requireRollLengthTenths(source.purchasedLengthMm, "Kenar bandı satın alınan uzunluğu");
        if (line.quantity !== rollCount) {
          throw new Error("Kenar bandı rulo adedi maliyet satırı quantity değeriyle uyuşmalıdır.");
        }
        const expectedPurchasedLengthTenths = rollLengthTenths * rollCount;
        if (!Number.isSafeInteger(expectedPurchasedLengthTenths) || purchasedLengthTenths !== expectedPurchasedLengthTenths) {
          throw new Error("Kenar bandı satın alınan uzunluğu rulo adedi ve rulo uzunluğuyla uyuşmuyor.");
        }
        if (!Array.isArray(source.sourcePartIds) || source.sourcePartIds.length === 0) {
          throw new Error("Rulo kenar bandı kaynak Part kimlikleriyle eşleşmelidir.");
        }
        validateSortedIdentifiers(source.furnitureIds, "Rulo kenar bandı mobilya kimlikleri");
        if (source.planSourceReference !== undefined) requireText(source.planSourceReference, "Rulo plan kaynak referansı", 256);
        if (source.priceSourceReference !== undefined) requireText(source.priceSourceReference, "Rulo fiyat kaynak referansı", 256);
      } else {
        if (
          line.category !== "material" ||
          (unit !== "mm" && unit !== "m") ||
          sourceEdgeDirection !== edgeDirection
        ) {
          throw new Error("Teklif kenar bandı kaynak kimliği, birim veya yön alanları tutarsız.");
        }
        if (hasRollMetadata) {
          throw new Error("Rulo metadata yalnızca rulo birimli kenar bandı satırlarında kullanılmalıdır.");
        }
      }
    } else if (
      source.resourceId !== undefined ||
      source.unit !== undefined ||
      source.edgeDirection !== undefined ||
      [...rollMetadataKeys].some(key => Object.prototype.hasOwnProperty.call(source, key))
    ) {
      throw new Error("Teklif kaynak metadata alanları resourceType ile birlikte kullanılmalıdır.");
    }

    const hasHardwareMetadata = [...hardwareMetadataKeys].some(key =>
      Object.prototype.hasOwnProperty.call(source, key)
    );
    if (hasHardwareMetadata) {
      if (line.category !== "hardware" || source.sourceType !== "production-consumption") {
        throw new Error("Donanım BOM metadata yalnızca production-consumption hardware satırlarında kullanılabilir.");
      }
      if ([...requiredHardwareMetadataKeys].some(key => !Object.prototype.hasOwnProperty.call(source, key))) {
        throw new Error("Donanım BOM metadata kimlik, birim ve mobilya kimliklerini birlikte içermelidir.");
      }
      requireIdentifier(source.hardwareId, "Teklif donanım kimliği");
      const hardwareUnit = requireText(source.hardwareUnit, "Teklif donanım birimi", 32);
      if (hardwareUnit !== line.unit) {
        throw new Error("Teklif donanım birimi maliyet satırı birimiyle uyuşmalıdır.");
      }
      validateSortedIdentifiers(source.hardwareFurnitureIds, "Teklif donanım mobilya kimlikleri");
      if (source.hardwareSourceReferences !== undefined) {
        validateSortedIdentifiers(source.hardwareSourceReferences, "Teklif donanım BOM kaynak referansları");
      }
    }

    if (strictSourceIntegrity) {
      const allowedCategories = source.sourceType === "production-consumption"
        ? ["material", "hardware"]
        : source.sourceType === "labor-operation"
          ? ["labor", "operation"]
          : ["waste", "profit"];
      if (!allowedCategories.includes(line.category)) {
        throw new Error("Teklif kaynak türü maliyet kategorisiyle uyuşmuyor.");
      }
      const sourceIdentity = JSON.stringify([source.sourceType, sourceId]);
      if (sourceIdentities.has(sourceIdentity)) {
        throw new Error("Teklif snapshot kaynak satırı eşlemesi yinelenemez: " + sourceIdentity + ".");
      }
      sourceIdentities.add(sourceIdentity);
      if (source.sourceType === "production-consumption" && line.category === "material" && source.sourcePartIds === undefined) {
        throw new Error("Üretim tüketimi malzeme satırı kaynak Part kimlikleriyle eşleşmelidir.");
      }
    }
    if (source.sourcePartIds !== undefined) {
      if (source.sourceType !== "production-consumption") {
        throw new Error("Kaynak Part kimlikleri yalnızca üretim tüketimi satırlarına eklenebilir.");
      }
      if (!Array.isArray(source.sourcePartIds) || source.sourcePartIds.length === 0) {
        throw new Error("Kaynak Part kimlikleri boş olmayan bir liste olmalıdır.");
      }
      let previousPartId: string | undefined;
      for (const rawPartId of source.sourcePartIds) {
        const partId = requireIdentifier(rawPartId, "Teklif kaynak Part kimliği");
        if (previousPartId !== undefined && previousPartId >= partId) {
          throw new Error("Teklif kaynak Part kimlikleri sıralı ve benzersiz olmalıdır.");
        }
        previousPartId = partId;
      }
    }
    if (source.sourceType === "labor-operation") {
      requireIdentifier(source.tariffId, "Tarife kimliği");
    } else if (source.tariffId !== undefined) {
      throw new Error("Tarife kullanmayan kaynak tarife kimliği taşıyamaz.");
    }
    if (source.sourceType === "quote-adjustment") {
      if (line.category !== "waste" && line.category !== "profit") {
        throw new Error("Teklif ek maliyet kaynağı yalnızca fire veya kâr kategorisini kullanabilir.");
      }
      requireText(line.sourceReference, "Fire/kâr kaynak referansı", 256);
    } else if (line.category === "waste" || line.category === "profit") {
      throw new Error("Fire/kâr maliyet satırı teklif ek maliyet kaynağına bağlı olmalıdır.");
    }
  }

  const grandTotalMinor = requireSafeInteger(costSummary.grandTotalMinor, "Genel teklif toplamı", 0);
  if (lineTotalSum !== BigInt(grandTotalMinor)) {
    throw new Error("Teklif satır toplamları genel toplamla uyuşmuyor.");
  }
  let categoryTotalSum = 0n;
  for (const category of costCategories) {
    const total = requireSafeInteger(categoryTotals[category], category + " kategori toplamı", 0);
    if (categorySums.get(category) !== BigInt(total)) {
      throw new Error("Teklif kategori toplamı satırlarıyla uyuşmuyor: " + category + ".");
    }
    categoryTotalSum += BigInt(total);
  }
  if (categoryTotalSum !== BigInt(grandTotalMinor)) {
    throw new Error("Teklif kategori toplamları genel toplamla uyuşmuyor.");
  }
}


function validateMaterialCostBasisSnapshot(value: unknown, quoteSummary: Record<string, unknown>): void {
  if (!isRecord(value)) throw new Error("Teklif malzeme maliyet temeli snapshot nesnesi olmalıdır.");
  requireOnlyKeys(value, materialCostBasisKeys, "Teklif malzeme maliyet temeli snapshot'ı");
  if (value.schemaVersion !== 1) throw new Error("Desteklenmeyen teklif malzeme maliyet temeli snapshot sürümü.");
  if (value.basis !== "net-consumption" && value.basis !== "stock-sheet-purchase") {
    throw new Error("Teklif malzeme maliyet temeli net-consumption veya stock-sheet-purchase olmalıdır.");
  }
  const basis = value.basis;
  const currencyCode = requireText(value.currencyCode, "Panel maliyet snapshot para birimi", 3);
  if (!currencyPattern.test(currencyCode)) throw new Error("Panel maliyet snapshot para birimi üç büyük harfli kod olmalıdır.");
  const panelCost = requireSafeInteger(value.panelMaterialCostMinor, "Snapshot panel malzeme maliyeti", 0);
  const edgeCost = requireSafeInteger(value.edgeBandingCostMinor, "Snapshot kenar bandı maliyeti", 0);
  const materialTotal = requireSafeInteger(value.materialCategoryTotalMinor, "Snapshot material kategori toplamı", 0);
  const grandTotal = requireSafeInteger(value.grandTotalMinor, "Snapshot teklif genel toplamı", 0);
  const sourceCount = requireSafeInteger(value.materialSourceCount, "Snapshot malzeme kaynak sayısı", 0);
  if (BigInt(panelCost) + BigInt(edgeCost) !== BigInt(materialTotal)) {
    throw new Error("Snapshot panel ve kenar bandı maliyetleri material kategori toplamıyla eşleşmiyor.");
  }
  if (!isRecord(value.categoryTotalsMinor)) throw new Error("Snapshot kategori toplamları geçerli bir nesne olmalıdır.");
  const categoryTotals = value.categoryTotalsMinor;
  if (
    Object.keys(categoryTotals).length !== costCategories.length ||
    costCategories.some(category => !Object.prototype.hasOwnProperty.call(categoryTotals, category))
  ) {
    throw new Error("Snapshot kategori toplamları eksik veya desteklenmeyen alan içeriyor.");
  }
  let categoryGrandTotal = 0n;
  const normalizedCategoryTotals = new Map<string, number>();
  for (const category of costCategories) {
    const amount = requireSafeInteger(categoryTotals[category], category + " snapshot kategori toplamı", 0);
    normalizedCategoryTotals.set(category, amount);
    categoryGrandTotal += BigInt(amount);
  }
  if (normalizedCategoryTotals.get("material") !== materialTotal || categoryGrandTotal !== BigInt(grandTotal)) {
    throw new Error("Snapshot material kategori veya genel toplamı diğer kategori toplamlarıyla uyuşmuyor.");
  }

  if (!Array.isArray(value.stockSheetGroups) || value.stockSheetGroups.length > 10000) {
    throw new Error("Snapshot levha satın alma grupları 0-10.000 arası bir liste olmalıdır.");
  }
  const groups = value.stockSheetGroups;
  if (basis === "net-consumption" && groups.length !== 0) {
    throw new Error("Net tüketim snapshot'ı levha satın alma grubu içeremez.");
  }
  if (basis === "stock-sheet-purchase" && groups.length !== sourceCount) {
    throw new Error("Levha satın alma snapshot grup sayısı kaynak sayısıyla eşleşmiyor.");
  }

  const groupIds = new Set<string>();
  const partIds = new Set<string>();
  let groupCostTotal = 0n;
  let previousGroupId: string | undefined;
  let totalSheetCount = 0;
  for (const [index, rawGroup] of groups.entries()) {
    if (!isRecord(rawGroup)) throw new Error("Snapshot levha satın alma " + (index + 1) + ". grubu geçersiz.");
    requireOnlyKeys(rawGroup, stockSheetGroupKeys, "Snapshot levha satın alma grubu");
    const groupId = requireText(rawGroup.groupId, "Snapshot levha grup kimliği", 512);
    if (groupIds.has(groupId) || (previousGroupId !== undefined && previousGroupId >= groupId)) {
      throw new Error("Snapshot levha grupları kimliğe göre sıralı ve benzersiz olmalıdır.");
    }
    groupIds.add(groupId);
    previousGroupId = groupId;
    const materialId = requireText(rawGroup.materialId, groupId + " malzeme kimliği", 240);
    const thicknessTicks = requireRollLengthTenths(rawGroup.thicknessMm, groupId + " mm kalınlığı");
    if (groupId !== JSON.stringify([materialId, thicknessTicks])) {
      throw new Error(groupId + " grup kimliği malzeme ve normalize mm kalınlığıyla uyuşmuyor.");
    }
    const sheetCount = requireSafeInteger(rawGroup.sheetCount, groupId + " levha adedi", 1);
    const unitPrice = requireSafeInteger(rawGroup.pricePerSheetMinor, groupId + " levha birim fiyatı", 0);
    const groupCost = requireSafeInteger(rawGroup.stockSheetCostMinor, groupId + " levha satın alma maliyeti", 0);
    if (BigInt(sheetCount) * BigInt(unitPrice) !== BigInt(groupCost)) {
      throw new Error(groupId + " snapshot satın alma maliyeti levha adedi × birim fiyatla eşleşmiyor.");
    }
    totalSheetCount += sheetCount;
    if (!Number.isSafeInteger(totalSheetCount)) throw new Error("Snapshot toplam levha adedi güvenli tam sayı aralığını aşıyor.");
    const groupCurrency = requireText(rawGroup.currencyCode, groupId + " para birimi", 3);
    if (!currencyPattern.test(groupCurrency) || groupCurrency !== currencyCode) {
      throw new Error(groupId + " para birimi panel maliyet snapshot'ıyla eşleşmiyor.");
    }
    validateSortedIdentifiers(rawGroup.sourcePartIds, groupId + " kaynak Part kimlikleri");
    for (const partId of rawGroup.sourcePartIds as string[]) {
      if (partIds.has(partId)) throw new Error("Snapshot kaynak Part kimliği gruplar arasında yineleniyor: " + partId + ".");
      partIds.add(partId);
    }
    if (rawGroup.sourceReference !== undefined) requireText(rawGroup.sourceReference, groupId + " fiyat kaynak referansı", 240);
    groupCostTotal += BigInt(groupCost);
  }
  if (basis === "stock-sheet-purchase" && groupCostTotal !== BigInt(panelCost)) {
    throw new Error("Snapshot levha satın alma grup maliyetleri panel malzeme toplamıyla eşleşmiyor.");
  }

  const lineSources = quoteSummary.lineSources as Array<Record<string, unknown>>;
  const costSummary = isRecord(quoteSummary.costSummary) ? quoteSummary.costSummary : null;
  const linesById = new Map<string, Record<string, unknown>>();
  if (costSummary !== null && Array.isArray(costSummary.lines)) {
    for (const line of costSummary.lines) {
      if (isRecord(line) && typeof line.id === "string") linesById.set(line.id, line);
    }
  }
  let panelLineTotal = 0n;
  let edgeLineTotal = 0n;
  let panelLineCount = 0;
  for (const source of lineSources) {
    const line = linesById.get(source.costLineId as string);
    if (line === undefined) throw new Error("Panel maliyet snapshot kaynak satırı maliyet kaydında bulunamadı.");
    if (source.resourceType === "material") {
      panelLineTotal += BigInt(requireSafeInteger(line.lineTotalMinor, "Panel maliyet satırı", 0));
      panelLineCount += 1;
    } else if (source.resourceType === "edge-banding") {
      edgeLineTotal += BigInt(requireSafeInteger(line.lineTotalMinor, "Kenar bandı maliyet satırı", 0));
    }
  }
  if (edgeLineTotal !== BigInt(edgeCost)) {
    throw new Error("Snapshot kenar bandı maliyeti teklif satırlarıyla eşleşmiyor.");
  }

  if (basis === "net-consumption") {
    if (
      quoteSummary.status !== "ready" ||
      panelLineCount !== sourceCount ||
      panelLineTotal !== BigInt(panelCost) ||
      quoteSummary.currencyCode !== currencyCode ||
      costSummary === null
    ) {
      throw new Error("Net tüketim snapshot'ı panel kaynakları, para birimi ve teklif satırlarıyla eşleşmiyor.");
    }
    const baseTotals = costSummary.categoryTotalsMinor as Record<string, number>;
    for (const category of costCategories) {
      if (normalizedCategoryTotals.get(category) !== baseTotals[category]) {
        throw new Error("Net tüketim snapshot kategori toplamı teklif satırlarıyla eşleşmiyor: " + category + ".");
      }
    }
    if (grandTotal !== costSummary.grandTotalMinor) {
      throw new Error("Net tüketim snapshot genel toplamı teklif satırlarıyla eşleşmiyor.");
    }
  } else {
    if (panelLineCount !== 0 || panelLineTotal !== 0n) {
      throw new Error("Levha satın alma snapshot'ı aynı teklifte net panel tüketim satırı içeremez.");
    }
    if (quoteSummary.status === "ready") {
      if (costSummary === null || quoteSummary.currencyCode !== currencyCode) {
        throw new Error("Levha satın alma snapshot'ı temel teklif para birimiyle eşleşmiyor.");
      }
      const baseTotals = costSummary.categoryTotalsMinor as Record<string, number>;
      if (baseTotals.material !== edgeCost) {
        throw new Error("Levha satın alma snapshot temel material toplamı yalnızca kenar bandını içermelidir.");
      }
      for (const category of costCategories) {
        if (category !== "material" && normalizedCategoryTotals.get(category) !== baseTotals[category]) {
          throw new Error("Levha satın alma snapshot kategori toplamı temel teklif satırlarıyla eşleşmiyor: " + category + ".");
        }
      }
      if (BigInt(costSummary.grandTotalMinor as number) + BigInt(panelCost) !== BigInt(grandTotal)) {
        throw new Error("Levha satın alma snapshot genel toplamı panel satın alma maliyetiyle eşleşmiyor.");
      }
    } else if (
      quoteSummary.status !== "empty" ||
      edgeCost !== 0 ||
      costSummary !== null ||
      costCategories.some(category => category !== "material" && normalizedCategoryTotals.get(category) !== 0) ||
      grandTotal !== panelCost
    ) {
      throw new Error("Boş temel teklifli levha satın alma snapshot'ı yalnızca panel satın alma maliyetini içerebilir.");
    }
  }
}

function validatePricingSnapshot(value: unknown, strictSourceIntegrity = false): asserts value is ProjectQuotePricingSnapshot {
  if (!isRecord(value)) {
    throw new Error("Teklif fiyat snapshot'ı geçerli bir nesne olmalıdır.");
  }
  requireOnlyKeys(value, snapshotKeys, "Teklif fiyat snapshot'ı");
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) {
    throw new Error("Desteklenmeyen teklif fiyat snapshot sürümü.");
  }
  const hasMaterialCostBasis = Object.prototype.hasOwnProperty.call(value, "materialCostBasis");
  if ((value.schemaVersion === 1 && hasMaterialCostBasis) || (value.schemaVersion === 2 && !hasMaterialCostBasis)) {
    throw new Error("Teklif fiyat snapshot sürümü materialCostBasis alanıyla tutarlı olmalıdır.");
  }
  const quotedOn = requireDateOnly(value.quotedOn, "Teklif tarihi");
  const quoteSummary = value.quoteSummary;
  validateQuoteSummary(quoteSummary, strictSourceIntegrity, value.schemaVersion === 2);
  const lineSources = quoteSummary.lineSources as Array<Record<string, unknown>>;

  if (value.consumptionPriceList === null) {
    if (lineSources.some((line) => line.sourceType === "production-consumption")) {
      throw new Error("Üretim tüketimi satırı olan snapshot fiyat listesi sürümü içermelidir.");
    }
  } else {
    validateCatalogVersion(value.consumptionPriceList, "Fiyat listesi", quotedOn);
  }

  if (value.laborOperationTariffList === null) {
    if (lineSources.some((line) => line.sourceType === "labor-operation")) {
      throw new Error("İşçilik/operasyon satırı olan snapshot tarife listesi sürümü içermelidir.");
    }
  } else {
    validateCatalogVersion(value.laborOperationTariffList, "Tarife listesi", quotedOn);
  }
  if (value.schemaVersion === 2) validateMaterialCostBasisSnapshot(value.materialCostBasis, quoteSummary);
}

function cloneJsonValue(value: unknown, seen = new Set<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Teklif snapshot'ı sonlu olmayan sayı içeremez.");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new Error("Teklif snapshot'ı döngüsel veri içeremez.");
    }
    seen.add(value);
    const clone = value.map((item) => cloneJsonValue(item, seen));
    seen.delete(value);
    return clone;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Teklif snapshot'ı yalnızca JSON uyumlu nesneler içerebilir.");
    }
    if (seen.has(value)) {
      throw new Error("Teklif snapshot'ı döngüsel veri içeremez.");
    }
    seen.add(value);
    const clone: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        throw new Error("Teklif snapshot'ı güvenli olmayan nesne anahtarı içeremez.");
      }
      clone[key] = cloneJsonValue(child, seen);
    }
    seen.delete(value);
    return clone;
  }
  throw new Error("Teklif snapshot'ı JSON uyumlu olmayan değer içeriyor.");
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

function validatePreviousRevision(value: unknown): ProjectQuoteRevisionReference {
  if (!isRecord(value)) {
    throw new Error("Önceki revizyon referansı geçerli bir nesne olmalıdır.");
  }
  requireOnlyKeys(value, referenceKeys, "Önceki revizyon referansı");
  return {
    projectId: requireIdentifier(value.projectId, "Önceki revizyon proje kimliği"),
    revisionId: requireIdentifier(value.revisionId, "Önceki revizyon kimliği"),
    revisionNumber: requireSafeInteger(value.revisionNumber, "Önceki revizyon numarası", 1),
    createdAt: requireDateTime(value.createdAt, "Önceki revizyon tarihi")
  };
}

function blocked(message: string): ProjectQuoteRevisionResult {
  return deepFreeze({
    status: "blocked" as const,
    revision: null,
    diagnostics: [message]
  });
}

/**
 * Creates an immutable revision envelope around a ready pricing snapshot.
 * The caller supplies all identifiers and timestamps; no ID, date, price,
 * currency conversion or catalogue version is inferred.
 */
function createProjectQuoteRevisionWithSourceIntegrity(value: unknown): ProjectQuoteRevisionResult {
  if (!isRecord(value)) {
    return blocked("Teklif revizyon girdisi geçerli bir nesne olmalıdır.");
  }

  try {
    requireOnlyKeys(value, inputKeys, "Teklif revizyon girdisi");
    const rawSourceIntegrityVersion = value.sourceIntegrityVersion;
    if (rawSourceIntegrityVersion !== undefined && rawSourceIntegrityVersion !== 1) {
      throw new Error("Teklif revizyon girdisi desteklenen sourceIntegrityVersion değerini kullanmalıdır.");
    }
    const sourceIntegrityVersion: 1 | undefined =
      rawSourceIntegrityVersion === 1 ? 1 : undefined;
    if (!Object.prototype.hasOwnProperty.call(value, "previousRevision")) {
      throw new Error("Önceki revizyon alanı ilk revizyonda null olarak açıkça sağlanmalıdır.");
    }

    const projectId = requireIdentifier(value.projectId, "Proje kimliği");
    const revisionId = requireIdentifier(value.revisionId, "Revizyon kimliği");
    const revisionNumber = requireSafeInteger(value.revisionNumber, "Revizyon numarası", 1);
    const createdAt = requireDateTime(value.createdAt, "Revizyon oluşturulma tarihi");

    const previousRevision = value.previousRevision === null
      ? null
      : validatePreviousRevision(value.previousRevision);

    let previousRevisionId: string | null = null;
    if (previousRevision === null) {
      if (revisionNumber !== 1) {
        throw new Error("Önceki revizyonu olmayan ilk teklif revizyonunun numarası 1 olmalıdır.");
      }
    } else {
      if (previousRevision.projectId !== projectId) {
        throw new Error("Önceki revizyon aynı proje kimliğine ait olmalıdır.");
      }
      if (previousRevision.revisionId === revisionId) {
        throw new Error("Yeni revizyon kimliği önceki revizyon kimliğinden farklı olmalıdır.");
      }
      if (
        previousRevision.revisionNumber >= Number.MAX_SAFE_INTEGER ||
        revisionNumber !== previousRevision.revisionNumber + 1
      ) {
        throw new Error("Revizyon numarası önceki revizyondan tam olarak bir fazla olmalıdır.");
      }
      if (Date.parse(createdAt) <= Date.parse(previousRevision.createdAt)) {
        throw new Error("Yeni revizyon tarihi önceki revizyon tarihinden sonra olmalıdır.");
      }
      previousRevisionId = previousRevision.revisionId;
    }

    validatePricingSnapshot(value.pricingSnapshot, sourceIntegrityVersion === 1);
    const clonedSnapshot = cloneJsonValue(value.pricingSnapshot) as ProjectQuotePricingSnapshot;
    const revision = deepFreeze({
      schemaVersion: 1 as const,
      ...(sourceIntegrityVersion === undefined ? {} : { sourceIntegrityVersion }),
      projectId,
      revisionId,
      revisionNumber,
      createdAt,
      previousRevisionId,
      pricingSnapshot: deepFreeze(clonedSnapshot)
    });

    return deepFreeze({
      status: "ready" as const,
      revision,
      diagnostics: []
    });
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }
}

export function createProjectQuoteRevision(value: unknown): ProjectQuoteRevisionResult {
  try {
    return createProjectQuoteRevisionWithSourceIntegrity(cloneRevisionInput(value));
  } catch (error) {
    return blocked(error instanceof Error ? error.message : String(error));
  }
}

function blockedHistory(message: string): ProjectQuoteRevisionHistoryResult {
  return deepFreeze({ status: "blocked" as const, history: null, diagnostics: [message] });
}

/**
 * Rejects an oversized own revision array before recursively copying its entries.
 * Descriptor reads avoid invoking an accessor-backed `revisions` property.
 * Proxy reflection traps are not suppressed by this check.
 */
function rejectExcessiveRevisionHistoryBeforeClone(value: Record<string, unknown>): void {
  const revisionsDescriptor = Object.getOwnPropertyDescriptor(value, "revisions");
  if (!revisionsDescriptor || !revisionsDescriptor.enumerable || !("value" in revisionsDescriptor)) return;
  const revisions = revisionsDescriptor.value;
  if (!Array.isArray(revisions)) return;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(revisions, "length");
  const length = lengthDescriptor && "value" in lengthDescriptor ? lengthDescriptor.value : undefined;
  if (
    typeof length === "number" &&
    Number.isSafeInteger(length) &&
    length > PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS
  ) {
    throw new Error(
      "Teklif revizyon geçmişi en fazla " + PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS + " revizyon içerebilir."
    );
  }
}


/**
 * Rejects an append that would exceed the revision cap before validating/copying
 * the existing entries or reading the incoming revision payload.
 */
function rejectFullRevisionHistoryBeforeAppend(value: unknown): void {
  if (!isRecord(value)) return;
  const revisionsDescriptor = Object.getOwnPropertyDescriptor(value, "revisions");
  if (!revisionsDescriptor || !revisionsDescriptor.enumerable || !("value" in revisionsDescriptor)) return;
  const revisions = revisionsDescriptor.value;
  if (!Array.isArray(revisions)) return;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(revisions, "length");
  const length = lengthDescriptor && "value" in lengthDescriptor ? lengthDescriptor.value : undefined;
  if (
    typeof length === "number" &&
    Number.isSafeInteger(length) &&
    length >= PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS
  ) {
    throw new Error(
      "Teklif revizyon geçmişi en fazla " + PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS + " revizyon içerebilir."
    );
  }
}

/**
 * Validates an append-only quote revision history for one project.
 * The supplied order is authoritative: revisions are never sorted or repaired.
 */
export function validateProjectQuoteRevisionHistory(value: unknown): ProjectQuoteRevisionHistoryResult {
  if (!isRecord(value)) return blockedHistory("Teklif revizyon geçmişi geçerli bir nesne olmalıdır.");
  try {
    rejectExcessiveRevisionHistoryBeforeClone(value);
    const safeValue = cloneRevisionInput(value);
    if (!isRecord(safeValue)) throw new Error("Teklif revizyon geçmişi geçerli bir nesne olmalıdır.");
    requireOnlyKeys(safeValue, historyInputKeys, "Teklif revizyon geçmişi");
    if (safeValue.schemaVersion !== undefined && safeValue.schemaVersion !== 1) {
      throw new Error("Teklif revizyon geçmişi desteklenen şema sürümünü kullanmalıdır.");
    }
    const projectId = requireIdentifier(safeValue.projectId, "Geçmiş proje kimliği");
    if (!Array.isArray(safeValue.revisions)) throw new Error("Teklif revizyon geçmişi revisions dizisi içermelidir.");
    if (safeValue.revisions.length > PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS) {
      throw new Error(
        "Teklif revizyon geçmişi en fazla " + PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS + " revizyon içerebilir."
      );
    }
    if (safeValue.revisions.length === 0) {
      return deepFreeze({
        status: "empty" as const,
        history: { schemaVersion: 1 as const, projectId, revisions: [] },
        diagnostics: []
      });
    }
    const revisionIds = new Set<string>();
    const revisions: DeepReadonly<ProjectQuoteRevision>[] = [];
    for (let index = 0; index < safeValue.revisions.length; index += 1) {
      const candidate = safeValue.revisions[index];
      const label = "Revizyon " + (index + 1);
      if (!isRecord(candidate)) throw new Error(label + " geçerli bir nesne olmalıdır.");
      requireOnlyKeys(candidate, revisionEnvelopeKeys, label);
      if (candidate.schemaVersion !== 1) throw new Error(label + " desteklenen revizyon şemasını kullanmalıdır.");
      const sourceIntegrityVersion = candidate.sourceIntegrityVersion;
      if (sourceIntegrityVersion !== undefined && sourceIntegrityVersion !== 1) {
        throw new Error(label + " desteklenen sourceIntegrityVersion değerini kullanmalıdır.");
      }
      const candidateProjectId = requireIdentifier(candidate.projectId, label + " proje kimliği");
      if (candidateProjectId !== projectId) throw new Error(label + " aynı proje kimliğine ait olmalıdır.");
      const revisionId = requireIdentifier(candidate.revisionId, label + " kimliği");
      if (revisionIds.has(revisionId)) {
        throw new Error("Teklif revizyon geçmişinde revisionId değerleri benzersiz olmalıdır: " + revisionId + ".");
      }
      const expectedRevisionNumber = index + 1;
      const revisionNumber = requireSafeInteger(candidate.revisionNumber, label + " numarası", 1);
      if (revisionNumber !== expectedRevisionNumber) throw new Error(label + " numarası kesintisiz biçimde " + expectedRevisionNumber + " olmalıdır.");
      const previous = revisions.length === 0 ? null : revisions[revisions.length - 1];
      const expectedPreviousRevisionId = previous === null ? null : previous.revisionId;
      if (candidate.previousRevisionId !== expectedPreviousRevisionId) {
        throw new Error(label + " previousRevisionId alanı önceki kayıtla kesintisiz bir zincir oluşturmalıdır.");
      }
      const result = createProjectQuoteRevisionWithSourceIntegrity({
        projectId: candidateProjectId, revisionId, revisionNumber, createdAt: candidate.createdAt,
        previousRevision: previous === null ? null : {
          projectId: previous.projectId, revisionId: previous.revisionId,
          revisionNumber: previous.revisionNumber, createdAt: previous.createdAt
        },
        sourceIntegrityVersion,
        pricingSnapshot: candidate.pricingSnapshot
      });
      if (result.status !== "ready" || result.revision === null) {
        throw new Error(label + ": " + (result.diagnostics[0] ?? "revizyon doğrulanamadı."));
      }
      revisions.push(result.revision);
      revisionIds.add(revisionId);
    }
    return deepFreeze({
      status: "ready" as const,
      history: { schemaVersion: 1 as const, projectId, revisions },
      diagnostics: []
    });
  } catch (error) {
    return blockedHistory(error instanceof Error ? error.message : String(error));
  }
}


/**
 * Appends one explicitly identified revision to a validated project history.
 * The next sequence number and previous link come from the verified history;
 * the caller must supply the revision ID, timestamp and ready pricing snapshot.
 */
export function appendProjectQuoteRevision(
  historyValue: unknown,
  revisionValue: unknown
): ProjectQuoteRevisionHistoryResult {
  try {
    rejectFullRevisionHistoryBeforeAppend(historyValue);
  } catch (error) {
    return blockedHistory(error instanceof Error ? error.message : String(error));
  }
  const validatedHistory = validateProjectQuoteRevisionHistory(historyValue);
  if (validatedHistory.status === "blocked" || validatedHistory.history === null) {
    return blockedHistory(validatedHistory.diagnostics[0] ?? "Teklif revizyon geçmişi doğrulanamadı.");
  }
  if (!isRecord(revisionValue)) {
    return blockedHistory("Yeni teklif revizyon girdisi geçerli bir nesne olmalıdır.");
  }

  try {
    const safeRevisionValue = cloneRevisionInput(revisionValue);
    if (!isRecord(safeRevisionValue)) throw new Error("Yeni teklif revizyon girdisi geçerli bir nesne olmalıdır.");
    requireOnlyKeys(safeRevisionValue, appendInputKeys, "Yeni teklif revizyon girdisi");
    const currentHistory = validatedHistory.history;
    const revisionId = requireIdentifier(safeRevisionValue.revisionId, "Yeni revizyon kimliği");
    const createdAt = requireDateTime(safeRevisionValue.createdAt, "Yeni revizyon oluşturulma tarihi");

    if (currentHistory.revisions.some((revision) => revision.revisionId === revisionId)) {
      throw new Error("Yeni revizyon kimliği mevcut geçmişte daha önce kullanılmamış olmalıdır; revisionId benzersiz olmalıdır.");
    }

    const previous = currentHistory.revisions.length === 0
      ? null
      : currentHistory.revisions[currentHistory.revisions.length - 1];
    const created = createProjectQuoteRevisionWithSourceIntegrity({
      projectId: currentHistory.projectId,
      revisionId,
      revisionNumber: currentHistory.revisions.length + 1,
      createdAt,
      previousRevision: previous === null ? null : {
        projectId: previous.projectId,
        revisionId: previous.revisionId,
        revisionNumber: previous.revisionNumber,
        createdAt: previous.createdAt
      },
      sourceIntegrityVersion: 1,
      pricingSnapshot: safeRevisionValue.pricingSnapshot
    });

    if (created.status !== "ready" || created.revision === null) {
      throw new Error(created.diagnostics[0] ?? "Yeni teklif revizyonu doğrulanamadı.");
    }

    return validateProjectQuoteRevisionHistory({
      projectId: currentHistory.projectId,
      revisions: [...currentHistory.revisions, created.revision]
    });
  } catch (error) {
    return blockedHistory(error instanceof Error ? error.message : String(error));
  }
}


export type ProjectQuoteCostCategory =
  | "material"
  | "hardware"
  | "labor"
  | "operation"
  | "waste"
  | "profit";

export interface ProjectQuoteRevisionCostLineSnapshot {
  category: ProjectQuoteCostCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currencyCode: string;
  sourceReference?: string;
  sourceType: ProjectQuoteLineSource["sourceType"];
  sourceId: string;
  resourceType?: ProjectQuoteLineSource["resourceType"];
  resourceId?: string;
  resourceUnit?: string;
  tariffId?: string;
  sourcePartIds?: readonly string[];
  edgeDirection?: ProjectCostLineEdgeDirection;
  rollCount?: number;
  rollLengthMm?: number;
  purchasedLengthMm?: number;
  furnitureIds?: readonly string[];
  planSourceReference?: string;
  priceSourceReference?: string;
  hardwareId?: string;
  hardwareUnit?: string;
  hardwareFurnitureIds?: readonly string[];
  hardwareSourceReferences?: readonly string[];
}

export interface ProjectQuoteRevisionLineChange {
  type: "added" | "removed" | "changed";
  from: ProjectQuoteRevisionCostLineSnapshot | null;
  to: ProjectQuoteRevisionCostLineSnapshot | null;
}

export interface ProjectQuoteRevisionComparison {
  schemaVersion: 1;
  projectId: string;
  fromRevisionId: string;
  fromRevisionNumber: number;
  toRevisionId: string;
  toRevisionNumber: number;
  currencyCode: string;
  fromGrandTotalMinor: number;
  toGrandTotalMinor: number;
  /** Positive means the later revision increased; negative means it decreased. */
  grandTotalDeltaMinor: number;
  /** Category totals are compared in the same currency and minor unit. */
  categoryDeltasMinor: Record<ProjectQuoteCostCategory, number>;
  /** Exact line-level differences; unit/direction/source identity changes are add/remove pairs. */
  lineChanges: readonly ProjectQuoteRevisionLineChange[];
  /** Present only when either revision uses stock-sheet purchase; carries the validated group comparison. */
  stockSheetGroupComparison?: DeepReadonly<ProjectQuoteRevisionStockSheetGroupComparison>;
}

export interface ProjectQuoteRevisionComparisonResult {
  status: "ready" | "blocked";
  comparison: DeepReadonly<ProjectQuoteRevisionComparison> | null;
  diagnostics: readonly string[];
}

function createRevisionComparisonLineSnapshot(
  line: ProjectCostLine,
  source: DeepReadonly<ProjectQuoteLineSource>
): ProjectQuoteRevisionCostLineSnapshot {
  return {
    category: line.category,
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    currencyCode: line.currencyCode,
    ...(line.sourceReference === undefined ? {} : { sourceReference: line.sourceReference }),
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    ...(source.resourceType === undefined ? {} : { resourceType: source.resourceType }),
    ...(source.resourceId === undefined ? {} : { resourceId: source.resourceId }),
    ...(source.unit === undefined ? {} : { resourceUnit: source.unit }),
    ...(source.tariffId === undefined ? {} : { tariffId: source.tariffId }),
    ...(source.sourcePartIds === undefined ? {} : { sourcePartIds: [...source.sourcePartIds] }),
    ...(line.edgeDirection === undefined ? {} : { edgeDirection: line.edgeDirection }),
    ...(source.rollCount === undefined ? {} : { rollCount: source.rollCount }),
    ...(source.rollLengthMm === undefined ? {} : { rollLengthMm: source.rollLengthMm }),
    ...(source.purchasedLengthMm === undefined ? {} : { purchasedLengthMm: source.purchasedLengthMm }),
    ...(source.furnitureIds === undefined ? {} : { furnitureIds: [...source.furnitureIds] }),
    ...(source.planSourceReference === undefined ? {} : { planSourceReference: source.planSourceReference }),
    ...(source.priceSourceReference === undefined ? {} : { priceSourceReference: source.priceSourceReference }),
    ...(source.hardwareId === undefined ? {} : { hardwareId: source.hardwareId }),
    ...(source.hardwareUnit === undefined ? {} : { hardwareUnit: source.hardwareUnit }),
    ...(source.hardwareFurnitureIds === undefined ? {} : { hardwareFurnitureIds: [...source.hardwareFurnitureIds] }),
    ...(source.hardwareSourceReferences === undefined ? {} : { hardwareSourceReferences: [...source.hardwareSourceReferences] })
  };
}

interface RevisionComparisonLine {
  snapshot: ProjectQuoteRevisionCostLineSnapshot;
  resourceType?: ProjectQuoteLineSource["resourceType"];
  resourceId?: string;
  resourceUnit?: string;
}

function revisionComparisonLineIdentity(line: RevisionComparisonLine): string {
  const snapshot = line.snapshot;
  return JSON.stringify([
    snapshot.category,
    snapshot.edgeDirection === undefined ? snapshot.description : null,
    snapshot.edgeDirection ?? null,
    snapshot.unit,
    snapshot.sourceType,
    snapshot.sourceId,
    snapshot.tariffId ?? null,
    snapshot.sourcePartIds ?? [],
    line.resourceType ?? null,
    line.resourceId ?? null,
    line.resourceUnit ?? null,
    snapshot.hardwareId ?? null,
    snapshot.hardwareUnit ?? null,
    snapshot.hardwareFurnitureIds ?? [],
    snapshot.furnitureIds ?? []
  ]);
}


function revisionComparisonLineValue(line: RevisionComparisonLine): string {
  const snapshot = line.snapshot;
  return JSON.stringify([
    snapshot.description,
    snapshot.quantity,
    snapshot.unitPriceMinor,
    snapshot.lineTotalMinor,
    snapshot.sourceReference ?? null,
    snapshot.rollCount ?? null,
    snapshot.rollLengthMm ?? null,
    snapshot.purchasedLengthMm ?? null,
    snapshot.furnitureIds ?? [],
    snapshot.planSourceReference ?? null,
    snapshot.priceSourceReference ?? null,
    snapshot.hardwareId ?? null,
    snapshot.hardwareUnit ?? null,
    snapshot.hardwareFurnitureIds ?? [],
    snapshot.hardwareSourceReferences ?? [],
    line.resourceType ?? null,
    line.resourceId ?? null,
    line.resourceUnit ?? null
  ]);
}


function revisionComparisonLines(revision: ProjectQuoteRevision): RevisionComparisonLine[] {
  const quoteSummary = revision.pricingSnapshot.quoteSummary;
  const costSummary = quoteSummary.costSummary;
  if (costSummary === null) {
    if (quoteSummary.status !== "empty" || quoteSummary.lineSources.length !== 0) {
      throw new Error("Yalnızca doğrulanmış boş teklif snapshot'ı satır içermeyen karşılaştırma olarak kullanılabilir.");
    }
    return [];
  }
  const sourcesByLineId = new Map(quoteSummary.lineSources.map((source) => [source.costLineId, source]));
  return costSummary.lines.map((line) => {
    const source = sourcesByLineId.get(line.id);
    if (source === undefined) {
      throw new Error("Teklif maliyet satırı doğrulanmış kaynak eşlemesine sahip değil: " + line.id + ".");
    }
    return {
      snapshot: createRevisionComparisonLineSnapshot(line, source),
      ...(source.resourceType === undefined ? {} : { resourceType: source.resourceType }),
      ...(source.resourceId === undefined ? {} : { resourceId: source.resourceId }),
      ...(source.unit === undefined ? {} : { resourceUnit: source.unit })
    };
  });
}

function groupRevisionComparisonLines(
  lines: readonly RevisionComparisonLine[]
): Map<string, RevisionComparisonLine[]> {
  const groups = new Map<string, RevisionComparisonLine[]>();
  for (const line of lines) {
    const key = revisionComparisonLineIdentity(line);
    const group = groups.get(key) ?? [];
    group.push(line);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => {
      const leftValue = revisionComparisonLineValue(left);
      const rightValue = revisionComparisonLineValue(right);
      return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    });
  }
  return groups;
}

function compareRevisionCostLines(
  fromRevision: ProjectQuoteRevision,
  toRevision: ProjectQuoteRevision
): ProjectQuoteRevisionLineChange[] {
  const fromGroups = groupRevisionComparisonLines(revisionComparisonLines(fromRevision));
  const toGroups = groupRevisionComparisonLines(revisionComparisonLines(toRevision));
  const identityKeys = [...new Set([...fromGroups.keys(), ...toGroups.keys()])].sort();
  const changes: ProjectQuoteRevisionLineChange[] = [];

  for (const identity of identityKeys) {
    const fromLines = fromGroups.get(identity) ?? [];
    const toLines = toGroups.get(identity) ?? [];
    const matchedCount = Math.min(fromLines.length, toLines.length);
    for (let index = 0; index < matchedCount; index += 1) {
      if (revisionComparisonLineValue(fromLines[index]) !== revisionComparisonLineValue(toLines[index])) {
        changes.push({ type: "changed", from: fromLines[index].snapshot, to: toLines[index].snapshot });
      }
    }
    for (let index = matchedCount; index < fromLines.length; index += 1) {
      changes.push({ type: "removed", from: fromLines[index].snapshot, to: null });
    }
    for (let index = matchedCount; index < toLines.length; index += 1) {
      changes.push({ type: "added", from: null, to: toLines[index].snapshot });
    }
  }
  return changes;
}

function blockedComparison(message: string): ProjectQuoteRevisionComparisonResult {
  return deepFreeze({
    status: "blocked" as const,
    comparison: null,
    diagnostics: [message]
  });
}

/**
 * Compares two revisions from one fully validated history.
 * The later revision must have a greater sequence number and both snapshots
 * must use the same currency. Lines match only by exact source, category, description,
 * unit, tariff and Part provenance; changed units/directions are add/remove pairs.
 */
export function compareProjectQuoteRevisions(
  historyValue: unknown,
  fromRevisionIdValue: unknown,
  toRevisionIdValue: unknown
): ProjectQuoteRevisionComparisonResult {
  const validatedHistory = validateProjectQuoteRevisionHistory(historyValue);
  if (validatedHistory.status !== "ready" || validatedHistory.history === null) {
    return blockedComparison(
      validatedHistory.status === "empty"
        ? "Boş teklif geçmişinde karşılaştırılacak revizyon bulunmuyor."
        : validatedHistory.diagnostics[0] ?? "Teklif revizyon geçmişi doğrulanamadı."
    );
  }

  try {
    const fromRevisionId = requireIdentifier(fromRevisionIdValue, "Başlangıç revizyon kimliği");
    const toRevisionId = requireIdentifier(toRevisionIdValue, "Hedef revizyon kimliği");
    const revisions = validatedHistory.history.revisions;
    const fromRevision = revisions.find((revision) => revision.revisionId === fromRevisionId);
    const toRevision = revisions.find((revision) => revision.revisionId === toRevisionId);

    if (fromRevision === undefined || toRevision === undefined) {
      throw new Error("Karşılaştırılacak revizyon kimlikleri doğrulanmış geçmişte bulunmalıdır.");
    }
    if (toRevision.revisionNumber <= fromRevision.revisionNumber) {
      throw new Error("Hedef revizyon başlangıç revizyonundan daha yeni olmalıdır.");
    }

    const hasStockSheetBasis =
      fromRevision.pricingSnapshot.materialCostBasis?.basis === "stock-sheet-purchase" ||
      toRevision.pricingSnapshot.materialCostBasis?.basis === "stock-sheet-purchase";

    let currencyCode: string;
    let fromGrandTotalMinor: number;
    let toGrandTotalMinor: number;
    let categoryDeltasMinor: Record<ProjectQuoteCostCategory, number>;
    let stockSheetGroupComparison: DeepReadonly<ProjectQuoteRevisionStockSheetGroupComparison> | undefined;

    if (hasStockSheetBasis) {
      const stockSheetResult = compareProjectQuoteRevisionStockSheetGroups(
        validatedHistory.history,
        fromRevisionId,
        toRevisionId
      );
      if (stockSheetResult.status !== "ready" || stockSheetResult.comparison === null) {
        throw new Error(
          stockSheetResult.diagnostics[0] ??
          "Levha satın alma grupları teklif revizyon karşılaştırmasına güvenli biçimde eklenemedi."
        );
      }
      stockSheetGroupComparison = stockSheetResult.comparison;
      currencyCode = stockSheetGroupComparison.currencyCode;
      fromGrandTotalMinor = stockSheetGroupComparison.fromGrandTotalMinor;
      toGrandTotalMinor = stockSheetGroupComparison.toGrandTotalMinor;
      categoryDeltasMinor = { ...stockSheetGroupComparison.categoryDeltasMinor };
    } else {
      const fromQuote = fromRevision.pricingSnapshot.quoteSummary;
      const toQuote = toRevision.pricingSnapshot.quoteSummary;
      const fromCost = fromQuote.costSummary;
      const toCost = toQuote.costSummary;
      const fromCurrencyCode = fromQuote.currencyCode;

      if (
        fromCurrencyCode === null ||
        toQuote.currencyCode !== fromCurrencyCode ||
        fromCost === null ||
        toCost === null ||
        fromCost.currencyCode !== fromCurrencyCode ||
        toCost.currencyCode !== fromCurrencyCode
      ) {
        throw new Error("Farklı para birimlerindeki teklif revizyonları kur bilgisi olmadan karşılaştırılamaz.");
      }

      currencyCode = fromCurrencyCode;
      fromGrandTotalMinor = requireSafeInteger(
        fromCost.grandTotalMinor,
        "Başlangıç revizyon genel toplamı",
        0
      );
      toGrandTotalMinor = requireSafeInteger(
        toCost.grandTotalMinor,
        "Hedef revizyon genel toplamı",
        0
      );
      categoryDeltasMinor = {} as Record<ProjectQuoteCostCategory, number>;
      for (const rawCategory of costCategories) {
        const category = rawCategory as ProjectQuoteCostCategory;
        categoryDeltasMinor[category] = safeRevisionComparisonDelta(
          toCost.categoryTotalsMinor[category],
          fromCost.categoryTotalsMinor[category],
          category + " kategori farkı"
        );
      }
    }

    const grandTotalDeltaMinor = safeRevisionComparisonDelta(
      toGrandTotalMinor,
      fromGrandTotalMinor,
      "Teklif genel toplam farkı"
    );
    const categoryDeltaTotal = Object.values(categoryDeltasMinor).reduce(
      (total, delta) => total + BigInt(delta),
      0n
    );
    if (categoryDeltaTotal !== BigInt(grandTotalDeltaMinor)) {
      throw new Error("Kategori farkları teklif genel toplam farkıyla uzlaşmıyor.");
    }

    return deepFreeze({
      status: "ready" as const,
      comparison: {
        schemaVersion: 1 as const,
        projectId: validatedHistory.history.projectId,
        fromRevisionId,
        fromRevisionNumber: fromRevision.revisionNumber,
        toRevisionId,
        toRevisionNumber: toRevision.revisionNumber,
        currencyCode,
        fromGrandTotalMinor,
        toGrandTotalMinor,
        grandTotalDeltaMinor,
        categoryDeltasMinor,
        ...(stockSheetGroupComparison === undefined ? {} : { stockSheetGroupComparison }),
        lineChanges: compareRevisionCostLines(fromRevision, toRevision)
      },
      diagnostics: []
    });
  } catch (error) {
    return blockedComparison(error instanceof Error ? error.message : String(error));
  }
}



export type ProjectQuoteRevisionStockSheetGroupChangedField =
  | "sourcePartIds"
  | "sheetCount"
  | "pricePerSheetMinor"
  | "stockSheetCostMinor"
  | "sourceReference";

export interface ProjectQuoteRevisionStockSheetGroupChange {
  type: "added" | "removed" | "changed";
  groupId: string;
  from: DeepReadonly<ProjectQuoteStockSheetGroupSnapshot> | null;
  to: DeepReadonly<ProjectQuoteStockSheetGroupSnapshot> | null;
  /** Stable ordered field keys for matched groups; added/removed groups have no field-level diff. */
  changedFields: readonly ProjectQuoteRevisionStockSheetGroupChangedField[];
}

export interface ProjectQuoteRevisionStockSheetGroupComparisonCounts {
  addedGroupCount: number;
  removedGroupCount: number;
  changedGroupCount: number;
  unchangedGroupCount: number;
}

export interface ProjectQuoteRevisionStockSheetPartChangeCounts {
  fromPartCount: number;
  toPartCount: number;
  addedPartCount: number;
  removedPartCount: number;
  movedPartCount: number;
  unchangedPartCount: number;
}

export interface ProjectQuoteRevisionStockSheetPartChange {
  type: "added" | "removed" | "moved";
  partId: string;
  fromGroupId: string | null;
  toGroupId: string | null;
}

export interface ProjectQuoteRevisionStockSheetGroupComparison {
  schemaVersion: 1;
  projectId: string;
  fromRevisionId: string;
  fromRevisionNumber: number;
  toRevisionId: string;
  toRevisionNumber: number;
  currencyCode: string;
  fromStockSheetCostMinor: number;
  toStockSheetCostMinor: number;
  stockSheetCostDeltaMinor: number;
  fromSheetCount: number;
  toSheetCount: number;
  sheetCountDelta: number;
  fromMaterialCategoryTotalMinor: number;
  toMaterialCategoryTotalMinor: number;
  materialCategoryDeltaMinor: number;
  fromGrandTotalMinor: number;
  toGrandTotalMinor: number;
  grandTotalDeltaMinor: number;
  categoryDeltasMinor: Record<ProjectQuoteCostCategory, number>;
  /** Deterministic counts over the union of stable group IDs, including unchanged groups. */
  groupCounts: ProjectQuoteRevisionStockSheetGroupComparisonCounts;
  /** Unique source Part ownership across all stock-sheet groups in each compared revision. */
  stockSheetPartCounts: ProjectQuoteRevisionStockSheetPartChangeCounts;
  /** Added, removed or moved Part IDs; unchanged IDs are represented only in counts. */
  stockSheetPartChanges: readonly ProjectQuoteRevisionStockSheetPartChange[];
  /** Stable group IDs match in place; material/thickness identity changes are add/remove pairs. */
  groupChanges: readonly ProjectQuoteRevisionStockSheetGroupChange[];
}

export interface ProjectQuoteRevisionStockSheetGroupComparisonResult {
  status: "ready" | "blocked";
  comparison: DeepReadonly<ProjectQuoteRevisionStockSheetGroupComparison> | null;
  diagnostics: readonly string[];
}

interface RevisionStockSheetComparisonTotals {
  currencyCode: string;
  categoryTotalsMinor: Record<ProjectQuoteCostCategory, number>;
  grandTotalMinor: number;
  stockSheetGroups: readonly DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>[];
  stockSheetCostMinor: number;
  sheetCount: number;
}

function blockedStockSheetGroupComparison(message: string): ProjectQuoteRevisionStockSheetGroupComparisonResult {
  return deepFreeze({
    status: "blocked" as const,
    comparison: null,
    diagnostics: [message]
  });
}

function createRevisionStockSheetComparisonTotals(
  revision: ProjectQuoteRevision
): RevisionStockSheetComparisonTotals {
  const basis = revision.pricingSnapshot.materialCostBasis;
  let currencyCode: string;
  let categorySource: Record<ProjectQuoteCostCategory, number>;
  let grandTotalMinor: number;
  let stockSheetGroups: readonly DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>[] = [];
  let stockSheetCostMinor = 0;

  if (basis !== undefined) {
    currencyCode = basis.currencyCode;
    categorySource = basis.categoryTotalsMinor as Record<ProjectQuoteCostCategory, number>;
    grandTotalMinor = requireSafeInteger(basis.grandTotalMinor, "Revizyon genel toplamı", 0);
    if (basis.basis === "stock-sheet-purchase") {
      stockSheetGroups = basis.stockSheetGroups;
      stockSheetCostMinor = requireSafeInteger(
        basis.panelMaterialCostMinor,
        "Revizyon levha satın alma toplamı",
        0
      );
    }
  } else {
    const quoteSummary = revision.pricingSnapshot.quoteSummary;
    const costSummary = quoteSummary.costSummary;
    if (quoteSummary.currencyCode === null || costSummary === null) {
      throw new Error("Levha grup karşılaştırması için doğrulanmış para birimi ve teklif toplamı bulunmalıdır.");
    }
    currencyCode = quoteSummary.currencyCode;
    categorySource = costSummary.categoryTotalsMinor as Record<ProjectQuoteCostCategory, number>;
    grandTotalMinor = requireSafeInteger(costSummary.grandTotalMinor, "Legacy revizyon genel toplamı", 0);
  }

  const categoryTotalsMinor = {} as Record<ProjectQuoteCostCategory, number>;
  let categoryTotal = 0n;
  for (const rawCategory of costCategories) {
    const category = rawCategory as ProjectQuoteCostCategory;
    const amount = requireSafeInteger(categorySource[category], category + " revizyon kategori toplamı", 0);
    categoryTotalsMinor[category] = amount;
    categoryTotal += BigInt(amount);
  }
  if (categoryTotal !== BigInt(grandTotalMinor)) {
    throw new Error("Revizyon kategori toplamları genel toplamla uyuşmuyor.");
  }

  let groupCostTotal = 0n;
  let sheetCountTotal = 0n;
  for (const group of stockSheetGroups) {
    groupCostTotal += BigInt(requireSafeInteger(group.stockSheetCostMinor, group.groupId + " levha grup maliyeti", 0));
    sheetCountTotal += BigInt(requireSafeInteger(group.sheetCount, group.groupId + " levha adedi", 1));
  }
  if (groupCostTotal !== BigInt(stockSheetCostMinor)) {
    throw new Error("Levha grup maliyetleri revizyon panel satın alma toplamıyla uyuşmuyor.");
  }
  if (sheetCountTotal > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Revizyon toplam levha adedi güvenli tam sayı aralığını aşıyor.");
  }

  return {
    currencyCode,
    categoryTotalsMinor,
    grandTotalMinor,
    stockSheetGroups,
    stockSheetCostMinor,
    sheetCount: Number(sheetCountTotal)
  };
}

function revisionStockSheetGroupValue(group: DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>): string {
  return JSON.stringify([
    group.materialId,
    group.thicknessMm,
    group.sourcePartIds,
    group.sheetCount,
    group.pricePerSheetMinor,
    group.stockSheetCostMinor,
    group.currencyCode,
    group.sourceReference ?? null
  ]);
}

function revisionStockSheetGroupChangedFields(
  from: DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>,
  to: DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>
): ProjectQuoteRevisionStockSheetGroupChangedField[] {
  const changedFields: ProjectQuoteRevisionStockSheetGroupChangedField[] = [];
  if (from.sourcePartIds.length !== to.sourcePartIds.length ||
      from.sourcePartIds.some((partId, index) => partId !== to.sourcePartIds[index])) {
    changedFields.push("sourcePartIds");
  }
  if (from.sheetCount !== to.sheetCount) changedFields.push("sheetCount");
  if (from.pricePerSheetMinor !== to.pricePerSheetMinor) changedFields.push("pricePerSheetMinor");
  if (from.stockSheetCostMinor !== to.stockSheetCostMinor) changedFields.push("stockSheetCostMinor");
  if ((from.sourceReference ?? null) !== (to.sourceReference ?? null)) {
    changedFields.push("sourceReference");
  }
  return changedFields;
}

function cloneRevisionStockSheetGroup(
  group: DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>
): ProjectQuoteStockSheetGroupSnapshot {
  return {
    groupId: group.groupId,
    materialId: group.materialId,
    thicknessMm: group.thicknessMm,
    sourcePartIds: [...group.sourcePartIds],
    sheetCount: group.sheetCount,
    pricePerSheetMinor: group.pricePerSheetMinor,
    stockSheetCostMinor: group.stockSheetCostMinor,
    currencyCode: group.currencyCode,
    ...(group.sourceReference === undefined ? {} : { sourceReference: group.sourceReference })
  };
}

function safeRevisionComparisonDelta(toValue: number, fromValue: number, label: string): number {
  const delta = BigInt(toValue) - BigInt(fromValue);
  const maximum = BigInt(Number.MAX_SAFE_INTEGER);
  if (delta > maximum || delta < -maximum) throw new Error(label + " güvenli tam sayı aralığını aşıyor.");
  return Number(delta);
}

/**
 * Compares only stock-sheet purchase groups and reconciled quote totals from two
 * validated revisions. At least one revision must use the explicit stock-sheet basis.
 * Material or thickness identity changes are represented as removed + added groups.
 */
export function compareProjectQuoteRevisionStockSheetGroups(
  historyValue: unknown,
  fromRevisionIdValue: unknown,
  toRevisionIdValue: unknown
): ProjectQuoteRevisionStockSheetGroupComparisonResult {
  const validatedHistory = validateProjectQuoteRevisionHistory(historyValue);
  if (validatedHistory.status !== "ready" || validatedHistory.history === null) {
    return blockedStockSheetGroupComparison(
      validatedHistory.status === "empty"
        ? "Boş teklif geçmişinde levha grubu karşılaştırılacak revizyon bulunmuyor."
        : validatedHistory.diagnostics[0] ?? "Teklif revizyon geçmişi levha grubu karşılaştırması için doğrulanamadı."
    );
  }

  try {
    const fromRevisionId = requireIdentifier(fromRevisionIdValue, "Başlangıç revizyon kimliği");
    const toRevisionId = requireIdentifier(toRevisionIdValue, "Hedef revizyon kimliği");
    const revisions = validatedHistory.history.revisions;
    const fromRevision = revisions.find(revision => revision.revisionId === fromRevisionId);
    const toRevision = revisions.find(revision => revision.revisionId === toRevisionId);
    if (fromRevision === undefined || toRevision === undefined) {
      throw new Error("Levha grubu karşılaştırma revizyon kimlikleri doğrulanmış geçmişte bulunmalıdır.");
    }
    if (toRevision.revisionNumber <= fromRevision.revisionNumber) {
      throw new Error("Levha grubu karşılaştırma hedef revizyonu başlangıç revizyonundan daha yeni olmalıdır.");
    }
    const hasStockSheetBasis =
      fromRevision.pricingSnapshot.materialCostBasis?.basis === "stock-sheet-purchase" ||
      toRevision.pricingSnapshot.materialCostBasis?.basis === "stock-sheet-purchase";
    if (!hasStockSheetBasis) {
      throw new Error("Levha grubu karşılaştırması için en az bir revizyon açık levha satın alma maliyet temeli içermelidir.");
    }

    const fromTotals = createRevisionStockSheetComparisonTotals(fromRevision);
    const toTotals = createRevisionStockSheetComparisonTotals(toRevision);
    if (fromTotals.currencyCode !== toTotals.currencyCode) {
      throw new Error("Farklı para birimlerindeki levha satın alma revizyonları kur bilgisi olmadan karşılaştırılamaz.");
    }

    const fromGroups = new Map(fromTotals.stockSheetGroups.map(group => [group.groupId, group]));
    const toGroups = new Map(toTotals.stockSheetGroups.map(group => [group.groupId, group]));
    const groupIds = [...new Set([...fromGroups.keys(), ...toGroups.keys()])].sort();
    const groupChanges: ProjectQuoteRevisionStockSheetGroupChange[] = [];
    const groupCounts: ProjectQuoteRevisionStockSheetGroupComparisonCounts = {
      addedGroupCount: 0,
      removedGroupCount: 0,
      changedGroupCount: 0,
      unchangedGroupCount: 0
    };
    for (const groupId of groupIds) {
      const fromGroup = fromGroups.get(groupId) ?? null;
      const toGroup = toGroups.get(groupId) ?? null;
      if (fromGroup === null) {
        groupCounts.addedGroupCount += 1;
      } else if (toGroup === null) {
        groupCounts.removedGroupCount += 1;
      } else if (revisionStockSheetGroupValue(fromGroup) === revisionStockSheetGroupValue(toGroup)) {
        groupCounts.unchangedGroupCount += 1;
        continue;
      } else {
        groupCounts.changedGroupCount += 1;
      }
      groupChanges.push({
        type: fromGroup === null ? "added" : toGroup === null ? "removed" : "changed",
        groupId,
        from: fromGroup === null ? null : cloneRevisionStockSheetGroup(fromGroup),
        to: toGroup === null ? null : cloneRevisionStockSheetGroup(toGroup),
        changedFields: fromGroup === null || toGroup === null
          ? []
          : revisionStockSheetGroupChangedFields(fromGroup, toGroup)
      });
    }

    const collectPartGroupIds = (
      groups: readonly DeepReadonly<ProjectQuoteStockSheetGroupSnapshot>[],
      label: string
    ): Map<string, string> => {
      const partGroupIds = new Map<string, string>();
      for (const group of groups) {
        for (const partId of group.sourcePartIds) {
          if (partGroupIds.has(partId)) {
            throw new Error(label + " kaynak Part kimliği birden fazla levha grubunda bulunuyor: " + partId + ".");
          }
          partGroupIds.set(partId, group.groupId);
        }
      }
      return partGroupIds;
    };
    const fromPartGroupIds = collectPartGroupIds(fromTotals.stockSheetGroups, "Başlangıç revizyonu");
    const toPartGroupIds = collectPartGroupIds(toTotals.stockSheetGroups, "Hedef revizyonu");
    const stockSheetPartCounts: ProjectQuoteRevisionStockSheetPartChangeCounts = {
      fromPartCount: fromPartGroupIds.size,
      toPartCount: toPartGroupIds.size,
      addedPartCount: 0,
      removedPartCount: 0,
      movedPartCount: 0,
      unchangedPartCount: 0
    };
    const stockSheetPartChanges: ProjectQuoteRevisionStockSheetPartChange[] = [];
    const partIds = [...new Set([...fromPartGroupIds.keys(), ...toPartGroupIds.keys()])].sort();
    for (const partId of partIds) {
      const fromGroupId = fromPartGroupIds.get(partId) ?? null;
      const toGroupId = toPartGroupIds.get(partId) ?? null;
      if (fromGroupId === null) {
        stockSheetPartCounts.addedPartCount += 1;
        stockSheetPartChanges.push({ type: "added", partId, fromGroupId: null, toGroupId });
      } else if (toGroupId === null) {
        stockSheetPartCounts.removedPartCount += 1;
        stockSheetPartChanges.push({ type: "removed", partId, fromGroupId, toGroupId: null });
      } else if (fromGroupId !== toGroupId) {
        stockSheetPartCounts.movedPartCount += 1;
        stockSheetPartChanges.push({ type: "moved", partId, fromGroupId, toGroupId });
      } else {
        stockSheetPartCounts.unchangedPartCount += 1;
      }
    }
    if (
      stockSheetPartCounts.fromPartCount !==
        stockSheetPartCounts.removedPartCount +
          stockSheetPartCounts.movedPartCount +
          stockSheetPartCounts.unchangedPartCount ||
      stockSheetPartCounts.toPartCount !==
        stockSheetPartCounts.addedPartCount +
          stockSheetPartCounts.movedPartCount +
          stockSheetPartCounts.unchangedPartCount
    ) {
      throw new Error("Levha satın alma Part sahipliği farkları başlangıç/hedef benzersiz Part kapsamıyla uzlaşmıyor.");
    }

    const stockSheetCostDeltaMinor = safeRevisionComparisonDelta(
      toTotals.stockSheetCostMinor, fromTotals.stockSheetCostMinor, "Levha satın alma maliyet farkı"
    );
    const groupCostDelta = groupChanges.reduce(
      (total, change) => total +
        BigInt(change.to?.stockSheetCostMinor ?? 0) -
        BigInt(change.from?.stockSheetCostMinor ?? 0),
      0n
    );
    if (groupCostDelta !== BigInt(stockSheetCostDeltaMinor)) {
      throw new Error("Levha grubu farkları panel satın alma maliyet farkıyla uzlaşmıyor.");
    }

    const categoryDeltasMinor = {} as Record<ProjectQuoteCostCategory, number>;
    let categoryDeltaTotal = 0n;
    for (const rawCategory of costCategories) {
      const category = rawCategory as ProjectQuoteCostCategory;
      const delta = safeRevisionComparisonDelta(
        toTotals.categoryTotalsMinor[category],
        fromTotals.categoryTotalsMinor[category],
        category + " kategori farkı"
      );
      categoryDeltasMinor[category] = delta;
      categoryDeltaTotal += BigInt(delta);
    }
    const grandTotalDeltaMinor = safeRevisionComparisonDelta(
      toTotals.grandTotalMinor, fromTotals.grandTotalMinor, "Teklif genel toplam farkı"
    );
    if (categoryDeltaTotal !== BigInt(grandTotalDeltaMinor)) {
      throw new Error("Kategori farkları teklif genel toplam farkıyla uzlaşmıyor.");
    }
    const sheetCountDelta = safeRevisionComparisonDelta(
      toTotals.sheetCount, fromTotals.sheetCount, "Toplam levha adedi farkı"
    );

    return deepFreeze({
      status: "ready" as const,
      comparison: {
        schemaVersion: 1 as const,
        projectId: validatedHistory.history.projectId,
        fromRevisionId,
        fromRevisionNumber: fromRevision.revisionNumber,
        toRevisionId,
        toRevisionNumber: toRevision.revisionNumber,
        currencyCode: fromTotals.currencyCode,
        fromStockSheetCostMinor: fromTotals.stockSheetCostMinor,
        toStockSheetCostMinor: toTotals.stockSheetCostMinor,
        stockSheetCostDeltaMinor,
        fromSheetCount: fromTotals.sheetCount,
        toSheetCount: toTotals.sheetCount,
        sheetCountDelta,
        fromMaterialCategoryTotalMinor: fromTotals.categoryTotalsMinor.material,
        toMaterialCategoryTotalMinor: toTotals.categoryTotalsMinor.material,
        materialCategoryDeltaMinor: categoryDeltasMinor.material,
        fromGrandTotalMinor: fromTotals.grandTotalMinor,
        toGrandTotalMinor: toTotals.grandTotalMinor,
        grandTotalDeltaMinor,
        categoryDeltasMinor,
        stockSheetPartCounts,
        stockSheetPartChanges,
        groupCounts,
        groupChanges
      },
      diagnostics: []
    });
  } catch (error) {
    return blockedStockSheetGroupComparison(error instanceof Error ? error.message : String(error));
  }
}


export interface ProjectQuoteRevisionSourceMapAuditCounts {
  lineCount: number;
  sourceReferenceLineCount: number;
  partLinkedLineCount: number;
  partReferenceCount: number;
  uniquePartIdCount: number;
  resourceLineCount: number;
  hardwareLineCount: number;
  hardwareFurnitureReferenceCount: number;
  uniqueHardwareFurnitureIdCount: number;
  hardwareBomReferenceCount: number;
  uniqueHardwareBomReferenceCount: number;
  laborOperationLineCount: number;
  quoteAdjustmentLineCount: number;
  duplicateSourceIdentityCount: number;
  duplicateSourceIdentityLineReferenceCount: number;
  /** Stock-sheet purchase provenance is kept separate from quote cost-line provenance. */
  stockSheetGroupCount: number;
  stockSheetPartReferenceCount: number;
  stockSheetUniquePartIdCount: number;
  stockSheetPriceSourceReferenceCount: number;
  sourceTypeCounts: Record<ProjectQuoteLineSource["sourceType"], number>;
  categoryCounts: Record<ProjectQuoteCostCategory, number>;
}


export interface ProjectQuoteRevisionSourceMapAuditDuplicateIdentity {
  sourceType: ProjectQuoteLineSource["sourceType"];
  sourceId: string;
  costLineIds: readonly string[];
}

export interface ProjectQuoteRevisionSourceMapAuditLine {
  costLineId: string;
  category: ProjectQuoteCostCategory;
  costLineUnit: string;
  currencyCode: string;
  sourceType: ProjectQuoteLineSource["sourceType"];
  sourceId: string;
  sourceReference?: string;
  tariffId?: string;
  sourcePartIds?: readonly string[];
  resourceType?: ProjectQuoteLineSource["resourceType"];
  resourceId?: string;
  resourceUnit?: string;
  edgeDirection?: ProjectCostLineEdgeDirection;
  rollCount?: number;
  rollLengthMm?: number;
  purchasedLengthMm?: number;
  furnitureIds?: readonly string[];
  planSourceReference?: string;
  priceSourceReference?: string;
  hardwareId?: string;
  hardwareUnit?: string;
  hardwareFurnitureIds?: readonly string[];
  hardwareSourceReferences?: readonly string[];
}

export interface ProjectQuoteRevisionSourceMapAuditStockSheetGroup {
  groupId: string;
  materialId: string;
  thicknessMm: number;
  sourcePartIds: readonly string[];
  sheetCount: number;
  pricePerSheetMinor: number;
  stockSheetCostMinor: number;
  currencyCode: string;
  sourceReference?: string;
}

export interface ProjectQuoteRevisionSourceIntegrityAuditRevision {
  revisionId: string;
  revisionNumber: number;
  createdAt: string;
  sourceIntegrityVersion: 1 | null;
}
export interface ProjectQuoteRevisionSourceIntegrityAudit {
  schemaVersion: 1;
  projectId: string;
  revisionCount: number;
  strictRevisionCount: number;
  legacyRevisionCount: number;
  revisions: readonly ProjectQuoteRevisionSourceIntegrityAuditRevision[];
}
export interface ProjectQuoteRevisionSourceIntegrityAuditResult {
  status: "ready" | "empty" | "blocked";
  audit: DeepReadonly<ProjectQuoteRevisionSourceIntegrityAudit> | null;
  diagnostics: readonly string[];
}
export interface ProjectQuoteRevisionSourceMapAuditRevision {
  revisionId: string;
  revisionNumber: number;
  createdAt: string;
  sourceIntegrityVersion: 1 | null;
  counts: ProjectQuoteRevisionSourceMapAuditCounts;
  duplicateSourceIdentities: readonly ProjectQuoteRevisionSourceMapAuditDuplicateIdentity[];
  /** Purchase groups retain their own Part provenance and are not counted as quote cost lines. */
  stockSheetGroups: readonly ProjectQuoteRevisionSourceMapAuditStockSheetGroup[];
  lines: readonly ProjectQuoteRevisionSourceMapAuditLine[];
}

export interface ProjectQuoteRevisionSourceMapAudit {
  schemaVersion: 1;
  projectId: string;
  revisionCount: number;
  totals: ProjectQuoteRevisionSourceMapAuditCounts;
  revisions: readonly ProjectQuoteRevisionSourceMapAuditRevision[];
}

export interface ProjectQuoteRevisionSourceMapAuditResult {
  status: "ready" | "empty" | "blocked";
  audit: DeepReadonly<ProjectQuoteRevisionSourceMapAudit> | null;
  diagnostics: readonly string[];
}

function createSourceMapAuditCounts(): ProjectQuoteRevisionSourceMapAuditCounts {
  return {
    lineCount: 0,
    sourceReferenceLineCount: 0,
    partLinkedLineCount: 0,
    partReferenceCount: 0,
    uniquePartIdCount: 0,
    resourceLineCount: 0,
    hardwareLineCount: 0,
    hardwareFurnitureReferenceCount: 0,
    uniqueHardwareFurnitureIdCount: 0,
    hardwareBomReferenceCount: 0,
    uniqueHardwareBomReferenceCount: 0,
    laborOperationLineCount: 0,
    quoteAdjustmentLineCount: 0,
    duplicateSourceIdentityCount: 0,
    duplicateSourceIdentityLineReferenceCount: 0,
    stockSheetGroupCount: 0,
    stockSheetPartReferenceCount: 0,
    stockSheetUniquePartIdCount: 0,
    stockSheetPriceSourceReferenceCount: 0,
    sourceTypeCounts: {
      "production-consumption": 0,
      "labor-operation": 0,
      "quote-adjustment": 0
    },
    categoryCounts: {
      material: 0,
      hardware: 0,
      labor: 0,
      operation: 0,
      waste: 0,
      profit: 0
    }
  };
}

function addSourceMapAuditCounts(
  target: ProjectQuoteRevisionSourceMapAuditCounts,
  source: ProjectQuoteRevisionSourceMapAuditCounts
): void {
  target.lineCount += source.lineCount;
  target.sourceReferenceLineCount += source.sourceReferenceLineCount;
  target.partLinkedLineCount += source.partLinkedLineCount;
  target.partReferenceCount += source.partReferenceCount;
  target.resourceLineCount += source.resourceLineCount;
  target.hardwareLineCount += source.hardwareLineCount;
  target.hardwareFurnitureReferenceCount += source.hardwareFurnitureReferenceCount;
  target.hardwareBomReferenceCount += source.hardwareBomReferenceCount;
  target.laborOperationLineCount += source.laborOperationLineCount;
  target.quoteAdjustmentLineCount += source.quoteAdjustmentLineCount;
  target.duplicateSourceIdentityCount += source.duplicateSourceIdentityCount;
  target.duplicateSourceIdentityLineReferenceCount += source.duplicateSourceIdentityLineReferenceCount;
  target.stockSheetGroupCount += source.stockSheetGroupCount;
  target.stockSheetPartReferenceCount += source.stockSheetPartReferenceCount;
  target.stockSheetPriceSourceReferenceCount += source.stockSheetPriceSourceReferenceCount;
  for (const sourceType of ["production-consumption", "labor-operation", "quote-adjustment"] as const) {
    target.sourceTypeCounts[sourceType] += source.sourceTypeCounts[sourceType];
  }
  for (const category of ["material", "hardware", "labor", "operation", "waste", "profit"] as const) {
    target.categoryCounts[category] += source.categoryCounts[category];
  }
}

function blockedSourceMapAudit(message: string): ProjectQuoteRevisionSourceMapAuditResult {
  return deepFreeze({
    status: "blocked" as const,
    audit: null,
    diagnostics: [message]
  });
}

/**
 * Produces an immutable, revision-ordered audit of quote source mappings.
 * It validates the full history first and never infers Part, hardware or price references.
 */
export function calculateProjectQuoteRevisionSourceMapAudit(
  historyValue: unknown
): ProjectQuoteRevisionSourceMapAuditResult {
  const validatedHistory = validateProjectQuoteRevisionHistory(historyValue);
  if (validatedHistory.status === "blocked" || validatedHistory.history === null) {
    return blockedSourceMapAudit(
      validatedHistory.diagnostics[0] ?? "Teklif revizyon geçmişi kaynak denetimi için doğrulanamadı."
    );
  }

  try {
    const history = validatedHistory.history;
    const totals = createSourceMapAuditCounts();
    const revisionAudits: ProjectQuoteRevisionSourceMapAuditRevision[] = [];
    const allPartIds = new Set<string>();
    const allStockSheetPartIds = new Set<string>();
    const allHardwareFurnitureIds = new Set<string>();
    const allHardwareBomReferences = new Set<string>();

    for (const revision of history.revisions) {
      const quoteSummary = revision.pricingSnapshot.quoteSummary;
      const costSummary = quoteSummary.costSummary;
      if (costSummary === null) {
        if (quoteSummary.status !== "empty" || quoteSummary.lineSources.length !== 0) {
          throw new Error("Maliyet özeti olmayan teklif revizyonunda yalnızca doğrulanmış boş satır kaynağı kabul edilir.");
        }
      } else if (costSummary.lines.length !== quoteSummary.lineSources.length) {
        throw new Error("Teklif revizyon kaynak denetimi maliyet/kaynak satır eşleşmesi olmadan üretilemez.");
      }
      const costLines = costSummary?.lines ?? [];

      const counts = createSourceMapAuditCounts();
      const partIds = new Set<string>();
      const hardwareFurnitureIds = new Set<string>();
      const hardwareBomReferences = new Set<string>();
      const sourceIdentityLineReferences = new Map<string, {
        sourceType: ProjectQuoteLineSource["sourceType"];
        sourceId: string;
        costLineIds: string[];
      }>();
      const lines: ProjectQuoteRevisionSourceMapAuditLine[] = [];

      for (let index = 0; index < costLines.length; index += 1) {
        const costLine = costLines[index];
        const source = quoteSummary.lineSources[index];
        if (costLine === undefined || source === undefined || source.costLineId !== costLine.id) {
          throw new Error("Teklif revizyon kaynak denetimi doğrulanmış satır kimliğini koruyamadı.");
        }

        const sourceIdentityKey = JSON.stringify([source.sourceType, source.sourceId]);
        let sourceIdentityReferences = sourceIdentityLineReferences.get(sourceIdentityKey);
        if (sourceIdentityReferences === undefined) {
          sourceIdentityReferences = { sourceType: source.sourceType, sourceId: source.sourceId, costLineIds: [] };
          sourceIdentityLineReferences.set(sourceIdentityKey, sourceIdentityReferences);
        }
        sourceIdentityReferences.costLineIds.push(costLine.id);

        counts.lineCount += 1;
        counts.sourceTypeCounts[source.sourceType] += 1;
        counts.categoryCounts[costLine.category] += 1;
        if (typeof costLine.sourceReference === "string" && costLine.sourceReference.length > 0) {
          counts.sourceReferenceLineCount += 1;
        }
        if (source.sourcePartIds !== undefined) {
          counts.partLinkedLineCount += 1;
          counts.partReferenceCount += source.sourcePartIds.length;
          for (const partId of source.sourcePartIds) {
            partIds.add(partId);
            allPartIds.add(partId);
          }
        }
        if (source.resourceType !== undefined) counts.resourceLineCount += 1;
        if (source.hardwareId !== undefined) counts.hardwareLineCount += 1;
        if (source.hardwareFurnitureIds !== undefined) {
          counts.hardwareFurnitureReferenceCount += source.hardwareFurnitureIds.length;
          for (const furnitureId of source.hardwareFurnitureIds) {
            hardwareFurnitureIds.add(furnitureId);
            allHardwareFurnitureIds.add(furnitureId);
          }
        }
        if (source.hardwareSourceReferences !== undefined) {
          counts.hardwareBomReferenceCount += source.hardwareSourceReferences.length;
          for (const reference of source.hardwareSourceReferences) {
            hardwareBomReferences.add(reference);
            allHardwareBomReferences.add(reference);
          }
        }
        if (source.sourceType === "labor-operation") counts.laborOperationLineCount += 1;
        if (source.sourceType === "quote-adjustment") counts.quoteAdjustmentLineCount += 1;

        lines.push({
          costLineId: costLine.id,
          category: costLine.category,
          costLineUnit: costLine.unit,
          currencyCode: costLine.currencyCode,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          ...(costLine.sourceReference === undefined ? {} : { sourceReference: costLine.sourceReference }),
          ...(source.tariffId === undefined ? {} : { tariffId: source.tariffId }),
          ...(source.sourcePartIds === undefined ? {} : { sourcePartIds: [...source.sourcePartIds] }),
          ...(source.resourceType === undefined ? {} : { resourceType: source.resourceType }),
          ...(source.resourceId === undefined ? {} : { resourceId: source.resourceId }),
          ...(source.unit === undefined ? {} : { resourceUnit: source.unit }),
          ...(source.edgeDirection === undefined ? {} : { edgeDirection: source.edgeDirection }),
          ...(source.rollCount === undefined ? {} : { rollCount: source.rollCount }),
          ...(source.rollLengthMm === undefined ? {} : { rollLengthMm: source.rollLengthMm }),
          ...(source.purchasedLengthMm === undefined ? {} : { purchasedLengthMm: source.purchasedLengthMm }),
          ...(source.furnitureIds === undefined ? {} : { furnitureIds: [...source.furnitureIds] }),
          ...(source.planSourceReference === undefined ? {} : { planSourceReference: source.planSourceReference }),
          ...(source.priceSourceReference === undefined ? {} : { priceSourceReference: source.priceSourceReference }),
          ...(source.hardwareId === undefined ? {} : { hardwareId: source.hardwareId }),
          ...(source.hardwareUnit === undefined ? {} : { hardwareUnit: source.hardwareUnit }),
          ...(source.hardwareFurnitureIds === undefined ? {} : { hardwareFurnitureIds: [...source.hardwareFurnitureIds] }),
          ...(source.hardwareSourceReferences === undefined ? {} : { hardwareSourceReferences: [...source.hardwareSourceReferences] })
        });
      }

      const materialCostBasis = revision.pricingSnapshot.materialCostBasis;
      const stockSheetGroups: ProjectQuoteRevisionSourceMapAuditStockSheetGroup[] =
        materialCostBasis?.basis === "stock-sheet-purchase"
          ? materialCostBasis.stockSheetGroups.map(group => ({
              groupId: group.groupId,
              materialId: group.materialId,
              thicknessMm: group.thicknessMm,
              sourcePartIds: [...group.sourcePartIds],
              sheetCount: group.sheetCount,
              pricePerSheetMinor: group.pricePerSheetMinor,
              stockSheetCostMinor: group.stockSheetCostMinor,
              currencyCode: group.currencyCode,
              ...(group.sourceReference === undefined ? {} : { sourceReference: group.sourceReference })
            }))
          : [];
      const stockSheetPartIds = new Set<string>();
      for (const group of stockSheetGroups) {
        counts.stockSheetGroupCount += 1;
        counts.stockSheetPartReferenceCount += group.sourcePartIds.length;
        if (group.sourceReference !== undefined) counts.stockSheetPriceSourceReferenceCount += 1;
        for (const partId of group.sourcePartIds) {
          stockSheetPartIds.add(partId);
          allStockSheetPartIds.add(partId);
        }
      }
      counts.stockSheetUniquePartIdCount = stockSheetPartIds.size;

      const duplicateSourceIdentities = [...sourceIdentityLineReferences.values()]
        .filter((identity) => identity.costLineIds.length > 1)
        .map((identity) => ({
          sourceType: identity.sourceType,
          sourceId: identity.sourceId,
          costLineIds: [...identity.costLineIds].sort()
        }))
        .sort((left, right) => {
          if (left.sourceType !== right.sourceType) return left.sourceType < right.sourceType ? -1 : 1;
          if (left.sourceId === right.sourceId) return 0;
          return left.sourceId < right.sourceId ? -1 : 1;
        });
      counts.duplicateSourceIdentityCount = duplicateSourceIdentities.length;
      counts.duplicateSourceIdentityLineReferenceCount = duplicateSourceIdentities.reduce(
        (count, identity) => count + identity.costLineIds.length,
        0
      );
      counts.uniquePartIdCount = partIds.size;
      counts.uniqueHardwareFurnitureIdCount = hardwareFurnitureIds.size;
      counts.uniqueHardwareBomReferenceCount = hardwareBomReferences.size;
      addSourceMapAuditCounts(totals, counts);
      revisionAudits.push({
        revisionId: revision.revisionId,
        revisionNumber: revision.revisionNumber,
        createdAt: revision.createdAt,
        sourceIntegrityVersion: revision.sourceIntegrityVersion ?? null,
        counts,
        duplicateSourceIdentities,
        stockSheetGroups,
        lines
      });
    }

    totals.uniquePartIdCount = allPartIds.size;
    totals.stockSheetUniquePartIdCount = allStockSheetPartIds.size;
    totals.uniqueHardwareFurnitureIdCount = allHardwareFurnitureIds.size;
    totals.uniqueHardwareBomReferenceCount = allHardwareBomReferences.size;

    return deepFreeze({
      status: validatedHistory.status,
      audit: {
        schemaVersion: 1 as const,
        projectId: history.projectId,
        revisionCount: history.revisions.length,
        totals,
        revisions: revisionAudits
      },
      diagnostics: []
    });
  } catch (error) {
    return blockedSourceMapAudit(error instanceof Error ? error.message : String(error));
  }
}


function blockedSourceIntegrityAudit(message: string): ProjectQuoteRevisionSourceIntegrityAuditResult {
  return deepFreeze({
    status: "blocked" as const,
    audit: null,
    diagnostics: [message]
  });
}

/**
 * Reconciles strict (sourceIntegrityVersion 1) and legacy (missing marker)
 * revisions using the already validated, immutable source-map audit snapshots.
 */
export function calculateProjectQuoteRevisionSourceIntegrityAudit(
  historyValue: unknown
): ProjectQuoteRevisionSourceIntegrityAuditResult {
  const sourceMapResult = calculateProjectQuoteRevisionSourceMapAudit(historyValue);
  if (sourceMapResult.status === "blocked" || sourceMapResult.audit === null) {
    return blockedSourceIntegrityAudit(
      sourceMapResult.diagnostics[0] ?? "Teklif revizyon geçmişi bütünlük kapsamı için doğrulanamadı."
    );
  }

  try {
    const sourceMapAudit = sourceMapResult.audit;
    if (sourceMapAudit.revisions.length !== sourceMapAudit.revisionCount) {
      throw new Error("Bütünlük kapsamı revizyon denetim sayısı ile revisionCount eşleşmiyor.");
    }

    let strictRevisionCount = 0;
    let legacyRevisionCount = 0;
    const revisions: ProjectQuoteRevisionSourceIntegrityAuditRevision[] = [];

    for (const revision of sourceMapAudit.revisions) {
      if (revision.sourceIntegrityVersion === 1) {
        strictRevisionCount += 1;
      } else if (revision.sourceIntegrityVersion === null) {
        legacyRevisionCount += 1;
      } else {
        throw new Error("Revizyon kaynak bütünlüğü işareti desteklenen değerlerden biri değil.");
      }

      revisions.push({
        revisionId: revision.revisionId,
        revisionNumber: revision.revisionNumber,
        createdAt: revision.createdAt,
        sourceIntegrityVersion: revision.sourceIntegrityVersion
      });
    }

    if (strictRevisionCount + legacyRevisionCount !== sourceMapAudit.revisionCount) {
      throw new Error("Strict ve legacy revizyon sayıları proje revisionCount değerini karşılamıyor.");
    }

    return deepFreeze({
      status: sourceMapResult.status,
      audit: {
        schemaVersion: 1 as const,
        projectId: sourceMapAudit.projectId,
        revisionCount: sourceMapAudit.revisionCount,
        strictRevisionCount,
        legacyRevisionCount,
        revisions
      },
      diagnostics: []
    });
  } catch (error) {
    return blockedSourceIntegrityAudit(error instanceof Error ? error.message : String(error));
  }
}

export interface ProjectQuoteRevisionSourceMapProvenance {
  sourceType: ProjectQuoteLineSource["sourceType"];
  sourceId: string;
  sourceReference?: string;
  tariffId?: string;
  sourcePartIds?: readonly string[];
  resourceType?: ProjectQuoteLineSource["resourceType"];
  resourceId?: string;
  resourceUnit?: string;
  edgeDirection?: ProjectCostLineEdgeDirection;
  rollCount?: number;
  rollLengthMm?: number;
  purchasedLengthMm?: number;
  furnitureIds?: readonly string[];
  planSourceReference?: string;
  priceSourceReference?: string;
  hardwareId?: string;
  hardwareUnit?: string;
  hardwareFurnitureIds?: readonly string[];
  hardwareSourceReferences?: readonly string[];
}

export interface ProjectQuoteRevisionSourceMapProvenanceChange {
  type: "added" | "removed" | "changed";
  costLineId: string;
  from: ProjectQuoteRevisionSourceMapProvenance | null;
  to: ProjectQuoteRevisionSourceMapProvenance | null;
}

export interface ProjectQuoteRevisionSourceMapProvenanceComparison {
  schemaVersion: 1;
  projectId: string;
  fromRevisionId: string;
  fromRevisionNumber: number;
  toRevisionId: string;
  toRevisionNumber: number;
  fromSourceIntegrityVersion: 1 | null;
  toSourceIntegrityVersion: 1 | null;
  fromLineCount: number;
  toLineCount: number;
  counts: {
    addedLineCount: number;
    removedLineCount: number;
    changedLineCount: number;
    unchangedLineCount: number;
  };
  changes: readonly ProjectQuoteRevisionSourceMapProvenanceChange[];
}

export interface ProjectQuoteRevisionSourceMapProvenanceComparisonResult {
  status: "ready" | "blocked";
  comparison: DeepReadonly<ProjectQuoteRevisionSourceMapProvenanceComparison> | null;
  diagnostics: readonly string[];
}

function createSourceMapProvenanceSnapshot(
  line: ProjectQuoteRevisionSourceMapAuditLine
): ProjectQuoteRevisionSourceMapProvenance {
  return {
    sourceType: line.sourceType,
    sourceId: line.sourceId,
    ...(line.sourceReference === undefined ? {} : { sourceReference: line.sourceReference }),
    ...(line.tariffId === undefined ? {} : { tariffId: line.tariffId }),
    ...(line.sourcePartIds === undefined ? {} : { sourcePartIds: [...line.sourcePartIds] }),
    ...(line.resourceType === undefined ? {} : { resourceType: line.resourceType }),
    ...(line.resourceId === undefined ? {} : { resourceId: line.resourceId }),
    ...(line.resourceUnit === undefined ? {} : { resourceUnit: line.resourceUnit }),
    ...(line.edgeDirection === undefined ? {} : { edgeDirection: line.edgeDirection }),
    ...(line.rollCount === undefined ? {} : { rollCount: line.rollCount }),
    ...(line.rollLengthMm === undefined ? {} : { rollLengthMm: line.rollLengthMm }),
    ...(line.purchasedLengthMm === undefined ? {} : { purchasedLengthMm: line.purchasedLengthMm }),
    ...(line.furnitureIds === undefined ? {} : { furnitureIds: [...line.furnitureIds] }),
    ...(line.planSourceReference === undefined ? {} : { planSourceReference: line.planSourceReference }),
    ...(line.priceSourceReference === undefined ? {} : { priceSourceReference: line.priceSourceReference }),
    ...(line.hardwareId === undefined ? {} : { hardwareId: line.hardwareId }),
    ...(line.hardwareUnit === undefined ? {} : { hardwareUnit: line.hardwareUnit }),
    ...(line.hardwareFurnitureIds === undefined ? {} : { hardwareFurnitureIds: [...line.hardwareFurnitureIds] }),
    ...(line.hardwareSourceReferences === undefined ? {} : { hardwareSourceReferences: [...line.hardwareSourceReferences] })
  };
}

function blockedSourceMapProvenanceComparison(
  message: string
): ProjectQuoteRevisionSourceMapProvenanceComparisonResult {
  return deepFreeze({
    status: "blocked" as const,
    comparison: null,
    diagnostics: [message]
  });
}

/**
 * Compares only quote source-map metadata for two revisions.
 * Cost, quantity, unit-price and line-total changes remain in the monetary comparison API.
 * Matching uses validated costLineId; unpaired IDs are added/removed provenance rows.
 */
export function compareProjectQuoteRevisionSourceMaps(
  historyValue: unknown,
  fromRevisionIdValue: unknown,
  toRevisionIdValue: unknown
): ProjectQuoteRevisionSourceMapProvenanceComparisonResult {
  const validatedHistory = validateProjectQuoteRevisionHistory(historyValue);
  if (validatedHistory.status !== "ready" || validatedHistory.history === null) {
    return blockedSourceMapProvenanceComparison(
      validatedHistory.status === "empty"
        ? "Boş teklif geçmişinde kaynak eşlemesi karşılaştırılacak revizyon bulunmuyor."
        : validatedHistory.diagnostics[0] ?? "Teklif revizyon geçmişi kaynak karşılaştırması için doğrulanamadı."
    );
  }

  try {
    const fromRevisionId = requireIdentifier(fromRevisionIdValue, "Başlangıç revizyon kimliği");
    const toRevisionId = requireIdentifier(toRevisionIdValue, "Hedef revizyon kimliği");
    const revisions = validatedHistory.history.revisions;
    const fromRevision = revisions.find((revision) => revision.revisionId === fromRevisionId);
    const toRevision = revisions.find((revision) => revision.revisionId === toRevisionId);
    if (fromRevision === undefined || toRevision === undefined) {
      throw new Error("Kaynak karşılaştırma revizyon kimlikleri doğrulanmış geçmişte bulunmalıdır.");
    }
    if (toRevision.revisionNumber <= fromRevision.revisionNumber) {
      throw new Error("Kaynak karşılaştırma hedef revizyonu başlangıç revizyonundan daha yeni olmalıdır.");
    }

    const auditResult = calculateProjectQuoteRevisionSourceMapAudit(validatedHistory.history);
    if (auditResult.status !== "ready" || auditResult.audit === null) {
      throw new Error(auditResult.diagnostics[0] ?? "Kaynak haritası denetimi karşılaştırma için üretilemedi.");
    }
    const fromAudit = auditResult.audit.revisions.find((revision) => revision.revisionId === fromRevisionId);
    const toAudit = auditResult.audit.revisions.find((revision) => revision.revisionId === toRevisionId);
    if (fromAudit === undefined || toAudit === undefined) {
      throw new Error("Kaynak karşılaştırma revizyon denetimleri doğrulanmış geçmişle eşleşmiyor.");
    }

    const fromLines = new Map(fromAudit.lines.map((line) => [line.costLineId, line]));
    const toLines = new Map(toAudit.lines.map((line) => [line.costLineId, line]));
    const costLineIds = [...new Set([...fromLines.keys(), ...toLines.keys()])].sort();
    const counts = {
      addedLineCount: 0,
      removedLineCount: 0,
      changedLineCount: 0,
      unchangedLineCount: 0
    };
    const changes: ProjectQuoteRevisionSourceMapProvenanceChange[] = [];

    for (const costLineId of costLineIds) {
      const fromLine = fromLines.get(costLineId);
      const toLine = toLines.get(costLineId);
      const from = fromLine === undefined ? null : createSourceMapProvenanceSnapshot(fromLine);
      const to = toLine === undefined ? null : createSourceMapProvenanceSnapshot(toLine);
      if (from === null) {
        counts.addedLineCount += 1;
        changes.push({ type: "added", costLineId, from: null, to });
      } else if (to === null) {
        counts.removedLineCount += 1;
        changes.push({ type: "removed", costLineId, from, to: null });
      } else if (JSON.stringify(from) !== JSON.stringify(to)) {
        counts.changedLineCount += 1;
        changes.push({ type: "changed", costLineId, from, to });
      } else {
        counts.unchangedLineCount += 1;
      }
    }

    return deepFreeze({
      status: "ready" as const,
      comparison: {
        schemaVersion: 1 as const,
        projectId: validatedHistory.history.projectId,
        fromRevisionId,
        fromRevisionNumber: fromRevision.revisionNumber,
        toRevisionId,
        toRevisionNumber: toRevision.revisionNumber,
        fromSourceIntegrityVersion: fromAudit.sourceIntegrityVersion,
        toSourceIntegrityVersion: toAudit.sourceIntegrityVersion,
        fromLineCount: fromAudit.lines.length,
        toLineCount: toAudit.lines.length,
        counts,
        changes
      },
      diagnostics: []
    });
  } catch (error) {
    return blockedSourceMapProvenanceComparison(error instanceof Error ? error.message : String(error));
  }
}
