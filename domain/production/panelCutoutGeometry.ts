export interface PanelCutoutEdgeBanding {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface PanelCutoutGeometryOpening {
  id: string;
  /** Offset from the panel's left edge, in millimetres. */
  xMm: number;
  /** Offset from the panel's top edge, in millimetres. */
  yMm: number;
  widthMm: number;
  lengthMm: number;
  edgeBanding: PanelCutoutEdgeBanding;
}

export interface PanelCutoutGeometryResult {
  schemaVersion: 1;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  outerEdgeBanding: PanelCutoutEdgeBanding;
  cutouts: PanelCutoutGeometryOpening[];
  outerFaceAreaMm2: number;
  cutoutAreaMm2: number;
  netFaceAreaMm2: number;
  netVolumeMm3: number;
  outerPerimeterMm: number;
  cutoutPerimeterMm: number;
  edgeBanding: {
    outerLengthMm: number;
    cutoutLengthMm: number;
    totalLengthMm: number;
    outerEdgeCount: number;
    cutoutEdgeCount: number;
    totalEdgeCount: number;
  };
}

const EDGE_KEYS = ["top", "bottom", "left", "right"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  return value;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(label + " için desteklenmeyen alan: " + key + ".");
    }
  }
}

function requireIdentifier(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim() !== value
  ) {
    throw new Error(label + " boş olmayan ve kenar boşluğu içermeyen bir metin olmalıdır.");
  }
  return value;
}

function normalizeMm(value: unknown, label: string, allowZero: boolean): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (allowZero ? value < 0 : value <= 0)
  ) {
    throw new Error(label + (allowZero
      ? " sıfır veya pozitif ve sonlu bir mm değeri olmalıdır."
      : " pozitif ve sonlu bir mm değeri olmalıdır."));
  }

  const scaled = value * 10;
  if (!Number.isFinite(scaled)) {
    throw new Error(label + " 0.1 mm normalizasyon aralığını aşıyor.");
  }

  const normalized = Math.round(scaled + Number.EPSILON * 10) / 10;
  if (!Number.isFinite(normalized) || (!allowZero && normalized <= 0)) {
    throw new Error(label + " 0.1 mm normalizasyonundan sonra pozitif kalmalıdır.");
  }
  return normalized === 0 ? 0 : normalized;
}

function roundTo(value: number, decimalPlaces: number, label: string): number {
  const factor = 10 ** decimalPlaces;
  const scaled = value * factor;
  if (!Number.isFinite(scaled)) {
    throw new Error(label + " güvenli sayısal aralıkta hesaplanamadı.");
  }
  return Math.round(scaled + Number.EPSILON * factor) / factor;
}

function validateEdgeBanding(value: unknown, label: string): PanelCutoutEdgeBanding {
  const source = requireRecord(value, label);
  rejectUnknownKeys(source, EDGE_KEYS, label);

  const result = {} as PanelCutoutEdgeBanding;
  for (const edge of EDGE_KEYS) {
    if (typeof source[edge] !== "boolean") {
      throw new Error(label + " " + edge + " kenarı açıkça boolean olmalıdır.");
    }
    result[edge] = source[edge] as boolean;
  }
  return result;
}

function edgeBandingLength(
  edges: PanelCutoutEdgeBanding,
  widthMm: number,
  lengthMm: number
): { lengthMm: number; edgeCount: number } {
  const widthCount = Number(edges.top) + Number(edges.bottom);
  const lengthCount = Number(edges.left) + Number(edges.right);
  return {
    lengthMm: widthMm * widthCount + lengthMm * lengthCount,
    edgeCount: widthCount + lengthCount
  };
}

function addFinite(total: number, contribution: number, label: string): number {
  const next = total + contribution;
  if (!Number.isFinite(next)) {
    throw new Error(label + " güvenli sayısal aralıkta hesaplanamadı.");
  }
  return next;
}

/**
 * Calculates one rectangular panel with explicit, axis-aligned rectangular
 * through-cutouts. This is a geometry primitive, not a production Part or CNC
 * instruction. All dimensions are millimetres and are normalized to 0.1 mm.
 */
