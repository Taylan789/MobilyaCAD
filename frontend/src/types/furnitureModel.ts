// MobilyaCAD parametrik mobilya modeli.
// Bütün ölçüler milimetre (mm) cinsindendir.
// Bu dosya, mobilya yapılandırması, üretim bileşenleri ve 3D geometri arasındaki
// tek kaynak doğrusudur (single source of truth).

export type FurnitureType =
  | "kitchen"
  | "wardrobe"
  | "desk"
  | "tv-unit"
  | "bookcase"
  | "bathroom"
  | "custom";

export type BackInstallation = "overlay" | "grooved" | "inset";
export type CarcassStyle = "between-sides" | "over-sides";
export type DoorStyle = "full-overlay" | "half-overlay" | "inset";
export type ShelfStyle = "fixed" | "adjustable";

// Mobilya yapılandırması: boyut, parça adedi ve konstrüksiyon kurallarını bir arada tutar.
export interface FurnitureConfig {
  type: FurnitureType;

  width: number;
  height: number;
  depth: number;

  panelThickness: number;
  backThickness: number;
  frontThickness: number;

  backInstallation: BackInstallation;
  backInset: number;
  backGrooveDepth: number;

  carcassStyle: CarcassStyle;

  doorCount: number;
  doorStyle: DoorStyle;
  doorGap: number;

  drawerCount: number;
  drawerBottomThickness: number;

  shelfCount: number;
  shelfStyle: ShelfStyle;

  dividerCount: number;

  hasBackPanel: boolean;
  hasPlinth: boolean;
  plinthHeight: number;
  plinthRecess: number;

  hasWorktop: boolean;
  worktopThickness: number;
  worktopOverhang: number;

  edgeBanding: boolean;
  edgeBandThickness: number;

  material: string;
}

// Yapılandırma doğrulama sonucu.
export interface ConfigIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

// Üretilen yapısal bileşen. Konumlar, mobilyanın alt-orta noktasına göre mm cinsindendir:
// x: sağ(+), y: yukarı(+), z: öne(+).
export type ComponentKind =
  | "side"
  | "top"
  | "bottom"
  | "shelf"
  | "back"
  | "door"
  | "drawer-front"
  | "drawer-side"
  | "drawer-bottom"
  | "divider"
  | "plinth"
  | "worktop";

export interface FurnitureComponent {
  id: string;
  kind: ComponentKind;
  name: string;

  width: number;
  height: number;
  depth: number;

  center: { x: number; y: number; z: number };

  material: string;
  thickness: number;

  // Görünür kenarlar için bantlama (üretim bilgisi).
  edgeBanding: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };

  grainDirection: "length" | "width" | "none";

  rule: string;
  formula: string;
}

// Varsayılan yapılandırma oluşturur.
export function createDefaultConfig(
  type: FurnitureType,
  overrides: Partial<FurnitureConfig> = {}
): FurnitureConfig {
  const base: FurnitureConfig = {
    type,
    width: 600,
    height: 850,
    depth: 560,

    panelThickness: 18,
    backThickness: 8,
    frontThickness: 18,

    backInstallation: "grooved",
    backInset: 0,
    backGrooveDepth: 8,

    carcassStyle: "between-sides",

    doorCount: 2,
    doorStyle: "full-overlay",
    doorGap: 2,

    drawerCount: 0,
    drawerBottomThickness: 6,

    shelfCount: 0,
    shelfStyle: "adjustable",

    dividerCount: 0,

    hasBackPanel: true,
    hasPlinth: false,
    plinthHeight: 0,
    plinthRecess: 30,

    hasWorktop: false,
    worktopThickness: 38,
    worktopOverhang: 20,

    edgeBanding: true,
    edgeBandThickness: 0.8,

    material: "Suntalam"
  };

  if (type === "bookcase" || type === "tv-unit" || type === "desk") {
    base.shelfCount = 2;
    base.doorCount = 0;
  }

  if (type === "wardrobe") {
    base.shelfCount = 2;
    base.dividerCount = 1;
  }

  return { ...base, ...overrides };
}

