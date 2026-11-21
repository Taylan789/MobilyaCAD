
import type { Furniture } from "../types/furniture";

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  type: Furniture["type"];
  width: number;
  height: number;
  depth: number;
  color: string;
  category: string;
  doorCount?: number;
  drawerCount?: number;
  shelfCount?: number;
  hasBackPanel?: boolean;
  backThickness?: number;
  edgeBanding?: boolean;
  material?: string;
}

// Mevcut 8 mobilya
const baseFurnitureCatalog: FurnitureCatalogItem[] = [
  {
    id: "base-cabinet",
    name: "Alt Mutfak Dolabı",
    type: "kitchen",
    width: 600,
    height: 850,
    depth: 560,
    color: "#d9d2c5",
    category: "Mutfak"
  },
  {
    id: "wall-cabinet",
    name: "Üst Mutfak Dolabı",
    type: "kitchen",
    width: 600,
    height: 720,
    depth: 350,
    color: "#e5e1d8",
    category: "Mutfak"
  },
  {
    id: "countertop",
    name: "Mutfak Mermeri",
    type: "custom",
    width: 600,
    height: 40,
    depth: 600,
    color: "#aaa9a5",
    category: "Tezgâh"
  },
  {
    id: "corner-cabinet",
    name: "Köşe Dolabı",
    type: "kitchen",
    width: 900,
    height: 850,
    depth: 900,
    color: "#c9c1b3",
    category: "Mutfak"
  },
  {
    id: "wardrobe",
    name: "Gardırop",
    type: "wardrobe",
    width: 1200,
    height: 2200,
    depth: 600,
    color: "#a77b55",
    category: "Dolap"
  },
  {
    id: "bookcase",
    name: "Kitaplık",
    type: "bookcase",
    width: 800,
    height: 1800,
    depth: 300,
    color: "#a77b55",
    category: "Mobilya"
  },
  {
    id: "desk",
    name: "Çalışma Masası",
    type: "desk",
    width: 1200,
    height: 750,
    depth: 600,
    color: "#b38b63",
    category: "Mobilya"
  },
  {
    id: "tv-unit",
    name: "TV Ünitesi",
    type: "tv-unit",
    width: 1800,
    height: 500,
    depth: 400,
    color: "#8b7968",
    category: "Mobilya"
  }
];

