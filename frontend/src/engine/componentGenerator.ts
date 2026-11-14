// Parametrik mobilya bileşen üretici.
// Tek kaynak doğrusu: FurnitureConfig → FurnitureComponent[].
// Bütün ölçüler milimetredir. Yerel koordinat sistemi:
// köşegen (0,0,0) mobilyanın alt-orta noktasıdır; x sağ, y yukarı, z öndedir.

import type { FurnitureConfig, ConfigIssue } from "../types/furnitureModel";
import { validateFurnitureConfig } from "../types/furnitureModel";
import type { FurnitureComponent } from "../types/furnitureModel";
import { roundMeasurement } from "./measurement";

export interface GenerationResult {
  components: FurnitureComponent[];
  issues: ConfigIssue[];
}

const DOOR_MIN = 40;
const DRAWER_FRONT_MIN = 60;

// Yapılandırmadan üretilmiş yapısal bileşenleri döndürür.
// Üretilemeyecek bileşen (ör. çok küçük kapak) atlanır ve uyarı kaydedilir.
export function generateComponents(config: FurnitureConfig): GenerationResult {
  const issues = validateFurnitureConfig(config);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    return { components: [], issues };
  }

  const components: FurnitureComponent[] = [];
  const { width: W, depth: D } = config;
  const t = config.panelThickness;
  const g = config.doorGap;
  const ft = config.frontThickness;
  const plinth = config.hasPlinth ? config.plinthHeight : 0;
  const worktop = config.hasWorktop ? config.worktopThickness : 0;
  const carcassH = config.height - plinth - worktop;

  if (carcassH < 100) {
    issues.push({
      field: "height",
      message: "Kaide/tezgâh sonrası gövde yüksekliği 100 mm altında.",
      severity: "error"
    });
    return { components: [], issues };
  }

  const innerWidth = W - t * 2;

  // Arkalık panelinin ön yüzeyi (tüm modlarda ortak referans).
  const backPanelFrontZ =
    config.backInstallation === "inset"
      ? -D / 2 + config.backInset + config.backThickness
      : -D / 2 + config.backThickness;

  // Raf/bölücü derinliği: ön yüzle arkalık ön yüzü arasındaki alan.
  const innerDepth = D / 2 - backPanelFrontZ;
  const innerZ = (D / 2 + backPanelFrontZ) / 2;

  function add(component: Omit<FurnitureComponent, "id">, index: number) {
    components.push({ ...component, id: `${component.kind}-${index}` });
  }

  function bandFlags(kind: string) {
    if (!config.edgeBanding) return { top: false, bottom: false, left: false, right: false };
    if (kind === "back") return { top: false, bottom: false, left: false, right: false };
    return { top: true, bottom: true, left: true, right: true };
  }

  // Slab modu: tezgâh/masa üstü gibi tek parça.
  const slabMode =
    config.type === "custom" &&
    config.height <= 60 &&
    config.doorCount === 0 &&
    config.drawerCount === 0 &&
    config.shelfCount === 0;

  if (slabMode) {
    add(
      {
        kind: "worktop",
        name: "Tezgâh",
        width: W,
        height: config.height,
        depth: D,
        center: { x: 0, y: config.height / 2, z: 0 },
        material: config.material,
        thickness: config.height,
        edgeBanding: bandFlags("worktop"),
        grainDirection: "length",
        rule: "slab",
        formula: "W × H × D (tek parça)"
      },
      0
    );
    return { components, issues };
  }

  // Masa modu: üst + 4 bacak (çekmece/raf/kapak yoksa).
  const tableMode =
    config.type === "desk" &&
    config.doorCount === 0 &&
    config.drawerCount === 0 &&
    config.shelfCount === 0;

  if (tableMode) {
    add(
      {
        kind: "top",
        name: "Masa Üstü",
        width: W,
        height: t,
        depth: D,
        center: { x: 0, y: config.height - t / 2, z: 0 },
        material: config.material,
        thickness: t,
        edgeBanding: bandFlags("top"),
        grainDirection: "length",
        rule: "table-top",
        formula: "W × t × D"
      },
      0
    );

    const legInset = t * 2;
    const legSize = Math.max(t, Math.min(W, D) * 0.08);
    const legH = config.height - t;
    const positions: Array<[number, number]> = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1]
    ];
    positions.forEach(([sx, sz], index) => {
      add(
        {
          kind: "side",
          name: `Bacak ${index + 1}`,
          width: legSize,
          height: legH,
          depth: legSize,
          center: {
            x: sx * (W / 2 - legInset - legSize / 2),
            y: legH / 2,
            z: sz * (D / 2 - legInset - legSize / 2)
          },
          material: config.material,
          thickness: legSize,
          edgeBanding: bandFlags("side"),
          grainDirection: "length",
          rule: "table-leg",
          formula: "boyut = min(W,D)*0.08, min t"
        },
        index + 1
      );
    });
    return { components, issues };
  }

  // Gövde panelleri.
      add(
        {
          kind: "side",
          name: "Yan Panel",
          width: t,
          height: carcassH,
          depth: D,
          center: { x: -(W / 2 - t / 2), y: plinth + carcassH / 2, z: 0 },
          material: config.material,
          thickness: t,
          edgeBanding: bandFlags("side"),
          grainDirection: "length",
          rule: "carcass-side",
          formula: "t × (H - plinth - tezgâh) × D"
        },
        0
      );

      add(
        {
          kind: "side",
          name: "Yan Panel",
          width: t,
          height: carcassH,
          depth: D,
          center: { x: W / 2 - t / 2, y: plinth + carcassH / 2, z: 0 },
          material: config.material,
          thickness: t,
          edgeBanding: bandFlags("side"),
          grainDirection: "length",
          rule: "carcass-side",
          formula: "t × (H - plinth - tezgâh) × D"
        },
        1
      );

  add(
    {
      kind: "bottom",
      name: "Alt Tabla",
      width: innerWidth,
      height: t,
      depth: D,
      center: { x: 0, y: plinth + t / 2, z: 0 },
      material: config.material,
      thickness: t,
      edgeBanding: bandFlags("bottom"),
      grainDirection: "width",
      rule: "carcass-bottom",
      formula: "(W - 2t) × t × D"
    },
    2
  );

  add(
    {
      kind: "top",
      name: "Üst Tabla",
      width: innerWidth,
      height: t,
      depth: D,
      center: { x: 0, y: plinth + carcassH - t / 2, z: 0 },
      material: config.material,
      thickness: t,
      edgeBanding: bandFlags("top"),
      grainDirection: "width",
      rule: "carcass-top",
      formula: "(W - 2t) × t × D"
    },
    3
  );

  // Raflar: bölücüler varsa bölücü sayısı kadar parçaya bölünür.
  const segments = config.dividerCount + 1;
  const segmentWidth = (innerWidth - config.dividerCount * t) / segments;

  for (let i = 0; i < config.shelfCount; i++) {
    for (let seg = 0; seg < segments; seg++) {
      const y =
        plinth +
        t +
        ((carcassH - t * 2) * (i + 1)) / (config.shelfCount + 1);
      const x =
        -innerWidth / 2 + segmentWidth / 2 + seg * (segmentWidth + t);
      add(
        {
          kind: "shelf",
          name: `Raf ${i + 1}${segments > 1 ? ` (${seg + 1}. Bölme)` : ""}`,
          width: roundMeasurement(segmentWidth),
          height: t,
          depth: innerDepth,
          center: { x: roundMeasurement(x), y: roundMeasurement(y), z: innerZ },
          material: config.material,
          thickness: t,
          edgeBanding: bandFlags("shelf"),
          grainDirection: "width",
          rule: "shelf-even-spacing",
          formula: "(W - 2t - n*t) / (n+1) parçalı, eşit aralıklı"
        },
        4 + i * segments + seg
      );
    }
  }

  // Bölücüler.
  for (let i = 0; i < config.dividerCount; i++) {
    const x = -innerWidth / 2 + segmentWidth + t / 2 + i * (segmentWidth + t);
    add(
      {
        kind: "divider",
        name: `Bölücü ${i + 1}`,
        width: t,
        height: carcassH - t * 2,
        depth: innerDepth,
        center: {
          x: roundMeasurement(x),
          y: plinth + carcassH / 2,
          z: innerZ
        },
        material: config.material,
        thickness: t,
        edgeBanding: bandFlags("divider"),
        grainDirection: "length",
        rule: "divider-even-spacing",
        formula: "(W - 2t) / (n + 1) eşit aralıklı"
      },
      i
    );
  }

  // Arkalık.
  if (config.hasBackPanel) {
    if (config.backInstallation === "overlay") {
      add(
        {
          kind: "back",
          name: "Arkalık",
          width: W,
          height: carcassH,
          depth: config.backThickness,
          center: {
            x: 0,
            y: plinth + carcassH / 2,
            z: -D / 2 + config.backThickness / 2
          },
          material: config.material,
          thickness: config.backThickness,
          edgeBanding: bandFlags("back"),
          grainDirection: "width",
          rule: "back-overlay",
          formula: "W × H × bt (arka yüze çakılı)"
        },
        0
      );
    } else if (config.backInstallation === "grooved") {
      add(
        {
          kind: "back",
          name: "Arkalık",
          width: innerWidth + config.backGrooveDepth * 2,
          height: carcassH - t * 2 + config.backGrooveDepth * 2,
          depth: config.backThickness,
          center: {
            x: 0,
            y: plinth + carcassH / 2,
            z: -D / 2 + config.backThickness / 2
          },
          material: config.material,
          thickness: config.backThickness,
          edgeBanding: bandFlags("back"),
          grainDirection: "width",
          rule: "back-grooved",
          formula: "(W - 2t + 2*gd) × (Hc - 2t + 2*gd) × bt"
        },
        0
      );
    } else {
      add(
        {
          kind: "back",
          name: "Arkalık",
          width: innerWidth,
          height: carcassH - t * 2,
          depth: config.backThickness,
          center: {
            x: 0,
            y: plinth + carcassH / 2,
            z: -D / 2 + config.backInset + config.backThickness / 2
          },
          material: config.material,
          thickness: config.backThickness,
          edgeBanding: bandFlags("back"),
          grainDirection: "width",
          rule: "back-inset",
          formula: "(W - 2t) × (Hc - 2t) × bt"
        },
        0
      );
    }
  }

  // Kaide.
  if (config.hasPlinth && plinth > 0) {
    add(
      {
        kind: "plinth",
        name: "Kaide",
        width: innerWidth,
        height: plinth,
        depth: t,
        center: {
          x: 0,
          y: plinth / 2,
          z: D / 2 - config.plinthRecess - t / 2
        },
        material: config.material,
        thickness: t,
        edgeBanding: bandFlags("plinth"),
        grainDirection: "width",
        rule: "plinth-recessed",
        formula: "(W - 2t) × p × t, önden plinthRecess kadar geri"
      },
      0
    );
  }

  // Tezgâh.
  if (config.hasWorktop && worktop > 0) {
    add(
      {
        kind: "worktop",
        name: "Tezgâh",
        width: W,
        height: worktop,
        depth: D + config.worktopOverhang,
        center: {
          x: 0,
          y: config.height - worktop / 2,
          z: config.worktopOverhang / 2
        },
        material: config.material,
        thickness: worktop,
        edgeBanding: bandFlags("worktop"),
        grainDirection: "length",
        rule: "worktop-overhang",
        formula: "W × wt × (D + overhang)"
      },
      0
    );
  }

  // Çekmece ön yüzleri ve kutuları.
  let drawerZoneBottom = plinth + g;
  if (config.drawerCount > 0) {
    const drawerFrontH = Math.min(
      240,
      Math.floor((carcassH - g * (config.drawerCount + 1)) / config.drawerCount)
    );

    if (drawerFrontH < DRAWER_FRONT_MIN) {
      issues.push({
        field: "drawerCount",
        message: `Çekmece ön yüzü ${drawerFrontH} mm; minimum ${DRAWER_FRONT_MIN} mm. Çekmeceler üretilmedi.`,
        severity: "warning"
      });
    } else {
      const drawerFrontW = frontWidth(config, W, t, g, config.drawerCount);
      if (drawerFrontW < DOOR_MIN) {
        issues.push({
          field: "drawerCount",
          message: "Çekmece ön yüz genişliği çok küçük; çekmeceler üretilmedi.",
          severity: "warning"
        });
      } else {
        const boxH = drawerFrontH - 8;
        const boxW = innerWidth - 8;
        const boxD = Math.max(10, innerDepth - 10);
        const boxZ = D / 2 - 8 - boxD / 2;

        for (let i = 0; i < config.drawerCount; i++) {
          const frontBottom = drawerZoneBottom + i * (drawerFrontH + g);
          const frontCenterY = frontBottom + drawerFrontH / 2;

          add(
            {
              kind: "drawer-front",
              name: `Çekmece Ön Yüzü ${i + 1}`,
              width: drawerFrontW,
              height: drawerFrontH,
              depth: ft,
              center: {
                x: 0,
                y: frontCenterY,
                z: D / 2 + ft / 2
              },
              material: config.material,
              thickness: ft,
              edgeBanding: bandFlags("door"),
              grainDirection: "length",
              rule: "drawer-front-overlay",
              formula: "ön yüz genişliği kapak kuralına göre; yükseklik bölgeye göre"
            },
            i
          );

          // Çekmece kutusu: 2 yan, 1 taban, 1 arka.
          const boxCenterY = frontBottom + 2 + boxH / 2;
          add(
            {
              kind: "drawer-side",
              name: `Çekmece ${i + 1} Sol Yan`,
              width: t,
              height: boxH,
              depth: boxD,
              center: {
                x: -(boxW / 2 - t / 2),
                y: boxCenterY,
                z: boxZ
              },
              material: config.material,
              thickness: t,
              edgeBanding: bandFlags("drawer-side"),
              grainDirection: "length",
              rule: "drawer-box-side",
              formula: "t × (önY - 8) × (içDerinlik - 10)"
            },
            i * 4
          );
          add(
            {
              kind: "drawer-side",
              name: `Çekmece ${i + 1} Sağ Yan`,
              width: t,
              height: boxH,
              depth: boxD,
              center: {
                x: boxW / 2 - t / 2,
                y: boxCenterY,
                z: boxZ
              },
              material: config.material,
              thickness: t,
              edgeBanding: bandFlags("drawer-side"),
              grainDirection: "length",
              rule: "drawer-box-side",
              formula: "t × (önY - 8) × (içDerinlik - 10)"
            },
            i * 4 + 1
          );
          add(
            {
              kind: "drawer-bottom",
              name: `Çekmece ${i + 1} Tabanı`,
              width: boxW - t * 2,
              height: config.drawerBottomThickness,
              depth: boxD - t,
              center: {
                x: 0,
                y: frontBottom + 2 + config.drawerBottomThickness / 2,
                z: boxZ
              },
              material: config.material,
              thickness: config.drawerBottomThickness,
              edgeBanding: bandFlags("drawer-bottom"),
              grainDirection: "width",
              rule: "drawer-box-bottom",
              formula: "(içW - 8 - 2t) × 6 × (içD - 10 - t)"
            },
            i * 4 + 2
          );
          add(
            {
              kind: "drawer-side",
              name: `Çekmece ${i + 1} Arka`,
              width: boxW - t * 2,
              height: boxH,
              depth: t,
              center: {
                x: 0,
                y: boxCenterY,
                z: boxZ - boxD / 2 + t / 2
              },
              material: config.material,
              thickness: t,
              edgeBanding: bandFlags("drawer-side"),
              grainDirection: "width",
              rule: "drawer-box-back",
              formula: "(içW - 8 - 2t) × (önY - 8) × t"
            },
            i * 4 + 3
          );
        }

        drawerZoneBottom =
          drawerZoneBottom +
          config.drawerCount * drawerFrontH +
          (config.drawerCount - 1) * g +
          g;
      }
    }
  }

  // Kapaklar: çekmece bölgesinin üstündeki alan.
  const doorZoneBottom = drawerZoneBottom + g;
  const doorZoneH = plinth + carcassH - g - doorZoneBottom;

  if (config.doorCount > 0) {
    const doorW = frontWidth(config, W, t, g, config.doorCount);
    const doorH = doorZoneH;

    if (doorW < DOOR_MIN || doorH < DOOR_MIN) {
      issues.push({
        field: "doorCount",
        message: `Kapak ölçüleri çok küçük (${Math.round(doorW)} × ${Math.round(doorH)} mm); kapaklar üretilmedi.`,
        severity: "warning"
      });
    } else {
      for (let i = 0; i < config.doorCount; i++) {
        const x = -W / 2 + g + doorW / 2 + i * (doorW + g);
        add(
          {
            kind: "door",
            name: `Kapak ${i + 1}`,
            width: roundMeasurement(doorW),
            height: roundMeasurement(doorH),
            depth: ft,
            center: {
              x: roundMeasurement(x),
              y: doorZoneBottom + doorH / 2,
              z: D / 2 + ft / 2
            },
            material: config.material,
            thickness: ft,
            edgeBanding: bandFlags("door"),
            grainDirection: "length",
            rule: `door-${config.doorStyle}`,
            formula: frontWidthFormula(config)
          },
          i
        );
      }
    }
  }

  return { components, issues };
}

function frontWidth(
  config: FurnitureConfig,
  W: number,
  t: number,
  g: number,
  count: number
): number {
  if (config.doorStyle === "half-overlay") {
    return (W + t - g * (count + 1)) / count;
  }
  if (config.doorStyle === "inset") {
    return (W - t * 2 - g * (count + 1)) / count;
  }
  return (W - g * (count + 1)) / count;
}

function frontWidthFormula(config: FurnitureConfig): string {
  if (config.doorStyle === "half-overlay") {
    return "(W + t - g*(n+1)) / n";
  }
  if (config.doorStyle === "inset") {
    return "(W - 2t - g*(n+1)) / n";
  }
  return "(W - g*(n+1)) / n";
}
