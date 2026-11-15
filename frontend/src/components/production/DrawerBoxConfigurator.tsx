import { useState } from "react";
import type { FormEvent } from "react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { calculateDrawerBoxParts, type DrawerBoxConstructionSpec } from "../../engine/drawerBoxParts";
import { isDrawerBoxProjectConfig } from "../../engine/drawerBoxProject";
import type { DrawerBoxProjectConfig } from "../../engine/drawerBoxProject";

const panelGroups = [
  { key: "sidePanels", label: "Yan paneller" },
  { key: "frontBackPanels", label: "Ön / arka paneller" },
  { key: "bottomPanel", label: "Taban paneli" },
  { key: "visibleFrontPanel", label: "Görünür ön panel" }
] as const;

const edges = [
  { key: "top", label: "Üst" },
  { key: "bottom", label: "Alt" },
  { key: "left", label: "Sol" },
  { key: "right", label: "Sağ" }
] as const;

const dimensionFields = [
  { key: "outerWidth", label: "Kutu dış genişliği" },
  { key: "sideHeight", label: "Yan panel yüksekliği" },
  { key: "outerDepth", label: "Kutu dış derinliği" },
  { key: "sideThickness", label: "Yan panel kalınlığı" },
  { key: "frontBackThickness", label: "Ön / arka panel kalınlığı" },
  { key: "bottomThickness", label: "Taban kalınlığı" },
  { key: "visibleFrontWidth", label: "Görünür ön panel genişliği" },
  { key: "visibleFrontHeight", label: "Görünür ön panel yüksekliği" },
  { key: "visibleFrontThickness", label: "Görünür ön panel kalınlığı" }
] as const;

type PanelGroupKey = typeof panelGroups[number]["key"];
type EdgeKey = typeof edges[number]["key"];
type DimensionKey = typeof dimensionFields[number]["key"];

interface DrawerDraft {
  outerWidth: string;
  sideHeight: string;
  outerDepth: string;
  sideThickness: string;
  frontBackThickness: string;
  bottomThickness: string;
  visibleFrontWidth: string;
  visibleFrontHeight: string;
  visibleFrontThickness: string;
  quantity: string;
  material: string;
  edgeBanding: Record<PanelGroupKey, Record<EdgeKey, string>>;
  grainDirection: Record<PanelGroupKey, string>;
}

interface DrawerBoxConfiguratorProps {
  furnitureId: string;
  expectedDrawerCount: number;
  configs: DrawerBoxProjectConfig[];
  onChange: (configs: DrawerBoxProjectConfig[]) => void;
}

function createEmptyDraft(): DrawerDraft {
  return {
    outerWidth: "",
    sideHeight: "",
    outerDepth: "",
    sideThickness: "",
    frontBackThickness: "",
    bottomThickness: "",
    visibleFrontWidth: "",
    visibleFrontHeight: "",
    visibleFrontThickness: "",
    quantity: "",
    material: "",
    edgeBanding: {
      sidePanels: { top: "", bottom: "", left: "", right: "" },
      frontBackPanels: { top: "", bottom: "", left: "", right: "" },
      bottomPanel: { top: "", bottom: "", left: "", right: "" },
      visibleFrontPanel: { top: "", bottom: "", left: "", right: "" }
    },
    grainDirection: {
      sidePanels: "",
      frontBackPanels: "",
      bottomPanel: "",
      visibleFrontPanel: ""
    }
  };
}

function createDraftFromConfig(config: DrawerBoxProjectConfig): DrawerDraft {
  const spec = config.spec;
  return {
    outerWidth: String(spec.outerWidth),
    sideHeight: String(spec.sideHeight),
    outerDepth: String(spec.outerDepth),
    sideThickness: String(spec.sideThickness),
    frontBackThickness: String(spec.frontBackThickness),
    bottomThickness: String(spec.bottomThickness),
    visibleFrontWidth: String(spec.visibleFrontWidth),
    visibleFrontHeight: String(spec.visibleFrontHeight),
    visibleFrontThickness: String(spec.visibleFrontThickness),
    quantity: String(spec.quantity),
    material: spec.material,
    edgeBanding: {
      sidePanels: {
        top: String(spec.edgeBanding.sidePanels.top),
        bottom: String(spec.edgeBanding.sidePanels.bottom),
        left: String(spec.edgeBanding.sidePanels.left),
        right: String(spec.edgeBanding.sidePanels.right)
      },
      frontBackPanels: {
        top: String(spec.edgeBanding.frontBackPanels.top),
        bottom: String(spec.edgeBanding.frontBackPanels.bottom),
        left: String(spec.edgeBanding.frontBackPanels.left),
        right: String(spec.edgeBanding.frontBackPanels.right)
      },
      bottomPanel: {
        top: String(spec.edgeBanding.bottomPanel.top),
        bottom: String(spec.edgeBanding.bottomPanel.bottom),
        left: String(spec.edgeBanding.bottomPanel.left),
        right: String(spec.edgeBanding.bottomPanel.right)
      },
      visibleFrontPanel: {
        top: String(spec.edgeBanding.visibleFrontPanel.top),
        bottom: String(spec.edgeBanding.visibleFrontPanel.bottom),
        left: String(spec.edgeBanding.visibleFrontPanel.left),
        right: String(spec.edgeBanding.visibleFrontPanel.right)
      }
    },
    grainDirection: {
      sidePanels: spec.grainDirection.sidePanels,
      frontBackPanels: spec.grainDirection.frontBackPanels,
      bottomPanel: spec.grainDirection.bottomPanel,
      visibleFrontPanel: spec.grainDirection.visibleFrontPanel
    }
  };
}

