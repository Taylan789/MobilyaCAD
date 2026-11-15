import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

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

  return (
    <section className="cad-property-section">
      <div className="cad-section-heading">
        <span>MALZEME VE DEKOR KATALOĞU</span>
        <Plus />
      </div>

      <p className="cad-field-note">
        Bu katalog proje dosyasında saklanır. Kalınlıklar mm cinsindendir; fiyat,
        tedarikçi, fire veya üretim standardı otomatik olarak atanmaz.
      </p>

      {materials.length === 0 ? (
        <div className="cad-inspector-empty" role="status">
          <div><Plus /></div>
          <strong>Henüz malzeme tanımlanmadı</strong>
          <p>Üretimde kullanacağın panel ve dekor kayıtlarını aşağıdan ekleyebilirsin.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((material) => (
            <article key={material.id} className="cad-production-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <strong className="block">{material.name}</strong>
                  <span className="block break-all">{material.id}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={material.name + " malzemesini düzenle"}
                    title="Düzenle"
                    onClick={() => editMaterial(material)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    aria-label={material.name + " malzemesini sil"}
                    title={referencedMaterialIds.has(material.id)
                      ? "Bu malzeme projede kullanılıyor; önce atamayı kaldır."
                      : "Sil"}
                    disabled={referencedMaterialIds.has(material.id)}
                    onClick={() => deleteMaterial(material.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <small>
                Kalınlıklar: {material.thicknessesMm.join(" · ")} mm
              </small>
              {material.decor && <small>Dekor: {material.decor}</small>}
              {referencedMaterialIds.has(material.id) && (
                <small role="status">Projede bir mobilya tarafından kullanılıyor.</small>
              )}
            </article>
          ))}
        </div>
      )}

      <form className="cad-drawer-config-form" onSubmit={submitMaterial}>
        <div className="cad-section-heading">
          <span>{editingId === null ? "YENİ PANEL MALZEMESİ" : "MALZEMEYİ DÜZENLE"}</span>
        </div>

        <div className="cad-field">
          <Label htmlFor="material-id">Kararlı malzeme ID</Label>
          <Input
            id="material-id"
            value={draft.id}
            onChange={(event) => updateDraft("id", event.target.value)}
            placeholder="mdf-beyaz"
            maxLength={64}
            required
            disabled={editingId !== null}
          />
          <p className="cad-field-note">Küçük harf, rakam, nokta, tire ve alt çizgi kullan.</p>
        </div>

        <div className="cad-field">
          <Label htmlFor="material-name">Malzeme adı</Label>
          <Input
            id="material-name"
            value={draft.name}
            onChange={(event) => updateDraft("name", event.target.value)}
            placeholder="MDF"
            maxLength={100}
            required
          />
        </div>

        <div className="cad-field">
          <Label htmlFor="material-decor">Dekor etiketi (isteğe bağlı)</Label>
          <Input
            id="material-decor"
            value={draft.decor}
            onChange={(event) => updateDraft("decor", event.target.value)}
            placeholder="Mat Beyaz"
            maxLength={100}
          />
        </div>

        <div className="cad-field">
          <Label htmlFor="material-thicknesses">Panel kalınlıkları (mm)</Label>
          <Input
            id="material-thicknesses"
            value={draft.thicknessesMm}
            onChange={(event) => updateDraft("thicknessesMm", event.target.value)}
            placeholder="8; 12; 18"
            required
            aria-describedby="material-thickness-help"
          />
          <p id="material-thickness-help" className="cad-field-note">
            Değerleri noktalı virgülle ayır. Ondalık değerlerde nokta kullan.
          </p>
        </div>

        {error && <p className="cad-drawer-config-error" role="alert">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            {editingId === null ? <Plus /> : <Pencil />}
            {editingId === null ? "Malzeme Ekle" : "Değişiklikleri Kaydet"}
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
