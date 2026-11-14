// Mobilya üretiminde kullanılacak parçaların veri yapısı.
// Bütün ölçüler milimetredir.

export type CncOperationType =
  | "drill"
  | "pocket"
  | "groove"
  | "cut"
  | "hinge-cup"
  | "dowel"
  | "minifix";

export interface CncOperation {
  id: string;
  type: CncOperationType;
  x: number;
  y: number;
  z: number;
  diameter: number;
  depth: number;
  description: string;
}

export interface Part {
  id: string;
  furnitureId: string;
  name: string;

  // Kesim ölçüleri
  width: number;
  length: number;
  thickness: number;
  quantity: number;

  // Kenar bantlama
  edgeBanding: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };

  // Malzeme
  material: string;

  // CNC işlemleri
  cncOperations: CncOperation[];

  // Parçanın üretim yönü
  grainDirection: "length" | "width" | "none";

  // Üretim notu
  productionNote?: string;
}