import { useEffect, useState } from "react";
import { Move3D, RotateCw } from "lucide-react";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { PlacedFurniture } from "../../types/placedFurniture";

type Axis = "x" | "y" | "z";
type PositionDraft = Record<Axis, string>;

interface FurnitureTransformFieldsProps {
  furniture: PlacedFurniture;
  onPositionCommit: (position: [number, number, number]) => void;
  onRotationCommit: (rotation: number) => void;
}

const axes: { key: Axis; label: string; index: number; color: string }[] = [
  { key: "x", label: "X", index: 0, color: "text-rose-400" },
  { key: "y", label: "Y", index: 1, color: "text-emerald-400" },
  { key: "z", label: "Z", index: 2, color: "text-sky-400" },
];

function formatMillimeters(meters: number) {
  return String(Number((meters * 1000).toFixed(1)));
}

function createPositionDraft(position: [number, number, number]): PositionDraft {
  return {
    x: formatMillimeters(position[0]),
    y: formatMillimeters(position[1]),
    z: formatMillimeters(position[2]),
  };
}

export function FurnitureTransformFields({
  furniture,
  onPositionCommit,
  onRotationCommit,
}: FurnitureTransformFieldsProps) {
  const [positionDraft, setPositionDraft] = useState(() =>
    createPositionDraft(furniture.position)
  );
  const [rotationDraft, setRotationDraft] = useState(String(furniture.rotation));

  useEffect(() => {
    setPositionDraft(createPositionDraft(furniture.position));
    setRotationDraft(String(furniture.rotation));
  }, [
    furniture.id,
    furniture.position[0],
    furniture.position[1],
    furniture.position[2],
    furniture.rotation,
  ]);

  function commitAxis(axis: Axis, index: number) {
    const rawValue = positionDraft[axis];
    const parsedValue = Number(rawValue);

    if (rawValue.trim() === "" || !Number.isFinite(parsedValue)) {
      setPositionDraft(createPositionDraft(furniture.position));
      return;
    }

    const nextPosition: [number, number, number] = [...furniture.position];
    nextPosition[index] = parsedValue / 1000;
    onPositionCommit(nextPosition);
  }

  function commitRotation() {
    const parsedValue = Number(rotationDraft);

    if (
      rotationDraft.trim() === "" ||
      !Number.isFinite(parsedValue) ||
      parsedValue < 0 ||
      parsedValue > 359
    ) {
      setRotationDraft(String(furniture.rotation));
      return;
    }

    onRotationCommit(parsedValue);
  }

  return (
    <section className="cad-property-section space-y-3">
      <div className="cad-section-heading">
        <span>KONUM VE DÖNÜŞ</span>
        <Move3D />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {axes.map((axis) => {
          const inputId = `furniture-position-${axis.key}`;

          return (
            <div className="cad-field min-w-0" key={axis.key}>
              <Label
                htmlFor={inputId}
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <span className={`font-bold ${axis.color}`}>{axis.label}</span>
                Konum
              </Label>
              <div className="cad-input-with-unit">
                <Input
                  id={inputId}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={positionDraft[axis.key]}
                  aria-label={`${axis.label} ekseni konumu, milimetre`}
                  className="min-w-0 text-right font-mono tabular-nums"
                  onChange={(event) =>
                    setPositionDraft((previous) => ({
                      ...previous,
                      [axis.key]: event.target.value,
                    }))
                  }
                  onBlur={() => commitAxis(axis.key, axis.index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span>mm</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cad-field">
        <Label
          htmlFor="furniture-rotation"
          className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <RotateCw className="size-3.5" />
          Dönüş açısı
        </Label>
        <div className="cad-input-with-unit">
          <Input
            id="furniture-rotation"
            type="number"
            min="0"
            max="359"
            step="1"
            value={rotationDraft}
            className="font-mono tabular-nums"
            onChange={(event) => setRotationDraft(event.target.value)}
            onBlur={commitRotation}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <span>°</span>
        </div>
      </div>

      <p className="cad-field-note">
        X ve Z oda merkezine, Y zeminden nesne merkezine göre ölçülür.
        X ve Z konumları oda sınırlarına göre otomatik sınırlandırılır.
      </p>
    </section>
  );
}
