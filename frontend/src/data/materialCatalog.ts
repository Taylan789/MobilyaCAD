import type { Material } from "../types/material";

// Malzeme kütüphanesi. Fiyatlar örnek veri olup gerçek pazar
// fiyatlarını yansıtmaz; maliyet tahmini yaparken kullanıcı
// kendi fiyatlarını girebilmelidir.
export const materialCatalog: Material[] = [
  {
    id: "suntalam-18",
    name: "Suntalam",
    type: "suntalam",
    thickness: 18,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 750,
    color: "#d9d2c5",
    edgeBandThickness: 0.8
  },
  {
    id: "suntalam-25",
    name: "Suntalam 25 mm",
    type: "suntalam",
    thickness: 25,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 950,
    color: "#d9d2c5",
    edgeBandThickness: 1.0
  },
  {
    id: "mdf-18",
    name: "MDF",
    type: "mdf",
    thickness: 18,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 900,
    color: "#c9b8a3",
    edgeBandThickness: 0.8
  },
  {
    id: "mdf-lam-18",
    name: "MDF Lam",
    type: "mdf-lam",
    thickness: 18,
    sheetWidth: 2800,
    sheetLength: 2070,
    pricePerSquareMeter: 1100,
    color: "#e5e1d8",
    edgeBandThickness: 0.8
  },
  {
    id: "kontrplak-18",
    name: "Kontrplak",
    type: "plywood",
    thickness: 18,
    sheetWidth: 2500,
    sheetLength: 1250,
    pricePerSquareMeter: 1400,
    color: "#b38b63",
    edgeBandThickness: 0.8
  },
  {
    id: "masif-mesele",
    name: "Masif Ahşap",
    type: "solid-wood",
    thickness: 20,
    sheetWidth: 2000,
    sheetLength: 500,
    pricePerSquareMeter: 3500,
    color: "#a77b55",
    edgeBandThickness: 1.2
  }
];

// Katalogdaki malzeme adları (UI seçenekleri için).
export const materialNames: string[] = materialCatalog.map(
  material => material.name
);

// Ada göre malzeme bulur; bulunamazsa undefined döner.
export function findMaterialByName(name: string): Material | undefined {
  return materialCatalog.find(material => material.name === name);
}
