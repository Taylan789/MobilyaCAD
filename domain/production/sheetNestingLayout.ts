import type { SheetNestingBatchResult, SheetNestingRotation } from "./sheetNestingInput.ts";
import { validateSheetNestingInput } from "./sheetNestingInput.ts";

export const MAX_SHEET_NESTING_LAYOUT_PIECES = 50_000;
export interface SheetNestingPlacement {
  sourcePartId: string; pieceNumber: number; xMm: number; yMm: number;
  widthMm: number; lengthMm: number; rotationDeg: SheetNestingRotation;
}
export interface SheetNestingLayoutSheet { index: number; placements: SheetNestingPlacement[]; pieceCount: number; }
export interface SheetNestingLayoutResult {
  schemaVersion: 1; strategy: "deterministic-shelf-v1";
  sheet: SheetNestingBatchResult["sheet"]; kerfMm: number;
  sheets: SheetNestingLayoutSheet[]; totalPieceCount: number;
}
export type SheetNestingLayoutReport =
  | { schemaVersion: 1; status: "ready" | "empty"; result: SheetNestingLayoutResult; diagnostics: [] }
  | { schemaVersion: 1; status: "blocked"; result: null; diagnostics: string[] };

type Rec = Record<string, unknown>;
type Part = SheetNestingBatchResult["parts"][number];
type Piece = { part: Part; pieceNumber: number };
type Row = { yMm: number; heightMm: number; usedWidthMm: number };
type MutableSheet = { index: number; rows: Row[]; placements: SheetNestingPlacement[]; pieceCount: number };
type Oriented = { rotationDeg: SheetNestingRotation; widthMm: number; lengthMm: number };
type ExistingCandidate = Oriented & {
  sheetIndex: number; rowIndex: number; xMm: number; endXmm: number;
  verticalSlackMm: number; horizontalSlackMm: number;
};
type NewRowCandidate = Oriented & { sheetIndex: number; yMm: number; horizontalSlackMm: number };

