import type { Furniture } from "../types/furniture";
import type { CabinetConstructionRules } from "../types/construction/cabinetRules";
import { calculateCabinetParts } from "./cabinetParts";

// Teknik çizim seçenekleri.
export interface DrawingOptions {
  // mm başına piksel
  scale?: number;
  title?: string;
}

// SVG metin değerleri için XML karakterlerini esc'ler.
export function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatMm(value: number): string {
  return `${Math.round(value * 10) / 10}`;
}

// Mobilyanın ön yüz elevasyon çizimini SVG olarak üretir.
// Parça bilgileri üretim motorundan alınır; çizim ayrı bir
// ölçü kaynağı tutmaz.
export function generateFrontElevationSvg(
  furniture: Furniture,
  rules: CabinetConstructionRules,
  options: DrawingOptions = {}
): string {
  const scale = options.scale ?? 0.4;
  const title = options.title ?? furniture.name;
  const margin = 60;

  const parts = calculateCabinetParts(furniture, rules);

  const doors = parts.filter(part => part.name === "Dolap Kapağı");
  const drawerFronts = parts.filter(part => part.name === "Çekmece Ön Yüzü");
  const shelves = parts.filter(part => part.name === "Raf");

  const widthMm = furniture.width;
  const heightMm = furniture.height;

  const widthPx = widthMm * scale;
  const heightPx = heightMm * scale;

  const svgWidth = widthPx + margin * 2;
  const svgHeight = heightPx + margin * 2 + 30;

  const gapMm = rules.doorGap;
  const gapPx = gapMm * scale;

  const drawerAreaMm =
    drawerFronts.length > 0
      ? drawerFronts[0].length * drawerFronts.length +
        gapMm * (drawerFronts.length + 1)
      : 0;
  const drawerAreaPx = drawerAreaMm * scale;

  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(1)}" height="${svgHeight.toFixed(1)}" viewBox="0 0 ${svgWidth.toFixed(1)} ${svgHeight.toFixed(1)}">`
  );

  lines.push(
    `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#334155"/></marker></defs>`
  );

  // Dış çerçeve
  lines.push(
    `<rect x="${margin}" y="${margin}" width="${widthPx.toFixed(1)}" height="${heightPx.toFixed(1)}" fill="none" stroke="#1e293b" stroke-width="2"/>`
  );

  // Raf çizgileri (kapak alanı içinde eşit aralıklarla)
  const doorAreaTop = margin + gapPx;
  const doorAreaBottom = margin + heightPx - drawerAreaPx - gapPx;
  const doorAreaHeight = doorAreaBottom - doorAreaTop;

  for (let i = 0; i < (shelves[0]?.quantity ?? 0); i++) {
    const shelfY =
      doorAreaTop + (doorAreaHeight * (i + 1)) / (shelves.length + 1);
    lines.push(
      `<line x1="${(margin + gapPx).toFixed(1)}" y1="${shelfY.toFixed(1)}" x2="${(margin + widthPx - gapPx).toFixed(1)}" y2="${shelfY.toFixed(1)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3"/>`
    );
  }

  // Kapaklar
  for (let i = 0; i < (doors[0]?.quantity ?? 0); i++) {
    const doorWidthPx = doors[0].width * scale;
    const doorHeightPx = doors[0].length * scale;
    const x = margin + gapPx + i * (doorWidthPx + gapPx);
    const y = doorAreaTop;

    lines.push(
      `<rect class="door" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${doorWidthPx.toFixed(1)}" height="${doorHeightPx.toFixed(1)}" fill="none" stroke="#334155" stroke-width="1"/>`
    );
  }

  // Çekmece ön yüzleri
  for (let i = 0; i < (drawerFronts[0]?.quantity ?? 0); i++) {
    const frontWidthPx = drawerFronts[0].width * scale;
    const frontHeightPx = drawerFronts[0].length * scale;
    const x = margin + gapPx;
    const y = margin + heightPx - drawerAreaPx + gapPx + i * (frontHeightPx + gapPx);

    lines.push(
      `<rect class="drawer" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${frontWidthPx.toFixed(1)}" height="${frontHeightPx.toFixed(1)}" fill="none" stroke="#334155" stroke-width="1"/>`
    );
  }

  // Genişlik boyut çizgisi
  const dimY = margin + heightPx + 24;
  lines.push(
    `<line x1="${margin}" y1="${dimY}" x2="${margin + widthPx}" y2="${dimY}" stroke="#64748b" stroke-width="1" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`
  );
  lines.push(
    `<line x1="${margin}" y1="${margin + heightPx}" x2="${margin}" y2="${dimY - 6}" stroke="#64748b" stroke-width="0.5" stroke-dasharray="3 3"/>`
  );
  lines.push(
    `<line x1="${margin + widthPx}" y1="${margin + heightPx}" x2="${margin + widthPx}" y2="${dimY - 6}" stroke="#64748b" stroke-width="0.5" stroke-dasharray="3 3"/>`
  );
  lines.push(
    `<text x="${margin + widthPx / 2}" y="${dimY + 14}" text-anchor="middle" font-size="11" fill="#334155">${formatMm(widthMm)} mm</text>`
  );

  // Yükseklik boyut çizgisi
  const dimX = margin + widthPx + 20;
  lines.push(
    `<line x1="${dimX}" y1="${margin}" x2="${dimX}" y2="${margin + heightPx}" stroke="#64748b" stroke-width="1" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`
  );
  lines.push(
    `<line x1="${margin + widthPx}" y1="${margin}" x2="${dimX - 6}" y2="${margin}" stroke="#64748b" stroke-width="0.5" stroke-dasharray="3 3"/>`
  );
  lines.push(
    `<line x1="${margin + widthPx}" y1="${margin + heightPx}" x2="${dimX - 6}" y2="${margin + heightPx}" stroke="#64748b" stroke-width="0.5" stroke-dasharray="3 3"/>`
  );
  lines.push(
    `<text x="${dimX + 6}" y="${margin + heightPx / 2}" font-size="11" fill="#334155" transform="rotate(90 ${dimX + 6} ${margin + heightPx / 2})" text-anchor="middle">${formatMm(heightMm)} mm</text>`
  );

  // Başlık
  lines.push(
    `<text x="${margin}" y="${svgHeight - 8}" font-size="12" font-weight="600" fill="#1e293b">${escapeXmlText(title)}</text>`
  );
  lines.push(
    `<text x="${svgWidth - margin}" y="${svgHeight - 8}" text-anchor="end" font-size="10" fill="#64748b">Ön yüz elevasyonu</text>`
  );

  lines.push("</svg>");

  return lines.join("\n");
}

// SVG metninin geçerli bir teknik çizim olup olmadığını kontrol eder.
export function isValidSvgDrawing(svg: string): boolean {
  return (
    svg.trimStart().startsWith("<svg") &&
    svg.trimEnd().endsWith("</svg>") &&
    svg.includes("xmlns=")
  );
}
