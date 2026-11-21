import type { Hardware } from "../types/hardware";

// Ölçüler üretici teknik verileriyle doldurulmalıdır.
// Bilinmeyen ölçüler varsayılan olarak sıfır bırakılır.

export interface HardwareCatalogItem extends Hardware {
  category: string;
}

export const hardwareCatalog: HardwareCatalogItem[] = [
  {
    id: "hinge-unknown",
    name: "Standart Tas Menteşe",
    type: "hinge",
    manufacturer: "Belirtilmemiş",
    model: "Model seçilmedi",
    category: "Menteşe",
    quantity: 2,
    holeDiameter: 0,
    holeDepth: 0,
    holePositions: [],
    edgeDistance: 0,
    centerDistance: 0,
    toolDiameter: 0,
    productionNote: "Üretici teknik çizimi bekleniyor."
  },
  {
    id: "minifix-unknown",
    name: "Minifix Bağlantı",
    type: "minifix",
    manufacturer: "Belirtilmemiş",
    model: "Model seçilmedi",
    category: "Bağlantı",
    quantity: 1,
    holeDiameter: 0,
    holeDepth: 0,
    holePositions: [],
    edgeDistance: 0,
    centerDistance: 0,
    toolDiameter: 0,
    productionNote: "Üretici teknik çizimi bekleniyor."
  },
  {
    id: "dowel-unknown",
    name: "Kavela",
    type: "dowel",
    manufacturer: "Belirtilmemiş",
    model: "Model seçilmedi",
    category: "Bağlantı",
    quantity: 2,
    holeDiameter: 0,
    holeDepth: 0,
    holePositions: [],
    edgeDistance: 0,
    centerDistance: 0,
    toolDiameter: 0,
    productionNote: "Üretici teknik çizimi bekleniyor."
  },
  {
    id: "shelf-pin-unknown",
    name: "Raf Pimi",
    type: "shelf-pin",
    manufacturer: "Belirtilmemiş",
    model: "Model seçilmedi",
    category: "Bağlantı",
    quantity: 4,
    holeDiameter: 0,
    holeDepth: 0,
    holePositions: [],
    edgeDistance: 0,
    centerDistance: 0,
    toolDiameter: 0,
    productionNote: "Üretici teknik çizimi bekleniyor."
  }
];