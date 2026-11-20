import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowDownToLine, FileJson, FileSpreadsheet, History, AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";

import { Button } from "../ui/button";
import {
  compareProjectQuoteRevisions,
  type ProjectQuoteRevisionComparisonResult,
  type ProjectQuoteRevisionHistory,
  type ProjectQuoteCostCategory,
} from "../../../../domain/production/projectQuoteRevision.ts";
import {
  parseProjectQuoteRevisionHistoryFile,
} from "../../../../domain/production/projectQuoteRevisionFile.ts";
import {
  readProjectQuoteRevisionHistoryFromProjectFile,
} from "../../../../domain/production/projectQuoteRevisionProjectFile.ts";
import {
  parseProjectQuoteRevisionComparisonFile,
  serializeProjectQuoteRevisionComparisonFile,
} from "../../../../domain/production/projectQuoteRevisionComparisonFile.ts";
import {
  parseProjectQuoteRevisionComparisonCsv,
  serializeProjectQuoteRevisionComparisonCsv,
} from "../../../../domain/production/projectQuoteRevisionComparisonCsv.ts";
import "./QuoteRevisionComparisonPanel.css";

const categories: ProjectQuoteCostCategory[] = [
  "material", "hardware", "labor", "operation", "waste", "profit",
];

const categoryLabels: Record<ProjectQuoteCostCategory, string> = {
  material: "Malzeme",
  hardware: "Donanım",
  labor: "İşçilik",
  operation: "Operasyon",
  waste: "Fire",
  profit: "Kâr",
};

const changeLabels = {
  added: "Eklendi",
  removed: "Kaldırıldı",
  changed: "Değişti",
} as const;

function formatMinor(value: number, currencyCode: string): string {
  return value.toLocaleString("tr-TR") + " " + currencyCode;
}

function formatQuantity(value: number): string {
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 3 });
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "proje";
}