function isRecord(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requireRecord(value: unknown, label: string): Rec {
  if (!isRecord(value)) throw new Error(label + " geçerli bir nesne olmalıdır.");
  return value;
}
function rejectUnknown(value: Rec, allowed: readonly string[], label: string): void {
  const key = Object.keys(value).find((candidate) => !allowed.includes(candidate));
  if (key !== undefined) throw new Error(label + " için desteklenmeyen alan: " + key + ".");
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
function roundMm(value: number, label: string): number {
  const scaled = value * 10;
  if (!Number.isFinite(value) || !Number.isFinite(scaled)) {
    throw new Error(label + " sonlu 0.1 mm koordinat aralığını aşıyor.");
  }
  return Math.round(scaled + Number.EPSILON * 10) / 10;
}
function addMm(a: number, b: number, label: string): number { return roundMm(a + b, label); }
function asc(a: number, b: number): number { return a < b ? -1 : a > b ? 1 : 0; }
function desc(a: number, b: number): number { return a > b ? -1 : a < b ? 1 : 0; }
function textOrder(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function orient(part: Part, rotationDeg: SheetNestingRotation): Oriented {
  return {
    rotationDeg,
    widthMm: rotationDeg === 0 ? part.widthMm : part.lengthMm,
    lengthMm: rotationDeg === 0 ? part.lengthMm : part.widthMm
  };
}
function normalizeBatch(value: unknown): SheetNestingBatchResult {
  const batch = requireRecord(value, "Levha nesting batch sonucu");
  rejectUnknown(batch, ["schemaVersion", "sheet", "kerfMm", "parts", "totalPieceCount"], "Levha nesting batch sonucu");
  if (batch.schemaVersion !== 1) throw new Error("Desteklenmeyen levha nesting batch şema sürümü.");
  if (!Array.isArray(batch.parts)) throw new Error("Levha nesting batch parçaları bir liste olmalıdır.");
  const parts = batch.parts.map((raw, index) => {
    const part = requireRecord(raw, "Levha nesting batch parçasının " + (index + 1) + ". kaydı");
    rejectUnknown(part, [
      "id", "materialId", "widthMm", "lengthMm", "thicknessMm", "quantity",
      "grainDirection", "geometry", "allowedRotationsDeg"
    ], "Levha nesting batch parçası");
    // Recompute derived rotations instead of trusting caller-provided data.
    return {
      id: part.id, materialId: part.materialId, widthMm: part.widthMm,
      lengthMm: part.lengthMm, thicknessMm: part.thicknessMm,
      quantity: part.quantity, grainDirection: part.grainDirection, geometry: part.geometry
    };
  });
  const validated = validateSheetNestingInput({
    schemaVersion: 1, sheet: batch.sheet, kerfMm: batch.kerfMm, parts
  });
  if (validated.status === "blocked" || validated.result === null) {
    throw new Error(validated.diagnostics.join(" "));
  }
  if (typeof batch.totalPieceCount !== "number" ||
      !Number.isSafeInteger(batch.totalPieceCount) ||
      batch.totalPieceCount !== validated.result.totalPieceCount) {
    throw new Error("Levha nesting batch toplam parça adedi içerikle eşleşmiyor.");
  }
  return validated.result;
}
function comparePieces(a: Piece, b: Piece): number {
  const longest = desc(Math.max(a.part.widthMm, a.part.lengthMm), Math.max(b.part.widthMm, b.part.lengthMm));
  if (longest !== 0) return longest;
  const shortest = desc(Math.min(a.part.widthMm, a.part.lengthMm), Math.min(b.part.widthMm, b.part.lengthMm));
  if (shortest !== 0) return shortest;
  const id = textOrder(a.part.id, b.part.id);
  return id !== 0 ? id : asc(a.pieceNumber, b.pieceNumber);
}
function compareExisting(a: ExistingCandidate, b: ExistingCandidate): number {
  return asc(a.verticalSlackMm, b.verticalSlackMm) ||
    asc(a.horizontalSlackMm, b.horizontalSlackMm) ||
    asc(a.sheetIndex, b.sheetIndex) || asc(a.rowIndex, b.rowIndex) || asc(a.rotationDeg, b.rotationDeg);
}
function compareNewRow(a: NewRowCandidate, b: NewRowCandidate): number {
  return asc(a.lengthMm, b.lengthMm) || asc(a.horizontalSlackMm, b.horizontalSlackMm) ||
    asc(a.sheetIndex, b.sheetIndex) || asc(a.rotationDeg, b.rotationDeg);
}
function placement(piece: Piece, dims: Oriented, xMm: number, yMm: number): SheetNestingPlacement {
  return {
    sourcePartId: piece.part.id, pieceNumber: piece.pieceNumber, xMm, yMm,
    widthMm: dims.widthMm, lengthMm: dims.lengthMm, rotationDeg: dims.rotationDeg
  };
}

/** Deterministic machine-independent shelf heuristic; not optimal nesting or CNC output. */
export function calculateSheetNestingLayout(value: unknown): SheetNestingLayoutReport {
  try {
    const batch = normalizeBatch(value);
    if (batch.totalPieceCount > MAX_SHEET_NESTING_LAYOUT_PIECES) {
      throw new Error("Yerleşim tek seferde en fazla " + MAX_SHEET_NESTING_LAYOUT_PIECES + " fiziksel parçayı destekler.");
    }
    const pieces: Piece[] = [];
    for (const part of batch.parts) {
      for (let pieceNumber = 1; pieceNumber <= part.quantity; pieceNumber += 1) pieces.push({ part, pieceNumber });
    }
    pieces.sort(comparePieces);
    const sheets: MutableSheet[] = [];

    for (const piece of pieces) {
      const existing: ExistingCandidate[] = [];
      for (const sheet of sheets) {
        for (const [rowIndex, row] of sheet.rows.entries()) {
          const xMm = row.usedWidthMm === 0 ? 0 : addMm(row.usedWidthMm, batch.kerfMm, "Parça X koordinatı");
          for (const rotationDeg of piece.part.allowedRotationsDeg) {
            const dims = orient(piece.part, rotationDeg);
            const endXmm = addMm(xMm, dims.widthMm, "Parça sağ sınırı");
            if (dims.lengthMm <= row.heightMm && endXmm <= batch.sheet.widthMm) {
              existing.push({
                ...dims, sheetIndex: sheet.index, rowIndex, xMm, endXmm,
                verticalSlackMm: row.heightMm - dims.lengthMm,
                horizontalSlackMm: batch.sheet.widthMm - endXmm
              });
            }
          }
        }
      }
      if (existing.length > 0) {
        existing.sort(compareExisting);
        const candidate = existing[0];
        if (!candidate) throw new Error("Yerleşim sıra adayı kayboldu.");
        const target = sheets[candidate.sheetIndex - 1];
        if (!target) throw new Error("Yerleşim levhası bulunamadı.");
        const row = target.rows[candidate.rowIndex];
        if (!row) throw new Error("Yerleşim sırası bulunamadı.");
        row.usedWidthMm = candidate.endXmm;
        target.placements.push(placement(piece, candidate, candidate.xMm, row.yMm));
        target.pieceCount += 1;
        continue;
      }

      const newRows: NewRowCandidate[] = [];
      for (const sheet of sheets) {
        const last = sheet.rows[sheet.rows.length - 1];
        const yMm = last === undefined ? 0 :
          addMm(addMm(last.yMm, last.heightMm, "Yeni sıra Y koordinatı"), batch.kerfMm, "Yeni sıra kerf aralığı");
        for (const rotationDeg of piece.part.allowedRotationsDeg) {
          const dims = orient(piece.part, rotationDeg);
          const endYmm = addMm(yMm, dims.lengthMm, "Parça alt sınırı");
          if (dims.widthMm <= batch.sheet.widthMm && endYmm <= batch.sheet.lengthMm) {
            newRows.push({
              ...dims, sheetIndex: sheet.index, yMm,
              horizontalSlackMm: batch.sheet.widthMm - dims.widthMm
            });
          }
        }
      }
      if (newRows.length > 0) {
        newRows.sort(compareNewRow);
        const candidate = newRows[0];
        if (!candidate) throw new Error("Yeni yerleşim sırası adayı kayboldu.");
        const target = sheets[candidate.sheetIndex - 1];
        if (!target) throw new Error("Yeni yerleşim levhası bulunamadı.");
        target.rows.push({ yMm: candidate.yMm, heightMm: candidate.lengthMm, usedWidthMm: candidate.widthMm });
        target.placements.push(placement(piece, candidate, 0, candidate.yMm));
        target.pieceCount += 1;
        continue;
      }

      const orientations = piece.part.allowedRotationsDeg
        .map((rotationDeg) => orient(piece.part, rotationDeg))
        .filter((dims) => dims.widthMm <= batch.sheet.widthMm && dims.lengthMm <= batch.sheet.lengthMm)
        .sort((a, b) =>
          asc(a.lengthMm, b.lengthMm) ||
          asc(batch.sheet.widthMm - a.widthMm, batch.sheet.widthMm - b.widthMm) ||
          asc(a.rotationDeg, b.rotationDeg)
        );
      const first = orientations[0];
      if (!first) throw new Error(piece.part.id + " parçası damar yönüne izin verilen dönüşlerde levha sınırlarına sığmıyor.");
      sheets.push({
        index: sheets.length + 1,
        rows: [{ yMm: 0, heightMm: first.lengthMm, usedWidthMm: first.widthMm }],
        placements: [placement(piece, first, 0, 0)],
        pieceCount: 1
      });
    }

    const placed = sheets.reduce((sum, sheet) => sum + sheet.pieceCount, 0);
    if (placed !== batch.totalPieceCount) throw new Error("Yerleşim tüm fiziksel parçaları kayıpsız yerleştiremedi.");
    const result: SheetNestingLayoutResult = {
      schemaVersion: 1, strategy: "deterministic-shelf-v1", sheet: { ...batch.sheet },
      kerfMm: batch.kerfMm,
      sheets: sheets.map((sheet) => ({
        index: sheet.index, placements: sheet.placements, pieceCount: sheet.pieceCount
      })),
      totalPieceCount: placed
    };
    return { schemaVersion: 1, status: placed === 0 ? "empty" : "ready", result, diagnostics: [] };
  } catch (error) {
    return { schemaVersion: 1, status: "blocked", result: null, diagnostics: [errorMessage(error)] };
  }
}
