import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ClipboardList,
  Layers3,
  Package,
  Ruler,
} from "lucide-react";

import { Button } from "../ui/button";
import type { EdgeBandingSummary } from "../../engine/edgeBanding";
import type { MaterialConsumptionSummary } from "../../engine/materialConsumption";
import type { ProjectProductionResult } from "../../engine/projectProduction";
import "./ProductionOverview.css";

interface ProductionOverviewProps {
  furnitureCount: number;
  production: ProjectProductionResult;
  edgeBanding: EdgeBandingSummary;
  materialConsumption: MaterialConsumptionSummary[];
  onExport: () => void;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString("tr-TR", { maximumFractionDigits });
}

export function ProductionOverview({
  furnitureCount,
  production,
  edgeBanding,
  materialConsumption,
  onExport,
}: ProductionOverviewProps) {
  const totalPieceCount = production.parts.reduce(
    (total, part) => total + part.quantity,
    0
  );
  const isEmpty = furnitureCount === 0;
  const isBlocked = production.exportBlockReason !== null;
  const isPartial = production.unsupportedFurniture.length > 0;
  const status = isEmpty ? "empty" : isBlocked ? "blocked" : isPartial ? "partial" : "ready";
  const statusLabel = {
    empty: "Veri bekleniyor",
    blocked: "Kontrol gerekli",
    partial: "Kısmi kapsam",
    ready: "Çıktıya hazır",
  }[status];
  const statusDescription = {
    empty: "Üretim raporunu oluşturmak için önce sahneye bir mobilya ekle.",
    blocked: "Kesim listesi güvenli biçimde dışa aktarılamıyor. Aşağıdaki engeli gider.",
    partial: "Desteklenen modüller hesaplandı. Desteklenmeyen mobilyalar kesim listesine dahil edilmedi.",
    ready: "Desteklenen modüller için parça listesi ve malzeme özeti hazır.",
  }[status];
  const canExport = production.parts.length > 0 && !isBlocked;

  return (
    <div className="mc-production">
      <header className="mc-production__header">
        <div>
          <span className="mc-production__eyebrow">ÜRETİM / PROJE RAPORU</span>
          <h3>Üretim özeti</h3>
          <p>Kesim, malzeme ve kenar bantlama verileri</p>
        </div>
        <div className={`mc-production__status mc-production__status--${status}`} role="status" aria-live="polite">
          {status === "ready" ? <CheckCircle2 /> : status === "empty" ? <ClipboardList /> : <AlertTriangle />}
          <span>{statusLabel}</span>
        </div>
      </header>

      <section className={`mc-production__readiness mc-production__readiness--${status}`}>
        <div className="mc-production__readiness-icon" aria-hidden="true">
          {status === "ready" ? <CheckCircle2 /> : status === "empty" ? <ClipboardList /> : <AlertTriangle />}
        </div>
        <div>
          <strong>{statusDescription}</strong>
          {!isEmpty && (
            <span>
              {production.supportedFurnitureCount} / {furnitureCount} modül üretim hesabına dahil edildi
            </span>
          )}
        </div>
      </section>

      <section className="mc-production__metrics" aria-label="Üretim ölçütleri">
        <article className="mc-production__metric">
          <span className="mc-production__metric-icon"><Layers3 /></span>
          <span className="mc-production__metric-label">Parça satırı</span>
          <strong>{formatNumber(production.parts.length, 0)}</strong>
          <small>farklı parça kaydı</small>
        </article>
        <article className="mc-production__metric">
          <span className="mc-production__metric-icon"><Package /></span>
          <span className="mc-production__metric-label">Toplam adet</span>
          <strong>{formatNumber(totalPieceCount, 0)}</strong>
          <small>kesilecek parça</small>
        </article>
        <article className="mc-production__metric">
          <span className="mc-production__metric-icon"><Ruler /></span>
          <span className="mc-production__metric-label">Kenar bantlama</span>
          <strong>{formatNumber(edgeBanding.totalLength, 1)}</strong>
          <small>toplam mm</small>
        </article>
        <article className="mc-production__metric">
          <span className="mc-production__metric-icon"><ClipboardList /></span>
          <span className="mc-production__metric-label">Malzeme grubu</span>
          <strong>{formatNumber(materialConsumption.length, 0)}</strong>
          <small>malzeme / kalınlık</small>
        </article>
      </section>

      {production.exportBlockReason && (
        <section className="mc-production__notice mc-production__notice--danger" role="alert">
          <AlertTriangle />
          <div>
            <strong>Kesim listesi dışa aktarılamıyor</strong>
            <p>{production.exportBlockReason}</p>
          </div>
        </section>
      )}

      {production.unsupportedFurniture.length > 0 && (
        <section className="mc-production__notice mc-production__notice--warning" role="status">
          <AlertTriangle />
          <div>
            <strong>Üretim kapsamı dışında kalan mobilyalar</strong>
            <ul>
              {production.unsupportedFurniture.map((item) => (
                <li key={item.furnitureId}>
                  <b>{item.furnitureName}:</b> {item.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(production.errors.length > 0 || production.blockedFurniture.length > 0) && (
        <section className="mc-production__issues" aria-label="Üretim doğrulama sorunları">
          <div className="mc-production__section-heading">
            <div>
              <span>DOĞRULAMA</span>
              <strong>Kontrol edilmesi gerekenler</strong>
            </div>
            <AlertTriangle />
          </div>
          {[...production.errors, ...production.blockedFurniture].map((issue, index) => (
            <div className="mc-production__issue" key={issue.furnitureId + issue.reason + index}>
              <span>{issue.furnitureName}</span>
              <p>{issue.reason}</p>
            </div>
          ))}
        </section>
      )}

      <section className="mc-production__section">
        <div className="mc-production__section-heading">
          <div>
            <span>MALZEME PLANLAMASI</span>
            <strong>Malzeme tüketimi</strong>
          </div>
          <Package />
        </div>
        {materialConsumption.length > 0 ? (
          <div className="mc-production__materials">
            {materialConsumption.map((summary) => (
              <article
                className="mc-production__material"
                key={(summary.materialId ?? summary.material) + "-" + summary.thickness}
              >
                <div className="mc-production__material-heading">
                  <div className="mc-production__material-swatch" aria-hidden="true" />
                  <div>
                    <strong>{summary.material}</strong>
                    <span>{summary.thickness} mm panel</span>
                  </div>
                  <b>{formatNumber(summary.totalQuantity, 0)} <small>adet</small></b>
                </div>
                {summary.materialId && <code>{summary.materialId}</code>}
                <div className="mc-production__material-stats">
                  <div><span>Net alan</span><strong>{formatNumber(summary.panelAreaM2, 3)} m²</strong></div>
                  <div><span>Net hacim</span><strong>{formatNumber(summary.volumeM3, 4)} m³</strong></div>
                  <div><span>Kenar bandı</span><strong>{formatNumber(summary.edgeBanding.totalLength, 1)} mm</strong></div>
                </div>
                <div className="mc-production__material-foot">
                  {summary.partLineCount} parça satırı · {summary.edgeBanding.edgeCount} bantlanacak kenar
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mc-production__empty">
            <Package />
            <strong>Malzeme tüketimi henüz oluşmadı</strong>
            <span>Desteklenen modüllerin geçerli parça listesi oluşturulduğunda burada görünür.</span>
          </div>
        )}
      </section>

      <section className="mc-production__section">
        <div className="mc-production__section-heading">
          <div>
            <span>İŞLEME LİSTESİ</span>
            <strong>Kesim listesi</strong>
          </div>
          <ClipboardList />
        </div>
        {production.parts.length > 0 ? (
          <div className="mc-production__cut-list">
            {production.parts.map((part) => (
              <article className="mc-production__cut-row" key={part.id}>
                <div className="mc-production__cut-main">
                  <strong>{part.name}</strong>
                  <span>{production.furnitureNames.get(part.furnitureId) ?? "Mobilya"}</span>
                  <small>{part.material} · {part.thickness} mm</small>
                </div>
                <div className="mc-production__cut-side">
                  <b>×{formatNumber(part.quantity, 0)}</b>
                  <span>{formatNumber(part.width, 1)} × {formatNumber(part.length, 1)}</span>
                  <small>mm</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mc-production__empty">
            <ClipboardList />
            <strong>Kesim listesi boş</strong>
            <span>Üretim hesabı desteklenen bir modül ekleyip gerekli kontrolleri tamamla.</span>
          </div>
        )}
      </section>

      <footer className="mc-production__footer">
        <div className="mc-production__scope-note">
          <AlertTriangle />
          <p>Net alan ve hacim değerleri fire, kesim payı, levha verimi veya rulo payı içermez. CNC operasyonları ve özel konstrüksiyon boşlukları bu raporda hesaplanmaz.</p>
        </div>
        <Button
          type="button"
          className="mc-production__export"
          onClick={onExport}
          disabled={!canExport}
          aria-describedby="mc-production-export-help"
        >
          <ArrowDownToLine />
          Kesim listesini CSV indir
        </Button>
        <span id="mc-production-export-help" className="mc-production__export-help">
          {canExport ? "Desteklenen parçalar CSV dosyasına aktarılır." : production.exportBlockReason ?? "Dışa aktarılacak geçerli parça bulunmuyor."}
        </span>
      </footer>
    </div>
  );
}
