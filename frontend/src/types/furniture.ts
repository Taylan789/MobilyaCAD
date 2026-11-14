// Mobilyaların temel veri yapısı
// Bütün ölçüler milimetre (mm) cinsindendir.

export interface Furniture {
  id: string;
  name: string;

  // Mobilya türü
  type:
    | "wardrobe"
    | "kitchen"
    | "bathroom"
    | "desk"
    | "bookcase"
    | "tv-unit"
    | "shelf"
    | "custom";

  // Dış ölçüler
  width: number;
  height: number;
  depth: number;

  // Oda içerisindeki konumu
  positionX: number;
  positionY: number;
  positionZ: number;

  // Yatay dönüş açısı (derece)
  rotation: number;

  // Kullanılacak levha kalınlığı
  materialThickness: number;
    // Parametrik mobilya özellikleri
  doorCount?: number;
  drawerCount?: number;
  shelfCount?: number;
  hasBackPanel?: boolean;
  backThickness?: number;
  edgeBanding?: boolean;
  material?: string;
}