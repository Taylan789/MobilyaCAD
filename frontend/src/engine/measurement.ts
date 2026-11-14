// MobilyaCAD ölçüm yardımcıları
// Bütün ölçüler milimetre cinsindendir.

// Ölçünün geçerli olup olmadığını kontrol eder.
export function validateMeasurement(
  value: number,
  name: string
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} ölçüsü sıfırdan büyük olmalıdır.`);
  }
}

// Ölçüyü 0.1 mm hassasiyetinde yuvarlar.
export function roundMeasurement(value: number): number {
  return Math.round(value * 10) / 10;
}

// İki ölçünün toplamını hesaplar.
export function addMeasurements(
  first: number,
  second: number
): number {
  return roundMeasurement(first + second);
}

// İki ölçünün farkını hesaplar.
export function subtractMeasurements(
  first: number,
  second: number
): number {
  const result = first - second;

  if (result < 0) {
    throw new Error("Hesaplanan ölçü negatif olamaz.");
  }

  return roundMeasurement(result);
}
