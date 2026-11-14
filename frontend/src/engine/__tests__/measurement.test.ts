import { describe, expect, it } from "vitest";
import {
  clampDimension,
  normalizeRotation,
  rotatedHalfExtent,
  roundMeasurement,
  subtractMeasurements,
  validateMeasurement
} from "../measurement";

describe("measurement", () => {
  it("yuvarlama 0.1 mm hassasiyetine sahip olmalıdır", () => {
    expect(roundMeasurement(2.3456)).toBe(2.3);
    expect(roundMeasurement(10.05)).toBe(10.1);
  });

  it("geçersiz ölçülerde hata fırlatmalıdır", () => {
    expect(() => validateMeasurement(0, "test")).toThrow();
    expect(() => validateMeasurement(-5, "test")).toThrow();
    expect(() => validateMeasurement(Number.NaN, "test")).toThrow();
    expect(() => validateMeasurement(10, "test")).not.toThrow();
  });

  it("çıkarma negatif sonuçta hata fırlatmalıdır", () => {
    expect(subtractMeasurements(10, 4)).toBe(6);
    expect(() => subtractMeasurements(4, 10)).toThrow();
  });

  it("boyutu sınırlar içinde tutmalıdır", () => {
    expect(clampDimension(50, 100, 500)).toBe(100);
    expect(clampDimension(999, 100, 500)).toBe(500);
    expect(clampDimension(250.4, 100, 500)).toBe(250);
    expect(clampDimension(Number.NaN, 100, 500)).toBe(100);
  });

  it("dönüş açısını [0,360) aralığına normalleştirmelidir", () => {
    expect(normalizeRotation(370)).toBe(10);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(Number.NaN)).toBe(0);
  });

  it("döndürülmüş dış sarmal yarı genişliğini doğru hesaplamalıdır", () => {
    const straight = rotatedHalfExtent(600, 560, 0);
    expect(straight.x).toBeCloseTo(300, 6);
    expect(straight.z).toBeCloseTo(280, 6);

    const quarter = rotatedHalfExtent(600, 560, Math.PI / 2);
    expect(quarter.x).toBeCloseTo(280, 6);
    expect(quarter.z).toBeCloseTo(300, 6);
  });
});