// 23 farklı mobilya tasarımı
const furnitureTemplates: Omit<FurnitureCatalogItem, "id">[] = [
  { name: "Çekmeceli Alt Dolap", type: "kitchen", width: 600, height: 850, depth: 560, color: "#c9bda9", category: "Mutfak", drawerCount: 3 },
  { name: "Kapaklı Üst Dolap", type: "kitchen", width: 800, height: 720, depth: 350, color: "#e5e1d8", category: "Mutfak", doorCount: 2 },
  { name: "Fırın Dolabı", type: "kitchen", width: 600, height: 2100, depth: 600, color: "#b8aa98", category: "Mutfak", doorCount: 2 },
  { name: "Ankastre Buzdolabı Dolabı", type: "kitchen", width: 700, height: 2200, depth: 650, color: "#c9c1b3", category: "Mutfak", doorCount: 2 },
  { name: "Evye Alt Dolabı", type: "kitchen", width: 800, height: 850, depth: 560, color: "#d9d2c5", category: "Mutfak", doorCount: 2 },
  { name: "Kiler Dolabı", type: "kitchen", width: 600, height: 2200, depth: 600, color: "#a77b55", category: "Mutfak", doorCount: 2, shelfCount: 5 },
  { name: "Sürgülü Gardırop", type: "wardrobe", width: 1800, height: 2200, depth: 650, color: "#a77b55", category: "Yatak Odası", doorCount: 2, shelfCount: 4 },
  { name: "Köşe Gardırop", type: "wardrobe", width: 1200, height: 2200, depth: 1200, color: "#987453", category: "Yatak Odası", doorCount: 2 },
  { name: "Şifonyer", type: "wardrobe", width: 900, height: 900, depth: 450, color: "#b38b63", category: "Yatak Odası", drawerCount: 4 },
  { name: "Komodin", type: "wardrobe", width: 500, height: 500, depth: 400, color: "#a77b55", category: "Yatak Odası", drawerCount: 2 },
  { name: "Makyaj Masası", type: "desk", width: 1000, height: 750, depth: 450, color: "#d6c3b1", category: "Yatak Odası", drawerCount: 3 },
  { name: "TV Alt Konsolu", type: "tv-unit", width: 1800, height: 500, depth: 400, color: "#8b7968", category: "Salon", doorCount: 2, drawerCount: 2 },
  { name: "Salon Vitrini", type: "wardrobe", width: 900, height: 2000, depth: 400, color: "#a98b70", category: "Salon", doorCount: 2, shelfCount: 4 },
  { name: "Duvar Kitaplığı", type: "bookcase", width: 1200, height: 2200, depth: 300, color: "#a77b55", category: "Salon", shelfCount: 6 },
  { name: "Orta Sehpa", type: "custom", width: 1000, height: 400, depth: 600, color: "#b38b63", category: "Salon" },
  { name: "Yan Sehpa", type: "custom", width: 500, height: 500, depth: 500, color: "#b38b63", category: "Salon" },
  { name: "Banyo Lavabo Dolabı", type: "bathroom", width: 800, height: 600, depth: 500, color: "#d9d2c5", category: "Banyo", doorCount: 2 },
  { name: "Banyo Boy Dolabı", type: "bathroom", width: 400, height: 1800, depth: 350, color: "#e5e1d8", category: "Banyo", doorCount: 2, shelfCount: 3 },
  { name: "Aynalı Banyo Dolabı", type: "bathroom", width: 800, height: 700, depth: 180, color: "#c9c1b3", category: "Banyo", doorCount: 2 },
  { name: "Çamaşır Makinesi Dolabı", type: "bathroom", width: 700, height: 2000, depth: 700, color: "#dedbd4", category: "Banyo", doorCount: 2 },
  { name: "Ofis Dosya Dolabı", type: "custom", width: 900, height: 1800, depth: 450, color: "#777f8c", category: "Ofis", doorCount: 2, shelfCount: 4 },
  { name: "Ofis Çekmeceli Keson", type: "desk", width: 450, height: 600, depth: 500, color: "#858b94", category: "Ofis", drawerCount: 3 },
  { name: "Toplantı Masası", type: "desk", width: 2000, height: 750, depth: 1000, color: "#987453", category: "Ofis" }
];

// Her tasarımın 4 ölçü varyasyonu
const furnitureVariants = [
  { label: "Kompakt", scale: 0.8 },
  { label: "Standart", scale: 1 },
  { label: "Geniş", scale: 1.2 },
  { label: "XL", scale: 1.4 }
];

// Toplam 8 + (23 x 4) = 100 model
export const furnitureCatalog: FurnitureCatalogItem[] = [
  ...baseFurnitureCatalog,
  ...furnitureTemplates.flatMap((item, index) =>
    furnitureVariants.map((variant, variantIndex) => ({
      ...item,
      id: `parametric-${index + 1}-${variantIndex + 1}`,
      name: `${item.name} - ${variant.label}`,
      width: Math.round(item.width * variant.scale / 10) * 10,
      height: Math.round(item.height * variant.scale / 10) * 10,
      depth: Math.round(item.depth * variant.scale / 10) * 10,
      doorCount: item.doorCount ?? 0,
      drawerCount: item.drawerCount ?? 0,
      shelfCount: item.shelfCount ?? 2,
      hasBackPanel: true,
      backThickness: 8,
      edgeBanding: true,
      material: "Suntalam"
    }))
  )
];
