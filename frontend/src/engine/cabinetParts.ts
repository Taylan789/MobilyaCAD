import type { Furniture } from "../types/furniture";
import type { Part } from "../types/part";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { validateMeasurement, roundMeasurement } from "./measurement";
import {
  calculateCabinetInnerDimensions,
  calculateSidePanelHeight
} from "./cabinetGeometry";

// Kapak genişliğini kapak stiline göre hesaplar.
function calculateDoorWidth(
  furniture: Furniture,
  rules: CabinetConstructionRules,
  doorCount: number
): number {
  const kalinlik = rules.panelThickness;
  const toplamBosluk = rules.doorGap * (doorCount + 1);

  if (rules.doorStyle === "full-overlay") {
    return furniture.width - toplamBosluk;
  }

  if (rules.doorStyle === "half-overlay") {
    return furniture.width + kalinlik - toplamBosluk;
  }

  return furniture.width - kalinlik * 2 - toplamBosluk;
}

// Kapak yüksekliğini kapak stiline göre hesaplar.
function calculateDoorHeight(
  furniture: Furniture,
  rules: CabinetConstructionRules
): number {
  const kalinlik = rules.panelThickness;

  if (rules.doorStyle === "inset") {
    return furniture.height - kalinlik * 2 - rules.doorGap * 2;
  }

  return furniture.height - rules.doorGap * 2;
}

