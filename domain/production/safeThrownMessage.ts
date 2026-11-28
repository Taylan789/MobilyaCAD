const safeValidationErrorMessages = new WeakMap<object, string>();

/** Creates a validation error whose message can be recovered without inspecting the thrown value. */
export function createSafeValidationError(message: string): Error {
  const error = new Error(message);
  safeValidationErrorMessages.set(error, message);
  return error;
}

/**
 * Reads only primitive strings or messages registered for internally-created
 * validation errors. Arbitrary objects, accessors and Proxies are never
 * reflected, coerced or stringified.
 */
export function safeThrownMessage(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value.trim() === "" ? fallback : value;
  }
  if ((typeof value === "object" && value !== null) || typeof value === "function") {
    return safeValidationErrorMessages.get(value as object) ?? fallback;
  }
  return fallback;
}
