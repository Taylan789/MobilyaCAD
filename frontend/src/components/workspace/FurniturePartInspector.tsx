import { useEffect, useRef, useState } from "react";
import { validateDimensionMillimeters, validatePositionMillimeters } from "./inspectorFieldValidation";
import { Layers3, MapPin, Move3D, Palette, Ruler } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { FurniturePart } from "../../types/placedFurniture";
import type { MaterialUsageLocation } from "../../types/materialUsage";
import "./FurniturePartInspector.css";

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
type InspectorFieldErrors = Partial<Record<DimensionField | Axis, string>>;

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
  const [fieldErrors, setFieldErrors] = useState<InspectorFieldErrors>({});
  const previousPartRef = useRef({
    id: part.id,
    width: part.width,
    height: part.height,
    depth: part.depth,
    position: [...part.position] as [number, number, number],
  });

  useEffect(() => {
    const previous = previousPartRef.current;

    if (previous.id !== part.id) {
      setDimensionDraft(createDimensionDraft(part));
      setPositionDraft(createPositionDraft(part.position));
      setFieldErrors({});
    } else {
      setDimensionDraft((current) => ({
        width: previous.width !== part.width ? String(part.width) : current.width,
        height: previous.height !== part.height ? String(part.height) : current.height,
        depth: previous.depth !== part.depth ? String(part.depth) : current.depth,
      }));
      setPositionDraft((current) => ({
        x: previous.position[0] !== part.position[0] ? toMillimeters(part.position[0]) : current.x,
        y: previous.position[1] !== part.position[1] ? toMillimeters(part.position[1]) : current.y,
        z: previous.position[2] !== part.position[2] ? toMillimeters(part.position[2]) : current.z,
      }));
      setFieldErrors((current) => {
        const next = { ...current };
        if (previous.width !== part.width) delete next.width;
        if (previous.height !== part.height) delete next.height;
        if (previous.depth !== part.depth) delete next.depth;
        if (previous.position[0] !== part.position[0]) delete next.x;
        if (previous.position[1] !== part.position[1]) delete next.y;
        if (previous.position[2] !== part.position[2]) delete next.z;
        return next;
      });
    }

    previousPartRef.current = {
      id: part.id,
      width: part.width,
      height: part.height,
      depth: part.depth,
      position: [...part.position] as [number, number, number],
    };
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
    const error = validateDimensionMillimeters(rawValue);

    if (error) {
      setFieldErrors((current) => ({ ...current, [field]: error }));
      return;
    }

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    onFieldChange(field, Number(rawValue));
  }

  function commitPosition(axis: Axis, index: number) {
    const rawValue = positionDraft[axis];
    const error = validatePositionMillimeters(rawValue);

    if (error) {
      setFieldErrors((current) => ({ ...current, [axis]: error }));
      return;
    }

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[axis];
      return next;
    });

    const nextPosition: [number, number, number] = [
      part.position[0],
      part.position[1],
      part.position[2],
    ];
    nextPosition[index] = Number(rawValue) / 1000;
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
                  aria-invalid={Boolean(fieldErrors[field])}
                  aria-describedby={fieldErrors[field] ? `selected-part-${field}-error` : undefined}
                  onChange={(event) => {
                    setDimensionDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }));
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next[field];
                      return next;
                    });
                  }}
                  onBlur={() => commitDimension(field)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span>mm</span>
              </div>
              {fieldErrors[field] && (
                <p id={`selected-part-${field}-error`} className="cad-inspector-field-error" role="alert">
                  {fieldErrors[field]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="cad-part-editor-group">
        <div className="cad-part-editor-heading">
          <span><Move3D /> YEREL KONUM</span>
          <small>mm</small>
        </div>
        <div className="cad-part-coordinate-grid">
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
                  min="-280000"
                  max="280000"
                  step="0.1"
                  value={positionDraft[axis.key]}
                  aria-invalid={Boolean(fieldErrors[axis.key])}
                  aria-describedby={fieldErrors[axis.key] ? `selected-part-position-${axis.key}-error` : undefined}
                  onChange={(event) => {
                    setPositionDraft((current) => ({
                      ...current,
                      [axis.key]: event.target.value,
                    }));
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next[axis.key];
                      return next;
                    });
                  }}
                  onBlur={() => commitPosition(axis.key, axis.index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span>mm</span>
              </div>
              {fieldErrors[axis.key] && (
                <p id={`selected-part-position-${axis.key}-error`} className="cad-inspector-field-error" role="alert">
                  {fieldErrors[axis.key]}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="cad-field-note">
          X, Y ve Z değerleri parçanın mobilya merkezine göre yerel konumudur.
          Değişiklikler 3D önizlemeye ve proje verisine uygulanır.
        </p>
      </div>

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

      <div className="cad-part-production-note">
        <span>ÜRETİM KAPSAMI</span>
        <p>Kesim listesi şu anda desteklenen mobilya konstrüksiyon kurallarından hesaplanır. Bu görsel parça düzenlemeleri üretim kesim ölçülerini değiştirmez.</p>
      </div>

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
