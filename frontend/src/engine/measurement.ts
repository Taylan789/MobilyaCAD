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

// Boyutu belirlenen sınırlar içine alır (negatif/sıfır boyutu üretmez).
export function clampDimension(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

// Dönüş açısını [0, 360) aralığına normalleştirir.
export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

// Dikdörtgenin döndürülmüş dış sarmal yarı genişliğini (mm) döndürür.
export function rotatedHalfExtent(
  width: number,
  depth: number,
  angleRad: number
): { x: number; z: number } {
  const cos = Math.abs(Math.cos(angleRad));
  const sin = Math.abs(Math.sin(angleRad));
  return {
    x: (cos * width + sin * depth) / 2,
    z: (sin * width + cos * depth) / 2
  };
}
