import { formatMillimeterReadout } from "./sceneReadout";
import type { ViewportSceneReadoutModel } from "./sceneReadout";
import "./ViewportSceneReadout.css";

interface ViewportSceneReadoutProps {
  readout: ViewportSceneReadoutModel;
}

function formatDimensions(dimensions: [number, number, number]): string {
  return dimensions.map(formatMillimeterReadout).join(" × ");
}

export function ViewportSceneReadout({ readout }: ViewportSceneReadoutProps) {
  return (
    <div
      className="cad-viewport-readout"
      role="status"
      aria-label="Seçili sahne öğesi ölçüleri"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="cad-viewport-readout__label">
        {readout.selection
          ? readout.selection.kind === "part" ? "PARÇA" : "MOBİLYA"
          : "SAHNE"}
      </span>
      <div className="cad-viewport-readout__value">
        {readout.selection ? (
          <>
            <strong title={readout.selection.name}>{readout.selection.name}</strong>
            <small>{formatDimensions(readout.selection.dimensions)} mm</small>
          </>
        ) : (
          <>
            <strong>
              {readout.visibleFurnitureCount} / {readout.totalFurnitureCount} nesne görünür
            </strong>
            <small>
              {readout.totalFurnitureCount === 0
                ? "Kütüphaneden model ekleyin"
                : "Seçim yok"}
            </small>
          </>
        )}
      </div>
    </div>
  );
}
