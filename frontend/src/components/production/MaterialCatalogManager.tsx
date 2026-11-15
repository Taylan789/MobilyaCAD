import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Layers3, Palette, Pencil, Plus, Ruler, Trash2, X } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  addMaterialCatalogEntry,
  removeMaterialCatalogEntry,
  updateMaterialCatalogEntry,
  type MaterialCatalogEntry
} from "../../engine/materialCatalog";

interface MaterialCatalogManagerProps {
  materials: MaterialCatalogEntry[];
  referencedMaterialIds: ReadonlySet<string>;
  onChange: (materials: MaterialCatalogEntry[]) => void;
}

interface MaterialDraft {
  id: string;
  name: string;
  decor: string;
  thicknessesMm: string;
}

const emptyDraft: MaterialDraft = {
  id: "",
  name: "",
  decor: "",
  thicknessesMm: ""
};

export function MaterialCatalogManager({
  materials,
  referencedMaterialIds,
  onChange
}: MaterialCatalogManagerProps) {
  const [draft, setDraft] = useState<MaterialDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(emptyDraft);
    setEditingId(null);
    setError(null);
  }, [materials]);

  function resetForm() {
    setDraft(emptyDraft);
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

  return (
    <section className="cad-property-section space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <Layers3 className="size-[18px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Malzeme kütüphanesi</h3>
            <p className="text-xs text-muted-foreground">Panel, dekor ve kalınlık tanımları</p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-muted/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
          {materials.length} kayıt
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/80 bg-card/70 p-3">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Toplam malzeme</span>
          <strong className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">{materials.length}</strong>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/70 p-3">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Projede kullanılan</span>
          <strong className="mt-1 block text-2xl font-semibold tabular-nums text-primary">{usedMaterialCount}</strong>
        </div>
      </div>

      <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Katalog bu proje dosyasında saklanır. Kalınlıklar mm cinsindendir; fiyat,
        tedarikçi, fire veya üretim standardı otomatik olarak atanmaz.
      </p>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card/40 px-4 py-7 text-center" role="status">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Layers3 className="size-5" />
          </div>
          <strong className="text-sm font-semibold text-foreground">Kütüphane henüz boş</strong>
          <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
            Kullandığın MDF, suntalam ve diğer panel türlerini tanımlayarak başlayabilirsin.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kayıtlı malzemeler</span>
            <span className="text-[11px] text-muted-foreground">Kimliğe göre sıralı</span>
          </div>
          {materials.map((material) => {
            const isReferenced = referencedMaterialIds.has(material.id);
            return (
              <article
                key={material.id}
                className="group rounded-xl border border-border/80 bg-card/65 p-3 transition-colors hover:border-primary/35 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <PackageIcon />
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-semibold text-foreground">{material.name}</strong>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{material.id}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-primary"
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
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label={material.name + " malzemesini sil"}
                      title={isReferenced ? "Bu malzeme projede kullanılıyor; önce atamayı kaldır." : "Sil"}
                      disabled={isReferenced}
                      onClick={() => deleteMaterial(material.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {material.thicknessesMm.map((thickness) => (
                    <span key={thickness} className="inline-flex items-center gap-1 rounded-md border border-border bg-background/70 px-2 py-1 text-[11px] font-medium tabular-nums text-foreground">
                      <Ruler className="size-3 text-muted-foreground" />
                      {thickness} mm
                    </span>
                  ))}
                  {material.decor && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/8 px-2 py-1 text-[11px] text-primary">
                      <Palette className="size-3" />
                      {material.decor}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  {isReferenced ? (
                    <>
                      <Check className="size-3 text-primary" />
                      <small className="text-[11px] text-primary">Projede kullanılıyor · Silme koruması aktif</small>
                    </>
                  ) : (
                    <small className="text-[11px] text-muted-foreground">Henüz bir mobilyaya atanmamış</small>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <form className="space-y-3 rounded-xl border border-border bg-card/55 p-3.5" onSubmit={submitMaterial}>
        <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{editingId === null ? "Yeni malzeme oluştur" : "Malzemeyi düzenle"}</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Teknik bilgileri eksiksiz tanımla</p>
          </div>
          <span className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {editingId === null ? "Yeni kayıt" : "Düzenleme"}
          </span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="material-id">Kararlı malzeme kimliği</Label>
          <Input
            id="material-id"
            value={draft.id}
            onChange={(event) => updateDraft("id", event.target.value)}
            placeholder="mdf-beyaz"
            maxLength={64}
            required
            disabled={editingId !== null}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">Küçük harf, rakam, nokta, tire ve alt çizgi kullan.</p>
        </div>

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <Label htmlFor="material-decor">Dekor etiketi <span className="font-normal text-muted-foreground">(isteğe bağlı)</span></Label>
          <Input
            id="material-decor"
            value={draft.decor}
            onChange={(event) => updateDraft("decor", event.target.value)}
            placeholder="Örn. Mat Beyaz"
            maxLength={100}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="material-thicknesses">Panel kalınlıkları (mm)</Label>
          <Input
            id="material-thicknesses"
            value={draft.thicknessesMm}
            onChange={(event) => updateDraft("thicknessesMm", event.target.value)}
            placeholder="8; 12; 18"
            required
            aria-describedby="material-thickness-help"
          />
          <p id="material-thickness-help" className="text-[11px] leading-relaxed text-muted-foreground">
            Kalınlıkları noktalı virgülle ayır. Ondalık değerlerde nokta kullan.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" className="flex-1">
            {editingId === null ? <Plus /> : <Pencil />}
            {editingId === null ? "Malzeme ekle" : "Değişiklikleri kaydet"}
          </Button>
          {editingId !== null && (
            <Button type="button" variant="outline" onClick={resetForm}>
              <X />
              İptal
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function PackageIcon() {
  return <Layers3 className="size-4" />;
}