export function calculatePanelCutoutGeometry(value: unknown): PanelCutoutGeometryResult {
  const request = requireRecord(value, "Panel kesit geometrisi");
  rejectUnknownKeys(
    request,
    ["schemaVersion", "widthMm", "lengthMm", "thicknessMm", "outerEdgeBanding", "cutouts"],
    "Panel kesit geometrisi"
  );

  if (request.schemaVersion !== 1) {
    throw new Error("Desteklenmeyen panel kesit geometrisi şema sürümü.");
  }

  const widthMm = normalizeMm(request.widthMm, "Panel genişliği", false);
  const lengthMm = normalizeMm(request.lengthMm, "Panel uzunluğu", false);
  const thicknessMm = normalizeMm(request.thicknessMm, "Panel kalınlığı", false);
  const outerEdgeBanding = validateEdgeBanding(request.outerEdgeBanding, "Panel dış kenar bantlama");

  if (!Array.isArray(request.cutouts)) {
    throw new Error("Panel açıklıkları bir liste olmalıdır.");
  }

  const seenIds = new Set<string>();
  const cutouts: PanelCutoutGeometryOpening[] = request.cutouts.map((raw, index) => {
    const opening = requireRecord(raw, "Panel açıklığının " + (index + 1) + ". kaydı");
    rejectUnknownKeys(
      opening,
      ["id", "xMm", "yMm", "widthMm", "lengthMm", "edgeBanding"],
      "Panel açıklığı"
    );

    const id = requireIdentifier(opening.id, "Panel açıklığı kimliği");
    if (seenIds.has(id)) throw new Error("Yinelenen panel açıklığı kimliği: " + id + ".");
    seenIds.add(id);

    const xMm = normalizeMm(opening.xMm, id + " X konumu", true);
    const yMm = normalizeMm(opening.yMm, id + " Y konumu", true);
    const openingWidthMm = normalizeMm(opening.widthMm, id + " genişliği", false);
    const openingLengthMm = normalizeMm(opening.lengthMm, id + " uzunluğu", false);
    const edgeBanding = validateEdgeBanding(opening.edgeBanding, id + " iç kenar bantlama");
    const rightMm = xMm + openingWidthMm;
    const bottomMm = yMm + openingLengthMm;

    if (!Number.isFinite(rightMm) || !Number.isFinite(bottomMm)) {
      throw new Error(id + " panel açıklığı sınırları güvenli aralıkta hesaplanamadı.");
    }
    if (xMm <= 0 || yMm <= 0 || rightMm >= widthMm || bottomMm >= lengthMm) {
      throw new Error(id + " panel açıklığı dış sınıra temas etmeden tamamen panel içinde olmalıdır.");
    }

    return { id, xMm, yMm, widthMm: openingWidthMm, lengthMm: openingLengthMm, edgeBanding };
  });

  for (let firstIndex = 0; firstIndex < cutouts.length; firstIndex += 1) {
    const first = cutouts[firstIndex];
    const firstRight = first.xMm + first.widthMm;
    const firstBottom = first.yMm + first.lengthMm;

    for (let secondIndex = firstIndex + 1; secondIndex < cutouts.length; secondIndex += 1) {
      const second = cutouts[secondIndex];
      const secondRight = second.xMm + second.widthMm;
      const secondBottom = second.yMm + second.lengthMm;
      const separated =
        firstRight < second.xMm ||
        secondRight < first.xMm ||
        firstBottom < second.yMm ||
        secondBottom < first.yMm;

      if (!separated) {
        throw new Error(first.id + " ve " + second.id + " panel açıklıkları çakışamaz veya birbirine temas edemez.");
      }
    }
  }

  const outerFaceAreaMm2 = widthMm * lengthMm;
  if (!Number.isFinite(outerFaceAreaMm2)) {
    throw new Error("Panel dış yüzey alanı güvenli sayısal aralıkta hesaplanamadı.");
  }

  let cutoutAreaMm2 = 0;
  let cutoutPerimeterMm = 0;
  let cutoutBandingLengthMm = 0;
  let cutoutEdgeCount = 0;

  for (const opening of cutouts) {
    cutoutAreaMm2 = addFinite(
      cutoutAreaMm2,
      opening.widthMm * opening.lengthMm,
      "Panel açıklık alanı"
    );
    cutoutPerimeterMm = addFinite(
      cutoutPerimeterMm,
      2 * (opening.widthMm + opening.lengthMm),
      "Panel açıklık çevresi"
    );
    const banding = edgeBandingLength(opening.edgeBanding, opening.widthMm, opening.lengthMm);
    cutoutBandingLengthMm = addFinite(
      cutoutBandingLengthMm,
      banding.lengthMm,
      "Panel açıklığı kenar bantlama"
    );
    cutoutEdgeCount += banding.edgeCount;
  }

  const netFaceAreaMm2 = outerFaceAreaMm2 - cutoutAreaMm2;
  if (!Number.isFinite(netFaceAreaMm2) || netFaceAreaMm2 <= 0) {
    throw new Error("Panel net yüzey alanı pozitif ve sonlu kalmalıdır.");
  }

  const netVolumeMm3 = netFaceAreaMm2 * thicknessMm;
  const outerPerimeterMm = 2 * (widthMm + lengthMm);
  const outerBanding = edgeBandingLength(outerEdgeBanding, widthMm, lengthMm);
  const totalBandingLengthMm = outerBanding.lengthMm + cutoutBandingLengthMm;
  const totalEdgeCount = outerBanding.edgeCount + cutoutEdgeCount;

  if (
    !Number.isFinite(netVolumeMm3) ||
    !Number.isFinite(outerPerimeterMm) ||
    !Number.isFinite(totalBandingLengthMm) ||
    !Number.isSafeInteger(totalEdgeCount)
  ) {
    throw new Error("Panel kesit tüketim değerleri güvenli sayısal aralıkta hesaplanamadı.");
  }

  return {
    schemaVersion: 1,
    widthMm,
    lengthMm,
    thicknessMm,
    outerEdgeBanding,
    cutouts,
    outerFaceAreaMm2: roundTo(outerFaceAreaMm2, 3, "Panel dış yüzey alanı"),
    cutoutAreaMm2: roundTo(cutoutAreaMm2, 3, "Panel açıklık alanı"),
    netFaceAreaMm2: roundTo(netFaceAreaMm2, 3, "Panel net yüzey alanı"),
    netVolumeMm3: roundTo(netVolumeMm3, 3, "Panel net hacmi"),
    outerPerimeterMm: roundTo(outerPerimeterMm, 1, "Panel dış çevresi"),
    cutoutPerimeterMm: roundTo(cutoutPerimeterMm, 1, "Panel açıklık çevresi"),
    edgeBanding: {
      outerLengthMm: roundTo(outerBanding.lengthMm, 1, "Panel dış kenar bantlama"),
      cutoutLengthMm: roundTo(cutoutBandingLengthMm, 1, "Panel açıklığı kenar bantlama"),
      totalLengthMm: roundTo(totalBandingLengthMm, 1, "Panel toplam kenar bantlama"),
      outerEdgeCount: outerBanding.edgeCount,
      cutoutEdgeCount,
      totalEdgeCount
    }
  };
}
