// Oda duvarlarının veri yapısı

export interface Wall {
  id: string;
  name: string;

  // Duvar uzunluğu ve yüksekliği (mm)
  length: number;
  height: number;

  // Duvar kalınlığı (mm)
  thickness: number;

  // Duvarın oda içerisindeki başlangıç koordinatları
  startX: number;
  startY: number;

  // Duvarın bitiş koordinatları
  endX: number;
  endY: number;

  // Duvarın açısı (derece)
  rotation: number;
}