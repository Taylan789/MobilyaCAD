import type { ProjectQuotePricingSnapshot } from "./projectQuotePricingSnapshot.ts";

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
  "pricingSnapshot"
]);
const historyInputKeys = new Set(["projectId", "revisions"]);
const appendInputKeys = new Set(["revisionId", "createdAt", "pricingSnapshot"]);
const revisionEnvelopeKeys = new Set([
  "schemaVersion",
  "projectId",
  "revisionId",
  "revisionNumber",
  "createdAt",
  "previousRevisionId",
  "pricingSnapshot"
]);
const referenceKeys = new Set(["projectId", "revisionId", "revisionNumber", "createdAt"]);
const snapshotKeys = new Set([
  "schemaVersion",
  "quotedOn",
  "consumptionPriceList",
  "laborOperationTariffList",
  "quoteSummary"
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
  "lineTotalMinor"
]);
const sourceKeys = new Set(["costLineId", "sourceType", "sourceId", "tariffId"]);
const costCategories = ["material", "hardware", "labor", "operation", "waste", "profit"];
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;
const currencyPattern = /^[A-Z]{3}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function requireSafeInteger(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(label + " en az " + minimum + " olan güvenli bir tam sayı olmalıdır.");
  }
  return value;
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

function validateQuoteSummary(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("Teklif snapshot özeti geçerli bir nesne olmalıdır.");
  }
  requireOnlyKeys(value, summaryKeys, "Teklif snapshot özeti");
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
    void unitPriceMinor;
    lineTotalSum += BigInt(lineTotalMinor);
    categorySums.set(line.category, (categorySums.get(line.category) ?? 0n) + BigInt(lineTotalMinor));

    if (source.costLineId !== lineId) {
      throw new Error("Teklif kaynak eşlemesi maliyet satırı kimliğiyle uyuşmuyor.");
    }
    requireIdentifier(source.sourceId, "Teklif kaynak kimliği");
    if (source.sourceType !== "production-consumption" && source.sourceType !== "labor-operation" && source.sourceType !== "quote-adjustment") {
      throw new Error("Teklif kaynak türü desteklenmiyor.");
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

function validatePricingSnapshot(value: unknown): asserts value is ProjectQuotePricingSnapshot {
  if (!isRecord(value)) {
    throw new Error("Teklif fiyat snapshot'ı geçerli bir nesne olmalıdır.");
  }
  requireOnlyKeys(value, snapshotKeys, "Teklif fiyat snapshot'ı");
  if (value.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen teklif fiyat snapshot sürümü.");
  }
  const quotedOn = requireDateOnly(value.quotedOn, "Teklif tarihi");
  const quoteSummary = value.quoteSummary;
  validateQuoteSummary(quoteSummary);
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
export function createProjectQuoteRevision(value: unknown): ProjectQuoteRevisionResult {
  if (!isRecord(value)) {
    return blocked("Teklif revizyon girdisi geçerli bir nesne olmalıdır.");
  }

  try {
    requireOnlyKeys(value, inputKeys, "Teklif revizyon girdisi");
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

    validatePricingSnapshot(value.pricingSnapshot);
    const clonedSnapshot = cloneJsonValue(value.pricingSnapshot) as ProjectQuotePricingSnapshot;
    const revision = deepFreeze({
      schemaVersion: 1 as const,
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
function blockedHistory(message: string): ProjectQuoteRevisionHistoryResult {
  return deepFreeze({ status: "blocked" as const, history: null, diagnostics: [message] });
}

/**
 * Validates an append-only quote revision history for one project.
 * The supplied order is authoritative: revisions are never sorted or repaired.
 */
export function validateProjectQuoteRevisionHistory(value: unknown): ProjectQuoteRevisionHistoryResult {
  if (!isRecord(value)) return blockedHistory("Teklif revizyon geçmişi geçerli bir nesne olmalıdır.");
  try {
    requireOnlyKeys(value, historyInputKeys, "Teklif revizyon geçmişi");
    const projectId = requireIdentifier(value.projectId, "Geçmiş proje kimliği");
    if (!Array.isArray(value.revisions)) throw new Error("Teklif revizyon geçmişi revisions dizisi içermelidir.");
    if (value.revisions.length === 0) {
      return deepFreeze({
        status: "empty" as const,
        history: { schemaVersion: 1 as const, projectId, revisions: [] },
        diagnostics: []
      });
    }
    const revisionIds = new Set<string>();
    const revisions: DeepReadonly<ProjectQuoteRevision>[] = [];
    for (let index = 0; index < value.revisions.length; index += 1) {
      const candidate = value.revisions[index];
      const label = "Revizyon " + (index + 1);
      if (!isRecord(candidate)) throw new Error(label + " geçerli bir nesne olmalıdır.");
      requireOnlyKeys(candidate, revisionEnvelopeKeys, label);
      if (candidate.schemaVersion !== 1) throw new Error(label + " desteklenen revizyon şemasını kullanmalıdır.");
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
      const result = createProjectQuoteRevision({
        projectId: candidateProjectId, revisionId, revisionNumber, createdAt: candidate.createdAt,
        previousRevision: previous === null ? null : {
          projectId: previous.projectId, revisionId: previous.revisionId,
          revisionNumber: previous.revisionNumber, createdAt: previous.createdAt
        },
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
  const validatedHistory = validateProjectQuoteRevisionHistory(historyValue);
  if (validatedHistory.status === "blocked" || validatedHistory.history === null) {
    return blockedHistory(validatedHistory.diagnostics[0] ?? "Teklif revizyon geçmişi doğrulanamadı.");
  }
  if (!isRecord(revisionValue)) {
    return blockedHistory("Yeni teklif revizyon girdisi geçerli bir nesne olmalıdır.");
  }

  try {
    requireOnlyKeys(revisionValue, appendInputKeys, "Yeni teklif revizyon girdisi");
    const currentHistory = validatedHistory.history;
    const revisionId = requireIdentifier(revisionValue.revisionId, "Yeni revizyon kimliği");
    const createdAt = requireDateTime(revisionValue.createdAt, "Yeni revizyon oluşturulma tarihi");

    if (currentHistory.revisions.some((revision) => revision.revisionId === revisionId)) {
      throw new Error("Yeni revizyon kimliği mevcut geçmişte zaten kullanılmış olmalıdır; revisionId benzersiz olmalıdır.");
    }

    const previous = currentHistory.revisions.length === 0
      ? null
      : currentHistory.revisions[currentHistory.revisions.length - 1];
    const created = createProjectQuoteRevision({
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
      pricingSnapshot: revisionValue.pricingSnapshot
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
