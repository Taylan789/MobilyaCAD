/**
 * Normalizes a catalogue material label for identity comparisons.
 * Stable IDs remain authoritative; labels are compared after Unicode compatibility,
 * whitespace and case normalization to catch inconsistent cross-family catalogues.
 */
export function normalizeMaterialCatalogLabel(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}
