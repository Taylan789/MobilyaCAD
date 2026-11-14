// Kesim optimizasyonu (panel yerleştirme).
// Bu algoritma BİR HEURİSTİKTİR (First-Fit Decreasing + sol-alt yerleştirme);
// matematiksel optimalite garanti edilmez. Sonuçlar "optimize edilmiş düzen"
// olarak etiketlenmelidir.

export interface SheetSize {
  width: number;
  length: number;
}

export interface PlacedPart {
  id: string;
  name: string;
  width: number;
  length: number;
  x: number;
  y: number;
  rotated: boolean;
}

export interface SheetLayout {
  sheetIndex: number;
  sheet: SheetSize;
  parts: PlacedPart[];
  usedAreaMm2: number;
  wasteAreaMm2: number;
  wastePercent: number;
}

export interface NestingInput {
  id: string;
  name: string;
  width: number;
  length: number;
  quantity: number;
  allowRotation: boolean;
}

export interface NestingOptions {
  sheet: SheetSize;
  kerf: number;
  margin: number;
}

export const defaultNestingOptions: NestingOptions = {
  sheet: { width: 2800, length: 2070 },
  kerf: 3,
  margin: 10
};

// Parçaları alana göre büyükten küçüğe sıralar (FFD).
function sortParts(inputs: NestingInput[]): NestingInput[] {
  return [...inputs].sort(
    (a, b) => b.width * b.length - a.width * a.length
  );
}

// Aday koordinatları: kenar boşluğu + zaten yerleştirilmiş parçaların kenarları.
function candidatePositions(
  placed: PlacedPart[],
  margin: number,
  kerf: number
): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([margin]);
  const ys = new Set<number>([margin]);
  placed.forEach((part) => {
    xs.add(part.x + part.width + kerf);
    ys.add(part.y + part.length + kerf);
  });
  return {
    xs: Array.from(xs).sort((a, b) => a - b),
    ys: Array.from(ys).sort((a, b) => a - b)
  };
}

// İki dikdörtgenin kesişip kesişmediğini kontrol eder.
function intersects(
  ax: number,
  ay: number,
  aw: number,
  al: number,
  bx: number,
  by: number,
  bw: number,
  bl: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bl && ay + al > by;
}

// Tek bir levha için parça yerleştirir; sığmıyorsa null döner.
function tryPlace(
  sheet: SheetSize,
  options: NestingOptions,
  part: NestingInput,
  placed: PlacedPart[]
): PlacedPart | null {
  const { xs: xCandidates, ys: yCandidates } = candidatePositions(
    placed,
    options.margin,
    options.kerf
  );

  const orientations = part.allowRotation
    ? [
        { w: part.width, l: part.length, rotated: false },
        { w: part.length, l: part.width, rotated: true }
      ]
    : [{ w: part.width, l: part.length, rotated: false }];

  for (const orientation of orientations) {
    const w = orientation.w + options.kerf;
    const l = orientation.l + options.kerf;

    for (const y of yCandidates) {
      for (const x of xCandidates) {
        if (x + w > sheet.width - options.margin + options.kerf) continue;
        if (y + l > sheet.length - options.margin + options.kerf) continue;

        const overlaps = placed.some((existing) =>
          intersects(
            x,
            y,
            w,
            l,
            existing.x - options.kerf,
            existing.y - options.kerf,
            existing.width + options.kerf * 2,
            existing.length + options.kerf * 2
          )
        );

        if (!overlaps) {
          return {
            id: part.id,
            name: part.name,
            width: orientation.w,
            length: orientation.l,
            x,
            y,
            rotated: orientation.rotated
          };
        }
      }
    }
  }

  return null;
}

export interface NestingResult {
  layouts: SheetLayout[];
  skippedPartIds: string[];
}

// First-Fit Decreasing kesim düzeni üretir.
// Tek başına en küçük levhaya sığmayan parçalar skippedPartIds içinde raporlanır.
export function nestParts(
  inputs: NestingInput[],
  options: NestingOptions = defaultNestingOptions
): NestingResult {
  const sheets: SheetLayout[] = [];
  const skippedPartIds: string[] = [];
  let current: PlacedPart[] = [];
  let currentUsed = 0;
  let sheetIndex = 0;

  const queue = sortParts(inputs);

  const closeCurrentSheet = () => {
    const sheetArea = options.sheet.width * options.sheet.length;
    sheets.push({
      sheetIndex,
      sheet: options.sheet,
      parts: current,
      usedAreaMm2: currentUsed,
      wasteAreaMm2: sheetArea - currentUsed,
      wastePercent: Math.round(((sheetArea - currentUsed) / sheetArea) * 1000) / 10
    });
    sheetIndex += 1;
    current = [];
    currentUsed = 0;
  };

  queue.forEach((input) => {
    for (let q = 0; q < input.quantity; q++) {
      const placed = tryPlace(options.sheet, options, input, current);
      if (placed) {
        current.push(placed);
        currentUsed += placed.width * placed.length;
        continue;
      }

      // Parça mevcut levhaya sığmıyor; yeni levhaya geç.
      if (current.length > 0) {
        closeCurrentSheet();
      }

      const next = tryPlace(options.sheet, options, input, current);
      if (next) {
        current.push(next);
        currentUsed += next.width * next.length;
      } else {
        // Parça hiçbir levhaya sığmıyor; atla ve raporla.
        skippedPartIds.push(input.id);
      }
    }
  });

  if (current.length > 0) {
    closeCurrentSheet();
  }

  return { layouts: sheets, skippedPartIds };
}

// Kesim planının toplam atık oranını hesaplar.
export function totalWastePercent(layouts: SheetLayout[]): number {
  if (layouts.length === 0) return 0;
  const totalArea = layouts.reduce(
    (sum, sheet) => sum + sheet.sheet.width * sheet.sheet.length,
    0
  );
  const usedArea = layouts.reduce((sum, sheet) => sum + sheet.usedAreaMm2, 0);
  if (totalArea <= 0) return 0;
  return Math.round(((totalArea - usedArea) / totalArea) * 1000) / 10;
}
