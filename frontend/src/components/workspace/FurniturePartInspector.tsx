import { useEffect, useState } from "react";
import { ChevronDown, Layers3, MapPin, Move3D, Palette, Ruler } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { FurniturePart } from "../../types/placedFurniture";
import type { MaterialUsageLocation } from "../../types/materialUsage";
import "./FurniturePartInspector.css";
import "./FurniturePartInspectorPrecision.css";

interface PartMaterialOption {
  id: string;
  name: string;
  decor?: string;
  thicknessesMm: number[];
}

type DimensionField = "width" | "height" | "depth";
type Axis = "x" | "y" | "z";
type DraftValues = Record<DimensionField, string>;
type PositionDraft = Record<Axis, string>;

interface FurniturePartInspectorProps {
  part: FurniturePart;
  materials: PartMaterialOption[];
  defaultMaterial: string;
  defaultMaterialId?: string;
  materialUsage: MaterialUsageLocation[];
  onSelectUsage: (furnitureId: string, partId: string | null) => void;
  onFieldChange: (field: "name" | DimensionField | "material", value: string | number) => void;
  onPositionChange: (position: [number, number, number]) => void;
  onOpenMaterialLibrary: () => void;
  onClearSelection: () => void;
}

const dimensions: { field: DimensionField; label: string }[] = [
  { field: "width", label: "Genişlik" },
  { field: "height", label: "Yükseklik" },
  { field: "depth", label: "Derinlik" },
];

const axes: { key: Axis; label: string; index: number; color: string }[] = [
  { key: "x", label: "X", index: 0, color: "text-rose-500" },
  { key: "y", label: "Y", index: 1, color: "text-emerald-600" },
  { key: "z", label: "Z", index: 2, color: "text-sky-600" },
];

const partTypeLabels: Record<FurniturePart["type"], string> = {
  door: "Kapak",
  drawer: "Çekmece",
  shelf: "Raf",
  panel: "Panel",
};

function toMillimeters(meters: number) {
  return String(Number((meters * 1000).toFixed(1)));
}

function createDimensionDraft(part: FurniturePart): DraftValues {
  return {
    width: String(part.width),
    height: String(part.height),
    depth: String(part.depth),
  };
}

function createPositionDraft(position: [number, number, number]): PositionDraft {
  return {
    x: toMillimeters(position[0]),
    y: toMillimeters(position[1]),
    z: toMillimeters(position[2]),
  };
}

