// Bağlantı elemanı (hardware) miktar hesaplama motoru.
// Miktarlar mobilya yapılandırmasından türetilir; üretici bilgisi katalogdan gelir.

import type { FurnitureConfig } from "../types/furnitureModel";
import type { HardwareType } from "../types/hardware";

export interface HardwareRequirement {
  type: HardwareType;
  name: string;
  quantity: number;
  rule: string;
  note: string;
}

// Kapak genişliğine göre menteşe sayısı: 600 mm üzerinde 3, aksi hâlde 2.
function hingesPerDoor(doorWidth: number): number {
  return doorWidth > 600 ? 3 : 2;
}

export function calculateHardware(config: FurnitureConfig): HardwareRequirement[] {
  const requirements: HardwareRequirement[] = [];
  const t = config.panelThickness;

  if (config.doorCount > 0) {
    // Kapak genişliği, tam overlay kuralıyla yaklaşık olarak hesaplanır.
    const doorW =
      (config.width - config.doorGap * (config.doorCount + 1)) /
      config.doorCount;
    const hinges = config.doorCount * hingesPerDoor(doorW);
    requirements.push({
      type: "hinge",
      name: "Tas Menteşe",
      quantity: hinges,
      rule: "hinge-per-door",
      note: `Kapak başına ${hingesPerDoor(doorW)} menteşe (kapak genişliği ${Math.round(doorW)} mm).`
    });

    requirements.push({
      type: "handle",
      name: "Kapak Tutamağı",
      quantity: config.doorCount,
      rule: "handle-per-door",
      note: "Kapak başına 1 tutamaç."
    });
  }

  if (config.drawerCount > 0) {
    requirements.push({
      type: "drawer-slide",
      name: "Çekmece Rayı",
      quantity: config.drawerCount * 2,
      rule: "slide-pair-per-drawer",
      note: "Çekmece başına 2 ray (çift)."
    });

    requirements.push({
      type: "handle",
      name: "Çekmece Tutamağı",
      quantity: config.drawerCount,
      rule: "handle-per-drawer",
      note: "Çekmece başına 1 tutamaç."
    });
  }

  if (config.shelfCount > 0 && config.shelfStyle === "adjustable") {
    requirements.push({
      type: "shelf-pin",
      name: "Raf Pimi",
      quantity: config.shelfCount * 4,
      rule: "pin-per-shelf",
      note: "Ayarlanabilir raf başına 4 pim."
    });
  }

  if (config.shelfCount > 0 && config.shelfStyle === "fixed") {
    requirements.push({
      type: "shelf-pin",
      name: "Raf Desteği",
      quantity: config.shelfCount * 2,
      rule: "fixed-shelf-support",
      note: "Sabit raf başına 2 destek."
    });
  }

  // Gövde birleşimleri: üst/alt tablalar ile yan paneller arasındaki 4 köşe.
  const carcassJoints = 4;
  requirements.push({
    type: "minifix",
    name: "Minifix Bağlantı",
    quantity: carcassJoints,
    rule: "minifix-corners",
    note: "Üst/alt tabla ile yan panel köşe birleşimleri."
  });

  requirements.push({
    type: "dowel",
    name: "Kavela",
    quantity: carcassJoints * 2,
    rule: "dowel-per-joint",
    note: `Köşe başına 2 kavela (panel kalınlığı ${t} mm).`
  });

  if (config.hasBackPanel) {
    // Arkalık civata/pim miktarı: çevre boyunca yaklaşık 300 mm aralıkla.
    const perimeter = 2 * (config.width + config.height);
    const backFasteners = Math.max(4, Math.round(perimeter / 300));
    requirements.push({
      type: "other",
      name: "Arkalık Pimi/Civata",
      quantity: backFasteners,
      rule: "back-perimeter-300mm",
      note: "Aralık çevresinde yaklaşık 300 mm aralıkla sabitleme."
    });
  }

  return requirements;
}
