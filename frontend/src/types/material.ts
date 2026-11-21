// Mobilya üretiminde kullanılacak malzemeler

export interface Material {
  id: string;
  name: string;

  // Malzeme türü
  type: "mdf" | "mdf-lam" | "suntalam" | "plywood" | "solid-wood" | "other";

  // Levha ölçüleri (mm)
  thickness: number;
  sheetWidth: number;
  sheetLength: number;

  // Metrekare fiyatı
  pricePerSquareMeter: number;

  // Malzeme rengi
  color: string;

  // Kenar bant kalınlığı
  edgeBandThickness: number;
}
