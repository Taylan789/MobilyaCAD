import type { Part } from "../types/part";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";

// CNC operasyonu üretimi için atölye sabitleri.
// Bu değerler standart tayf değerleridir; konstrüksiyon kuralı değil.
const HINGE_CUP_DIAMETER = 35;
const HINGE_CUP_DEPTH = 12;
const HINGE_CUP_EDGE_OFFSET = 22.5;
const HINGE_CUP_ROW_MARGIN = 100;
const HINGE_CUP_COUNT = 2;

const SHELF_PIN_DIAMETER = 5;
const SHELF_PIN_DEPTH = 12;
const SHELF_PIN_EDGE_OFFSET = 32;

const MINIFIX_DIAMETER = 15;
const MINIFIX_DEPTH = 13;
const MINIFIX_EDGE_OFFSET = 45;

const DOWEL_DIAMETER = 8;
const DOWEL_DEPTH = 15;
const DOWEL_EDGE_OFFSET = 12;
const DOWEL_SPREAD = 50;

// Parçaların üretim özelliklerine göre CNC operasyonları üretir.
// Girdi değiştirilmez; yeni parça dizisi döner.
// Üretilen operasyonlar konstrüksiyon kurallarına bağlıdır;
// gerçek makine programı doğrulaması yoktur.
export function addCncOperations(
  parts: Part[],
  rules: CabinetConstructionRules
): Part[] {
  return parts.map(part => {
    if (part.name === "Dolap Kapağı") {
      return { ...part, cncOperations: hingeCupOperations(part) };
    }

    if (part.name === "Sol Yan Panel" || part.name === "Sağ Yan Panel") {
      return {
        ...part,
        cncOperations: shelfPinOperations(part, rules)
      };
    }

    if (part.name === "Üst Tabla" || part.name === "Alt Tabla") {
      return { ...part, cncOperations: minifixOperations(part) };
    }

    return part;
  });
}

// Kapak arkasına menteşe kupusu delikleri üretir.
function hingeCupOperations(part: Part): Part["cncOperations"] {
  const operations: Part["cncOperations"] = [];

  for (let i = 0; i < HINGE_CUP_COUNT; i++) {
    const y =
      i === 0
        ? HINGE_CUP_ROW_MARGIN
        : part.length - HINGE_CUP_ROW_MARGIN;

    operations.push({
      id: `${part.id}-hinge-${i + 1}`,
      type: "hinge-cup",
      x: HINGE_CUP_EDGE_OFFSET,
      y: round(y),
      z: 0,
      diameter: HINGE_CUP_DIAMETER,
      depth: HINGE_CUP_DEPTH,
      description: `Menteşe kupusu: kapak arkası, kenardan ${HINGE_CUP_EDGE_OFFSET} mm.`
    });
  }

  return operations;
}

// Yan panellere ayarlanabilir raf pimi delikleri üretir.
function shelfPinOperations(
  part: Part,
  rules: CabinetConstructionRules
): Part["cncOperations"] {
  const operations: Part["cncOperations"] = [];
  const shelfCount = Math.max(0, Math.floor(rules.shelfCount));

  for (let i = 0; i < shelfCount; i++) {
    const y = round(((i + 1) * part.length) / (shelfCount + 1));

    operations.push(
      {
        id: `${part.id}-pin-${i + 1}-a`,
        type: "drill",
        x: SHELF_PIN_EDGE_OFFSET,
        y,
        z: 0,
        diameter: SHELF_PIN_DIAMETER,
        depth: SHELF_PIN_DEPTH,
        description: `Raf pimi deliği: ön kenar ${SHELF_PIN_EDGE_OFFSET} mm.`
      },
      {
        id: `${part.id}-pin-${i + 1}-b`,
        type: "drill",
        x: part.width - SHELF_PIN_EDGE_OFFSET,
        y,
        z: 0,
        diameter: SHELF_PIN_DIAMETER,
        depth: SHELF_PIN_DEPTH,
        description: `Raf pimi deliği: arka kenar ${SHELF_PIN_EDGE_OFFSET} mm.`
      }
    );
  }

  return operations;
}

// Üst/alt tablaların yan panel bağlantı deliklerini üretir.
function minifixOperations(part: Part): Part["cncOperations"] {
  const operations: Part["cncOperations"] = [];
  const centerY = round(part.length / 2);

  for (const end of ["left", "right"] as const) {
    const x =
      end === "left"
        ? MINIFIX_EDGE_OFFSET
        : part.width - MINIFIX_EDGE_OFFSET;
    const dowelX =
      end === "left"
        ? DOWEL_EDGE_OFFSET
        : part.width - DOWEL_EDGE_OFFSET;

    operations.push({
      id: `${part.id}-minifix-${end}`,
      type: "minifix",
      x,
      y: centerY,
      z: 0,
      diameter: MINIFIX_DIAMETER,
      depth: MINIFIX_DEPTH,
      description: `Minifix govde deliği: ${end === "left" ? "sol" : "sağ"} uç.`
    });

    operations.push(
      {
        id: `${part.id}-dowel-${end}-a`,
        type: "dowel",
        x: dowelX,
        y: round(centerY - DOWEL_SPREAD),
        z: 0,
        diameter: DOWEL_DIAMETER,
        depth: DOWEL_DEPTH,
        description: "Çiftçeği deliği: minifix yanısı."
      },
      {
        id: `${part.id}-dowel-${end}-b`,
        type: "dowel",
        x: dowelX,
        y: round(centerY + DOWEL_SPREAD),
        z: 0,
        diameter: DOWEL_DIAMETER,
        depth: DOWEL_DEPTH,
        description: "Çiftçeği deliği: minifix yanısı."
      }
    );
  }

  return operations;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