export function DrawerBoxConfigurator({
  furnitureId,
  expectedDrawerCount,
  configs,
  onChange
}: DrawerBoxConfiguratorProps) {
  const [draft, setDraft] = useState<DrawerDraft>(createEmptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configuredCount = configs.reduce(
    (total, config) => total + config.spec.quantity,
    0
  );

  function resetForm() {
    setDraft(createEmptyDraft());
    setEditingId(null);
    setError(null);
    setFormOpen(false);
  }

  function editConfig(config: DrawerBoxProjectConfig) {
    setDraft(createDraftFromConfig(config));
    setEditingId(config.id);
    setError(null);
    setFormOpen(true);
  }

  function removeConfig(id: string) {
    onChange(configs.filter((config) => config.id !== id));
    if (editingId === id) resetForm();
  }

  function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const dimensionsValid = dimensionFields.every(({ key }) => {
      const value = draft[key];
      return value.trim() !== "" &&
        Number.isFinite(Number(value)) &&
        Number(value) > 0;
    });
    if (!dimensionsValid) {
      setError("Tüm ölçüleri mm cinsinden sıfırdan büyük bir değerle doldur.");
      return;
    }

    const quantity = Number(draft.quantity);
    if (
      draft.quantity.trim() === "" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      setError("Çekmece grubu adedi pozitif tam sayı olmalıdır.");
      return;
    }

    if (draft.material.trim() === "") {
      setError("Malzeme adını gir.");
      return;
    }

    const bandingComplete = panelGroups.every(({ key }) =>
      edges.every(({ key: edge }) => {
        const value = draft.edgeBanding[key][edge];
        return value === "true" || value === "false";
      })
    );
    if (!bandingComplete) {
      setError("Her panel grubunun dört kenarı için bantlama seçimi yap.");
      return;
    }

    const grainComplete = panelGroups.every(({ key }) =>
      draft.grainDirection[key] === "length" ||
      draft.grainDirection[key] === "width" ||
      draft.grainDirection[key] === "none"
    );
    if (!grainComplete) {
      setError("Her panel grubu için damar yönünü seç.");
      return;
    }

    const edgeBanding = Object.fromEntries(
      panelGroups.map(({ key }) => [
        key,
        Object.fromEntries(
          edges.map(({ key: edge }) => [
            edge,
            draft.edgeBanding[key][edge] === "true"
          ])
        )
      ])
    ) as DrawerBoxConstructionSpec["edgeBanding"];

    const grainDirection = Object.fromEntries(
      panelGroups.map(({ key }) => [key, draft.grainDirection[key]])
    ) as DrawerBoxConstructionSpec["grainDirection"];

    const spec: DrawerBoxConstructionSpec = {
      outerWidth: Number(draft.outerWidth),
      sideHeight: Number(draft.sideHeight),
      outerDepth: Number(draft.outerDepth),
      sideThickness: Number(draft.sideThickness),
      frontBackThickness: Number(draft.frontBackThickness),
      bottomThickness: Number(draft.bottomThickness),
      visibleFrontWidth: Number(draft.visibleFrontWidth),
      visibleFrontHeight: Number(draft.visibleFrontHeight),
      visibleFrontThickness: Number(draft.visibleFrontThickness),
      quantity,
      material: draft.material.trim(),
      bottomFit: "between-sides-and-front-back",
      edgeBanding,
      grainDirection
    };

    const config: DrawerBoxProjectConfig = {
      id: editingId ?? crypto.randomUUID(),
      spec
    };

    if (!isDrawerBoxProjectConfig(config)) {
      setError("Çekmece yapılandırması geçersiz. Ölçü ve seçimleri kontrol et.");
      return;
    }

    const previousQuantity = editingId
      ? configs.find((item) => item.id === editingId)?.spec.quantity ?? 0
      : 0;
    const nextConfiguredCount = configuredCount - previousQuantity + quantity;
    if (nextConfiguredCount > expectedDrawerCount) {
      setError(
        "Bu grup eklendiğinde tanımlı çekmece adedi mobilyadaki çekmece sayısını aşar."
      );
      return;
    }

    try {
      calculateDrawerBoxParts(furnitureId, config.id, spec);
    } catch (calculationError) {
      setError(
        calculationError instanceof Error
          ? calculationError.message
          : "Çekmece ölçüleri hesaplanamadı."
      );
      return;
    }

    onChange(
      editingId
        ? configs.map((item) => item.id === editingId ? config : item)
        : [...configs, config]
    );
    resetForm();
  }

  return (
    <div className="cad-drawer-configurator">
      <div className="cad-production-summary">
        <span>Tanımlı çekmece adedi</span>
        <strong>{configuredCount} / {expectedDrawerCount}</strong>
      </div>

      <p className="cad-drawer-config-note">
        Ölçü, malzeme, kenar bantlama ve damar yönü açıkça girilmelidir.
        Ray payı, görünür ön panel boşluğu ve bağlantı ölçüsü tahmin edilmez.
      </p>

      {configs.map((config, index) => (
        <div className="cad-production-card" key={config.id}>
          <strong>Çekmece grubu {index + 1}</strong>
          <span>
            {config.spec.outerWidth} × {config.spec.sideHeight} × {config.spec.outerDepth} mm
          </span>
          <small>{config.spec.quantity} adet · {config.spec.material}</small>
          <div className="cad-drawer-config-actions">
            <Button type="button" variant="outline" onClick={() => editConfig(config)}>
              Düzenle
            </Button>
            <Button type="button" variant="outline" onClick={() => removeConfig(config.id)}>
              Sil
            </Button>
          </div>
        </div>
      ))}

      {expectedDrawerCount <= 0 ? (
        <p className="cad-field-note">
          Bu mobilyada çekmece adedi bulunmuyor. Önce mobilya kataloğundan çekmeceli bir modül seç.
        </p>
      ) : (
        <>
          {!formOpen && (
            <Button
              type="button"
              variant="outline"
              className="cad-full-button"
              disabled={configuredCount >= expectedDrawerCount}
              onClick={() => {
                setDraft(createEmptyDraft());
                setEditingId(null);
                setError(null);
                setFormOpen(true);
              }}
            >
              Çekmece grubu ekle
            </Button>
          )}

          {formOpen && (
            <form className="cad-drawer-config-form" onSubmit={saveConfig}>
              <div className="cad-drawer-config-grid">
                {dimensionFields.map(({ key, label }) => (
                  <div className="cad-field" key={key}>
                    <Label htmlFor={"drawer-" + key}>{label} (mm)</Label>
                    <Input
                      id={"drawer-" + key}
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={draft[key]}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          [key]: event.target.value
                        }))
                      }
                    />
                  </div>
                ))}

                <div className="cad-field">
                  <Label htmlFor="drawer-quantity">Çekmece adedi</Label>
                  <Input
                    id="drawer-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={draft.quantity}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        quantity: event.target.value
                      }))
                    }
                  />
                </div>

                <div className="cad-field">
                  <Label htmlFor="drawer-material">Malzeme</Label>
                  <Input
                    id="drawer-material"
                    type="text"
                    value={draft.material}
                    placeholder="Atölye malzeme adını gir"
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        material: event.target.value
                      }))
                    }
                  />
                </div>
              </div>

              <div className="cad-drawer-config-panel">
                <strong>Taban konstrüksiyonu</strong>
                <p className="cad-drawer-config-note">
                  Şimdilik yalnızca tabanın yan ve ön/arka paneller arasına oturduğu kurgu desteklenir.
                </p>
              </div>

              <div className="cad-drawer-config-panel">
                <strong>Kenar bantlama</strong>
                {panelGroups.map((group) => (
                  <div className="cad-drawer-panel-group" key={group.key}>
                    <strong>{group.label}</strong>
                    <div className="cad-drawer-option-grid">
                      {edges.map((edge) => {
                        const id = "drawer-" + group.key + "-" + edge.key;
                        return (
                          <div className="cad-field" key={edge.key}>
                            <Label htmlFor={id}>{edge.label}</Label>
                            <select
                              id={id}
                              className="cad-native-select"
                              value={draft.edgeBanding[group.key][edge.key]}
                              onChange={(event) =>
                                setDraft((previous) => ({
                                  ...previous,
                                  edgeBanding: {
                                    ...previous.edgeBanding,
                                    [group.key]: {
                                      ...previous.edgeBanding[group.key],
                                      [edge.key]: event.target.value
                                    }
                                  }
                                }))
                              }
                            >
                              <option value="">Seçiniz</option>
                              <option value="false">Bant yok</option>
                              <option value="true">Bant var</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="cad-drawer-config-panel">
                <strong>Damar yönü</strong>
                {panelGroups.map((group) => {
                  const id = "drawer-grain-" + group.key;
                  return (
                    <div className="cad-field" key={group.key}>
                      <Label htmlFor={id}>{group.label}</Label>
                      <select
                        id={id}
                        className="cad-native-select"
                        value={draft.grainDirection[group.key]}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            grainDirection: {
                              ...previous.grainDirection,
                              [group.key]: event.target.value
                            }
                          }))
                        }
                      >
                        <option value="">Seçiniz</option>
                        <option value="length">Uzunluk yönü</option>
                        <option value="width">Genişlik yönü</option>
                        <option value="none">Damar yönü yok</option>
                      </select>
                    </div>
                  );
                })}
              </div>

              {error && <p className="cad-drawer-config-error" role="alert">{error}</p>}

              <div className="cad-drawer-config-actions">
                <Button type="submit">Yapılandırmayı kaydet</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Vazgeç
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