function downloadText(filename: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function revisionLabel(revision: ProjectQuoteRevisionHistory["revisions"][number]): string {
  const date = new Date(revision.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? revision.createdAt
    : date.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  return "Rev. " + revision.revisionNumber + " · " + dateLabel;
}

const sourceTypeLabels: Record<string, string> = {
  "production-consumption": "Üretim tüketimi",
  "labor-operation": "İşçilik / operasyon",
  "quote-adjustment": "Teklif düzeltmesi",
};

function sourceTypeLabel(value: string): string {
  return sourceTypeLabels[value] ?? value;
}

const edgeDirectionLabels: Record<string, string> = {
  top: "Üst", bottom: "Alt", left: "Sol", right: "Sağ",
};

function edgeDirectionLabel(value: string | undefined): string {
  if (!value) return "—";
  return edgeDirectionLabels[value] ?? value;
}

function SourceMetadata({ line, side }: {
  line: NonNullable<ProjectQuoteRevisionComparisonResult["comparison"]>["lineChanges"][number]["from"];
  side: string;
}) {
  if (!line) return null;
  return (
    <div className="qrc-source">
      <strong>{side}</strong>
      <dl>
        <div><dt>Kaynak türü</dt><dd>{sourceTypeLabel(line.sourceType)}</dd></div>
        <div><dt>Kaynak ID</dt><dd>{line.sourceId}</dd></div>
        {line.sourceReference && <div><dt>Referans</dt><dd>{line.sourceReference}</dd></div>}
        {line.tariffId && <div><dt>Tarife ID</dt><dd>{line.tariffId}</dd></div>}
        {line.sourcePartIds && <div><dt>Part ID</dt><dd>{line.sourcePartIds.join(", ")}</dd></div>}
        {line.edgeDirection && <div><dt>Kenar</dt><dd>{edgeDirectionLabel(line.edgeDirection)}</dd></div>}
      </dl>
    </div>
  );
}

export function QuoteRevisionComparisonPanel() {
  const historyInputRef = useRef<HTMLInputElement>(null);
  const comparisonInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<ProjectQuoteRevisionHistory | null>(null);
  const [fromRevisionId, setFromRevisionId] = useState("");
  const [toRevisionId, setToRevisionId] = useState("");
  const [importedComparison, setImportedComparison] = useState<ProjectQuoteRevisionComparisonResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [exportDiagnostics, setExportDiagnostics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const historyComparison = useMemo(() => {
    if (!history || !fromRevisionId || !toRevisionId) return null;
    return compareProjectQuoteRevisions(history, fromRevisionId, toRevisionId);
  }, [history, fromRevisionId, toRevisionId]);

  const activeResult = importedComparison ?? historyComparison;
  const comparison = activeResult?.comparison ?? null;
  const canExport = activeResult?.status === "ready"
    && comparison !== null
    && activeResult.diagnostics.length === 0;

  function resetImportedState() {
    setHistory(null);
    setFromRevisionId("");
    setToRevisionId("");
    setImportedComparison(null);
    setExportDiagnostics([]);
  }

  async function handleHistoryImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    resetImportedState();
    setFileName(file.name);
    setDiagnostics([]);
    setIsLoading(true);
    try {
      const text = await file.text();
      const standalone = parseProjectQuoteRevisionHistoryFile(text);
      if (standalone.history && standalone.status !== "blocked") {
        const loaded = standalone.history;
        setHistory(loaded);
        setFromRevisionId(loaded.revisions[0]?.revisionId ?? "");
        setToRevisionId(loaded.revisions.at(-1)?.revisionId ?? "");
        if (loaded.revisions.length < 2) {
          setDiagnostics(["Karşılaştırma için aynı proje geçmişinde en az iki revizyon bulunmalıdır."]);
        }
        return;
      }

      let projectValue: unknown;
      try {
        projectValue = JSON.parse(text) as unknown;
      } catch {
        setDiagnostics([...standalone.diagnostics]);
        return;
      }
      const projectHistory = readProjectQuoteRevisionHistoryFromProjectFile(projectValue);
      if (projectHistory.history && (projectHistory.status === "ready" || projectHistory.status === "empty")) {
        const loaded = projectHistory.history;
        setHistory(loaded);
        setFromRevisionId(loaded.revisions[0]?.revisionId ?? "");
        setToRevisionId(loaded.revisions.at(-1)?.revisionId ?? "");
        if (loaded.revisions.length < 2) {
          setDiagnostics(["Proje dosyasında karşılaştırılabilir en az iki teklif revizyonu bulunmalıdır."]);
        }
        return;
      }
      setDiagnostics([...(projectHistory.diagnostics.length > 0 ? projectHistory.diagnostics : standalone.diagnostics)]);
    } catch (error) {
      setDiagnostics([error instanceof Error ? error.message : "Dosya okunamadı."]);
    } finally {
      setIsLoading(false);
    }
  }


  async function handleComparisonImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    resetImportedState();
    setFileName(file.name);
    setDiagnostics([]);
    setIsLoading(true);
    try {
      const text = await file.text();
      const parsed = file.name.toLocaleLowerCase("tr-TR").endsWith(".csv")
        ? parseProjectQuoteRevisionComparisonCsv(text)
        : parseProjectQuoteRevisionComparisonFile(text);
      if (parsed.status === "ready" && parsed.comparison) {
        setImportedComparison({ status: "ready", comparison: parsed.comparison, diagnostics: [] });
      } else {
        setDiagnostics([...parsed.diagnostics]);
      }
    } catch (error) {
      setDiagnostics([error instanceof Error ? error.message : "Karşılaştırma dosyası okunamadı."]);
    } finally {
      setIsLoading(false);
    }
  }

  function exportJson() {
    if (!activeResult || !canExport) return;
    const result = serializeProjectQuoteRevisionComparisonFile(activeResult);
    if (result.status !== "ready" || result.json === null) {
      setExportDiagnostics([...result.diagnostics]);
      return;
    }
    setExportDiagnostics([]);
    downloadText(
      "teklif-karsilastirma-" + safeFilePart(comparison!.projectId) + "-r" + comparison!.fromRevisionNumber + "-r" + comparison!.toRevisionNumber + ".json",
      result.json,
      "application/json;charset=utf-8",
    );
  }

  function exportCsv() {
    if (!activeResult || !canExport) return;
    const result = serializeProjectQuoteRevisionComparisonCsv(activeResult);
    if (result.status !== "ready" || result.csv === null) {
      setExportDiagnostics(result.diagnostics);
      return;
    }
    setExportDiagnostics([]);
    downloadText(
      "teklif-karsilastirma-" + safeFilePart(comparison!.projectId) + "-r" + comparison!.fromRevisionNumber + "-r" + comparison!.toRevisionNumber + ".csv",
      result.csv,
      "text/csv;charset=utf-8",
    );
  }

  return (
    <section className="qrc-panel" aria-label="Teklif revizyon karşılaştırması">
      <details className="qrc-disclosure">
        <summary>
          <span className="qrc-heading-icon"><History aria-hidden="true" /></span>
          <span className="qrc-heading-copy">
            <small>TEKLİF / SÜRÜM KONTROLÜ</small>
            <strong>Revizyon karşılaştırması</strong>
            <span>Doğrulanmış geçmiş veya karşılaştırma dosyasından JSON / CSV</span>
          </span>
          <span className="qrc-disclosure-state">Aç / kapat</span>
        </summary>

        <div className="qrc-content">
          <div className="qrc-import-actions">
            <Button type="button" variant="outline" size="sm" onClick={() => historyInputRef.current?.click()}>
              <History aria-hidden="true" />
              Geçmiş JSON seç
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => comparisonInputRef.current?.click()}>
              <FileJson aria-hidden="true" />
              Karşılaştırma JSON / CSV seç
            </Button>
            <input
              ref={historyInputRef}
              className="qrc-file-input"
              type="file"
              accept=".json,application/json"
              aria-label="Teklif revizyon geçmişi JSON dosyası"
              onChange={handleHistoryImport}
            />
            <input
              ref={comparisonInputRef}
              className="qrc-file-input"
              type="file"
              accept=".json,.csv,application/json,text/csv"
              aria-label="Teklif revizyon karşılaştırması JSON veya CSV dosyası"
              onChange={handleComparisonImport}
            />
          </div>

          {fileName && <p className="qrc-file-name">Yüklenen dosya: <strong>{fileName}</strong></p>}
          {isLoading && <div className="qrc-message qrc-message--loading" role="status"><LoaderCircle aria-hidden="true" /><span>Dosya doğrulanıyor…</span></div>}

          {history && history.revisions.length > 0 && (
            <div className="qrc-revision-selectors">
              <label>
                <span>Başlangıç revizyonu</span>
                <select value={fromRevisionId} onChange={(event) => { setFromRevisionId(event.target.value); setExportDiagnostics([]); }}>
                  {history.revisions.map((revision) => (
                    <option key={revision.revisionId} value={revision.revisionId}>{revisionLabel(revision)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Karşılaştırılacak revizyon</span>
                <select value={toRevisionId} onChange={(event) => { setToRevisionId(event.target.value); setExportDiagnostics([]); }}>
                  {history.revisions.map((revision) => (
                    <option key={revision.revisionId} value={revision.revisionId}>{revisionLabel(revision)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {diagnostics.length > 0 && (
            <div className="qrc-message qrc-message--warning" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div><strong>Dosya veya revizyon doğrulaması gerekli</strong><ul>{diagnostics.map((message, index) => <li key={index}>{message}</li>)}</ul></div>
            </div>
          )}

          {activeResult?.status === "blocked" && activeResult.diagnostics.length > 0 && (
            <div className="qrc-message qrc-message--warning" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div><strong>Karşılaştırma dışa aktarıma hazır değil</strong><ul>{activeResult.diagnostics.map((message, index) => <li key={index}>{message}</li>)}</ul></div>
            </div>
          )}

          {comparison && activeResult?.status === "ready" && (
            <div className="qrc-result">
              <div className="qrc-result-status" role="status">
                <CheckCircle2 aria-hidden="true" />
                <span>Doğrulanmış karşılaştırma</span>
                <small>{comparison.projectId}</small>
              </div>

              <div className="qrc-total-grid">
                <article><span>Başlangıç · Rev. {comparison.fromRevisionNumber}</span><strong>{formatMinor(comparison.fromGrandTotalMinor, comparison.currencyCode)}</strong></article>
                <article><span>Hedef · Rev. {comparison.toRevisionNumber}</span><strong>{formatMinor(comparison.toGrandTotalMinor, comparison.currencyCode)}</strong></article>
                <article className="qrc-total-delta"><span>Genel fark</span><strong>{comparison.grandTotalDeltaMinor > 0 ? "+" : ""}{formatMinor(comparison.grandTotalDeltaMinor, comparison.currencyCode)}</strong></article>
              </div>

              <div className="qrc-category-table-wrap">
                <table className="qrc-category-table">
                  <thead><tr><th>Kalem</th><th>Fark (minor)</th></tr></thead>
                  <tbody>{categories.map((category) => (
                    <tr key={category}><td>{categoryLabels[category]}</td><td>{comparison.categoryDeltasMinor[category].toLocaleString("tr-TR")} {comparison.currencyCode}</td></tr>
                  ))}</tbody>
                </table>
              </div>

              <div className="qrc-lines-heading">
                <strong>Satır değişiklikleri</strong>
                <span>{comparison.lineChanges.length} kayıt</span>
              </div>
              {comparison.lineChanges.length > 0 ? (
                <div className="qrc-lines">
                  {comparison.lineChanges.map((change, index) => {
                    const line = change.to ?? change.from;
                    if (!line) return null;
                    return (
                      <article className={"qrc-line qrc-line--" + change.type} key={change.type + "-" + index}>
                        <div className="qrc-line-main">
                          <span className={"qrc-change qrc-change--" + change.type}>{changeLabels[change.type]}</span>
                          <strong>{line.description}</strong>
                          <small>{categoryLabels[line.category]} · {formatQuantity(line.quantity)} {line.unit}</small>
                        </div>
                        <div className="qrc-line-totals">
                          <span>{change.from ? formatMinor(change.from.lineTotalMinor, change.from.currencyCode) : "—"}</span>
                          <span aria-hidden="true">→</span>
                          <span>{change.to ? formatMinor(change.to.lineTotalMinor, change.to.currencyCode) : "—"}</span>
                        </div>
                        <details className="qrc-line-source">
                          <summary>Kaynak metadata</summary>
                          <div className="qrc-source-grid">
                            <SourceMetadata line={change.from} side="Başlangıç" />
                            <SourceMetadata line={change.to} side="Hedef" />
                          </div>
                        </details>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="qrc-no-changes">Bu iki revizyon arasında doğrulanmış satır değişikliği yok.</p>
              )}

              <p className="qrc-precision-note">
                Tutarlar kaynak sözleşmesindeki minor unit olarak gösterilir. Para birimi, birimler, kaynak referansları, tarife kimlikleri, kenar yönleri ve Part ID metadata'sı dönüştürülmeden korunur.
              </p>
            </div>
          )}

          <div className="qrc-export-actions">
            <Button type="button" variant="outline" size="sm" disabled={!canExport} onClick={exportJson}>
              <ArrowDownToLine aria-hidden="true" />
              JSON indir
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!canExport} onClick={exportCsv}>
              <FileSpreadsheet aria-hidden="true" />
              CSV indir
            </Button>
            <span>{canExport ? "Ready sonucu; serializer doğrulaması indirme öncesinde tekrar yapılır." : "İndirme yalnızca doğrulanmış karşılaştırma hazır olduğunda açılır."}</span>
          </div>

          {exportDiagnostics.length > 0 && (
            <div className="qrc-message qrc-message--warning" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div><strong>Dosya oluşturulamadı</strong><ul>{exportDiagnostics.map((message, index) => <li key={index}>{message}</li>)}</ul></div>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
