// Dolap üretim ve konstrüksiyon kuralları
// Bütün ölçüler milimetredir.

export interface CabinetConstructionRules {
  panelThickness: number;
  backThickness: number;

  backInstallation: "overlay" | "grooved" | "inset";
  backInset: number;

  carcassStyle: "between-sides" | "over-sides";

  shelfCount: number;
  shelfStyle: "fixed" | "adjustable";

  edgeBandThickness: number;

  // Kapak konstrüksiyonu
  doorStyle: "full-overlay" | "half-overlay" | "inset";

  // Kapak ve gövde arasındaki boşluk
  doorGap: number;

  // Kapak adedi
  doorCount: number;

  // Arkalık montajında kanal derinliği
  backGrooveDepth: number;
}
