import type { Furniture } from "../types/furniture";
import type { Part } from "../types/part";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { validateMeasurement, roundMeasurement } from "./measurement";
import { calculateCabinetInnerDimensions } from "./cabinetGeometry";

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

  if (!Number.isInteger(rules.shelfCount) || rules.shelfCount < 0) {
    throw new Error("Raf sayısı geçersiz.");
  }

  if (!Number.isInteger(rules.doorCount) || rules.doorCount < 1) {
    throw new Error("Kapak sayısı geçersiz.");
  }

  const kalinlik = rules.panelThickness;
  const ic = calculateCabinetInnerDimensions(furniture, rules);
  const parcalar: Part[] = [];

  function parcaEkle(
    id: string,
    name: string,
    width: number,
    length: number,
    thickness: number,
    quantity: number,
    edgeBanding: Part["edgeBanding"]
  ) {
    validateMeasurement(width, `${name} genişliği`);
    validateMeasurement(length, `${name} uzunluğu`);
    validateMeasurement(thickness, `${name} kalınlığı`);

    parcalar.push({
      id: `${furniture.id}-${id}`,
      furnitureId: furniture.id,
      name,
      width: roundMeasurement(width),
      length: roundMeasurement(length),
      thickness,
      quantity,
      edgeBanding,
      material: "Belirtilmemiş",
      cncOperations: [],
      grainDirection: "none"
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
  const yanYukseklik =
    rules.carcassStyle === "over-sides"
      ? furniture.height - kalinlik * 2
      : furniture.height;

  parcaEkle(
    "left-side",
    "Sol Yan Panel",
    furniture.depth,
    yanYukseklik,
    kalinlik,
    1,
    bantYok
  );

  parcaEkle(
    "right-side",
    "Sağ Yan Panel",
    furniture.depth,
    yanYukseklik,
    kalinlik,
    1,
    bantYok
  );

  // Üst ve alt tablalar
  parcaEkle(
    "top",
    "Üst Tabla",
    ic.width,
    furniture.depth - kalinlik,
    kalinlik,
    1,
    bantYok
  );

  parcaEkle(
    "bottom",
    "Alt Tabla",
    ic.width,
    furniture.depth - kalinlik,
    kalinlik,
    1,
    bantYok
  );

  // Raflar
  if (rules.shelfCount > 0) {
    parcaEkle(
      "shelf",
      "Raf",
      ic.width,
      ic.depth,
      kalinlik,
      rules.shelfCount,
      onBantli
    );
  }

  // Kapaklar
  const kapakBosluk = rules.doorGap;
  const toplamKapakBoslugu = kapakBosluk * (rules.doorCount + 1);

  let toplamKapakGenisligi: number;

  if (rules.doorStyle === "full-overlay") {
    toplamKapakGenisligi = furniture.width - toplamKapakBoslugu;
  } else if (rules.doorStyle === "half-overlay") {
    toplamKapakGenisligi =
      furniture.width + kalinlik - toplamKapakBoslugu;
  } else {
    toplamKapakGenisligi =
      furniture.width - kalinlik * 2 - toplamKapakBoslugu;
  }

  const kapakGenisligi = toplamKapakGenisligi / rules.doorCount;

  const kapakYuksekligi =
    rules.doorStyle === "inset"
      ? furniture.height - kalinlik * 2 - kapakBosluk * 2
      : furniture.height - kapakBosluk * 2;

  if (kapakGenisligi <= 0 || kapakYuksekligi <= 0) {
    throw new Error("Kapak ölçüleri geçersiz.");
  }

  parcaEkle(
    "door",
    "Dolap Kapağı",
    kapakGenisligi,
    kapakYuksekligi,
    kalinlik,
    rules.doorCount,
    {
      top: true,
      bottom: true,
      left: true,
      right: true
    }
  );

  // Arkalık
  if (rules.backInstallation === "overlay") {
    parcaEkle(
      "back",
      "Arkalık",
      furniture.width,
      furniture.height,
      rules.backThickness,
      1,
      bantYok
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
      bantYok
    );
  }

  return parcalar;
}