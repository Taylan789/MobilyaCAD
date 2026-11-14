// Bütün ölçüler milimetre (mm) cinsindendir.

export interface Room {
  id: string;
  name: string;

  // Oda ölçüleri
  width: number;
  length: number;
  height: number;

  // Duvar kalınlığı
  wallThickness: number;

  // Oda şekli
  shape: "rectangle" | "polygon";

  // Oda zemini
  floorLevel: number;
}