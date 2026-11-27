import { useState } from "react";
import { Plus, Ruler } from "lucide-react";
import type { FurnitureCatalogItem } from "../../data/furnitureCatalog";
import "./FurnitureCatalogCardAction.css";
import "./FurnitureCatalogCardDragFeedback.css";
import "./FurnitureCatalogCardConstruction.css";

interface FurnitureCatalogCardProps {
  item: FurnitureCatalogItem;
  index: number;
  onAdd: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function FurniturePreview({ item }: { item: FurnitureCatalogItem }) {
  const largest = Math.max(item.width, item.height, item.depth, 1);
  const frontWidth = Math.max(54, Math.min(112, 38 + (item.width / largest) * 66));
  const frontHeight = Math.max(24, Math.min(90, 24 + (item.height / largest) * 72));
  const depth = Math.max(9, Math.min(23, 7 + (item.depth / largest) * 18));
  const isDesk = item.type === "desk";
  const isCountertop = item.category === "Tezgâh" || item.id === "countertop";
  const x = 110 - frontWidth / 2;
  const right = x + frontWidth;
  const top = isDesk ? 70 : 124 - frontHeight;
  const bottom = isDesk ? 84 : 124;
  const dx = depth * 0.72;
  const dy = depth * 0.42;
  const doorCount = Math.min(item.doorCount ?? 0, 4);
  const drawerCount = Math.min(item.drawerCount ?? 0, 4);
  const shelfCount = Math.min(item.shelfCount ?? 0, 5);

  return (
    <svg viewBox="0 0 220 144" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id={`catalog-front-${item.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={item.color} stopOpacity=".96" />
          <stop offset="100%" stopColor={item.color} stopOpacity=".68" />
        </linearGradient>
        <linearGradient id={`catalog-side-${item.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8fa5b1" stopOpacity=".56" />
          <stop offset="100%" stopColor="#263944" stopOpacity=".8" />
        </linearGradient>
      </defs>
      <path d="M18 128H202" stroke="#8ea5b2" strokeOpacity=".18" strokeWidth="1" />
      <path d="M32 136H188" stroke="#8ea5b2" strokeOpacity=".1" strokeWidth="1" strokeDasharray="2 5" />
      {isDesk ? (
        <g stroke="#c4d1d8" strokeLinejoin="round">
          <path d={`M${x} ${top} L${right} ${top} L${right + dx} ${top - dy} L${x + dx} ${top - dy} Z`} fill={item.color} fillOpacity=".95" strokeOpacity=".9" />
          <path d={`M${x} ${top} L${right} ${top} L${right} ${top + 8} L${x} ${top + 8} Z`} fill="#344a56" strokeOpacity=".65" />
          <path d={`M${right} ${top} L${right + dx} ${top - dy} L${right + dx} ${top - dy + 8} L${right} ${top + 8} Z`} fill={`url(#catalog-side-${item.id})`} strokeOpacity=".55" />
          <path d={`M${x + 8} ${top + 8} L${x + 8} 126 M${right - 8} ${top + 8} L${right - 8} 126 M${right + dx - 8} ${top - dy + 8} L${right + dx - 8} 119`} fill="none" strokeWidth="3.2" strokeLinecap="round" strokeOpacity=".78" />
        </g>
      ) : isCountertop ? (
        <g stroke="#d5dfe4" strokeLinejoin="round">
          <path d={`M${x - 4} ${top + 8} L${right + 4} ${top + 8} L${right + dx + 4} ${top + 8 - dy} L${x + dx - 4} ${top + 8 - dy} Z`} fill={item.color} strokeOpacity=".85" />
          <path d={`M${x - 4} ${top + 8} L${right + 4} ${top + 8} L${right + 4} ${top + 16} L${x - 4} ${top + 16} Z`} fill="#53636b" strokeOpacity=".65" />
          <path d={`M${right + 4} ${top + 8} L${right + dx + 4} ${top + 8 - dy} L${right + dx + 4} ${top + 16 - dy} L${right + 4} ${top + 16} Z`} fill={`url(#catalog-side-${item.id})`} strokeOpacity=".55" />
        </g>
      ) : (
        <g stroke="#c4d1d8" strokeLinejoin="round">
          <path d={`M${x} ${top} L${right} ${top} L${right + dx} ${top - dy} L${x + dx} ${top - dy} Z`} fill={item.color} fillOpacity=".94" strokeOpacity=".85" />
          <path d={`M${right} ${top} L${right + dx} ${top - dy} L${right + dx} ${bottom - dy} L${right} ${bottom} Z`} fill={`url(#catalog-side-${item.id})`} strokeOpacity=".7" />
          <path d={`M${x} ${top} L${right} ${top} L${right} ${bottom} L${x} ${bottom} Z`} fill={`url(#catalog-front-${item.id})`} strokeOpacity=".9" />
          <path d={`M${x + 4} ${top + 4} H${right - 4}`} stroke="#fff" strokeOpacity=".25" />
          {item.type === "bookcase" ? (
            Array.from({ length: Math.max(1, shelfCount) }, (_, index) => {
              const y = top + ((bottom - top) * (index + 1)) / (Math.max(1, shelfCount) + 1);
              return <path key={`shelf-${index}`} d={`M${x + 4} ${y} H${right - 4}`} stroke="#304651" strokeWidth="2.2" strokeOpacity=".9" />;
            })
          ) : drawerCount > 0 ? (
            Array.from({ length: drawerCount }, (_, index) => {
              const y = top + ((bottom - top) * (index + 1)) / drawerCount;
              return (
                <g key={`drawer-${index}`}>
                  <path d={`M${x + 3} ${y} H${right - 3}`} stroke="#354b57" strokeWidth="1.4" />
                  <path d={`M${(x + right) / 2 - 3} ${y - 5} H${(x + right) / 2 + 3}`} stroke="#e2d0bd" strokeWidth="1.6" strokeLinecap="round" />
                </g>
              );
            })
          ) : (
            Array.from({ length: Math.max(1, doorCount) - 1 }, (_, index) => {
              const divider = x + (frontWidth * (index + 1)) / Math.max(1, doorCount);
              return <path key={`door-${index}`} d={`M${divider} ${top + 3} V${bottom - 3}`} stroke="#344a56" strokeWidth="1.2" />;
            })
          )}
          {doorCount > 0 && drawerCount === 0 && item.type !== "bookcase" && (
            <path d={`M${right - 9} ${top + frontHeight * .48} v8 M${x + 9} ${top + frontHeight * .48} v8`} stroke="#e2d0bd" strokeWidth="1.6" strokeLinecap="round" />
          )}
        </g>
      )}
      <path d={`M${x - 4} 132H${right + dx + 6}`} stroke="#8fa7b4" strokeOpacity=".2" strokeWidth="1" />
    </svg>
  );
}

export function FurnitureCatalogCard({ item, index, onAdd, onDragStart, onDragEnd: notifyDragEnd }: FurnitureCatalogCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const onDragEnd = () => {
    setIsDragging(false);
    notifyDragEnd?.();
  };
  const details = [
    item.doorCount ? `${item.doorCount} kapak` : "",
    item.drawerCount ? `${item.drawerCount} çekmece` : "",
    item.shelfCount ? `${item.shelfCount} raf` : "",
  ].filter(Boolean).join(" · ");

  const construction = [
    item.hasBackPanel === true
      ? item.backThickness === undefined
        ? "Arkalık"
        : `Arkalık ${item.backThickness.toLocaleString("tr-TR")} mm`
      : item.hasBackPanel === false
        ? "Arkalıksız"
        : "",
    item.edgeBanding === true
      ? "Kenar bantlama"
      : item.edgeBanding === false
        ? "Kenar bantlama yok"
        : "",
    item.material?.trim() ?? "",
  ].filter(Boolean);
  const constructionLabel = construction.join(" · ");

  const dimensions = [item.width, item.height, item.depth]
    .map((value) => value.toLocaleString("tr-TR"))
    .join(" × ");

  return (
    <button
      type="button"
      className="cad-catalog-card mc-catalog-card"
      data-dragging={isDragging ? "true" : undefined}
      draggable
      onDragStart={(event) => {
        setIsDragging(true);
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-mobilyacad-catalog-id", item.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={onAdd}
      title={`Tıkla ile ${item.name} modelini odaya ekle; sürükleyerek sahnede konumlandır.`}
      aria-label={`${item.name}, G × Y × D: ${dimensions} milimetre.${constructionLabel ? ` Konstrüksiyon: ${constructionLabel}.` : ""} Tıkla ile odaya ekle; sürükleyerek sahnede konumlandır.`}
    >
      <span className="mc-catalog-card__visual">
        <span className="mc-catalog-card__serial">MC / {String(index + 1).padStart(3, "0")}</span>
        <FurniturePreview item={item} />
        <span className="mc-catalog-card__add" aria-hidden="true"><Plus /><span className="mc-catalog-card__add-label">EKLE</span></span>
      </span>
      <span className={`mc-catalog-card__content${constructionLabel ? " has-construction" : ""}`}>
        <span className="mc-catalog-card__category">{item.category}</span>
        <strong>{item.name}</strong>
        <span className="mc-catalog-card__dimensions"><Ruler /><span className="mc-catalog-card__axis-label">G × Y × D</span>{dimensions} mm</span>
        <span className="mc-catalog-card__details">{details || "Tıkla: ekle · Sürükle: yerleştir"}</span>
        {constructionLabel && (
          <span className="mc-catalog-card__construction" title={constructionLabel}>
            <small className="mc-catalog-card__construction-label">KONSTRÜKSİYON</small>
            <span>{constructionLabel}</span>
          </span>
        )}
      </span>
    </button>
  );
}
