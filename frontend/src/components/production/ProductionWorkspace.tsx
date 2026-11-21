import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Factory,
  Package,
} from "lucide-react";

import "./ProductionWorkspace.css";

type ProductionSection = "report" | "materials";

interface ProductionWorkspaceProps {
  section: ProductionSection;
  onSectionChange: (section: ProductionSection) => void;
  onBackToDesign: () => void;
  furnitureCount: number;
  partCount: number;
  supportedFurnitureCount: number;
  unsupportedCount: number;
  documentStatusLabel: string;
  exportBlockReason: string | null;
  children: ReactNode;
}

export function ProductionWorkspace({
  section,
  onSectionChange,
  onBackToDesign,
  furnitureCount,
  partCount,
  supportedFurnitureCount,
  unsupportedCount,
  documentStatusLabel,
  exportBlockReason,
  children,
}: ProductionWorkspaceProps) {
  const status = furnitureCount === 0
    ? "empty"
    : exportBlockReason
      ? "blocked"
      : unsupportedCount > 0
        ? "partial"
        : "ready";
  const statusLabel = {
    empty: "Veri bekleniyor",
    blocked: "Kontrol gerekli",
    partial: "Kısmi kapsam",
    ready: "Hesaplama hazır",
  }[status];
  const StatusIcon = status === "ready"
    ? CheckCircle2
    : status === "empty"
      ? ClipboardList
      : AlertTriangle;

  return (
    <section className="mc-production-studio" aria-label="Üretim çalışma alanı">
      <header className="mc-production-studio__topbar">
        <div className="mc-production-studio__brand">
          <span className="mc-production-studio__brand-mark" aria-hidden="true">
            <Factory />
          </span>
          <span className="mc-production-studio__brand-copy">
            <small>MOBİLYACAD / WORKSPACE</small>
            <strong>ÜRETİM MERKEZİ</strong>
          </span>
        </div>

        <div className="mc-production-studio__top-actions">
          <span className="mc-production-studio__document" title={documentStatusLabel}>
            <i aria-hidden="true" />
            {documentStatusLabel}
          </span>
          <span className={`mc-production-studio__status mc-production-studio__status--${status}`} role="status" aria-live="polite">
            <StatusIcon />
            {statusLabel}
          </span>
          <button type="button" className="mc-production-studio__back" onClick={onBackToDesign}>
            <ArrowLeft />
            <span>Modellemeye dön</span>
          </button>
        </div>
      </header>

      <div className="mc-production-studio__layout">
        <aside className="mc-production-studio__rail">
          <nav className="mc-production-studio__navigation" aria-label="Üretim bölümleri">
            <span className="mc-production-studio__eyebrow">ÜRETİM MODÜLLERİ</span>
            <button
              type="button"
              className={section === "report" ? "is-active" : ""}
              aria-current={section === "report" ? "page" : undefined}
              onClick={() => onSectionChange("report")}
            >
              <ClipboardList />
              <span>Üretim raporu</span>
              <kbd>01</kbd>
            </button>
            <button
              type="button"
              className={section === "materials" ? "is-active" : ""}
              aria-current={section === "materials" ? "page" : undefined}
              onClick={() => onSectionChange("materials")}
            >
              <Package />
              <span>Malzeme kataloğu</span>
              <kbd>02</kbd>
            </button>
          </nav>

          <section className="mc-production-studio__project">
            <span className="mc-production-studio__eyebrow">PROJE KAPSAMI</span>
            <div className="mc-production-studio__project-total">
              <strong>{furnitureCount.toLocaleString("tr-TR")}</strong>
              <span>mobilya modülü</span>
            </div>
            <div className="mc-production-studio__project-row">
              <span>Üretim parçası</span>
              <b>{partCount.toLocaleString("tr-TR")}</b>
            </div>
            <div className="mc-production-studio__project-row">
              <span>Desteklenen modül</span>
              <b>{supportedFurnitureCount.toLocaleString("tr-TR")} / {furnitureCount.toLocaleString("tr-TR")}</b>
            </div>
            {unsupportedCount > 0 && (
              <div className="mc-production-studio__project-warning">
                {unsupportedCount.toLocaleString("tr-TR")} modül mevcut üretim kapsamının dışında
              </div>
            )}
          </section>

          <div className="mc-production-studio__scope">
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>Üretim kapsamı</strong>
              <p>Bu sürüm kesim listesi, malzeme tüketimi ve kenar bantlama verilerini sunar. CNC takım yolu, nesting, fire optimizasyonu veya makine bağlantısı üretmez.</p>
            </div>
          </div>

          <div className="mc-production-studio__rail-footer">
            <span>METRİK SİSTEM</span>
            <strong>mm <i>·</i> m² <i>·</i> m³</strong>
          </div>
        </aside>

        <main className="mc-production-studio__main">
          <header className="mc-production-studio__heading">
            <div>
              <span className="mc-production-studio__eyebrow">
                ÜRETİM / {section === "report" ? "01 — PROJE RAPORU" : "02 — MALZEME YÖNETİMİ"}
              </span>
              <h1>{section === "report" ? "Üretim hazırlığı" : "Malzeme kataloğu"}</h1>
              <p>
                {section === "report"
                  ? "Tasarım verisinden hesaplanan parça, malzeme ve kenar bantlama çıktıları."
                  : "Projede kullanılan panel malzemelerini ve kalınlık kataloglarını yönet."}
              </p>
            </div>
            <div className="mc-production-studio__heading-meta">
              <span><i /> CANLI PROJE VERİSİ</span>
              <small>{partCount.toLocaleString("tr-TR")} PARÇA SATIRI</small>
            </div>
          </header>

          <div className="mc-production-studio__content">
            {children}
          </div>
        </main>
      </div>
    </section>
  );
}
