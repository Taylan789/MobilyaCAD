const MAX_DIMENSION_MM = 280000;

export function validateDimensionMillimeters(rawValue: string): string | null {
  const normalized = rawValue.trim();
  if (normalized === "") return "Ölçü boş bırakılamaz.";

  const value = Number(normalized);
  if (!Number.isFinite(value)) return "Geçerli bir sayı gir.";
  if (value < 1) return "Ölçü en az 1 mm olmalıdır.";
  if (value > MAX_DIMENSION_MM) return "Ölçü 280000 mm sınırını aşamaz.";

  return null;
}

export function validatePositionMillimeters(rawValue: string): string | null {
  const normalized = rawValue.trim();
  if (normalized === "") return "Konum boş bırakılamaz.";

  const value = Number(normalized);
  if (!Number.isFinite(value)) return "Geçerli bir sayı gir.";
  if (Math.abs(value) > MAX_DIMENSION_MM) {
    return "Konum -280000 ile 280000 mm arasında olmalıdır.";
  }

  return null;
}