export function calculateCabinetParts(
  furniture: Furniture,
  rules: CabinetConstructionRules
): Part[] {
  validateMeasurement(furniture.width, "Dolap genişliği");
  validateMeasurement(furniture.height, "Dolap yüksekliği");
  validateMeasurement(furniture.depth, "Dolap derinliği");
  validateMeasurement(rules.panelThickness, "Panel kalınlığı");
  validateMeasurement(rules.backThickness, "Arkalık kalınlığı");
  validateMeasurement(rules.doorGap, "Kapak boşluğu");

  // Mobilya kendi yapılandırma sayılarını taşıyorsa bunlar birincil
  // bilgi kaynağıdır; kurallar yalnızca varsayılan sağlar.
  const doorCount = furniture.doorCount ?? rules.doorCount;
  const drawerCount = furniture.drawerCount ?? 0;
  const shelfCount = furniture.shelfCount ?? rules.shelfCount;

  if (!Number.isInteger(doorCount) || doorCount < 0) {
    throw new Error("Kapak sayısı geçersiz.");
  }

  if (!Number.isInteger(drawerCount) || drawerCount < 0) {
    throw new Error("Çekmece sayısı geçersiz.");
  }

  if (!Number.isInteger(shelfCount) || shelfCount < 0) {
    throw new Error("Raf sayısı geçersiz.");
  }

  if (rules.doorCount < 0 || !Number.isInteger(rules.doorCount)) {
    throw new Error("Kural kapak sayısı geçersiz.");
  }

  const kalinlik = rules.panelThickness;
  const ic = calculateCabinetInnerDimensions(furniture, rules);
  const parcalar: Part[] = [];
  const malzeme = furniture.material ?? "Belirtilmemiş";

  function parcaEkle(
    id: string,
    name: string,
    width: number,
    length: number,
    thickness: number,
    quantity: number,
    edgeBanding: Part["edgeBanding"],
    note: string
  ) {
    validateMeasurement(width, `${name} genişliği`);
    validateMeasurement(length, `${name} uzunluğu`);
    validateMeasurement(thickness, `${name} kalınlığı`);

    if (quantity < 0 || !Number.isInteger(quantity)) {
      throw new Error(`${name} adedi geçersiz.`);
    }

    if (quantity === 0) return;

    // Mobilya kenar bantlamasını kapatırsa hiçbir parça bantlanmaz.
    const bantli = furniture.edgeBanding !== false;

    parcalar.push({
      id: `${furniture.id}-${id}`,
      furnitureId: furniture.id,
      name,
      width: roundMeasurement(width),
      length: roundMeasurement(length),
      thickness,
      quantity,
      edgeBanding: bantli
        ? edgeBanding
        : { top: false, bottom: false, left: false, right: false },
      material: malzeme,
      cncOperations: [],
      grainDirection: "length",
      productionNote: note
    });
  }

  const bantYok = {
    top: false,
    bottom: false,
    left: false,
    right: false
  };

  const onBantli = {
    top: true,
    bottom: false,
    left: false,
    right: false
  };

  // Yan paneller
  const yanYukseklik = calculateSidePanelHeight(furniture, rules);

  parcaEkle(
    "left-side",
    "Sol Yan Panel",
    furniture.depth,
    yanYukseklik,
    kalinlik,
    1,
    bantYok,
    `Yan panel: derinlik D, yükseklik ${rules.carcassStyle === "over-sides" ? "H - 2t" : "H"} (${rules.carcassStyle}).`
  );

  parcaEkle(
    "right-side",
    "Sağ Yan Panel",
    furniture.depth,
    yanYukseklik,
    kalinlik,
    1,
    bantYok,
    `Yan panel: derinlik D, yükseklik ${rules.carcassStyle === "over-sides" ? "H - 2t" : "H"} (${rules.carcassStyle}).`
  );

  // Üst ve alt tablolar
  parcaEkle(
    "top",
    "Üst Tabla",
    ic.width,
    furniture.depth,
    kalinlik,
    1,
    bantYok,
    `Üst tabla: iç genişlik W - 2t, derinlik D (${rules.carcassStyle}).`
  );

  parcaEkle(
    "bottom",
    "Alt Tabla",
    ic.width,
    furniture.depth,
    kalinlik,
    1,
    bantYok,
    `Alt tabla: iç genişlik W - 2t, derinlik D (${rules.carcassStyle}).`
  );

  // Raflar
  if (shelfCount > 0) {
    parcaEkle(
      "shelf",
      "Raf",
      ic.width,
      ic.depth,
      kalinlik,
      shelfCount,
      onBantli,
      `Raf: iç genişlik W - 2t, iç derinlik (${rules.backInstallation} arkalık).`
    );
  }

  // Çekmeceler
  if (drawerCount > 0) {
    const drawerArea = Math.min(
      furniture.height * 0.4,
      ic.height - rules.doorGap * (drawerCount + 1)
    );

    if (drawerArea <= 0) {
      throw new Error(
        "Çekmece alanı geçersiz. Yükseklik çekmece sayısı için çok küçük."
      );
    }

    const onYuzYuksekligi =
      Math.min(rules.drawerFrontMaxHeight, drawerArea / drawerCount) -
      rules.doorGap;

    if (onYuzYuksekligi <= 0) {
      throw new Error("Çekmece ön yüz yüksekliği geçersiz.");
    }

    const onYuzGenisligi = ic.width - rules.drawerGap * 2;

    if (onYuzGenisligi <= 0) {
      throw new Error(
        "Çekmece ön yüz genişliği geçersiz. İç genişlik boşluklara yetmiyor."
      );
    }

    parcaEkle(
      "drawer-front",
      "Çekmece Ön Yüzü",
      onYuzGenisligi,
      onYuzYuksekligi,
      kalinlik,
      drawerCount,
      {
        top: true,
        bottom: true,
        left: true,
        right: true
      },
      `Çekmece ön yüzü: iç genişlik - 2×çekmece boşluğu, yükseklik çekmece alanına göre.`
    );

    const kutusuYukseklik = onYuzYuksekligi - rules.drawerBoxThickness * 2;
    const kutusuDerinlik = ic.depth - rules.drawerGap * 2;

    if (kutusuYukseklik <= 0 || kutusuDerinlik <= 0) {
      throw new Error(
        "Çekmece kutusu ölçüleri geçersiz. Gövde iç ölçüleri çekmece için çok küçük."
      );
    }

    parcaEkle(
      "drawer-side",
      "Çekmece Yan Paneli",
      kutusuDerinlik,
      kutusuYukseklik,
      rules.drawerBoxThickness,
      drawerCount * 2,
      bantYok,
      `Çekmece yan paneli: iç derinlik - 2×boşluk, yükseklik ön yüz - 2×kut kalınlığı.`
    );

    parcaEkle(
      "drawer-bottom",
      "Çekmece Tablası",
      kutusuDerinlik - rules.drawerBoxThickness,
      onYuzGenisligi - rules.drawerGap * 2 - rules.drawerBoxThickness,
      rules.drawerBottomThickness,
      drawerCount,
      bantYok,
      `Çekmece tablası: kutunun iç ölçülerine göre.`
    );
  }

  // Kapaklar
  if (doorCount > 0) {
    const toplamKapakGenisligi = calculateDoorWidth(furniture, rules, doorCount);
    const kapakGenisligi = toplamKapakGenisligi / doorCount;

    const kapakYuksekligi = calculateDoorHeight(furniture, rules);

    if (kapakGenisligi <= 0 || kapakYuksekligi <= 0) {
      throw new Error(
        "Kapak ölçüleri geçersiz. Dış ölçüler kapak sayısı ve boşluklara yetmiyor."
      );
    }

    parcaEkle(
      "door",
      "Dolap Kapağı",
      kapakGenisligi,
      kapakYuksekligi,
      kalinlik,
      doorCount,
      {
        top: true,
        bottom: true,
        left: true,
        right: true
      },
      `Kapak: ${rules.doorStyle} stili, genişlik dış ölçüden boşluklar çıkarılarak adede bölünür.`
    );
  }

  // Arkalık
  if (furniture.hasBackPanel !== false) {
    if (rules.backInstallation === "overlay") {
      parcaEkle(
        "back",
        "Arkalık",
        furniture.width,
        furniture.height,
        rules.backThickness,
        1,
        bantYok,
        "Arkalık: dış ölçüler üzerine monte edilmiş (overlay)."
      );
    } else {
      const arkalikGenisligi =
        rules.backInstallation === "grooved"
          ? ic.width + rules.backGrooveDepth * 2
          : ic.width;

      const arkalikYuksekligi =
        rules.backInstallation === "grooved"
          ? ic.height + rules.backGrooveDepth * 2
          : ic.height;

      parcaEkle(
        "back",
        "Arkalık",
        arkalikGenisligi,
        arkalikYuksekligi,
        rules.backThickness,
        1,
        bantYok,
        `Arkalık: ${rules.backInstallation} montaj, iç ölçüler ve kanal/rahder açısı.`
      );
    }
  }

  return parcalar;
}
