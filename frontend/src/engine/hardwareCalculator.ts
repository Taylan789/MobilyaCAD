import type { Furniture } from "../types/furniture";
import type { Hardware } from "../types/hardware";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";

// Donanım adedi kuralları. Bu değerler konstrüksiyon kurallarıdır;
// üretici özel ölçüleri içermez.
export interface HardwareRules {
  hingesPerDoor: number;
  slidesPerDrawer: number;
  pinsPerAdjustableShelf: number;
  handlesPerDoor: number;
  handlesPerDrawer: number;
  minifixPerHorizontalPanel: number;
}

export const defaultHardwareRules: HardwareRules = {
  hingesPerDoor: 2,
  slidesPerDrawer: 2,
  pinsPerAdjustableShelf: 4,
  handlesPerDoor: 1,
  handlesPerDrawer: 1,
  minifixPerHorizontalPanel: 2
};

export interface HardwareQuantity {
  type: Hardware["type"];
  name: string;
  quantity: number;
  productionNote: string;
}

export function calculateHardwareQuantities(
  furniture: Furniture,
  rules: CabinetConstructionRules,
  hardwareRules: HardwareRules = defaultHardwareRules
): HardwareQuantity[] {
  const doorCount = furniture.doorCount ?? rules.doorCount;
  const drawerCount = furniture.drawerCount ?? 0;
  const shelfCount = furniture.shelfCount ?? rules.shelfCount;

  const quantities: HardwareQuantity[] = [];

  if (doorCount > 0) {
    quantities.push({
      type: "hinge",
      name: "Tas Menteşe",
      quantity: doorCount * hardwareRules.hingesPerDoor,
      productionNote: `Kapak başı ${hardwareRules.hingesPerDoor} menteşe (${doorCount} kapak).`
    });

    quantities.push({
      type: "handle",
      name: "Kapak Tutamaç",
      quantity: doorCount * hardwareRules.handlesPerDoor,
      productionNote: `Kapak başı ${hardwareRules.handlesPerDoor} tutamaç.`
    });
  }

  if (drawerCount > 0) {
    quantities.push({
      type: "drawer-slide",
      name: "Çekmece Kaydırıcı",
      quantity: drawerCount * hardwareRules.slidesPerDrawer,
      productionNote: `Çekmece başı ${hardwareRules.slidesPerDrawer} kaydırıcı (${drawerCount} çekmece).`
    });

    quantities.push({
      type: "handle",
      name: "Çekmece Tutamaç",
      quantity: drawerCount * hardwareRules.handlesPerDrawer,
      productionNote: `Çekmece başı ${hardwareRules.handlesPerDrawer} tutamaç.`
    });
  }

  if (shelfCount > 0) {
    if (rules.shelfStyle === "adjustable") {
      quantities.push({
        type: "shelf-pin",
        name: "Raf Pimi",
        quantity: shelfCount * hardwareRules.pinsPerAdjustableShelf,
        productionNote: `Ayarlanabilir raf başı ${hardwareRules.pinsPerAdjustableShelf} pin (${shelfCount} raf).`
      });
    }
  }

  // Üst ve alt tablaların her biri iki yan panela bağlanır.
  quantities.push({
    type: "minifix",
    name: "Minifix Bağlantı",
    quantity: 2 * hardwareRules.minifixPerHorizontalPanel,
    productionNote: `Üst ve alt tabla başına ${hardwareRules.minifixPerHorizontalPanel} minifix.`
  });

  return quantities.filter(q => q.quantity > 0);
}
