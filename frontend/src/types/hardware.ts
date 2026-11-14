// Mobilya bağlantı elemanları ve aksesuarları

export type HardwareType =
  | "hinge"
  | "drawer-slide"
  | "minifix"
  | "dowel"
  | "shelf-pin"
  | "handle"
  | "other";

export interface HardwareHole {
  x: number;
  y: number;
  z: number;
  diameter: number;
  depth: number;
  face: "front" | "back" | "top" | "bottom" | "left" | "right";
}

export interface Hardware {
  id: string;
  name: string;
  type: HardwareType;

  // Üretici ve ürün bilgileri
  manufacturer: string;
  model: string;

  // Kullanım miktarı
  quantity: number;

  // Delik özellikleri
  holeDiameter: number;
  holeDepth: number;
  holePositions: HardwareHole[];

  // Montaj bilgileri
  edgeDistance: number;
  centerDistance: number;

  // CNC takım bilgisi
  toolDiameter: number;
  productionNote?: string;
}