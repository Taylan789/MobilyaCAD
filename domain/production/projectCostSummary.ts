/**
 * Explicit, user-supplied project cost calculation.
 *
 * Prices are expressed in the smallest currency unit supplied by the caller.
 * Quantities are decimal values with at most six meaningful fractional places.
 * No catalogue price, currency conversion, tax, waste percentage or margin is inferred.
 */

export const PROJECT_COST_CATEGORIES = [
  "material",
  "hardware",
  "labor",
  "operation",
  "waste",
  "profit"
] as const;

export type ProjectCostCategory = (typeof PROJECT_COST_CATEGORIES)[number];

export type ProjectCostLineEdgeDirection = "top" | "bottom" | "left" | "right";

export interface ProjectCostLineInput {
  id: string;
  category: ProjectCostCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  currencyCode: string;
  sourceReference?: string;
  /** Explicit direction for edge-banding consumption; descriptions remain display-only. */
  edgeDirection?: ProjectCostLineEdgeDirection;
}


export interface ProjectCostLine extends ProjectCostLineInput {
  lineTotalMinor: number;
}

export type ProjectCostCategoryTotals = Record<ProjectCostCategory, number>;

export interface ProjectCostSummary {
  status: "empty" | "ready";
  currencyCode: string | null;
  lineCount: number;
  lines: ProjectCostLine[];
  categoryTotalsMinor: ProjectCostCategoryTotals;
  grandTotalMinor: number;
}

