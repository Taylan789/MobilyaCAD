import { escapeXmlText } from "./technicalDrawing";

// Levha yerleştirme (nesting) girdisi.
export interface NestingSheet {
  widthMm: number;
  lengthMm: number;
}

export interface NestingPart {
  id: string;
  name: string;
  widthMm: number;
  lengthMm: number;
  quantity: number;
  // 90 derece döndürülebilir mi (varsayılan: true)
  canRotate?: boolean;
}

// Yerleştirilmiş bir parça.
export interface PlacedPart {
  partId: string;
  partName: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  lengthMm: number;
  rotated: boolean;
}

export interface NestingResult {
  sheet: NestingSheet;
  kerfMm: number;
  // Levha başına yerleştirilmiş parçalar.
  sheets: PlacedPart[][];
  placedCount: number;
  unplaced: NestingPart[];
  // Toplam parça alanı / topl levha alanı (%).
  utilizationPercent: number;
  // Heuristik olup olmadığını belirten sabit etiket.
  heuristic: boolean;
}

export interface NestingOptions {
  kerfMm?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  l: number;
}

// a dikdörtgeni, b dikdörtgeninin kerf genişletilmiş hâliyle çakışıyor mu?
function overlaps(a: Rect, b: Rect, kerfMm: number): boolean {
  return !(
    a.x + a.w + kerfMm <= b.x ||
    b.x + b.w + kerfMm <= a.x ||
    a.y + a.l + kerfMm <= b.y ||
    b.y + b.l + kerfMm <= a.y
  );
}

function fits(rect: Rect, sheet: NestingSheet): boolean {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.w <= sheet.widthMm &&
    rect.y + rect.l <= sheet.lengthMm
  );
}

