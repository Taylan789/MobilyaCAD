import { useEffect, useState } from "react";
import { Layers3, Move3D, Ruler } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { FurniturePart } from "../../types/placedFurniture";

type DimensionField = "width" | "height" | "depth";
type Axis = "x" | "y" | "z";
type DraftValues = Record<DimensionField, string>;
type PositionDraft = Record<Axis, string>;

interface FurniturePartInspectorProps {
  part: FurniturePart;
  onFieldChange: (field: "name" | DimensionField, value: string | number) => void;
  onPositionChange: (position: [number, number, number]) => void;
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
  onFieldChange,
  onPositionChange,
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
