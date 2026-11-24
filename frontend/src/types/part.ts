import type { PanelCutoutGeometryResult } from "../../../domain/production/panelCutoutGeometry.ts";

// Mobilya üretiminde kullanılacak parçaların veri yapısı.
// Bütün ölçüler milimetredir.

export type CncOperationType =
  | "drill"
  | "pocket"
  | "groove"
  | "cut"
  | "hinge-cup"
  | "dowel"
  | "minifix";

export interface CncOperation {
  id: string;
  type: CncOperationType;
  x: number;
  y: number;
  z: number;
  diameter: number;
  depth: number;
  description: string;
}

export interface PartEdgeBandingAssignment {
  edgeBandingId: string;
  unit: "mm" | "m";
}

export interface Part {
  id: string;
  furnitureId: string;
  name: string;

  // Kesim ölçüleri
  width: number;
  length: number;
  thickness: number;
  quantity: number;

  // Kenar bantlama
  edgeBanding: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };

  // Malzeme
  material: string;
  /** Stable project material catalogue reference; absent on legacy/free-text parts. */
  materialId?: string;
  /** Source drawer group identity; absent for body panels. */
  drawerGroupId?: string;
  /** Preserved domain cutout geometry; export remains blocked until serializers support it. */
  panelGeometry?: PanelCutoutGeometryResult;
  /** Explicit edge-band catalogue metadata from the domain report. */
  edgeBandingMaterialId?: string;
  edgeBandingUnit?: "mm" | "m";
  /** Per-edge catalog assignments retained from the domain report; CSV remains blocked until supported. */
  edgeBandingByEdge?: Partial<Record<"top" | "bottom" | "left" | "right", PartEdgeBandingAssignment>>;

  // CNC işlemleri
  cncOperations: CncOperation[];

  // Parçanın üretim yönü
  grainDirection: "length" | "width" | "none";

  // Üretim notu
  productionNote?: string;
}