// Yapılandırmanın fiziksel uygunluğunu kontrol eder.
// Hatalar üretimi durdurur; uyarılar üretime devam eder ama kullanıcıya gösterilir.
export function validateFurnitureConfig(
  config: FurnitureConfig
): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const t = config.panelThickness;

  if (!Number.isFinite(config.width) || config.width < 100) {
    issues.push({
      field: "width",
      message: "Genişlik en az 100 mm olmalıdır.",
      severity: "error"
    });
  }
  if (!Number.isFinite(config.height) || config.height < 100) {
    issues.push({
      field: "height",
      message: "Yükseklik en az 100 mm olmalıdır.",
      severity: "error"
    });
  }
  if (!Number.isFinite(config.depth) || config.depth < 100) {
    issues.push({
      field: "depth",
      message: "Derinlik en az 100 mm olmalıdır.",
      severity: "error"
    });
  }
  if (!Number.isFinite(t) || t < 3 || t > 60) {
    issues.push({
      field: "panelThickness",
      message: "Panel kalınlığı 3-60 mm arasında olmalıdır.",
      severity: "error"
    });
  }
  if (!Number.isFinite(config.backThickness) || config.backThickness < 3) {
    issues.push({
      field: "backThickness",
      message: "Arkalık kalınlığı en az 3 mm olmalıdır.",
      severity: "error"
    });
  }
  if (!Number.isFinite(config.frontThickness) || config.frontThickness < 3) {
    issues.push({
      field: "frontThickness",
      message: "Kapak kalınlığı en az 3 mm olmalıdır.",
      severity: "error"
    });
  }

  const counts = [
    ["doorCount", config.doorCount],
    ["drawerCount", config.drawerCount],
    ["shelfCount", config.shelfCount],
    ["dividerCount", config.dividerCount]
  ] as const;

  for (const [field, value] of counts) {
    if (!Number.isInteger(value) || value < 0) {
      issues.push({
        field,
        message: `${field} tam sayı ve sıfırdan küçük olmamalıdır.`,
        severity: "error"
      });
    }
  }

  if (config.doorCount > 8) {
    issues.push({
      field: "doorCount",
      message: "Kapak sayısı en fazla 8 olabilir.",
      severity: "warning"
    });
  }
  if (config.drawerCount > 8) {
    issues.push({
      field: "drawerCount",
      message: "Çekmece sayısı en fazla 8 olabilir.",
      severity: "warning"
    });
  }
  if (config.shelfCount > 12) {
    issues.push({
      field: "shelfCount",
      message: "Raf sayısı en fazla 12 olabilir.",
      severity: "warning"
    });
  }

  if (config.doorGap < 0 || config.doorGap > 10) {
    issues.push({
      field: "doorGap",
      message: "Kapak boşluğu 0-10 mm arasında olmalıdır.",
      severity: "error"
    });
  }

  if (config.hasPlinth) {
    if (config.plinthHeight < 10 || config.plinthHeight > 200) {
      issues.push({
        field: "plinthHeight",
        message: "Kaide yüksekliği 10-200 mm arasında olmalıdır.",
        severity: "error"
      });
    }
  }

  if (config.hasWorktop) {
    if (config.worktopThickness < 12 || config.worktopThickness > 60) {
      issues.push({
        field: "worktopThickness",
        message: "Tezgâh kalınlığı 12-60 mm arasında olmalıdır.",
        severity: "error"
      });
    }
  }

  if (config.backInstallation === "inset" && config.backInset < 0) {
    issues.push({
      field: "backInset",
      message: "Arkalık içe yerleştirme mesafesi negatif olamaz.",
      severity: "error"
    });
  }

  if (
    config.backInstallation === "grooved" &&
    (config.backGrooveDepth < 1 || config.backGrooveDepth > t / 2)
  ) {
    issues.push({
      field: "backGrooveDepth",
      message: "Kanal derinliği 1 ile panel yarı kalınlığı arasında olmalıdır.",
      severity: "error"
    });
  }

  return issues;
}

// Yapılandırma hataları varsa üretim durdurulur.
export function hasBlockingErrors(config: FurnitureConfig): boolean {
  return validateFurnitureConfig(config).some(
    (issue) => issue.severity === "error"
  );
}
