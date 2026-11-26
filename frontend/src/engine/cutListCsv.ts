import type { Part } from "../types/part";

type CsvCell = string | number;
type CsvRow = { furnitureName: string; furnitureId?: string; part: Part };

export interface ParsedProjectCutListCsvRow {
  furnitureName: string;
  part: Part;
}

const partIdHeader = "Parça ID";

const csvHeaders = [
  "Mobilya",
  "Parça",
  "Genişlik (mm)",
  "Uzunluk (mm)",
  "Kalınlık (mm)",
  "Adet",
  "Malzeme",
  "Malzeme ID",
  "Bant Üst",
  "Bant Alt",
  "Bant Sol",
  "Bant Sağ"
];

const drawerMetadataHeaders = ["Çekmece Grubu ID", "Damar Yönü"];
const productionNoteHeaders = ["Üretim Notu"];
const edgeKeys = ["top", "bottom", "left", "right"] as const;

function escapeCsvCell(value: CsvCell): string {
  const text = String(value);
  return /[;"\n\r]/.test(text)
    ? "\"" + text.replace(/"/g, "\"\"") + "\""
    : text;
}

function formatGrainDirection(direction: Part["grainDirection"]): string {
  if (direction === "length") return "Boy";
  if (direction === "width") return "En";
  return "Belirtilmedi";
}

function validateCutListPart(part: Part): void {
  if (
    typeof part.name !== "string" ||
    part.name.trim() === "" ||
    typeof part.material !== "string" ||
    part.material.trim() === "" ||
    (part.materialId !== undefined &&
      (typeof part.materialId !== "string" || part.materialId.trim() === ""))
  ) {
    throw new Error("Kesim listesinde parça adı ve malzemesi belirtilmelidir.");
  }

  if (part.panelGeometry !== undefined) {
    throw new Error(part.name + " kesitli panel geometrisi CSV biçiminde korunamadığı için dışa aktarım engellendi.");
  }

  const hasPerEdgeCatalogAssignment = part.edgeBandingByEdge !== undefined &&
    Object.keys(part.edgeBandingByEdge).length > 0;
  if (
    hasPerEdgeCatalogAssignment ||
    part.edgeBandingMaterialId !== undefined ||
    part.edgeBandingUnit !== undefined
  ) {
    throw new Error(part.name + " kenar bandı katalog ataması CSV biçiminde korunamadığı için dışa aktarım engellendi.");
  }

  if (Array.isArray(part.cncOperations) && part.cncOperations.length > 0) {
    throw new Error(part.name + " CNC operasyonları CSV biçiminde korunamadığı için dışa aktarım engellendi.");
  }

  if (
    ![part.width, part.length, part.thickness].every(
      (value) => Number.isFinite(value) && value > 0
    )
  ) {
    throw new Error(part.name + " ölçüleri pozitif ve sonlu olmalıdır.");
  }

  if (!Number.isSafeInteger(part.quantity) || part.quantity < 1) {
    throw new Error(part.name + " adet değeri pozitif tam sayı olmalıdır.");
  }

  if (
    !part.edgeBanding ||
    edgeKeys.some((edge) => typeof part.edgeBanding[edge] !== "boolean")
  ) {
    throw new Error(part.name + " kenar bantlama bilgisi geçersiz.");
  }

  if (
    part.drawerGroupId !== undefined &&
    (typeof part.drawerGroupId !== "string" || part.drawerGroupId.trim() === "")
  ) {
    throw new Error(part.name + " çekmece grubu kimliği geçersiz.");
  }

  if (!["length", "width", "none"].includes(part.grainDirection)) {
    throw new Error(part.name + " damar yönü geçersiz.");
  }
}

function serializeCutListRows(rows: readonly CsvRow[], includeFurnitureId = false, includePartId = false): string {
  for (const row of rows) {
    if (typeof row.furnitureName !== "string" || row.furnitureName.trim() === "") {
      throw new Error("Kesim listesi için mobilya adı belirtilmelidir.");
    }
    validateCutListPart(row.part);
    if (includePartId && (typeof row.part.id !== "string" || row.part.id.trim() === "" || row.part.id.trim() !== row.part.id || typeof row.furnitureId !== "string" || row.furnitureId.trim() === "" || row.furnitureId !== row.part.furnitureId)) {
      throw new Error("Proje CSV dışa aktarımı için parça ve mobilya kimlikleri geçerli olmalıdır.");
    }
  }

  // Single-furniture CSV header remains stable; project CSV adds identity columns.
  // Drawer metadata columns are appended only when a source group or explicit
  // grain direction exists, so those values are no longer silently discarded.
  const includeDrawerMetadata = rows.some(({ part }) =>
    part.drawerGroupId !== undefined || part.grainDirection !== "none"
  );
  const includeProductionNote = rows.some(({ part }) =>
    typeof part.productionNote === "string" && part.productionNote.trim() !== ""
  );
  const headers = [
    csvHeaders[0],
    ...(includeFurnitureId ? ["Mobilya ID"] : []),
    csvHeaders[1],
    ...(includePartId ? [partIdHeader] : []),
    ...csvHeaders.slice(2),
    ...(includeDrawerMetadata ? drawerMetadataHeaders : []),
    ...(includeProductionNote ? productionNoteHeaders : [])
  ];
  const csvRows: CsvCell[][] = [
    headers,
    ...rows.map(({ furnitureName, furnitureId, part }) => {
      const row: CsvCell[] = [
        furnitureName,
        ...(includeFurnitureId ? [furnitureId ?? ""] : []),
        part.name,
        ...(includePartId ? [part.id] : []),
        part.width,
        part.length,
        part.thickness,
        part.quantity,
        part.material,
        part.materialId ?? "",
        part.edgeBanding.top ? "Evet" : "Hayır",
        part.edgeBanding.bottom ? "Evet" : "Hayır",
        part.edgeBanding.left ? "Evet" : "Hayır",
        part.edgeBanding.right ? "Evet" : "Hayır"
      ];

      if (includeDrawerMetadata) {
        row.push(part.drawerGroupId ?? "", formatGrainDirection(part.grainDirection));
      }
      if (includeProductionNote) row.push(part.productionNote ?? "");
      return row;
    })
  ];

  return "\uFEFF" + csvRows
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\r\n");
}

/**
 * Serializes one furniture's calculated production parts using the existing
 * Turkish Excel-friendly CSV contract. Dimensions remain in millimetres.
 */
export function createCutListCsv(
  furnitureName: string,
  parts: readonly Part[]
): string {
  if (typeof furnitureName !== "string" || furnitureName.trim() === "") {
    throw new Error("Kesim listesi için mobilya adı belirtilmelidir.");
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Kesim listesi için en az bir parça gereklidir.");
  }

  return serializeCutListRows(parts.map((part) => ({ furnitureName, part })));
}

/**
 * Serializes a project-wide cut list while resolving each part's source
 * furniture name by furnitureId. Unknown IDs are rejected, never relabelled.
 */
export function createProjectCutListCsv(
  furnitureNames: ReadonlyMap<string, string>,
  parts: readonly Part[]
): string {
  if (!furnitureNames || typeof furnitureNames.get !== "function") {
    throw new Error("Proje kesim listesi için mobilya adı eşlemesi gereklidir.");
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Kesim listesi için en az bir parça gereklidir.");
  }

  const seenPartIds = new Set<string>();
  const rows = parts.map((part) => {
    if (typeof part.id !== "string" || part.id.trim() === "" || part.id.trim() !== part.id || seenPartIds.has(part.id)) {
      throw new Error("Proje CSV dışa aktarımı için parça kimlikleri geçerli ve benzersiz olmalıdır.");
    }
    seenPartIds.add(part.id);
    const furnitureName = furnitureNames.get(part.furnitureId);
    if (typeof furnitureName !== "string" || furnitureName.trim() === "") {
      throw new Error("Parça için mobilya adı eşleşmesi bulunamadı.");
    }
    return { furnitureName, furnitureId: part.furnitureId, part };
  });

  return serializeCutListRows(rows, true, true);
}


function parseCsvRecords(source: string): string[][] {
  if (typeof source !== "string" || source.length === 0) throw new Error("Proje CSV dosyası boş olamaz.");
  const input = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let quoteClosed = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') { field += '"'; index += 1; }
        else { quoted = false; quoteClosed = true; }
      } else field += character;
      continue;
    }
    if (quoteClosed) {
      if (character === ";") { record.push(field); field = ""; quoteClosed = false; continue; }
      if (character === "\r" || character === "\n") {
        record.push(field);
        if (record.length > 1 || record[0] !== "") records.push(record);
        record = []; field = ""; quoteClosed = false;
        if (character === "\r" && input[index + 1] === "\n") index += 1;
        continue;
      }
      throw new Error("CSV tırnaklı alanından sonra yalnızca ayırıcı veya satır sonu gelebilir.");
    }
    if (character === '"') {
      if (field !== "") throw new Error("CSV tırnak karakteri alanın başında bulunmalıdır.");
      quoted = true; continue;
    }
    if (character === ";") { record.push(field); field = ""; continue; }
    if (character === "\r" || character === "\n") {
      record.push(field);
      if (record.length > 1 || record[0] !== "") records.push(record);
      record = []; field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      continue;
    }
    field += character;
  }
  if (quoted) throw new Error("CSV dosyasında kapatılmamış tırnaklı alan var.");
  if (quoteClosed || field !== "" || record.length > 0) {
    record.push(field);
    if (record.length > 1 || record[0] !== "") records.push(record);
  }
  return records;
}