// İlk uyan-düşen (first-fit decreasing) + alt-sol (bottom-left)
// heuristikiyle parçaları levhalara yerleştirir.
// Sonuç optimum değildir; "heuristic" bayrağı her zaman true'dur.
export function nestParts(
  parts: NestingPart[],
  sheet: NestingSheet,
  options: NestingOptions = {}
): NestingResult {
  const kerfMm = options.kerfMm ?? 0;

  const pieces = parts
    .filter(part => part.quantity > 0 && part.widthMm > 0 && part.lengthMm > 0)
    .flatMap(part =>
      Array.from({ length: part.quantity }, () => ({
        partId: part.id,
        partName: part.name,
        widthMm: part.widthMm,
        lengthMm: part.lengthMm,
        canRotate: part.canRotate !== false
      }))
    )
    .sort((a, b) => b.widthMm * b.lengthMm - a.widthMm * a.lengthMm);

  const sheets: PlacedPart[][] = [];
  const sheetRects: Rect[][] = [];
  const unplaced: NestingPart[] = [];
  let placedCount = 0;
  let placedArea = 0;

  for (const piece of pieces) {
    const orientations = [
      { w: piece.widthMm, l: piece.lengthMm, rotated: false }
    ];
    if (piece.canRotate && piece.widthMm !== piece.lengthMm) {
      orientations.push({ w: piece.lengthMm, l: piece.widthMm, rotated: true });
    }

    // Hiçbir yönde tek başına levhaya sığmıyorsa yerleştirilemez.
    const fitsAlone = orientations.some(
      o => o.w <= sheet.widthMm && o.l <= sheet.lengthMm
    );

    if (!fitsAlone) {
      const source = parts.find(part => part.id === piece.partId);
      if (source && !unplaced.includes(source)) {
        unplaced.push(source);
      }
      continue;
    }

    let placed = false;

    for (let sheetIndex = 0; sheetIndex < sheets.length && !placed; sheetIndex++) {
      const rects = sheetRects[sheetIndex];

      for (const orientation of orientations) {
        const position = findBottomLeftPosition(rects, orientation, sheet, kerfMm);

        if (position) {
          rects.push({ ...position, w: orientation.w, l: orientation.l });
          sheets[sheetIndex].push({
            partId: piece.partId,
            partName: piece.partName,
            xMm: position.x,
            yMm: position.y,
            widthMm: orientation.w,
            lengthMm: orientation.l,
            rotated: orientation.rotated
          });
          placedCount++;
          placedArea += orientation.w * orientation.l;
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      sheets.push([]);
      sheetRects.push([]);
      const rects = sheetRects[sheetRects.length - 1];

      for (const orientation of orientations) {
        const position = findBottomLeftPosition(rects, orientation, sheet, kerfMm);

        if (position) {
          rects.push({ ...position, w: orientation.w, l: orientation.l });
          sheets[sheets.length - 1].push({
            partId: piece.partId,
            partName: piece.partName,
            xMm: position.x,
            yMm: position.y,
            widthMm: orientation.w,
            lengthMm: orientation.l,
            rotated: orientation.rotated
          });
          placedCount++;
          placedArea += orientation.w * orientation.l;
          placed = true;
          break;
        }
      }
    }
  }

  const totalSheetArea = sheets.length * sheet.widthMm * sheet.lengthMm;

  return {
    sheet,
    kerfMm,
    sheets,
    placedCount,
    unplaced,
    utilizationPercent:
      totalSheetArea > 0 ? (placedArea / totalSheetArea) * 100 : 0,
    heuristic: true
  };
}

// Açı noktalarından alt-sol konumunu bulur.
function findBottomLeftPosition(
  placed: Rect[],
  piece: { w: number; l: number },
  sheet: NestingSheet,
  kerfMm: number
): { x: number; y: number } | null {
  const candidates: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];

  for (const rect of placed) {
    candidates.push({ x: rect.x + rect.w + kerfMm, y: rect.y });
    candidates.push({ x: rect.x, y: rect.y + rect.l + kerfMm });
  }

  let best: { x: number; y: number } | null = null;

  for (const candidate of candidates) {
    const rect = { x: candidate.x, y: candidate.y, w: piece.w, l: piece.l };

    if (!fits(rect, sheet)) continue;

    const clash = placed.some(p => overlaps(rect, p, kerfMm));
    if (clash) continue;

    if (
      best === null ||
      candidate.y < best.y ||
      (candidate.y === best.y && candidate.x < best.x)
    ) {
      best = candidate;
    }
  }

  return best;
}

// Yerleştirme sonucunun tek bir levha için SVG çizimini üretir.
export function generateNestingSvg(
  result: NestingResult,
  sheetIndex: number,
  options: DrawingOptions = {}
): string {
  const scale = options.scale ?? 0.2;
  const margin = 40;
  const placed = result.sheets[sheetIndex] ?? [];

  const widthPx = result.sheet.widthMm * scale;
  const heightPx = result.sheet.lengthMm * scale;
  const svgWidth = widthPx + margin * 2;
  const svgHeight = heightPx + margin * 2 + 26;

  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(1)}" height="${svgHeight.toFixed(1)}" viewBox="0 0 ${svgWidth.toFixed(1)} ${svgHeight.toFixed(1)}">`
  );

  lines.push(
    `<rect x="${margin}" y="${margin}" width="${widthPx.toFixed(1)}" height="${heightPx.toFixed(1)}" fill="#f8fafc" stroke="#1e293b" stroke-width="2"/>`
  );

  for (const part of placed) {
    const x = margin + part.xMm * scale;
    const y = margin + part.yMm * scale;
    const w = part.widthMm * scale;
    const l = part.lengthMm * scale;

    lines.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${l.toFixed(1)}" fill="#dbeafe" stroke="#2563eb" stroke-width="1"/>`
    );

    if (w > 34 && l > 14) {
      lines.push(
        `<text x="${(x + 3).toFixed(1)}" y="${(y + 11).toFixed(1)}" font-size="9" fill="#1e40af">${escapeXmlText(part.partName)}</text>`
      );
      lines.push(
        `<text x="${(x + 3).toFixed(1)}" y="${(y + 21).toFixed(1)}" font-size="8" fill="#3b82f6">${part.widthMm}×${part.lengthMm}${part.rotated ? " (döndürülmüş)" : ""}</text>`
      );
    }
  }

  lines.push(
    `<text x="${margin}" y="${svgHeight - 8}" font-size="11" font-weight="600" fill="#1e293b">Levha ${sheetIndex + 1} · ${result.sheet.widthMm}×${result.sheet.lengthMm} mm · kerf ${result.kerfMm} mm</text>`
  );
  lines.push(
    `<text x="${svgWidth - margin}" y="${svgHeight - 8}" text-anchor="end" font-size="10" fill="#64748b">Heuristik yerleştirme (optimum değil)</text>`
  );

  lines.push("</svg>");

  return lines.join("\n");
}

interface DrawingOptions {
  scale?: number;
}

// Yerleştirme sonucunun toplam özetini üretir.
export function summarizeNesting(result: NestingResult): {
  sheetCount: number;
  placedCount: number;
  unplacedCount: number;
  utilizationPercent: number;
} {
  return {
    sheetCount: result.sheets.length,
    placedCount: result.placedCount,
    unplacedCount: result.unplaced.length,
    utilizationPercent: result.utilizationPercent
  };
}
