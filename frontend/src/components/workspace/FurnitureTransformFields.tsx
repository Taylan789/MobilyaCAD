import { useEffect, useState } from "react";
import { AlertCircle, Move3D, RotateCw } from "lucide-react";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { PlacedFurniture } from "../../types/placedFurniture";
import "./FurnitureTransformFields.css";

type Axis = "x" | "y" | "z";
type PositionDraft = Record<Axis, string>;
type PositionErrors = Partial<Record<Axis, string>>;

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
  const [positionErrors, setPositionErrors] = useState<PositionErrors>({});
  const [rotationError, setRotationError] = useState<string | null>(null);

  useEffect(() => {
    setPositionDraft(createPositionDraft(furniture.position));
    setRotationDraft(String(furniture.rotation));
    setPositionErrors({});
    setRotationError(null);
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
      setPositionErrors((previous) => ({
        ...previous,
        [axis]: `${axis.toUpperCase()} konumu geçerli bir sayı değil; geçerli değer girilene kadar önceki konum uygulanır.`,
      }));
      return;
    }

    setPositionErrors((previous) => {
      const next = { ...previous };
      delete next[axis];
      return next;
    });
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
      setRotationError("Dönüş açısı 0–359° aralığında olmalı; geçerli değer girilene kadar önceki açı uygulanır.");
      return;
    }

    setRotationError(null);
    onRotationCommit(parsedValue);
  }

  return (
    <section className="cad-property-section cad-transform-panel space-y-3">
      <div className="cad-section-heading cad-transform-panel__heading">
        <span>KONUM VE DÖNÜŞ</span>
        <Move3D />
      </div>

      <div className="cad-transform-axis-grid" role="group" aria-label="Mobilya konumu, milimetre">
        {axes.map((axis) => {
          const inputId = `furniture-position-${axis.key}`;

          return (
            <div
              className={`cad-field min-w-0 cad-transform-axis-field cad-transform-axis-field--${axis.key}`}
              key={axis.key}
            >
              <Label
                htmlFor={inputId}
                className="cad-transform-axis-label mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <span className="cad-transform-axis-label__letter">{axis.label}</span>
                Konum
              </Label>
              <div className="cad-input-with-unit cad-transform-axis-value">
                <Input
                  id={inputId}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={positionDraft[axis.key]}
                  aria-describedby="furniture-position-help"
                  aria-invalid={Boolean(positionErrors[axis.key])}
                  aria-errormessage={positionErrors[axis.key] ? `furniture-position-${axis.key}-error` : undefined}
                  aria-label={`${axis.label} ekseni konumu, milimetre`}
                  className="cad-transform-axis-input min-w-0 font-mono tabular-nums"
                  onChange={(event) => {
                    setPositionErrors((previous) => {
                      const next = { ...previous };
                      delete next[axis.key];
                      return next;
                    });
                    setPositionDraft((previous) => ({
                      ...previous,
                      [axis.key]: event.target.value,
                    }));
                  }}
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
      {Object.keys(positionErrors).length > 0 && (
        <div className="cad-transform-validation-list">
          {axes.map((axis) => {
            const error = positionErrors[axis.key];
            if (!error) return null;

            return (
              <p
                className="cad-transform-validation"
                id={`furniture-position-${axis.key}-error`}
                role="status"
                aria-live="polite"
                key={axis.key}
              >
                <AlertCircle aria-hidden="true" />
                <span>{error}</span>
              </p>
            );
          })}
        </div>
      )}

      <div className="cad-field cad-transform-rotation">
        <Label
          htmlFor="furniture-rotation"
          className="cad-transform-rotation__label mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <RotateCw className="size-3.5" />
          Dönüş açısı
          <span className="cad-transform-rotation__range" id="furniture-rotation-help">0–359°</span>
        </Label>
        <div className="cad-input-with-unit cad-transform-rotation__value">
          <Input
            id="furniture-rotation"
            type="number"
            min="0"
            max="359"
            step="1"
            value={rotationDraft}
            aria-label="Dönüş açısı, derece"
            aria-describedby="furniture-rotation-help"
            aria-invalid={Boolean(rotationError)}
            aria-errormessage={rotationError ? "furniture-rotation-error" : undefined}
            className="cad-transform-rotation__input font-mono tabular-nums"
            onChange={(event) => {
              setRotationError(null);
              setRotationDraft(event.target.value);
            }}
            onBlur={commitRotation}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <span>°</span>
        </div>
      </div>
      {rotationError && (
        <p className="cad-transform-validation" id="furniture-rotation-error" role="status" aria-live="polite">
          <AlertCircle aria-hidden="true" />
          <span>{rotationError}</span>
        </p>
      )}

      <div className="cad-transform-reference-row">
        <p className="cad-field-note cad-transform-help" id="furniture-position-help">
          X/Z: oda merkezi · Y: zemin
        </p>
        <span className="cad-transform-reference-unit" aria-hidden="true">MM / DEG</span>
      </div>
      <details className="cad-transform-reference">
        <summary>
          <span>Ölçüm referansı</span>
          <span className="cad-transform-reference__hint">KOORDİNAT / AÇI</span>
        </summary>
        <div className="cad-transform-reference__content">
          <p>
            X ve Z oda merkezine, Y zeminden nesne merkezine göre ölçülür.
            X ve Z konumları oda sınırlarına göre otomatik sınırlandırılır.
          </p>
          <p>Dönüş açısı 0–359° aralığında derece olarak uygulanır.</p>
        </div>
      </details>
    </section>
  );
}