function requiredCsvText(value: string, label: string): string {
  if (value.trim() === "") throw new Error(label + " boş olamaz.");
  return value;
}

function requiredCsvIdentifier(value: string, label: string): string {
  if (value.trim() === "" || value.trim() !== value) throw new Error(label + " geçerli bir kimlik olmalıdır.");
  return value;
}

function positiveCsvNumber(value: string, label: string): number {
  if (value.trim() === "") throw new Error(label + " boş olamaz.");
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(label + " pozitif ve sonlu bir mm değeri olmalıdır.");
  return number;
}

function positiveCsvInteger(value: string, label: string): number {
  const number = positiveCsvNumber(value, label);
  if (!Number.isSafeInteger(number)) throw new Error(label + " pozitif güvenli tam sayı olmalıdır.");
  return number;
}

function csvBoolean(value: string, label: string): boolean {
  if (value === "Evet") return true;
  if (value === "Hayır") return false;
  throw new Error(label + " yalnızca Evet veya Hayır olabilir.");
}

/** Parses only the identity-complete project CSV emitted by createProjectCutListCsv. */
export function parseProjectCutListCsv(content: string): ParsedProjectCutListCsvRow[] {
  const records = parseCsvRecords(content);
  if (records.length < 2) throw new Error("Proje CSV dosyası başlık ve en az bir parça satırı taşımalıdır.");
  const headers = records[0];
  const allowed = [...csvHeaders, "Mobilya ID", partIdHeader, ...drawerMetadataHeaders, ...productionNoteHeaders];
  const seen = new Set<string>();
  for (const header of headers) {
    if (seen.has(header)) throw new Error("Proje CSV dosyasında yinelenen sütun başlığı var: " + header + ".");
    seen.add(header);
    if (!allowed.includes(header)) throw new Error("Proje CSV dosyasında desteklenmeyen sütun var: " + header + ".");
  }
  const required = ["Mobilya", "Mobilya ID", "Parça", partIdHeader, "Genişlik (mm)", "Uzunluk (mm)", "Kalınlık (mm)", "Adet", "Malzeme", "Malzeme ID", "Bant Üst", "Bant Alt", "Bant Sol", "Bant Sağ"];
  const missing = required.find((header) => !seen.has(header));
  if (missing !== undefined) throw new Error("Kayıpsız proje CSV round-trip için zorunlu sütun eksik: " + missing + ".");
  const column = new Map(headers.map((header, index) => [header, index]));
  const read = (row: string[], header: string): string => row[column.get(header) as number];
  const hasDrawerMetadata = column.has("Çekmece Grubu ID") || column.has("Damar Yönü");
  if (hasDrawerMetadata && (!column.has("Çekmece Grubu ID") || !column.has("Damar Yönü"))) {
    throw new Error("Çekmece CSV metadata sütunları birlikte bulunmalıdır.");
  }
  const seenPartIds = new Set<string>();
  return records.slice(1).map((row, rowIndex) => {
    const line = rowIndex + 2;
    if (row.length !== headers.length) throw new Error("Proje CSV " + line + ". satırındaki sütun sayısı başlıkla eşleşmiyor.");
    const id = requiredCsvIdentifier(read(row, partIdHeader), "Parça ID");
    if (seenPartIds.has(id)) throw new Error("Proje CSV dosyasında yinelenen Parça ID var: " + id + ".");
    seenPartIds.add(id);
    const furnitureId = requiredCsvIdentifier(read(row, "Mobilya ID"), "Mobilya ID");
    const materialId = read(row, "Malzeme ID");
    const drawerGroupId = hasDrawerMetadata ? read(row, "Çekmece Grubu ID") : "";
    const grain = hasDrawerMetadata ? read(row, "Damar Yönü") : "Belirtilmedi";
    const note = column.has("Üretim Notu") ? read(row, "Üretim Notu") : "";
    let grainDirection: Part["grainDirection"];
    if (grain === "Boy") grainDirection = "length";
    else if (grain === "En") grainDirection = "width";
    else if (grain === "Belirtilmedi") grainDirection = "none";
    else throw new Error("Proje CSV " + line + ". satırındaki damar yönü geçersiz.");
    const part: Part = {
      id,
      furnitureId,
      name: requiredCsvText(read(row, "Parça"), "Parça adı"),
      width: positiveCsvNumber(read(row, "Genişlik (mm)"), "Genişlik"),
      length: positiveCsvNumber(read(row, "Uzunluk (mm)"), "Uzunluk"),
      thickness: positiveCsvNumber(read(row, "Kalınlık (mm)"), "Kalınlık"),
      quantity: positiveCsvInteger(read(row, "Adet"), "Adet"),
      material: requiredCsvText(read(row, "Malzeme"), "Malzeme"),
      edgeBanding: {
        top: csvBoolean(read(row, "Bant Üst"), "Bant Üst"),
        bottom: csvBoolean(read(row, "Bant Alt"), "Bant Alt"),
        left: csvBoolean(read(row, "Bant Sol"), "Bant Sol"),
        right: csvBoolean(read(row, "Bant Sağ"), "Bant Sağ")
      },
      cncOperations: [],
      grainDirection,
      ...(materialId === "" ? {} : { materialId: requiredCsvIdentifier(materialId, "Malzeme ID") }),
      ...(drawerGroupId === "" ? {} : { drawerGroupId: requiredCsvIdentifier(drawerGroupId, "Çekmece Grubu ID") }),
      ...(note === "" ? {} : { productionNote: note })
    };
    return { furnitureName: requiredCsvText(read(row, "Mobilya"), "Mobilya adı"), part };
  });
}
