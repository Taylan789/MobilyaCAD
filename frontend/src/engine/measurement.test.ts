import { describe, it, expect } from "vitest";
import {
  validateMeasurement,
  roundMeasurement,
  addMeasurements,
  subtractMeasurements
} from "../engine/measurement";

describe("measurement", () => {
  it("validateMeasurement kabul edilir pozitif sonlu sayı", () => {
    expect(() => validateMeasurement(18, "test")).not.toThrow();
  });

  it("validateMeasurement sıfır ve negatif değerleri reddeder", () => {
    expect(() => validateMeasurement(0, "test")).toThrow();
    expect(() => validateMeasurement(-5, "test")).toThrow();
  });

  it("validateMeasurement sonlu olmayan değerleri reddeder", () => {
    expect(() => validateMeasurement(Number.NaN, "test")).toThrow();
    expect(() => validateMeasurement(Number.POSITIVE_INFINITY, "test")).toThrow();
  });

  it("roundMeasurement 0.1 mm hassasiyetine yuvarlar", () => {
    expect(roundMeasurement(10.46)).toBe(10.5);
    expect(roundMeasurement(10.44)).toBe(10.4);
  });

  it("addMeasurements toplamı yuvarlar", () => {
    expect(addMeasurements(10.46, 5.12)).toBe(15.6);
  });

  it("subtractMeasurements negatif sonucu reddeder", () => {
    expect(() => subtractMeasurements(5, 10)).toThrow();
    expect(subtractMeasurements(10, 5)).toBe(5);
  });
});