const quantityScale = 1_000_000n;
const quantityDecimalPlaces = 6;
const identifierPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const currencyPattern = /^[A-Z]{3}$/;
const allowedLineKeys = new Set([
  "id",
  "category",
  "description",
  "quantity",
  "unit",
  "unitPriceMinor",
  "currencyCode",
  "sourceReference",
  "edgeDirection"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireTrimmedText(value: unknown, label: string, maxLength: number): string {
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

function quantityToMicros(value: unknown, label: string): bigint {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error(label + " pozitif, sonlu ve güvenli aralıkta bir sayı olmalıdır.");
  }

  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(value.toString().toLowerCase());
  if (!match) {
    throw new Error(label + " ondalık miktar olarak okunamadı.");
  }

  const whole = match[1];
  const fraction = match[2] ?? "";
  const exponent = Number(match[3] ?? 0);
  let digits = BigInt(whole + fraction);
  let decimalPlaces = fraction.length - exponent;

  if (decimalPlaces < 0) {
    digits *= 10n ** BigInt(-decimalPlaces);
    decimalPlaces = 0;
  }

  if (decimalPlaces > quantityDecimalPlaces) {
    const divisor = 10n ** BigInt(decimalPlaces - quantityDecimalPlaces);
    if (digits % divisor !== 0n) {
      throw new Error(label + " en fazla " + quantityDecimalPlaces + " anlamlı ondalık basamak içerebilir.");
    }
    digits /= divisor;
    decimalPlaces = quantityDecimalPlaces;
  }

  return digits * 10n ** BigInt(quantityDecimalPlaces - decimalPlaces);
}

function toSafeMinorUnits(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(label + " güvenli tam sayı aralığını aşıyor.");
  }
  return Number(value);
}

/**
 * Calculates a single line using the same six-decimal quantity and half-up
 * minor-unit rounding rule used by the project cost summary.
 */
export function calculateProjectCostLineTotalMinor(
  quantity: unknown,
  unitPriceMinor: unknown,
  label = "Maliyet satırı"
): number {
  if (
    typeof unitPriceMinor !== "number" ||
    !Number.isSafeInteger(unitPriceMinor) ||
    unitPriceMinor < 0
  ) {
    throw new Error(label + " birim fiyatı negatif olmayan güvenli bir tam sayı olmalıdır.");
  }

  const quantityMicros = quantityToMicros(quantity, label + " miktarı");
  const lineTotal = (
    quantityMicros * BigInt(unitPriceMinor) + quantityScale / 2n
  ) / quantityScale;
  return toSafeMinorUnits(lineTotal, label + " satır tutarı");
}

function emptyCategoryTotals(): ProjectCostCategoryTotals {
  return {
    material: 0,
    hardware: 0,
    labor: 0,
    operation: 0,
    waste: 0,
    profit: 0
  };
}

/**
 * Calculates explicit quote line totals.
 *
 * Each line is rounded independently to the nearest supplied minor currency
 * unit using half-up rounding. No conversion is performed between units or
 * currencies. Invalid input rejects the complete calculation.
 */
export function calculateProjectCostSummary(value: unknown): ProjectCostSummary {
  if (!Array.isArray(value)) {
    throw new Error("Proje maliyet kalemleri bir liste olmalıdır.");
  }

  const lines: ProjectCostLine[] = [];
  const seenIds = new Set<string>();
  const categoryTotals = Object.fromEntries(
    PROJECT_COST_CATEGORIES.map((category) => [category, 0n])
  ) as Record<ProjectCostCategory, bigint>;
  let grandTotal = 0n;
  let currencyCode: string | null = null;

  for (const [index, rawLine] of value.entries()) {
    const label = "Maliyet kaleminin " + (index + 1) + ". satırı";
    if (!isRecord(rawLine)) {
      throw new Error(label + " geçerli bir nesne olmalıdır.");
    }

    for (const key of Object.keys(rawLine)) {
      if (!allowedLineKeys.has(key)) {
        throw new Error(label + " desteklenmeyen alan içeriyor: " + key + ".");
      }
    }

    const id = requireTrimmedText(rawLine.id, label + " kimliği", 64);
    if (!identifierPattern.test(id)) {
      throw new Error(label + " kimliği geçersiz.");
    }
    if (seenIds.has(id)) {
      throw new Error("Yinelenen proje maliyet kalemi kimliği: " + id + ".");
    }
    seenIds.add(id);

    if (
      typeof rawLine.category !== "string" ||
      !(PROJECT_COST_CATEGORIES as readonly string[]).includes(rawLine.category)
    ) {
      throw new Error(id + " maliyet kategorisi desteklenmiyor.");
    }
    const category = rawLine.category as ProjectCostCategory;
    const edgeDirection = rawLine.edgeDirection === undefined ? undefined : rawLine.edgeDirection;
    if (edgeDirection !== undefined && (category !== "material" ||
        edgeDirection !== "top" && edgeDirection !== "bottom" && edgeDirection !== "left" && edgeDirection !== "right")) {
      throw new Error(id + " kenar yönü yalnızca material satırlarında top, bottom, left veya right olabilir.");
    }
    const description = requireTrimmedText(rawLine.description, id + " açıklaması", 240);
    const unit = requireTrimmedText(rawLine.unit, id + " birimi", 32);
    const lineCurrency = requireTrimmedText(rawLine.currencyCode, id + " para birimi kodu", 3);
    if (!currencyPattern.test(lineCurrency)) {
      throw new Error(id + " para birimi kodu üç büyük harf olmalıdır.");
    }
    if (currencyCode !== null && currencyCode !== lineCurrency) {
      throw new Error("Tek proje maliyet özetinde farklı para birimleri birlikte kullanılamaz.");
    }
    currencyCode = lineCurrency;

    if (
      typeof rawLine.unitPriceMinor !== "number" ||
      !Number.isSafeInteger(rawLine.unitPriceMinor) ||
      rawLine.unitPriceMinor < 0
    ) {
      throw new Error(id + " birim fiyatı negatif olmayan güvenli bir tam sayı olmalıdır.");
    }

    const sourceReference = rawLine.sourceReference === undefined
      ? undefined
      : requireTrimmedText(rawLine.sourceReference, id + " kaynak referansı", 256);

    const lineTotalMinor = calculateProjectCostLineTotalMinor(
      rawLine.quantity,
      rawLine.unitPriceMinor,
      id
    );
    const lineTotal = BigInt(lineTotalMinor);

    categoryTotals[category] += lineTotal;
    grandTotal += lineTotal;

    lines.push({
      id,
      category,
      description,
      quantity: rawLine.quantity as number,
      unit,
      unitPriceMinor: rawLine.unitPriceMinor,
      currencyCode: lineCurrency,
      ...(sourceReference === undefined ? {} : { sourceReference }),
      ...(edgeDirection === undefined ? {} : { edgeDirection }),
      lineTotalMinor
    });
  }

  const categoryTotalsMinor = emptyCategoryTotals();
  for (const category of PROJECT_COST_CATEGORIES) {
    categoryTotalsMinor[category] = toSafeMinorUnits(
      categoryTotals[category],
      category + " maliyet toplamı"
    );
  }

  return {
    status: lines.length === 0 ? "empty" : "ready",
    currencyCode,
    lineCount: lines.length,
    lines,
    categoryTotalsMinor,
    grandTotalMinor: toSafeMinorUnits(grandTotal, "Proje maliyet toplamı")
  };
}
