import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Layers3, MapPin, Palette, Pencil, Plus, Ruler, Search, Trash2, X } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  addMaterialCatalogEntry,
  removeMaterialCatalogEntry,
  updateMaterialCatalogEntry,
  type MaterialCatalogEntry
} from "../../engine/materialCatalog";
import type { MaterialUsageLocation } from "../../types/materialUsage";
import "./MaterialCatalogManager.css";
import "./MaterialCatalogManagerEmptyState.css";
import "./MaterialPanelThicknessSelector.css";
import "./MaterialCatalogManagerContainerLayout.css";
import "./MaterialCatalogUsageTrace.css";

interface MaterialCatalogManagerProps {
  materials: MaterialCatalogEntry[];
  referencedMaterialIds: ReadonlySet<string>;
  usageByMaterialId: ReadonlyMap<string, MaterialUsageLocation[]>;
  onSelectUsage: (furnitureId: string, partId: string | null) => void;
  onChange: (materials: MaterialCatalogEntry[]) => void;
}

interface MaterialDraft {
  id: string;
  name: string;
  decor: string;
  thicknessesMm: string;
}

interface PanelSectionPreviewProps {
  thicknessesMm: number[];
  decor?: string;
  compact?: boolean;
  selectedThickness?: number;
  onSelectThickness?: (thickness: number) => void;
}

const emptyDraft: MaterialDraft = {
  id: "",
  name: "",
  decor: "",
  thicknessesMm: ""
};