export function FurniturePartInspector({
  part,
  materials,
  defaultMaterial,
  defaultMaterialId,
  materialUsage,
  onSelectUsage,
  onFieldChange,
  onPositionChange,
  onOpenMaterialLibrary,
  onClearSelection,
}: FurniturePartInspectorProps) {
  const [dimensionDraft, setDimensionDraft] = useState(() => createDimensionDraft(part));
  const [positionDraft, setPositionDraft] = useState(() => createPositionDraft(part.position));

  useEffect(() => {
    setDimensionDraft(createDimensionDraft(part));
    setPositionDraft(createPositionDraft(part.position));
  }, [
    part.id,
    part.width,
    part.height,
    part.depth,
    part.position[0],
    part.position[1],
    part.position[2],
  ]);

  const normalizedDefaultMaterial = defaultMaterial.trim();
  const normalizedPartMaterial = part.material.trim();
  const inheritsFurnitureMaterial =
    normalizedDefaultMaterial !== "" &&
    normalizedPartMaterial === normalizedDefaultMaterial;
  const defaultCatalogMaterial = defaultMaterialId
    ? materials.find((material) => material.id === defaultMaterialId)
    : materials.find((material) => material.name === defaultMaterial);
  const assignedMaterial = inheritsFurnitureMaterial
    ? defaultCatalogMaterial
    : materials.find((material) => material.name === part.material);
  const materialSource = !normalizedPartMaterial
    ? "unassigned"
    : inheritsFurnitureMaterial && defaultMaterialId && !defaultCatalogMaterial
      ? "missing"
      : assignedMaterial
        ? "catalog"
        : "custom";
  const materialSourceLabels = {
    catalog: "KATALOG",
    custom: "SERBEST",
    missing: "KAYIT EKSİK",
    unassigned: "ATANMAMIŞ"
  } as const;
  const materialSourceDescriptions = {
    catalog: inheritsFurnitureMaterial
      ? "Mobilya varsayılanından gelen katalog kaydı"
      : "Katalog kimliğiyle eşleşen malzeme",
    custom: inheritsFurnitureMaterial
      ? "Mobilya varsayılanından gelen serbest metin"
      : "Katalog dışında serbest metin",
    missing: "Mobilya varsayılanının katalog kimliği çözümlenemedi",
    unassigned: "Bu parçaya henüz malzeme atanmadı"
  } as const;
  const materialSelectValue = inheritsFurnitureMaterial
    ? "__default__"
    : assignedMaterial?.id ?? "__current__";

  function commitDimension(field: DimensionField) {
    const rawValue = dimensionDraft[field];
    const value = Number(rawValue);

    if (
      rawValue.trim() === "" ||
      !Number.isFinite(value) ||
      value < 1 ||
      value > 280000
    ) {
      setDimensionDraft(createDimensionDraft(part));
      return;
    }

    onFieldChange(field, value);
  }

  function commitPosition(axis: Axis, index: number) {
    const rawValue = positionDraft[axis];
    const value = Number(rawValue);

    if (
      rawValue.trim() === "" ||
      !Number.isFinite(value) ||
      Math.abs(value) > 280000
    ) {
      setPositionDraft(createPositionDraft(part.position));
      return;
    }

    const nextPosition: [number, number, number] = [
      part.position[0],
      part.position[1],
      part.position[2],
    ];
    nextPosition[index] = value / 1000;
    onPositionChange(nextPosition);
  }

  return (
    <section className="cad-property-section cad-part-inspector space-y-4" aria-label="Seçili parça özellikleri">
      <div className="cad-section-heading">
        <span>PARÇA DENETLEYİCİSİ</span>
        <Layers3 />
      </div>

      <div className="cad-selected-object">
        <div className="cad-selected-object-icon">
          <Layers3 />
        </div>
        <div>
          <strong>{part.name}</strong>
          <small>{partTypeLabels[part.type]} · 3D sahne bileşeni</small>
        </div>
        <span className="cad-part-live-indicator" aria-label="3D geometri bağlantısı etkin" title="3D geometri bağlantısı etkin" />
      </div>

      <div className="cad-field">
        <Label htmlFor="selected-part-name">Parça adı</Label>
        <Input
          id="selected-part-name"
          value={part.name}
          maxLength={80}
          onChange={(event) => onFieldChange("name", event.target.value)}
        />
      </div>

      <div className="cad-part-editor-group">
        <div className="cad-part-editor-heading">
          <span><Ruler /> GEOMETRİ ÖLÇÜLERİ</span>
          <small>mm</small>
        </div>
        <div className="cad-dimension-fields">
          {dimensions.map(({ field, label }) => (
            <div className="cad-dimension-field" key={field}>
              <Label htmlFor={`selected-part-${field}`}>{label}</Label>
              <div className="cad-input-with-unit">
                <Input
                  id={`selected-part-${field}`}
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="280000"
                  step="1"
                  value={dimensionDraft[field]}
                  onChange={(event) =>
                    setDimensionDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  onBlur={() => commitDimension(field)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span>mm</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="cad-part-position-disclosure">
        <summary aria-controls="cad-part-position-fields">
          <Move3D aria-hidden="true" />
          <span className="cad-part-position-disclosure__copy">
            <strong>Yerel konum</strong>
            <small>Mobilya merkezine göre</small>
          </span>
          <small className="cad-part-position-disclosure__units">X · Y · Z / mm</small>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="cad-part-position-disclosure__content">
          <div id="cad-part-position-fields" className="cad-part-coordinate-grid" role="group" aria-label="Parça konumu, milimetre">
          {axes.map((axis) => (
            <div className="cad-field min-w-0" key={axis.key}>
              <Label htmlFor={`selected-part-position-${axis.key}`}>
                <span className={`cad-part-axis-label ${axis.color}`}>{axis.label}</span>
                Konum
              </Label>
              <div className="cad-input-with-unit">
                <Input
                  id={`selected-part-position-${axis.key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={positionDraft[axis.key]}
                  onChange={(event) =>
                    setPositionDraft((current) => ({
                      ...current,
                      [axis.key]: event.target.value,
                    }))
                  }
                  onBlur={() => commitPosition(axis.key, axis.index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span>mm</span>
              </div>
            </div>
          ))}
          </div>
          <p className="cad-field-note">
            X, Y ve Z değerleri parçanın mobilya merkezine göre yerel konumudur.
            Değişiklikler 3D önizlemeye ve proje verisine uygulanır.
          </p>
        </div>
      </details>
      <div className="cad-part-material-group">
        <div className="cad-part-editor-heading">
          <span><Palette /> MALZEME ATAMASI</span>
          <small>KATALOG</small>
        </div>

        <div className="cad-part-material-summary">
          <div className="cad-part-material-summary__icon" aria-hidden="true">
            <Layers3 />
          </div>
          <div className="cad-part-material-summary__copy">
            <div className="cad-part-material-summary__title">
              <strong>{part.material || "Malzeme atanmadı"}</strong>
              <span className={`cad-part-material-source is-${materialSource}`}>
                {materialSourceLabels[materialSource]}
              </span>
            </div>
            <small>{materialSourceDescriptions[materialSource]}</small>
            {assignedMaterial && <code>{assignedMaterial.id}</code>}
          </div>
          {assignedMaterial && (
            <span className="cad-part-material-thickness">
              {assignedMaterial.thicknessesMm.join(" / ")} mm
            </span>
          )}
        </div>

        <div className="cad-field">
          <Label htmlFor="selected-part-material">Parça malzemesi</Label>
          <select
            id="selected-part-material"
            className="cad-part-material-select"
            value={materialSelectValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue === "__default__") {
                onFieldChange("material", defaultMaterial);
                return;
              }
              if (nextValue === "__current__") return;
              const nextMaterial = materials.find((material) => material.id === nextValue);
              if (nextMaterial) onFieldChange("material", nextMaterial.name);
            }}
          >
            <option value="__default__" disabled={!normalizedDefaultMaterial}>
              Mobilya varsayılanı · {defaultMaterial || "Tanımlı değil"}
            </option>
            {!inheritsFurnitureMaterial && !assignedMaterial && (
              <option value="__current__">
                Mevcut değer · {part.material || "Atanmamış"}
              </option>
            )}
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
                {material.decor ? " · " + material.decor : ""}
                {" — " + material.thicknessesMm.join(" / ") + " mm"}
              </option>
            ))}
          </select>
        </div>

        {assignedMaterial?.decor && (
          <div className="cad-part-material-decor">
            <span>DEKOR</span>
            <strong>{assignedMaterial.decor}</strong>
          </div>
        )}

        {assignedMaterial && (
          <details className="cad-part-material-usage">
            <summary>
              <MapPin aria-hidden="true" />
              <span>Proje kullanım yerleri</span>
              <strong>{materialUsage.length}</strong>
            </summary>
            <div className="cad-part-material-usage__list">
              {materialUsage.length > 0 ? (
                materialUsage.slice(0, 8).map((usage, index) => (
                  <button
                    type="button"
                    key={usage.furnitureId + "-" + (usage.partId ?? usage.partName) + "-" + index}
                    onClick={() => onSelectUsage(usage.furnitureId, usage.partId ?? null)}
                    title={usage.furnitureName + " / " + usage.partName + " seç"}
                  >
                    <span>{usage.furnitureName}</span>
                    <strong>{usage.partName}</strong>
                    <small>{usage.sourceLabel}</small>
                  </button>
                ))
              ) : (
                <p>Bu malzeme henüz başka bir mobilya veya parçada kullanılmıyor.</p>
              )}
              {materialUsage.length > 8 && (
                <p>+ {materialUsage.length - 8} ek kullanım noktası malzeme kütüphanesinde gösteriliyor.</p>
              )}
            </div>
          </details>
        )}

        {materialSource === "custom" && (
          <p className="cad-field-note">
            Bu değer katalog dışı serbest metin. Kullanım yerleri katalog kimliği üzerinden izlenemiyor.
          </p>
        )}
        {materialSource === "missing" && (
          <p className="cad-field-note">
            Projede kayıtlı malzeme kimliği katalogda bulunamadı. Katalog kaydını yeniden eşleştir.
          </p>
        )}

        {materials.length === 0 && (
          <p className="cad-field-note">
            Projede henüz katalog malzemesi yok. Malzeme kütüphanesinden MDF,
            suntalam ve kullandığın panel türlerini tanımlayabilirsin.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="cad-part-material-manage"
          onClick={onOpenMaterialLibrary}
        >
          <Layers3 />
          Malzeme kütüphanesini yönet
        </Button>

        <p className="cad-part-material-note">
          Atama parça verisine ve proje JSON'una kaydedilir. Mevcut üretim kesim
          listesi desteklenen konstrüksiyon kurallarından hesaplanır; bu parça
          ataması kesim ölçülerini veya 3D yüzey görünümünü henüz değiştirmez.
        </p>
      </div>

      <details className="cad-part-production-note">
        <summary>
          <span>ÜRETİM KAPSAMI</span>
          <small>AYRINTI</small>
          <ChevronDown aria-hidden="true" />
        </summary>
        <p>Kesim listesi şu anda desteklenen mobilya konstrüksiyon kurallarından hesaplanır. Bu görsel parça düzenlemeleri üretim kesim ölçülerini değiştirmez.</p>
      </details>

      <Button
        type="button"
        variant="outline"
        className="cad-full-button"
        onClick={onClearSelection}
      >
        Parça seçimini kaldır
      </Button>
    </section>
  );
}
