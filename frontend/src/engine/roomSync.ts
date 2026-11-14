// Oda / mobilya senkronizasyonu.
// Oda ölçüleri değiştiğinde mobilya konumları oda sınırları içine alınır;
// geçerli yerleşimler korunur. Bütün hesaplar milimetre cinsinden yapılır,
// döndürülen konumlar metre cinsindendir (sahne birimi).

import { normalizeRotation, rotatedHalfExtent } from "./measurement";

export interface RoomDimensionsMm {
  width: number;
  length: number;
  height: number;
}

export interface FurniturePlacement {
  id: string;
  width: number;
  height: number;
  depth: number;
  rotation: number;
  position: [number, number, number];
}

// Tek bir mobilyanın konumunu oda sınırları içine alır (metre cinsinden).
export function clampPositionToRoom(
  position: [number, number, number],
  widthMm: number,
  heightMm: number,
  depthMm: number,
  rotationDeg: number,
  room: RoomDimensionsMm
): [number, number, number] {
  const angle = (normalizeRotation(rotationDeg) * Math.PI) / 180;
  const half = rotatedHalfExtent(widthMm, depthMm, angle);

  const halfWidthM = half.x / 1000;
  const halfDepthM = half.z / 1000;

  const roomHalfWidthM = room.width / 2000;
  const roomHalfLengthM = room.length / 2000;

  const x = Math.max(
    -roomHalfWidthM + halfWidthM,
    Math.min(roomHalfWidthM - halfWidthM, position[0])
  );

  const z = Math.max(
    -roomHalfLengthM + halfDepthM,
    Math.min(roomHalfLengthM - halfDepthM, position[2])
  );

  const halfHeightM = heightMm / 2000;
  const y = Math.max(
    halfHeightM,
    Math.min(room.height / 1000 - halfHeightM, position[1])
  );

  return [x, y, z];
}

// Tüm mobilyaları oda sınırları içine alır.
export function clampFurnitureToRoom<T extends FurniturePlacement>(
  furniture: T[],
  room: RoomDimensionsMm
): T[] {
  return furniture.map((item) => ({
    ...item,
    position: clampPositionToRoom(
      item.position,
      item.width,
      item.height,
      item.depth,
      item.rotation,
      room
    )
  }));
}

// Mobilya boyutları için oda sınırlarını kontrol eder.
// Boyut, odaya sığmayacak ölçekte küçüldürülür (mm cinsinden döner).
export function clampDimensionsToRoom(
  widthMm: number,
  heightMm: number,
  depthMm: number,
  rotationDeg: number,
  room: RoomDimensionsMm
): { width: number; height: number; depth: number } {
  const angle = (normalizeRotation(rotationDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));

  let width = Math.max(100, widthMm);
  let depth = Math.max(100, depthMm);
  const height = Math.max(100, Math.min(heightMm, room.height));

  for (let attempt = 0; attempt < 8; attempt++) {
    const halfWidthM = (cos * width + sin * depth) / 2000;
    const halfDepthM = (sin * width + cos * depth) / 2000;

    const widthFits = halfWidthM <= room.width / 2000;
    const depthFits = halfDepthM <= room.length / 2000;

    if (widthFits && depthFits) break;

    if (!widthFits) {
      width = Math.max(100, Math.floor((room.width * 1000) / (cos + (sin * depth) / width)));
    }
    if (!depthFits) {
      depth = Math.max(100, Math.floor((room.length * 1000) / ((sin * width) / depth + cos)));
    }
  }

  return { width, height, depth };
}