function PanelSectionPreview({
  thicknessesMm,
  decor,
  compact = false,
  selectedThickness,
  onSelectThickness
}: PanelSectionPreviewProps) {
  const availableThicknesses = [...new Set(
    thicknessesMm.filter((thickness) => Number.isFinite(thickness) && thickness > 0)
  )].sort((a, b) => a - b);
  const sampleThickness = selectedThickness !== undefined &&
    availableThicknesses.includes(selectedThickness)
    ? selectedThickness
    : availableThicknesses[0];
  const sectionHeight = sampleThickness === undefined
    ? 0
    : Math.max(5, Math.min(22, sampleThickness * 0.7));
  const top = 48 - sectionHeight;

  return (
    <div
      className={"mc-panel-preview" + (compact ? " mc-panel-preview--compact" : "")}
      role="group"
      aria-label={
        sampleThickness === undefined
          ? "Panel kesit önizlemesi için kalınlık girilmedi"
          : "Temsili panel kesiti, gösterilen kalınlık " + sampleThickness + " milimetre"
      }
    >
      <svg viewBox="0 0 164 76" aria-hidden="true">
        <path d="M8 62H154M8 68H154" stroke="currentColor" strokeOpacity=".14" strokeWidth="1" />
        {sampleThickness === undefined ? (
          <g fill="none" stroke="currentColor" strokeOpacity=".45" strokeDasharray="4 4">
            <path d="M28 43 116 43 137 31 49 31Z" />
            <path d="M28 43V53L116 53V43M116 43 137 31V41L116 53" />
          </g>
        ) : (
          <g strokeLinejoin="round">
            <path
              d={"M25 " + top + " L113 " + top + " L135 " + (top - 12) + " L47 " + (top - 12) + " Z"}
              fill="#91a9b7"
              fillOpacity=".72"
              stroke="#c4d2da"
              strokeOpacity=".72"
            />
            <path
              d={"M25 " + top + " L113 " + top + " L113 48 L25 48 Z"}
              fill="#647d8b"
              stroke="#b2c2cb"
              strokeOpacity=".78"
            />
            <path
              d={"M113 " + top + " L135 " + (top - 12) + " L135 " + (48 - 12) + " L113 48 Z"}
              fill="#344c59"
              stroke="#91a9b7"
              strokeOpacity=".8"
            />
            <path d={"M34 " + (top + 3) + " H105"} stroke="#dce5e9" strokeOpacity=".36" />
            <path d="M25 53H113" stroke="#c39470" strokeWidth="2" />
            <circle cx="122" cy="56" r="2" fill="#c39470" />
          </g>
        )}
        {sampleThickness !== undefined && (
          <text x="139" y="66" fill="currentColor" fontSize="8" textAnchor="end">
            {sampleThickness}
          </text>
        )}
      </svg>
      <div className="mc-panel-preview__caption" aria-live="polite">
        <span>KESİT ŞEMASI</span>
        <strong>
          {sampleThickness === undefined
            ? "Kalınlık bekleniyor"
            : sampleThickness.toLocaleString("tr-TR") + " mm"}
        </strong>
        <small>{decor || "Yüzey rengi / dokusu tanımlı değil"}</small>
      </div>
      {!compact && onSelectThickness && availableThicknesses.length > 1 && (
        <div className="mc-panel-preview__options" role="group" aria-label="Kesit önizleme kalınlığı">
          <span>ÖNİZLEME</span>
          {availableThicknesses.map((thickness) => (
            <button
              key={thickness}
              type="button"
              aria-label={"Kesit önizlemesini " + thickness + " mm göster"}
              aria-pressed={sampleThickness === thickness}
              onClick={() => onSelectThickness(thickness)}
            >
              {thickness.toLocaleString("tr-TR")} mm
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parseThicknessDraft(value: string): number[] {
  return value
    .split(";")
    .map((token) => Number(token.trim()))
    .filter((thickness) => Number.isFinite(thickness) && thickness > 0);
}

export function MaterialCatalogManager({
  materials,
  referencedMaterialIds,
  usageByMaterialId,
  onSelectUsage,
  onChange
}: MaterialCatalogManagerProps) {
  const [draft, setDraft] = useState<MaterialDraft>(emptyDraft);
  const [previewThickness, setPreviewThickness] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<"all" | "used" | "unused">("all");
  const [expandedUsageMaterialIds, setExpandedUsageMaterialIds] = useState<string[]>([]);

  useEffect(() => {
    setDraft(emptyDraft);
    setPreviewThickness(null);
    setEditingId(null);
    setError(null);
  }, [materials]);

  function resetForm() {
    setDraft(emptyDraft);
    setPreviewThickness(null);
    setEditingId(null);
    setError(null);
  }

  function updateDraft(field: keyof MaterialDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }

  function editMaterial(material: MaterialCatalogEntry) {
    setDraft({
      id: material.id,
      name: material.name,
      decor: material.decor ?? "",
      thicknessesMm: material.thicknessesMm.join("; ")
    });
    setEditingId(material.id);
    setPreviewThickness(material.thicknessesMm[0] ?? null);
    setError(null);
  }

  function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const tokens = draft.thicknessesMm.split(";").map((value) => value.trim());
      if (tokens.length === 0 || tokens.some((value) => !/^\d+(?:\.\d+)?$/.test(value))) {
        throw new Error("Kalınlıkları mm olarak noktalı ondalıkla ve noktalı virgülle ayırarak gir. Örnek: 8; 12; 18");
      }

      const entry: MaterialCatalogEntry = {
        id: draft.id.trim(),
        name: draft.name.trim(),
        category: "panel",
        ...(draft.decor.trim() === "" ? {} : { decor: draft.decor.trim() }),
        thicknessesMm: tokens.map(Number),
        unit: "mm"
      };

      const next = editingId === null
        ? addMaterialCatalogEntry(materials, entry)
        : updateMaterialCatalogEntry(materials, editingId, entry);

      onChange(next);
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Malzeme kaydedilemedi.");
    }
  }

  function deleteMaterial(id: string) {
    const material = materials.find((item) => item.id === id);
    if (!material || !window.confirm('"' + material.name + '" malzemesini projeden silmek istiyor musun?')) {
      return;
    }

    try {
      onChange(removeMaterialCatalogEntry(materials, id, [...referencedMaterialIds]));
      if (editingId === id) resetForm();
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Malzeme silinemedi.");
    }
  }

  const usedMaterialCount = materials.filter((material) =>
    referencedMaterialIds.has(material.id)
  ).length;
  const unusedMaterialCount = materials.length - usedMaterialCount;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filteredMaterials = materials.filter((material) => {
    const isReferenced = referencedMaterialIds.has(material.id);
    const matchesFilter =
      materialFilter === "all" ||
      (materialFilter === "used" && isReferenced) ||
      (materialFilter === "unused" && !isReferenced);
    const matchesSearch =
      normalizedSearch === "" ||
      [material.name, material.id, material.decor ?? ""].some((value) =>
        value.toLocaleLowerCase("tr-TR").includes(normalizedSearch)
      ) ||
      material.thicknessesMm.some((thickness) =>
        String(thickness).includes(normalizedSearch)
      );

    return matchesFilter && matchesSearch;
  });

  const draftThicknesses = parseThicknessDraft(draft.thicknessesMm);
  const activeFilterLabel = materialFilter === "used"
    ? "Kullanılan"
    : materialFilter === "unused"
      ? "Atanmamış"
      : "Tümü";
  const isEditing = editingId !== null;

  return (
    <section className="mc-material-library" aria-label="Malzeme kütüphanesi">
      <header className="mc-material-library__header">
        <div className="mc-material-library__title">
          <span className="mc-material-library__mark" aria-hidden="true"><Layers3 /></span>
          <div>
            <span className="mc-material-library__eyebrow">KÜTÜPHANE / PANEL ENVANTERİ</span>
            <h2>Malzeme kütüphanesi</h2>
            <p>Projede kullanılan panel türlerini ve tanımlı kalınlık seçeneklerini yönet.</p>
          </div>
        </div>
        <span className="mc-material-library__record-count">
          {materials.length.toLocaleString("tr-TR")} KAYIT
        </span>
      </header>

      <dl className="mc-material-library__register" aria-label="Malzeme kullanım özeti">
        <div className="mc-material-library__register-item mc-material-library__register-item--used">
          <dt>PROJEDE KULLANILAN</dt>
          <dd>{usedMaterialCount.toLocaleString("tr-TR")}</dd>
        </div>
        <div className="mc-material-library__register-item mc-material-library__register-item--unused">
          <dt>ATANMAMIŞ</dt>
          <dd>{unusedMaterialCount.toLocaleString("tr-TR")}</dd>
        </div>
      </dl>

      <div className="mc-material-library__workspace">
        <section className="mc-material-library__catalog" aria-label="Kayıtlı malzemeler">
          <div className="mc-material-library__section-heading">
            <div>
              <span className="mc-material-library__eyebrow">ENVANTER</span>
              <h3>Kayıtlı malzemeler</h3>
            </div>
            <span className="mc-material-library__result-count" role="status" aria-live="polite">
              {filteredMaterials.length} / {materials.length}
            </span>
          </div>

          <p className="mc-material-library__notice">
            <Palette aria-hidden="true" />
            <span>
              Katalog yalnızca kimlik, ad, dekor etiketi ve kalınlıkları saklar.
              Renk, gerçek yüzey dokusu, fiyat, tedarikçi ve fire bilgisi tanımlı değildir.
            </span>
          </p>

          {materials.length > 0 && (
            <div className="mc-material-library__toolbar">
              <div className="mc-material-library__search">
                <Search aria-hidden="true" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Malzeme, dekor, kimlik veya kalınlık ara..."
                  aria-label="Malzeme kataloğunda ara"
                />
                {searchQuery !== "" && (
                  <button
                    type="button"
                    aria-label="Aramayı temizle"
                    onClick={() => setSearchQuery("")}
                  >
                    <X />
                  </button>
                )}
              </div>
              <div className="mc-material-library__filters" role="group" aria-label="Malzeme kullanım filtresi">
                <Button
                  type="button"
                  size="sm"
                  variant={materialFilter === "all" ? "secondary" : "ghost"}
                  aria-pressed={materialFilter === "all"}
                  onClick={() => setMaterialFilter("all")}
                >
                  Tümü <span>{materials.length}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={materialFilter === "used" ? "secondary" : "ghost"}
                  aria-pressed={materialFilter === "used"}
                  onClick={() => setMaterialFilter("used")}
                >
                  Kullanılan <span>{usedMaterialCount}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={materialFilter === "unused" ? "secondary" : "ghost"}
                  aria-pressed={materialFilter === "unused"}
                  onClick={() => setMaterialFilter("unused")}
                >
                  Atanmamış <span>{unusedMaterialCount}</span>
                </Button>
              </div>
            </div>
          )}

          {materials.length === 0 ? (
            <div className="mc-material-library__empty" role="status">
              <Layers3 aria-hidden="true" />
              <strong>Kütüphane henüz boş</strong>
              <p>Kullandığın MDF, suntalam ve diğer panel türlerini tanımlayarak başlayabilirsin.</p>
              <a
                className="mc-material-library__empty-action"
                href="#material-catalog-form"
                aria-controls="material-catalog-form"
              >
                <Plus aria-hidden="true" />
                <span>Malzeme tanımla</span>
              </a>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="mc-material-library__empty mc-material-library__empty--search" role="status">
              <Search aria-hidden="true" />
              <strong>Eşleşen malzeme bulunamadı</strong>
              <p>Arama terimini veya kullanım filtresini değiştir.</p>
              <div className="mc-material-library__empty-context" role="group" aria-label="Aktif arama ve filtre">
                {searchQuery.trim() !== "" && (
                  <span className="mc-material-library__empty-context-query" title={searchQuery.trim()}>
                    <small>ARAMA</small>
                    <strong>{searchQuery.trim()}</strong>
                  </span>
                )}
                <span className="mc-material-library__empty-context-filter">
                  <small>FİLTRE</small>
                  <strong>{activeFilterLabel}</strong>
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setMaterialFilter("all");
                }}
              >
                Filtreleri temizle
              </Button>
            </div>
          ) : (
            <div className="mc-material-library__grid">
              {filteredMaterials.map((material) => {
                const isReferenced = referencedMaterialIds.has(material.id);
                const usages = usageByMaterialId.get(material.id) ?? [];
                const furnitureCount = new Set(usages.map((usage) => usage.furnitureId)).size;
                const usageExpanded = expandedUsageMaterialIds.includes(material.id);
                const visibleUsages = usageExpanded ? usages : usages.slice(0, 8);
                return (
                  <article
                    key={material.id}
                    className={"mc-material-card" + (isReferenced ? " mc-material-card--used" : "")}
                  >
                    <div className="mc-material-card__sample">
                      <PanelSectionPreview
                        thicknessesMm={material.thicknessesMm}
                        decor={material.decor}
                        compact
                      />
                    </div>
                    <div className="mc-material-card__body">
                      <div className="mc-material-card__heading">
                        <div>
                          <span className="mc-material-library__eyebrow">{material.category.toUpperCase()} PANEL</span>
                          <strong>{material.name}</strong>
                          <small>{material.id}</small>
                        </div>
                        <div className="mc-material-card__actions">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={material.name + " malzemesini düzenle"}
                            title="Düzenle"
                            onClick={() => editMaterial(material)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={material.name + " malzemesini sil"}
                            title={isReferenced ? "Bu malzeme projede kullanılıyor; önce atamayı kaldır." : "Sil"}
                            disabled={isReferenced}
                            onClick={() => deleteMaterial(material.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      <div className="mc-material-card__thicknesses">
                        {material.thicknessesMm.map((thickness) => (
                          <span key={thickness}><Ruler /> {thickness} mm</span>
                        ))}
                      </div>

                      <div className="mc-material-card__footer">
                        {material.decor ? (
                          <span className="mc-material-card__decor"><Palette /> {material.decor}</span>
                        ) : (
                          <span className="mc-material-card__decor mc-material-card__decor--empty">Dekor etiketi yok</span>
                        )}
                        {isReferenced ? (
                          <span className="mc-material-card__usage"><Check /> {usages.length > 0 ? usages.length + " kullanım" : "Kullanımda"}</span>
                        ) : (
                          <span className="mc-material-card__usage mc-material-card__usage--idle">Atanmamış</span>
                        )}
                      </div>

                      {usages.length > 0 && (
                        <details className="mc-material-card__locations">
                          <summary>
                            <MapPin aria-hidden="true" />
                            <span>Kullanım yerlerini göster</span>
                            <small>{furnitureCount} mobilya</small>
                          </summary>
                          <ul>
                            {visibleUsages.map((usage, index) => (
                              <li key={usage.furnitureId + "-" + (usage.partId ?? usage.partName) + "-" + index}>
                                <button
                                  type="button"
                                  onClick={() => onSelectUsage(usage.furnitureId, usage.partId ?? null)}
                                  title={usage.furnitureName + " / " + usage.partName + " seç"}
                                >
                                  <span>{usage.furnitureName}</span>
                                  <strong>{usage.partName}</strong>
                                  <small>{usage.sourceLabel}</small>
                                </button>
                              </li>
                            ))}
                          </ul>
                          {usages.length > 8 && (
                            <button
                              type="button"
                              className="mc-material-card__locations-more"
                              aria-expanded={usageExpanded}
                              aria-label={
                                usageExpanded
                                  ? material.name + " kullanım listesini ilk 8 kayda daralt"
                                  : material.name + " için kalan " + (usages.length - 8) + " kullanım noktasını göster"
                              }
                              onClick={() => setExpandedUsageMaterialIds((current) =>
                                usageExpanded
                                  ? current.filter((id) => id !== material.id)
                                  : [...current, material.id]
                              )}
                            >
                              {usageExpanded
                                ? "İlk 8 kullanımı göster"
                                : "+ " + (usages.length - 8) + " kullanım noktasını göster"}
                            </button>
                          )}
                        </details>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="mc-material-library__editor">
          <form id="material-catalog-form" tabIndex={-1} onSubmit={submitMaterial}>
            <div className="mc-material-library__editor-heading">
              <div>
                <span className="mc-material-library__eyebrow">MALZEME TANIMI</span>
                <h3>{isEditing ? "Malzemeyi düzenle" : "Yeni malzeme"}</h3>
                <p>Proje kataloğuna panel kaydı ekle.</p>
              </div>
              <span className="mc-material-library__editor-index">{isEditing ? "EDIT" : "NEW"}</span>
            </div>

            <div className="mc-material-library__draft-preview">
              <PanelSectionPreview
                thicknessesMm={draftThicknesses}
                decor={draft.decor.trim() || undefined}
                selectedThickness={previewThickness ?? undefined}
                onSelectThickness={setPreviewThickness}
              />
              <p>Şematik kesit önizlemesi. Kalınlık etiketleri girilen mm değerlerini gösterir; yüzey rengi veya dokusu temsil edilmez.</p>
            </div>

            <div className="mc-material-library__field">
              <Label htmlFor="material-id">Kararlı malzeme kimliği</Label>
              <Input
                id="material-id"
                value={draft.id}
                onChange={(event) => updateDraft("id", event.target.value)}
                placeholder="mdf-beyaz"
                maxLength={64}
                required
                disabled={isEditing}
              />
              <small>Küçük harf, rakam, nokta, tire ve alt çizgi kullan.</small>
            </div>

            <div className="mc-material-library__field">
              <Label htmlFor="material-name">Malzeme adı</Label>
              <Input
                id="material-name"
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="Örn. MDF"
                maxLength={100}
                required
              />
            </div>

            <div className="mc-material-library__field">
              <Label htmlFor="material-decor">Dekor etiketi <span>(isteğe bağlı)</span></Label>
              <Input
                id="material-decor"
                value={draft.decor}
                onChange={(event) => updateDraft("decor", event.target.value)}
                placeholder="Örn. Mat Beyaz"
                maxLength={100}
              />
              <small>Yalnızca metin etiketi olarak saklanır.</small>
            </div>

            <div className="mc-material-library__field">
              <Label htmlFor="material-thicknesses">Panel kalınlıkları <span>mm</span></Label>
              <Input
                id="material-thicknesses"
                value={draft.thicknessesMm}
                onChange={(event) => updateDraft("thicknessesMm", event.target.value)}
                placeholder="8; 12; 18"
                required
                aria-describedby="material-thickness-help"
              />
              <small id="material-thickness-help">Kalınlıkları noktalı virgülle ayır. Ondalık değerlerde nokta kullan.</small>
            </div>

            {error && (
              <p className="mc-material-library__error" role="alert">{error}</p>
            )}

            <div className="mc-material-library__form-actions">
              <Button type="submit">
                {isEditing ? <Pencil /> : <Plus />}
                {isEditing ? "Değişiklikleri kaydet" : "Malzeme ekle"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X /> İptal
                </Button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </section>
  );
}
