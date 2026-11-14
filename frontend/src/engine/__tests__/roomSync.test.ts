import { describe, expect, it } from "vitest";
import {
  clampDimensionsToRoom,
  clampFurnitureToRoom,
  clampPositionToRoom
} from "../roomSync";

describe("roomSync", () => {
  const room = { width: 4000, length: 5000, height: 2800 };

  it("geçerli konumu değiştirmemelidir", () => {
    const result = clampPositionToRoom([0, 0.425, 0], 600, 850, 560, 0, room);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(0.425, 6);
    expect(result[2]).toBe(0);
  });

  it("oda dışındaki konumu sınırlar içine almalıdır", () => {
    const result = clampPositionToRoom([10, 0.425, 10], 600, 850, 560, 0, room);
    expect(result[0]).toBeCloseTo(1.7, 6);
    expect(result[2]).toBeCloseTo(2.2, 6);
  });

  it("döndürülmüş mobilya için dış sarmalı sınırları kullanmalıdır", () => {
    const angle = Math.PI / 4;
    const halfX = (Math.cos(angle) * 600 + Math.sin(angle) * 560) / 2 / 1000;
    const roomSmall = { width: 1000, length: 1000, height: 2800 };
    const result = clampPositionToRoom(
      [0.5, 0.425, 0.5],
      600,
      850,
      560,
      45,
      roomSmall
    );
    expect(result[0]).toBeCloseTo(0.5 - halfX, 6);
    expect(result[2]).toBeCloseTo(0.5 - halfX, 6);
  });

  it("yüksekliği oda yüksekliğine göre sınırlamalıdır", () => {
    const result = clampPositionToRoom([0, 2.5, 0], 600, 850, 560, 0, room);
    expect(result[1]).toBeCloseTo(2.8 - 0.425, 6);
  });

  it("oda küçüldüğünde tüm mobilyaları sınırlar içine almalıdır", () => {
    const furniture = [
      {
        id: "a",
        width: 600,
        height: 850,
        depth: 560,
        rotation: 0,
        position: [1.9, 0.425, 2.4] as [number, number, number]
      }
    ];
    const smallRoom = { width: 2000, length: 2000, height: 2800 };
    const clamped = clampFurnitureToRoom(furniture, smallRoom);
    expect(Math.abs(clamped[0].position[0])).toBeLessThanOrEqual(1.0 - 0.3 + 1e-9);
    expect(Math.abs(clamped[0].position[2])).toBeLessThanOrEqual(1.0 - 0.28 + 1e-9);
  });

  it("boyutları odaya sığdırmalıdır", () => {
    const result = clampDimensionsToRoom(6000, 850, 560, 0, room);
    expect(result.width).toBe(4000);
    expect(result.height).toBe(850);
    expect(result.depth).toBe(560);
  });

  it("negatif boyutları asla üretmemelidir", () => {
    const result = clampDimensionsToRoom(-100, 50, 50, 0, room);
    expect(result.width).toBeGreaterThanOrEqual(100);
    expect(result.height).toBeGreaterThanOrEqual(100);
    expect(result.depth).toBeGreaterThanOrEqual(100);
  });
});
