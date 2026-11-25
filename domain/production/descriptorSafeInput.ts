/**
 * Copies a bounded array of plain records using own data descriptors only.
 * Accessors, inherited/custom prototypes, sparse or extended arrays and Proxy
 * reflection failures are rejected before any row value is read.
 */
export function copyDenseDataRecordList(
  value: unknown,
  label: string,
  allowedKeys: ReadonlySet<string>,
  maximum: number
): Record<string, unknown>[] {
  try {
    if (!Array.isArray(value)) {
      throw new Error(label + " liste olmalı ve " + maximum + " satırı aşmamalıdır.");
    }

    const arrayPrototype = Object.getPrototypeOf(value);
    if (arrayPrototype !== Array.prototype) {
      throw new Error(label + " standart dizi olmalıdır.");
    }

    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const length = lengthDescriptor && "value" in lengthDescriptor ? lengthDescriptor.value : undefined;
    if (
      typeof length !== "number" ||
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > maximum
    ) {
      throw new Error(label + " liste olmalı ve " + maximum + " satırı aşmamalıdır.");
    }

    const arrayKeys = Reflect.ownKeys(value);
    if (arrayKeys.length !== length + 1) {
      throw new Error(label + " dizileri yoğun ve ek özelliksiz olmalıdır.");
    }
    for (const key of arrayKeys) {
      if (key === "length") continue;
      if (
        typeof key !== "string" ||
        !/^(0|[1-9]\d*)$/.test(key) ||
        Number(key) >= length
      ) {
        throw new Error(label + " dizileri yalnızca sıralı indeks içermelidir.");
      }
    }

    const copied: Record<string, unknown>[] = [];
    for (let index = 0; index < length; index += 1) {
      const rowDescriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!rowDescriptor || !rowDescriptor.enumerable || !("value" in rowDescriptor)) {
        throw new Error(label + " dizileri own enumerable data property içermelidir.");
      }

      const row = rowDescriptor.value;
      if (typeof row !== "object" || row === null || Array.isArray(row)) {
        throw new Error(label + " satırları düz JSON nesnesi olmalıdır.");
      }

      const rowPrototype = Object.getPrototypeOf(row);
      if (rowPrototype !== Object.prototype && rowPrototype !== null) {
        throw new Error(label + " satırları düz JSON nesnesi olmalıdır.");
      }

      const rowCopy = Object.create(null) as Record<string, unknown>;
      for (const key of Reflect.ownKeys(row)) {
        if (typeof key !== "string") {
          throw new Error(label + " satırları sembol anahtarı içeremez.");
        }
        if (!allowedKeys.has(key)) {
          throw new Error(label + " satırı desteklenmeyen alan içeriyor: " + key + ".");
        }

        const descriptor = Object.getOwnPropertyDescriptor(row, key);
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
          throw new Error(label + " satırları own enumerable data property içermelidir.");
        }
        Object.defineProperty(rowCopy, key, {
          value: descriptor.value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
      copied.push(rowCopy);
    }

    return copied;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(label + " güvenli biçimde incelenemedi.");
  }
}
