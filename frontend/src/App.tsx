import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import {
  Box,
  ArrowLeft,
  Factory,
  CookingPot,
  Layers,
  DoorOpen,
  BookOpen,
  Monitor,
  Table2,
  PanelLeft,
  PanelRight,
  Move3D,
  Maximize2,
  RotateCw,
  Save,
  BoxSelect,
  Search,
  Plus,
  Trash2,
  Ruler,
  Settings2,
  House,
  Package,
  MousePointer2,
  Layers3,
  X,
  Keyboard,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Focus,
} from "lucide-react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "./components/ui/sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "./components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import { ScrollArea } from "./components/ui/scroll-area";
import { MobilyaCadLogo } from "./components/brand/MobilyaCadLogo";
import "./components/workspace/KeyboardShortcuts.css";
import "./styles/workbench.css";
import "./styles/workspace-viewport-fit.css";
import "./styles/ui-inspector-layout-001.css";
import "./styles/cad-graphite-workspace-001.css";
import "./styles/ui-production-dock-empty-state-001.css";
import "./styles/cad-production-dock-collapse-001.css";

import Scene3D from "./components/viewport/Scene3D";
import { DrawerBoxConfigurator } from "./components/production/DrawerBoxConfigurator";
import { ProductionOverview } from "./components/production/ProductionOverview";
import { ProductionWorkspace } from "./components/production/ProductionWorkspace";
import { MaterialCatalogManager } from "./components/production/MaterialCatalogManager";
import { FurnitureTransformFields } from "./components/workspace/FurnitureTransformFields";
import { FurniturePartInspector } from "./components/workspace/FurniturePartInspector";
import { FurnitureCatalogCard } from "./components/catalog/FurnitureCatalogCard";
import "./components/catalog/FurnitureCatalogCard.css";
import type { MaterialCatalogEntry } from "./engine/materialCatalog";
import type { MaterialUsageLocation } from "./types/materialUsage";
import { furnitureCatalog } from "./data/furnitureCatalog";
import { createPlacedFurniture } from "./types/placedFurniture";
import type { PlacedFurniture } from "./types/placedFurniture";
import { parseProjectFile, serializeProjectFile } from "./engine/projectFile";
import { calculateEdgeBandingSummary } from "./engine/edgeBanding";
import { calculateMaterialConsumptionSummary } from "./engine/materialConsumption";
import { createProjectCutListCsv } from "./engine/cutListCsv";
import { calculateProjectProduction, isSupportedCabinetCatalogItem } from "./engine/projectProduction";
import type { CabinetConstructionRules } from "./types/construction/cabinetRules";

type SceneMaterialSource = "catalog" | "custom" | "missing" | "unassigned";

interface SceneMaterialResolution {
  name: string;
  source: SceneMaterialSource;
  searchTerms: string[];
}

const sceneMaterialSourceLabels: Record<SceneMaterialSource, string> = {
  catalog: "KATALOG",
  custom: "SERBEST",
  missing: "KAYIT EKSİK",
  unassigned: "ATANMAMIŞ",
};

function resolveSceneMaterial(
  materialName: string | undefined,
  materials: MaterialCatalogEntry[],
  materialId?: string
): SceneMaterialResolution {
  const name = materialName?.trim() ?? "";
  const normalizedName = name.toLocaleLowerCase("tr-TR");
  const catalogEntry = materialId
    ? materials.find((entry) => entry.id === materialId)
    : normalizedName
      ? materials.find(
          (entry) => entry.name.toLocaleLowerCase("tr-TR") === normalizedName
        )
      : undefined;

  if (catalogEntry) {
    return {
      name: catalogEntry.name,
      source: "catalog",
      searchTerms: [
        name,
        catalogEntry.name,
        catalogEntry.id,
        catalogEntry.decor ?? "",
      ],
    };
  }

  return {
    name,
    source: materialId ? "missing" : name ? "custom" : "unassigned",
    searchTerms: [name, materialId ?? ""],
  };
}

function matchesSceneMaterialSearch(
  materialName: string | undefined,
  materials: MaterialCatalogEntry[],
  query: string,
  materialId?: string
): boolean {
  if (!query) return false;

  return resolveSceneMaterial(materialName, materials, materialId).searchTerms.some(
    (term) => term.toLocaleLowerCase("tr-TR").includes(query)
  );
}

function App() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  function startWorkspace() {
    if (workspaceOpen) return;
    setWorkspaceOpen(true);
  }
  const [roomWidth, setRoomWidth] = useState(4000);
  const [roomLength, setRoomLength] = useState(5000);
  const [roomHeight, setRoomHeight] = useState(2800);

  const [furniture, setFurniture] = useState<PlacedFurniture[]>([]);
  const [materials, setMaterials] = useState<MaterialCatalogEntry[]>([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [transformMode, setTransformMode] = useState<"translate" | "scale" | "rotate">("translate");
  const [mobilePanel, setMobilePanel] = useState<"catalog" | "inspector" | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches
  );
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const syncCompactViewport = () => setIsCompactViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", syncCompactViewport);
    return () => mediaQuery.removeEventListener("change", syncCompactViewport);
  }, []);
  const [leftDockCollapsed, setLeftDockCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [leftPanelMode, setLeftPanelMode] = useState<"catalog" | "scene">("catalog");
  const [sceneSearch, setSceneSearch] = useState("");
  const [collapsedSceneFurnitureIds, setCollapsedSceneFurnitureIds] = useState<string[]>([]);
  const [hiddenFurnitureIds, setHiddenFurnitureIds] = useState<string[]>([]);
  const [isolatedFurnitureId, setIsolatedFurnitureId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"room" | "furniture" | "production" | "materials">("room");
  const [workspaceMode, setWorkspaceMode] = useState<"design" | "production">("design");
  const [productionSection, setProductionSection] = useState<"report" | "materials">("report");
  const [bottomPanelTab, setBottomPanelTab] = useState<"parts" | "materials" | "issues">("parts");
  const [bottomDockCollapsed, setBottomDockCollapsed] = useState(false);

  const mobileCatalogHidden = isCompactViewport && mobilePanel !== "catalog";
  const mobileInspectorHidden = isCompactViewport
    ? mobilePanel !== "inspector"
    : inspectorCollapsed;

  const [constructionRules] = useState<CabinetConstructionRules>({
    panelThickness: 18,
    backThickness: 8,
    backInstallation: "grooved",
    backInset: 0,
    backGrooveDepth: 8,
    carcassStyle: "between-sides",
    shelfCount: 2,
    shelfStyle: "adjustable",
    edgeBandThickness: 0.8,
    doorStyle: "full-overlay",
    doorGap: 2,
    doorCount: 2,
  });

  const [dimensionDraft, setDimensionDraft] = useState<{
    id: string;
    values: { width: string; height: string; depth: string };
  } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogDragActive, setCatalogDragActive] = useState(false);
  const [projectName, setProjectName] = useState("Yeni Tasarım");
  const [documentSource, setDocumentSource] = useState<"new" | "imported" | "exported">("new");
  const [savedProjectSnapshot, setSavedProjectSnapshot] = useState(() =>
    serializeProjectFile(
      { width: 4000, length: 5000, height: 2800 },
      [],
      "snapshot",
      []
    )
  );

  const projectSnapshot = useMemo(
    () =>
      serializeProjectFile(
        { width: roomWidth, length: roomLength, height: roomHeight },
        furniture,
        "snapshot",
        materials
      ),
    [roomWidth, roomLength, roomHeight, furniture, materials]
  );
  const hasUnsavedChanges = projectSnapshot !== savedProjectSnapshot;
  const documentStatusLabel = hasUnsavedChanges
    ? "Değişiklik var"
    : documentSource === "exported"
      ? "JSON dışa aktarıldı"
      : documentSource === "imported"
        ? "Dosyadan açıldı"
        : "Yeni proje";
  const documentStatusTitle = hasUnsavedChanges
    ? "Son JSON dışa aktarımından sonra kaydedilmemiş değişiklikler var."
    : documentSource === "exported"
      ? "Mevcut tasarım JSON dosyası olarak dışa aktarıldı."
      : documentSource === "imported"
        ? "Proje bir JSON dosyasından açıldı."
        : "Yeni tasarım henüz dışa aktarılmadı.";

  function startNewProject(
    initialPanel: "catalog" | "scene" = "catalog",
    initialInspector: "room" | "furniture" | "production" | "materials" = "room"
  ) {
    if (
      hasUnsavedChanges &&
      !window.confirm("Kaydedilmemiş değişiklikler var. Yeni projeye geçmek istiyor musun?")
    ) {
      return;
    }

    setRoomWidth(4000);
    setRoomLength(5000);
    setRoomHeight(2800);
    setFurniture([]);
    setMaterials([]);
    setSelectedFurnitureId(null);
    setSelectedPartId(null);
    setFocusRequestId(0);
    setTransformMode("translate");
    setMobilePanel(null);
    setLeftDockCollapsed(false);
    setInspectorCollapsed(false);
    setBottomDockCollapsed(false);
    setShowShortcuts(false);
    setLeftPanelMode(initialPanel);
    setSceneSearch("");
    setCollapsedSceneFurnitureIds([]);
    setHiddenFurnitureIds([]);
    setIsolatedFurnitureId(null);
    setInspectorTab(initialInspector);
    setWorkspaceMode(initialInspector === "production" ? "production" : "design");
    setProductionSection("report");
    setDimensionDraft(null);
    setSelectedCategory("Tümü");
    setCatalogSearch("");
    setProjectName("Yeni Tasarım");
    setDocumentSource("new");
    setSavedProjectSnapshot(
      serializeProjectFile(
        { width: 4000, length: 5000, height: 2800 },
        [],
        "snapshot",
        []
      )
    );

    if (!workspaceOpen) startWorkspace();
  }

  useEffect(() => {
    setInspectorTab((current) =>
      selectedFurnitureId
        ? "furniture"
        : current === "furniture"
          ? "room"
          : current
    );
  }, [selectedFurnitureId, selectedPartId]);

  useEffect(() => {
    if (!selectedFurnitureId) return;
    setCollapsedSceneFurnitureIds((current) =>
      current.includes(selectedFurnitureId)
        ? current.filter((id) => id !== selectedFurnitureId)
        : current
    );
  }, [selectedFurnitureId, selectedPartId]);

  const catalogCategories = [
    "Tümü",
    ...Array.from(new Set(furnitureCatalog.map((item) => item.category))),
  ];

  const filteredFurnitureCatalog = furnitureCatalog.filter((item) => {
    const kategoriUygun =
      selectedCategory === "Tümü" || item.category === selectedCategory;

    const aramaUygun = item.name
      .toLocaleLowerCase("tr")
      .includes(catalogSearch.toLocaleLowerCase("tr").trim());

    return kategoriUygun && aramaUygun;
  });

  const categoryLabels: Record<string, string> = {
    kitchen: "Mutfak",
    wardrobe: "Gardırop",
    desk: "Çalışma Alanı",
    "tv-unit": "TV Ünitesi",
    bookcase: "Kitaplık",
    bathroom: "Banyo",
    custom: "Diğer",
  };

  const selectedFurniture = furniture.find(
    (item) => item.id === selectedFurnitureId
  );

  const selectedPart = selectedFurniture?.parts.find(
    (part) => part.id === selectedPartId
  );

  const selectedCatalogItem = furnitureCatalog.find(
    (item) => item.id === selectedFurniture?.catalogId
  );

  const normalizedSceneSearch = sceneSearch.trim().toLocaleLowerCase("tr-TR");
  const filteredSceneFurniture = furniture.filter((item) => {
    const furnitureNameMatches = item.name
      .toLocaleLowerCase("tr-TR")
      .includes(normalizedSceneSearch);
    const furnitureMaterialMatches = matchesSceneMaterialSearch(
      item.material,
      materials,
      normalizedSceneSearch,
      item.materialId
    );
    const partMatches = item.parts.some((part) =>
      part.name.toLocaleLowerCase("tr-TR").includes(normalizedSceneSearch) ||
      matchesSceneMaterialSearch(part.material, materials, normalizedSceneSearch)
    );

    return furnitureNameMatches || furnitureMaterialMatches || partMatches;
  });
  const allSceneFurnitureCollapsed = furniture.length > 0 &&
    furniture.every((item) => collapsedSceneFurnitureIds.includes(item.id));
  const hiddenFurnitureCount = furniture.filter((item) => hiddenFurnitureIds.includes(item.id)).length;
  const referencedMaterialIds = new Set(
    furniture.flatMap((item) => [
      ...(item.materialId ? [item.materialId] : []),
      ...item.parts.flatMap((part) => {
        const matchingMaterial = materials.find((entry) => entry.name === part.material);
        return matchingMaterial ? [matchingMaterial.id] : [];
      }),
      ...(item.drawerBoxSpecs ?? []).flatMap((config) => [
        ...(config.spec.materialId ? [config.spec.materialId] : []),
        ...Object.values(config.spec.panelMaterialIds ?? {}).filter(
          (id): id is string => typeof id === "string" && id.trim() !== ""
        )
      ])
    ])
  );

  const materialUsageById = useMemo(() => {
    const usageById = new Map<string, MaterialUsageLocation[]>();

    const addUsage = (
      materialId: string | undefined,
      location: MaterialUsageLocation
    ) => {
      if (!materialId) return;
      const locations = usageById.get(materialId) ?? [];
      locations.push(location);
      usageById.set(materialId, locations);
    };

    for (const item of furniture) {
      const defaultMaterial = item.materialId
        ? materials.find((entry) => entry.id === item.materialId)
        : materials.find((entry) => entry.name === item.material);

      if (defaultMaterial) {
        addUsage(defaultMaterial.id, {
          furnitureId: item.id,
          furnitureName: item.name,
          partName: "Mobilya varsayılanı",
          sourceLabel: "Varsayılan atama"
        });
      }

      for (const part of item.parts) {
        const inheritsDefault =
          item.material.trim() !== "" &&
          part.material.trim() === item.material.trim();

        if (inheritsDefault) {
          if (defaultMaterial) {
            addUsage(defaultMaterial.id, {
              furnitureId: item.id,
              furnitureName: item.name,
              partId: part.id,
              partName: part.name,
              sourceLabel: "Mobilya varsayılanı"
            });
          }
          continue;
        }

        const partMaterial = materials.find((entry) => entry.name === part.material);
        if (partMaterial) {
          addUsage(partMaterial.id, {
            furnitureId: item.id,
            furnitureName: item.name,
            partId: part.id,
            partName: part.name,
            sourceLabel: "Parça ataması"
          });
        }
      }

      for (const config of item.drawerBoxSpecs ?? []) {
        const drawerMaterial = config.spec.materialId
          ? materials.find((entry) => entry.id === config.spec.materialId)
          : materials.find((entry) => entry.name === config.spec.material);

        if (drawerMaterial) {
          addUsage(drawerMaterial.id, {
            furnitureId: item.id,
            furnitureName: item.name,
            partName: "Çekmece kutusu",
            sourceLabel: "Çekmece yapılandırması"
          });
        }

        for (const [panelName, materialId] of Object.entries(config.spec.panelMaterialIds ?? {})) {
          if (typeof materialId !== "string" || materialId.trim() === "") continue;
          const panelMaterial = materials.find((entry) => entry.id === materialId);
          if (panelMaterial) {
            addUsage(panelMaterial.id, {
              furnitureId: item.id,
              furnitureName: item.name,
              partName: "Çekmece paneli · " + panelName,
              sourceLabel: "Panel ataması"
            });
          }
        }
      }
    }

    return usageById;
  }, [furniture, materials]);

  const selectedPartMaterialId = selectedPart && selectedFurniture
    ? selectedPart.material.trim() !== "" &&
      selectedPart.material.trim() === selectedFurniture.material.trim() &&
      selectedFurniture.materialId
      ? selectedFurniture.materialId
      : materials.find((entry) => entry.name === selectedPart.material)?.id
    : undefined;
  const selectedPartMaterialUsage = selectedPartMaterialId
    ? materialUsageById.get(selectedPartMaterialId) ?? []
    : [];
  const projectProduction = calculateProjectProduction(
    furniture,
    furnitureCatalog,
    constructionRules,
    materials
  );
  const productionExportBlockReason = projectProduction.exportBlockReason;
  const productionParts = projectProduction.parts;

  const edgeBandingSummary = calculateEdgeBandingSummary(productionParts);
  const materialConsumptionSummary = calculateMaterialConsumptionSummary(productionParts);

  function addFurniture(catalogId: string, dropPosition?: [number, number, number]) {
    const item = furnitureCatalog.find(
      (product) => product.id === catalogId
    );

    if (!item) return;

    const rawPosition = dropPosition ?? [0, item.height / 2000, 0];
    const halfWidth = item.width / 2000;
    const halfDepth = item.depth / 2000;
    const placed = createPlacedFurniture(item, [
      Math.max(-roomWidth / 2000 + halfWidth, Math.min(roomWidth / 2000 - halfWidth, rawPosition[0])),
      item.height / 2000,
      Math.max(-roomLength / 2000 + halfDepth, Math.min(roomLength / 2000 - halfDepth, rawPosition[2])),
    ]);

    setFurniture((previous) => [...previous, placed]);
    setSelectedFurnitureId(placed.id);
    setSelectedPartId(null);
    setIsolatedFurnitureId(null);
  }

  function updateSelectedPart(
    field: "name" | "width" | "height" | "depth" | "material",
    value: string | number
  ) {
    if (!selectedFurnitureId || !selectedPartId) return;

    if (
      typeof value === "number" &&
      (!Number.isFinite(value) || value < 1)
    ) {
      return;
    }

    setFurniture((previous) =>
      previous.map((item) => {
        if (item.id !== selectedFurnitureId) return item;

        return {
          ...item,
          parts: item.parts.map((part) =>
            part.id === selectedPartId
              ? { ...part, [field]: value }
              : part
          ),
        };
      })
    );
  }

  function updateSelectedPartPosition(position: [number, number, number]) {
    if (
      !selectedFurnitureId ||
      !selectedPartId ||
      !position.every(Number.isFinite)
    ) {
      return;
    }

    setFurniture((previous) =>
      previous.map((item) => {
        if (item.id !== selectedFurnitureId) return item;
        return {
          ...item,
          parts: item.parts.map((part) =>
            part.id === selectedPartId ? { ...part, position } : part
          ),
        };
      })
    );
  }

  function updateFurnitureMaterial(id: string, materialId: string) {
    const material = materialId === ""
      ? undefined
      : materials.find((entry) => entry.id === materialId);
    if (materialId !== "" && !material) return;

    setFurniture((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;
        const nextMaterialName = material?.name ?? item.material;
        return {
          ...item,
          material: nextMaterialName,
          materialId: material?.id,
          parts: item.parts.map((part) =>
            part.material === item.material
              ? { ...part, material: nextMaterialName }
              : part
          )
        };
      })
    );
  }

  function updateMaterials(nextMaterials: MaterialCatalogEntry[]) {
    const materialById = new Map(nextMaterials.map((material) => [material.id, material]));
    setMaterials(nextMaterials);
    setFurniture((previous) =>
      previous.map((item) => {
        const assignedMaterial = item.materialId
          ? materialById.get(item.materialId)
          : undefined;
        const drawerBoxSpecs = item.drawerBoxSpecs?.map((config) => {
          const drawerMaterial = config.spec.materialId
            ? materialById.get(config.spec.materialId)
            : undefined;
          return drawerMaterial
            ? { ...config, spec: { ...config.spec, material: drawerMaterial.name } }
            : config;
        });
        const parts = item.parts.map((part) => {
          const previousCatalogMaterial = materials.find((entry) => entry.name === part.material);
          const renamedCatalogMaterial = previousCatalogMaterial
            ? materialById.get(previousCatalogMaterial.id)
            : undefined;

          if (renamedCatalogMaterial) {
            return { ...part, material: renamedCatalogMaterial.name };
          }

          if (assignedMaterial && part.material === item.material) {
            return { ...part, material: assignedMaterial.name };
          }

          return part;
        });

        return {
          ...item,
          ...(assignedMaterial ? { material: assignedMaterial.name } : {}),
          parts,
          ...(drawerBoxSpecs ? { drawerBoxSpecs } : {})
        };
      })
    );
  }

  function updateFurniture(
    field: "width" | "height" | "depth",
    value: number
  ) {
    if (!selectedFurnitureId || !Number.isFinite(value) || value < 100) return;

    setFurniture((previous) =>
      previous.map((item) => {
        if (item.id !== selectedFurnitureId) return item;

        const genislik = field === "width" ? value : item.width;
        const derinlik = field === "depth" ? value : item.depth;
        const yukseklik =
          field === "height" ? Math.min(value, roomHeight) : item.height;

        const aci = (item.rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(aci));
        const sin = Math.abs(Math.sin(aci));

        const sinirliGenislik = Math.min(
          genislik,
          Math.floor(roomWidth / (cos + (sin * derinlik) / genislik))
        );

        const sinirliDerinlik = Math.min(
          derinlik,
          Math.floor(roomLength / ((sin * genislik) / derinlik + cos))
        );

        const sonGenislik = Math.max(100, sinirliGenislik);
        const sonDerinlik = Math.max(100, sinirliDerinlik);

        const sonYariGenislik =
          (cos * sonGenislik + sin * sonDerinlik) / 2000;

        const sonYariDerinlik =
          (sin * sonGenislik + cos * sonDerinlik) / 2000;

        const sinirliX = Math.max(
          -roomWidth / 2000 + sonYariGenislik,
          Math.min(
            roomWidth / 2000 - sonYariGenislik,
            item.position[0]
          )
        );

        const sinirliZ = Math.max(
          -roomLength / 2000 + sonYariDerinlik,
          Math.min(
            roomLength / 2000 - sonYariDerinlik,
            item.position[2]
          )
        );

        return {
          ...item,
          width: sonGenislik,
          height: yukseklik,
          depth: sonDerinlik,
          position: [
            sinirliX,
            Math.max(
              yukseklik / 2000,
              Math.min(
                roomHeight / 1000 - yukseklik / 2000,
                item.position[1]
              )
            ),
            sinirliZ,
          ],
        };
      })
    );
  }

  function updateFurnitureRotation(id: string, rotation: number) {
    if (!Number.isFinite(rotation)) return;

    setFurniture((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;

        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const angle = (normalizedRotation * Math.PI) / 180;
        const width = item.width / 1000;
        const depth = item.depth / 1000;

        const halfWidth =
          (Math.abs(Math.cos(angle)) * width +
            Math.abs(Math.sin(angle)) * depth) / 2;

        const halfDepth =
          (Math.abs(Math.sin(angle)) * width +
            Math.abs(Math.cos(angle)) * depth) / 2;

        const x = Math.max(
          -roomWidth / 2000 + halfWidth,
          Math.min(roomWidth / 2000 - halfWidth, item.position[0])
        );

        const z = Math.max(
          -roomLength / 2000 + halfDepth,
          Math.min(roomLength / 2000 - halfDepth, item.position[2])
        );

        return {
          ...item,
          rotation: normalizedRotation,
          position: [x, item.position[1], z],
        };
      })
    );
  }

  function updateFurniturePosition(
    id: string,
    position: [number, number, number]
  ) {
    setFurniture((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;

        const genislik = item.width / 1000;
        const derinlik = item.depth / 1000;
        const aci = (item.rotation * Math.PI) / 180;

        const yariGenislik =
          (Math.abs(Math.cos(aci)) * genislik +
            Math.abs(Math.sin(aci)) * derinlik) /
          2;

        const yariDerinlik =
          (Math.abs(Math.sin(aci)) * genislik +
            Math.abs(Math.cos(aci)) * derinlik) /
          2;

        const odaYariGenislik = roomWidth / 2000;
        const odaYariUzunluk = roomLength / 2000;

        const sinirliX = Math.max(
          -odaYariGenislik + yariGenislik,
          Math.min(odaYariGenislik - yariGenislik, position[0])
        );

        const sinirliZ = Math.max(
          -odaYariUzunluk + yariDerinlik,
          Math.min(odaYariUzunluk - yariDerinlik, position[2])
        );

        return {
          ...item,
          position: [sinirliX, position[1], sinirliZ],
        };
      })
    );
  }

  function resizeFurniture(
    id: string,
    dimensions: { width: number; height: number; depth: number },
    requestedPosition: [number, number, number]
  ) {
    setFurniture((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;

        const aci = (item.rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(aci));
        const sin = Math.abs(Math.sin(aci));

        let genislik = Math.max(100, dimensions.width);
        let derinlik = Math.max(100, dimensions.depth);

        const yukseklik = Math.min(
          Math.max(100, dimensions.height),
          roomHeight
        );

        // Genişliği sınırlarken derinliği değiştirme.
        const genislikSiniriX =
          cos > 0.000001
            ? (roomWidth - sin * derinlik) / cos
            : Infinity;

        const genislikSiniriZ =
          sin > 0.000001
            ? (roomLength - cos * derinlik) / sin
            : Infinity;

        genislik = Math.max(
          100,
          Math.min(
            genislik,
            Math.floor(genislikSiniriX),
            Math.floor(genislikSiniriZ)
          )
        );

        // Derinliği sınırlarken genişliği değiştirme.
        const derinlikSiniriX =
          sin > 0.000001
            ? (roomWidth - cos * genislik) / sin
            : Infinity;

        const derinlikSiniriZ =
          cos > 0.000001
            ? (roomLength - sin * genislik) / cos
            : Infinity;

        derinlik = Math.max(
          100,
          Math.min(
            derinlik,
            Math.floor(derinlikSiniriX),
            Math.floor(derinlikSiniriZ)
          )
        );

        const yariGenislik =
          (cos * genislik + sin * derinlik) / 2000;

        const yariDerinlik =
          (sin * genislik + cos * derinlik) / 2000;

        return {
          ...item,
          width: genislik,
          height: yukseklik,
          depth: derinlik,
          position: [
            Math.max(
              -roomWidth / 2000 + yariGenislik,
              Math.min(roomWidth / 2000 - yariGenislik, requestedPosition[0])
            ),
            Math.max(
              yukseklik / 2000,
              Math.min(roomHeight / 1000 - yukseklik / 2000, requestedPosition[1])
            ),
            Math.max(
              -roomLength / 2000 + yariDerinlik,
              Math.min(roomLength / 2000 - yariDerinlik, requestedPosition[2])
            ),
          ],
        };
      })
    );
  }
  function exportProductionCsv() {
    if (productionParts.length === 0 || productionExportBlockReason) return;

    const csv = createProjectCutListCsv(projectProduction.furnitureNames, productionParts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mobilyacad-proje-kesim-listesi.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function focusSceneFurniture(furnitureId: string, partId: string | null = null) {
    const target = furniture.find((item) => item.id === furnitureId);
    if (!target) return;

    if (partId && !target.parts.some((part) => part.id === partId)) return;

    setHiddenFurnitureIds((current) => current.filter((id) => id !== target.id));
    setIsolatedFurnitureId((current) => current && current !== target.id ? null : current);
    setSelectedFurnitureId(target.id);
    setSelectedPartId(partId);
    setLeftPanelMode("scene");
    setLeftDockCollapsed(false);
    setInspectorCollapsed(false);
    setInspectorTab("furniture");
    setMobilePanel(null);
    setFocusRequestId((current) => current + 1);
    setWorkspaceMode("design");
  }

  function toggleFurnitureVisibility(furnitureId: string) {
    const isExcludedByIsolation =
      isolatedFurnitureId !== null && isolatedFurnitureId !== furnitureId;

    if (isExcludedByIsolation) {
      setIsolatedFurnitureId(null);
      setHiddenFurnitureIds((current) => current.filter((id) => id !== furnitureId));
      return;
    }

    const isHidden = hiddenFurnitureIds.includes(furnitureId);
    if (isHidden) {
      setHiddenFurnitureIds((current) => current.filter((id) => id !== furnitureId));
      return;
    }

    setHiddenFurnitureIds((current) => [...current, furnitureId]);
    if (selectedFurnitureId === furnitureId) {
      setSelectedFurnitureId(null);
      setSelectedPartId(null);
    }
    if (isolatedFurnitureId === furnitureId) {
      setIsolatedFurnitureId(null);
    }
  }

  function toggleSceneIsolation() {
    if (!selectedFurnitureId) return;
    setHiddenFurnitureIds((current) => current.filter((id) => id !== selectedFurnitureId));
    setIsolatedFurnitureId((current) =>
      current === selectedFurnitureId ? null : selectedFurnitureId
    );
  }

  function restoreSceneVisibility() {
    setHiddenFurnitureIds([]);
    setIsolatedFurnitureId(null);
  }

  function focusProductionFurniture(furnitureId: string) {
    focusSceneFurniture(furnitureId);
  }

  function saveProject() {
    const json = serializeProjectFile(
      {
        width: roomWidth,
        length: roomLength,
        height: roomHeight,
      },
      furniture,
      undefined,
      materials
    );
    const file = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    const safeProjectName =
      projectName
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, " ")
        .slice(0, 80) || "MobilyaCAD-Proje";

    link.href = url;
    link.download = `${safeProjectName}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSavedProjectSnapshot(projectSnapshot);
    setDocumentSource("exported");
  }

  async function loadProject(event: ChangeEvent<HTMLInputElement>): Promise<boolean> {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = "";
      return false;
    }

    if (
      hasUnsavedChanges &&
      !window.confirm("Kaydedilmemiş değişiklikler var. Açacağın proje mevcut çalışmanın yerini alacak. Devam edilsin mi?")
    ) {
      event.target.value = "";
      return false;
    }

    try {
      const project = parseProjectFile(await file.text());

      setRoomWidth(project.room.width);
      setRoomLength(project.room.length);
      setRoomHeight(project.room.height);
      setFurniture(project.furniture);
      setMaterials(project.materials ?? []);
      setHiddenFurnitureIds([]);
      setIsolatedFurnitureId(null);
      setSelectedFurnitureId(null);
      setSelectedPartId(null);
      setInspectorTab("room");
      setLeftPanelMode("scene");
      setCollapsedSceneFurnitureIds([]);
      setDimensionDraft(null);
      setMobilePanel(null);
      setProjectName(file.name.replace(/\.[^.]+$/, "").trim() || "İçe Aktarılan Tasarım");
      setDocumentSource("imported");
      setSavedProjectSnapshot(
        serializeProjectFile(
          { width: project.room.width, length: project.room.length, height: project.room.height },
          project.furniture,
          "snapshot",
          project.materials ?? []
        )
      );
      return true;
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Proje dosyası okunamadı."
      );
      return false;
    } finally {
      event.target.value = "";
    }
  }

  function deleteFurniture() {
    setFurniture((previous) =>
      previous.filter((item) => item.id !== selectedFurnitureId)
    );
    setHiddenFurnitureIds((current) => current.filter((id) => id !== selectedFurnitureId));
    setIsolatedFurnitureId((current) => current === selectedFurnitureId ? null : current);

    setSelectedFurnitureId(null);
    setSelectedPartId(null);
  }

  useEffect(() => {
    if (!workspaceOpen) {
      setShowShortcuts(false);
      return;
    }

    function handleWorkspaceShortcut(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey;
      const target = event.target;
      const isTextEntry = target instanceof HTMLElement && (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );

      if (event.key === "Escape" && showShortcuts) {
        setShowShortcuts(false);
        return;
      }

      if (hasModifier && key === "n") {
        event.preventDefault();
        startNewProject();
        return;
      }

      if (hasModifier && key === "k") {
        event.preventDefault();
        const searchInput = document.getElementById("cad-catalog-search") as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
        return;
      }

      if (hasModifier && key === "s") {
        event.preventDefault();
        saveProject();
        return;
      }

      if (hasModifier && key === "o") {
        event.preventDefault();
        document.getElementById("mobilyacad-project-file")?.click();
        return;
      }

      if (hasModifier || event.altKey || isTextEntry) return;

      if (key === "1") setTransformMode("translate");
      else if (key === "2") setTransformMode("scale");
      else if (key === "3") setTransformMode("rotate");
      else if (event.key === "?") setShowShortcuts((current) => !current);
    }

    window.addEventListener("keydown", handleWorkspaceShortcut);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcut);
  }, [workspaceOpen, showShortcuts, saveProject]);

  const sidebarStyle = {
    "--sidebar-width": "278px",
    "--sidebar-width-icon": "52px",
  } as CSSProperties;

  return (
    <TooltipProvider>
      {!workspaceOpen ? (
        <div className="atelier-home">
          <header className="atelier-homebar">
            <MobilyaCadLogo className="atelier-brand-lockup" descriptor="STUDIO" />
            <nav className="atelier-home-nav" aria-label="Stüdyo bölümleri">
              <a className="active" href="#studio-home">Stüdyo</a>
              <a href="#templates">Başlangıç</a>
              <a href="#recent">Son projeler</a>
            </nav>
            <div className="atelier-profile">
              <span className="atelier-profile-indicator" aria-hidden="true" />
              <div><b>TASARIM STÜDYOSU</b><small>Mobilya · Bileşen · Üretim</small></div>
            </div>
          </header>
          <main className="atelier-home-main" id="studio-home">
            <section className="atelier-welcome">
              <div className="atelier-welcome-copy">
                <span className="atelier-eyebrow">MOBİLYA TASARIM STÜDYOSU / 01</span>
                <h1>Fikrini çiz.<br/><em>Üretime dönüştür.</em></h1>
                <p>Mobilya, bileşen ve üretim projelerini tek bir tasarım alanında oluştur. İstediğin ölçekte başla, detayları sen belirle.</p>
                <div className="atelier-welcome-actions">
                  <Button className="atelier-primary-action" onClick={() => startNewProject()}><Plus /> Yeni tasarım başlat <span>↗</span></Button>
                  <label className="atelier-open-action" htmlFor="atelier-open-project">Proje dosyası aç <span>↗</span></label>
                  <input id="atelier-open-project" type="file" accept=".json,application/json" hidden onChange={(event) => { void loadProject(event).then((loaded) => { if (loaded) startWorkspace(); }); }} />
                </div>
              </div>

            </section>
            <section className="atelier-section atelier-start-section" id="templates">
              <div className="atelier-section-heading"><div><span className="atelier-eyebrow">BAŞLANGIÇ NOKTASI</span><h2>Ne tasarlıyoruz?</h2></div><span className="atelier-section-note">Bir çalışma türü seçerek başla</span></div>
              <div className="atelier-start-grid">
                <button className="atelier-start-card atelier-start-card-wide" onClick={() => startNewProject()}><span className="atelier-card-number">01</span><div className="atelier-card-visual atelier-visual-furniture"><div className="mini-cabinet"><i></i><i></i><i></i></div></div><div className="atelier-card-copy"><b>Mobilya tasarımı</b><span>Dolap, masa, kitaplık ve özel ürünler</span></div><span className="atelier-card-arrow">↗</span></button>
                <button className="atelier-start-card" onClick={() => startNewProject("scene")}><span className="atelier-card-number">02</span><div className="atelier-card-visual atelier-visual-parts"><div className="mini-panels"><i></i><i></i><i></i></div></div><div className="atelier-card-copy"><b>Parça modelleme</b><span>Panel, profil ve bileşenler</span></div><span className="atelier-card-arrow">↗</span></button>
                <button className="atelier-start-card" onClick={() => startNewProject("catalog", "production")}><span className="atelier-card-number">03</span><div className="atelier-card-visual atelier-visual-production"><div className="mini-cut"><i></i><i></i><i></i><i></i></div></div><div className="atelier-card-copy"><b>Üretim hazırlığı</b><span>Kesim, malzeme ve imalat</span></div><span className="atelier-card-arrow">↗</span></button>
              </div>
            </section>
            <section className="atelier-bottom-row">
              <div className="atelier-recent" id="recent"><div className="atelier-section-heading"><div><span className="atelier-eyebrow">ÇALIŞMALARIN</span><h2>Son projeler</h2></div><button onClick={() => startNewProject()}>Yeni proje ↗</button></div><button className="atelier-empty-project" onClick={() => startNewProject()}><span className="atelier-empty-plus">＋</span><span><b>İlk projen burada başlayacak</b><small>Yeni bir tasarım alanı oluştur ve çalışmaya başla.</small></span><span className="atelier-empty-arrow">→</span></button></div>
            </section>
          </main>
          <footer className="atelier-home-footer"><span>MOBİLYACAD STUDIO <b>·</b> TASARIM VE ÜRETİM ORTAMI</span><span>ÖLÇÜYLE TASARLA. ÜRETİME HAZIRLA.</span></footer>
        </div>
      ) : (
      <div className="cad-app">
        <header className={`cad-topbar${workspaceMode === "production" ? " cad-topbar--production" : ""}`}>
          <div className="cad-brand">
            <MobilyaCadLogo className="cad-brand-lockup" tone="inverse" descriptor="DESIGN &amp; MANUFACTURING" />
          </div>

          <Separator orientation="vertical" className="cad-top-separator" />

          <div className="cad-document-name">
            <span className={`cad-document-dot${hasUnsavedChanges ? " cad-document-dot--dirty" : ""}`} />
            <span className="cad-document-title" title={projectName}>{projectName}</span>
            <span
              className={`cad-document-status cad-document-status--${hasUnsavedChanges ? "dirty" : documentSource}`}
              aria-hidden="true"
              title={documentStatusTitle}
            >
              {documentStatusLabel}
            </span>
          </div>
          <span
            className="cad-document-status-announcement"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {documentStatusLabel}
          </span>

          <div className="cad-top-actions">
            <Separator orientation="vertical" className="cad-top-separator" />

            <ToggleGroup
              value={[transformMode]}
              onValueChange={(values) => {
                const value = values[0];
                if (value === "translate" || value === "scale" || value === "rotate") {
                  setTransformMode(value);
                }
              }}
              className="cad-tool-toggle"
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem value="translate" aria-label="Taşı" aria-keyshortcuts="1">
                      <Move3D />
                      <span>Taşı</span>
                    </ToggleGroupItem>
                  }
                />
                <TooltipContent>Mobilyayı taşı</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem value="scale" aria-label="Boyutlandır" aria-keyshortcuts="2">
                      <Maximize2 />
                      <span>Boyutlandır</span>
                    </ToggleGroupItem>
                  }
                />
                <TooltipContent>Mobilyayı boyutlandır</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem value="rotate" aria-label="Döndür" aria-keyshortcuts="3">
                      <RotateCw />
                      <span>Döndür</span>
                    </ToggleGroupItem>
                  }
                />
                <TooltipContent>Mobilyayı döndür</TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </div>

          <div className="cad-top-right">
            <div className="cad-mode-indicator">
              <span />
              {workspaceMode === "production" ? "Üretim modu" : "Tasarım modu"}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cad-production-mode-button"
              aria-label={workspaceMode === "production" ? "Tasarım moduna dön" : "Üretim alanını aç"}
              title={workspaceMode === "production" ? "Tasarım moduna dön" : "Üretim alanını aç"}
              aria-pressed={workspaceMode === "production"}
              onClick={() => {
                if (workspaceMode === "production") {
                  setWorkspaceMode("design");
                  setInspectorTab("production");
                } else {
                  setWorkspaceMode("production");
                  setProductionSection("report");
                  setInspectorTab("production");
                }
              }}
            >
              {workspaceMode === "production" ? <ArrowLeft /> : <Factory />}
              <span>{workspaceMode === "production" ? "Modelleme" : "Üretim"}</span>
            </Button>
            <Button variant="ghost" size="sm" className="cad-home-button" aria-label="Stüdyoya dön" onClick={() => setWorkspaceOpen(false)}>
              <House />
              <span>Stüdyo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cad-new-project-button"
              aria-label="Yeni proje oluştur"
              aria-keyshortcuts="Control+N Meta+N"
              onClick={() => startNewProject()}
              title="Yeni proje oluştur"
            >
              <Plus />
              <span>Yeni</span>
            </Button>
            <input
              id="mobilyacad-project-file"
              type="file"
              accept=".json,application/json"
              onChange={loadProject}
              hidden
            />
            <Button
              variant="outline"
              className="cad-open-project-button"
              aria-label="JSON proje dosyası aç"
              aria-keyshortcuts="Control+O Meta+O"
              onClick={() => document.getElementById("mobilyacad-project-file")?.click()}
            >
              <BookOpen />
              <span>Proje Aç</span>
            </Button>
            <Button className="cad-save-button" aria-label="Projeyi JSON olarak indir" aria-keyshortcuts="Control+S Meta+S" onClick={saveProject}>
              <Save />
              <span>Projeyi İndir</span>
            </Button>
            <div className="cad-shortcut-anchor">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="cad-shortcut-trigger"
                      aria-label="Klavye kısayollarını göster"
                      aria-haspopup="dialog"
                      aria-expanded={showShortcuts}
                      aria-controls="cad-shortcuts-dialog"
                      onClick={() => setShowShortcuts((current) => !current)}
                    >
                      <Keyboard />
                    </Button>
                  }
                />
                <TooltipContent>Klavye kısayolları · ?</TooltipContent>
              </Tooltip>
              {showShortcuts && (
                <section
                  id="cad-shortcuts-dialog"
                  className="cad-shortcuts-panel"
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby="cad-shortcuts-title"
                >
                  <div className="cad-shortcuts-panel__header">
                    <div>
                      <strong id="cad-shortcuts-title">Klavye kısayolları</strong>
                      <span>Çalışma alanında daha hızlı ilerle</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Kısayol penceresini kapat"
                      onClick={() => setShowShortcuts(false)}
                    >
                      <X />
                    </Button>
                  </div>
                  <div className="cad-shortcuts-list">
                    <div><span>Yeni proje oluştur</span><kbd>Ctrl / ⌘ N</kbd></div>
                    <div><span>Kütüphanede ara</span><kbd>Ctrl / ⌘ K</kbd></div>
                    <div><span>Projeyi JSON olarak indir</span><kbd>Ctrl / ⌘ S</kbd></div>
                    <div><span>JSON proje dosyası aç</span><kbd>Ctrl / ⌘ O</kbd></div>
                    <div><span>Taşıma aracını seç</span><kbd>1</kbd></div>
                    <div><span>Boyutlandırma aracını seç</span><kbd>2</kbd></div>
                    <div><span>Döndürme aracını seç</span><kbd>3</kbd></div>
                    <div><span>Bu yardımı aç / kapat</span><kbd>?</kbd></div>
                  </div>
                  <p className="cad-shortcuts-note">1, 2 ve 3 kısayolları metin alanlarında yazı yazarken devre dışıdır.</p>
                </section>
              )}
            </div>
          </div>
        </header>

        {workspaceMode === "production" ? (
          <ProductionWorkspace
            section={productionSection}
            onSectionChange={setProductionSection}
            onBackToDesign={() => {
              setFocusRequestId(0);
              setWorkspaceMode("design");
              setInspectorTab("production");
            }}
            furnitureCount={furniture.length}
            partCount={productionParts.length}
            supportedFurnitureCount={projectProduction.supportedFurnitureCount}
            unsupportedCount={projectProduction.unsupportedFurniture.length}
            documentStatusLabel={documentStatusLabel}
            exportBlockReason={productionExportBlockReason}
          >
            {productionSection === "report" ? (
              <>
                {selectedFurniture &&
                  isSupportedCabinetCatalogItem(selectedCatalogItem) &&
                  selectedFurniture.drawerCount > 0 && (
                    <DrawerBoxConfigurator
                      key={selectedFurniture.id}
                      furnitureId={selectedFurniture.id}
                      expectedDrawerCount={selectedFurniture.drawerCount}
                      configs={selectedFurniture.drawerBoxSpecs ?? []}
                      materials={materials}
                      onChange={(drawerBoxSpecs) =>
                        setFurniture((previous) =>
                          previous.map((item) =>
                            item.id === selectedFurniture.id
                              ? { ...item, drawerBoxSpecs }
                              : item
                          )
                        )
                      }
                    />
                  )}
                <ProductionOverview
                  furnitureCount={furniture.length}
                  selectedFurnitureId={selectedFurnitureId}
                  onFocusFurniture={focusProductionFurniture}
                  production={projectProduction}
                  edgeBanding={edgeBandingSummary}
                  materialConsumption={materialConsumptionSummary}
                  onExport={exportProductionCsv}
                />
              </>
            ) : (
              <MaterialCatalogManager
                materials={materials}
                referencedMaterialIds={referencedMaterialIds}
                usageByMaterialId={materialUsageById}
                onSelectUsage={focusSceneFurniture}
                onChange={updateMaterials}
              />
            )}
          </ProductionWorkspace>
        ) : (
        <SidebarProvider
          defaultOpen
          style={sidebarStyle}
          className={`cad-workspace${mobilePanel === "catalog" ? " mobile-catalog-open" : mobilePanel === "inspector" ? " mobile-inspector-open" : ""}${leftDockCollapsed ? " cad-workspace--left-collapsed" : ""}`}
        >
          <Sidebar
            id="cad-left-dock"
            role="region"
            aria-label="Kütüphane ve sahne paneli"
            aria-hidden={mobileCatalogHidden}
            inert={mobileCatalogHidden}
            collapsible="none"
            className="cad-sidebar"
          >
            <SidebarHeader className="cad-sidebar-header">
              <div className="cad-sidebar-heading">
                <div className="cad-sidebar-heading-icon">
                  <Package />
                </div>
                <div>
                  <strong>Mobilya Kütüphanesi</strong>
                  <span>ÖLÇÜ VARYANTLI MODELLER</span>
                </div>
                <span className="cad-library-count">
                  {furnitureCatalog.length}
                </span>
              </div>

              <div className="cad-search">
                <Search />
                <Input
                  id="cad-catalog-search"
                  aria-keyshortcuts="Control+K Meta+K"
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Model veya mobilya ara..."
                />
                <kbd>Ctrl K</kbd>
              </div>
            </SidebarHeader>

            <SidebarSeparator />

            <div className="studio-sidebar-switch" role="tablist" aria-label="Sol panel görünümü">
            <button type="button" role="tab" aria-selected={leftPanelMode === "catalog"} className={leftPanelMode === "catalog" ? "active" : ""} onClick={() => setLeftPanelMode("catalog")}><Package /> Kütüphane</button>
            <button type="button" role="tab" aria-selected={leftPanelMode === "scene"} className={leftPanelMode === "scene" ? "active" : ""} onClick={() => setLeftPanelMode("scene")}><Layers3 /> Sahne ağacı <span>{furniture.length}</span></button>
          </div>
          <SidebarContent className="cad-sidebar-content">
            {leftPanelMode === "catalog" ? (
              <>

              <SidebarGroup>
                <SidebarGroupLabel>KATEGORİLER</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {catalogCategories.map((category) => (
                      <SidebarMenuItem key={category}>
                        <SidebarMenuButton
                          isActive={selectedCategory === category}
                          onClick={() => setSelectedCategory(category)}
                          tooltip={
                            category === "Tümü"
                              ? "Tüm modeller"
                              : categoryLabels[category] || category
                          }
                        >
                          {category === "Tümü" ? (
                            <Layers3 />
                          ) : category === "kitchen" ? (
                            <CookingPot />
                          ) : category === "wardrobe" ? (
                            <DoorOpen />
                          ) : category === "desk" ? (
                            <Monitor />
                          ) : category === "bookcase" ? (
                            <BookOpen />
                          ) : category === "tv-unit" ? (
                            <Table2 />
                          ) : (
                            <Box />
                          )}
                          <span>
                            {category === "Tümü"
                              ? "Tüm Modeller"
                              : categoryLabels[category] || category}
                          </span>
                          <span className="cad-category-count">
                            {category === "Tümü"
                              ? furnitureCatalog.length
                              : furnitureCatalog.filter(
                                  (item) => item.category === category
                                ).length}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />

              <SidebarGroup className="cad-model-group">
                <div className="cad-model-heading">
                  <SidebarGroupLabel>MODEL KÜTÜPHANESİ</SidebarGroupLabel>
                  <span>{filteredFurnitureCatalog.length} model</span>
                </div>

                <SidebarGroupContent>
                  <ScrollArea className="cad-catalog-scroll">
                    <div className="cad-catalog-grid">
                      {filteredFurnitureCatalog.map((item, index) => (
                        <FurnitureCatalogCard
                          key={item.id}
                          item={item}
                          index={index}
                          onAdd={() => addFurniture(item.id)}
                          onDragStart={() => setCatalogDragActive(true)}
                          onDragEnd={() => setCatalogDragActive(false)}
                        />
                      ))}
                    </div>

                    {filteredFurnitureCatalog.length === 0 && (
                      <p className="cad-empty-state">
                        Aramanızla eşleşen model bulunamadı.
                      </p>
                    )}
                  </ScrollArea>
                </SidebarGroupContent>
              </SidebarGroup>
            
              </>
            ) : (
              <div className="studio-scene-tree">
                <div className="studio-tree-heading">
                  <span>PROJE HİYERARŞİSİ</span>
                  <div className="studio-tree-heading-actions">
                    <small>{filteredSceneFurniture.length} / {furniture.length} MOBİLYA</small>
                    <button
                      type="button"
                      className={isolatedFurnitureId === selectedFurnitureId && selectedFurnitureId ? "studio-tree-isolate is-active" : "studio-tree-isolate"}
                      disabled={!selectedFurnitureId}
                      aria-label={isolatedFurnitureId === selectedFurnitureId ? "Yalıtılmış görünümü kapat" : "Seçili mobilyayı yalıt"}
                      aria-pressed={Boolean(selectedFurnitureId && isolatedFurnitureId === selectedFurnitureId)}
                      title={!selectedFurnitureId ? "Önce bir mobilya seç" : isolatedFurnitureId === selectedFurnitureId ? "Yalıtılmış görünümü kapat" : "Yalnızca seçili mobilyayı göster"}
                      onClick={toggleSceneIsolation}
                    >
                      <Focus aria-hidden="true" />
                    </button>
                    {(hiddenFurnitureCount > 0 || isolatedFurnitureId !== null) && (
                      <button
                        type="button"
                        className="studio-tree-restore-visibility"
                        aria-label="Tüm mobilyaları görünür yap"
                        title="Tüm mobilyaları görünür yap"
                        onClick={restoreSceneVisibility}
                      >
                        <Eye aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="studio-tree-toggle-all"
                      disabled={furniture.length === 0 || normalizedSceneSearch.length > 0}
                      aria-label={allSceneFurnitureCollapsed ? "Tüm mobilya gruplarını aç" : "Tüm mobilya gruplarını daralt"}
                      title={normalizedSceneSearch ? "Arama sonuçları açık tutulur" : allSceneFurnitureCollapsed ? "Tüm grupları aç" : "Tüm grupları daralt"}
                      onClick={() => setCollapsedSceneFurnitureIds(
                        allSceneFurnitureCollapsed ? [] : furniture.map((item) => item.id)
                      )}
                    >
                      <ChevronsUpDown />
                    </button>
                  </div>
                </div>

                <div className="studio-tree-search">
                  <Search aria-hidden="true" />
                  <Input
                    id="cad-scene-search"
                    value={sceneSearch}
                    onChange={(event) => setSceneSearch(event.target.value)}
                    placeholder="Mobilya, parça veya malzeme ara..."
                    aria-label="Sahne ağacında mobilya, parça, malzeme veya dekor ara"
                  />
                  {sceneSearch && (
                    <button
                      type="button"
                      aria-label="Sahne aramasını temizle"
                      title="Aramayı temizle"
                      onClick={() => setSceneSearch("")}
                    >
                      <X />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="studio-tree-room"
                  onClick={() => {
                    setSelectedFurnitureId(null);
                    setSelectedPartId(null);
                    setIsolatedFurnitureId(null);
                  }}
                >
                  <House />
                  <span>
                    <strong>Çalışma odası</strong>
                    <small>{roomWidth} × {roomLength} × {roomHeight} mm</small>
                  </span>
                </button>

                <div className="studio-tree-branch">
                  <span className="studio-tree-branch-label">
                    MOBİLYALAR <b>{filteredSceneFurniture.length} / {furniture.length}</b>
                  </span>
                  {furniture.length === 0 ? (
                    <div className="studio-tree-empty">
                      <Layers3 />
                      <strong>Sahne henüz boş</strong>
                      <span>Kütüphaneden bir model ekleyerek başla.</span>
                      <button type="button" onClick={() => setLeftPanelMode("catalog")}>Kütüphaneyi aç</button>
                    </div>
                  ) : filteredSceneFurniture.length === 0 ? (
                    <div className="studio-tree-empty studio-tree-empty-search" role="status">
                      <Search />
                      <strong>Eşleşen nesne bulunamadı</strong>
                      <span>Mobilya, parça adı, malzeme veya dekor etiketiyle tekrar ara.</span>
                      <button type="button" onClick={() => setSceneSearch("")}>Aramayı temizle</button>
                    </div>
                  ) : (
                    filteredSceneFurniture.map((item) => {
                      const itemMaterial = resolveSceneMaterial(
                        item.material,
                        materials,
                        item.materialId
                      );
                      const itemMatches = normalizedSceneSearch.length === 0 ||
                        item.name.toLocaleLowerCase("tr-TR").includes(normalizedSceneSearch) ||
                        matchesSceneMaterialSearch(
                          item.material,
                          materials,
                          normalizedSceneSearch,
                          item.materialId
                        );
                      const visibleParts = normalizedSceneSearch.length === 0 || itemMatches
                        ? item.parts
                        : item.parts.filter((part) =>
                            part.name.toLocaleLowerCase("tr-TR").includes(normalizedSceneSearch) ||
                            matchesSceneMaterialSearch(part.material, materials, normalizedSceneSearch)
                          );
                      const isExpanded = normalizedSceneSearch.length > 0 ||
                        !collapsedSceneFurnitureIds.includes(item.id);
                      const isManuallyHidden = hiddenFurnitureIds.includes(item.id);
                      const isExcludedByIsolation =
                        isolatedFurnitureId !== null && isolatedFurnitureId !== item.id;
                      const isHidden = isManuallyHidden || isExcludedByIsolation;

                      return (
                        <div
                          className={`studio-tree-object${isHidden ? " is-hidden" : ""}${isExcludedByIsolation ? " is-isolated-out" : ""}`}
                          key={item.id}
                        >
                          <div className="studio-tree-object-row">
                            <button
                              type="button"
                              className={"studio-tree-object-select" + (selectedFurnitureId === item.id && !selectedPartId ? " selected" : "")}
                              aria-label={item.name + " mobilyasını seç ve 3D sahnede odakla"}
                              title={isHidden ? "Mobilyayı görünür yap, seç ve 3D sahnede odakla" : "Mobilyayı seç ve 3D sahnede odakla"}
                              onClick={() => focusSceneFurniture(item.id)}
                            >
                              <Box />
                              <span>
                                <strong>{item.name}</strong>
                                <small>{item.width} × {item.height} × {item.depth} mm</small>
                                <small className="studio-tree-material-line" title={itemMaterial.name || "Malzeme atanmadı"}>
                                  <span className={`studio-tree-material-source is-${itemMaterial.source}`}>
                                    {sceneMaterialSourceLabels[itemMaterial.source]}
                                  </span>
                                  <span className="studio-tree-material-name">
                                    {itemMaterial.name || "Malzeme atanmadı"}
                                  </span>
                                </small>
                              </span>
                              <em>{item.parts.length}</em>
                            </button>
                            <button
                              type="button"
                              className={isHidden ? "studio-tree-visibility-toggle is-hidden" : "studio-tree-visibility-toggle"}
                              aria-label={isHidden ? item.name + " mobilyasını görünür yap" : item.name + " mobilyasını gizle"}
                              aria-pressed={!isHidden}
                              title={isHidden ? "Görünür yap" : "Sahnede gizle"}
                              onClick={() => toggleFurnitureVisibility(item.id)}
                            >
                              {isHidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                            </button>
                            <button
                              type="button"
                              className="studio-tree-disclosure"
                              disabled={normalizedSceneSearch.length > 0}
                              aria-expanded={isExpanded}
                              aria-label={item.name + " parçalarını " + (isExpanded ? "daralt" : "genişlet")}
                              title={normalizedSceneSearch ? "Arama sonuçları açık tutulur" : isExpanded ? "Parçaları daralt" : "Parçaları genişlet"}
                              onClick={() => setCollapsedSceneFurnitureIds((current) =>
                                current.includes(item.id)
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id]
                              )}
                            >
                              {isExpanded ? <ChevronDown /> : <ChevronRight />}
                            </button>
                          </div>
                          {isExpanded && visibleParts.length > 0 && (
                            <div className="studio-tree-object-parts">
                              {visibleParts.map((part) => {
                                const inheritsFurnitureMaterial =
                                  part.material.trim().toLocaleLowerCase("tr-TR") ===
                                  item.material.trim().toLocaleLowerCase("tr-TR");
                                const partMaterial = resolveSceneMaterial(
                                  part.material,
                                  materials,
                                  inheritsFurnitureMaterial ? item.materialId : undefined
                                );

                                return (
                                  <button
                                    type="button"
                                    className={selectedFurnitureId === item.id && selectedPartId === part.id ? "studio-tree-part selected" : "studio-tree-part"}
                                    key={part.id}
                                    aria-label={item.name + " içindeki " + part.name + " parçasını seç ve sahnede odakla. Malzeme: " + (partMaterial.name || "atanmamış") + ". " + sceneMaterialSourceLabels[partMaterial.source]}
                                    title={part.name + " · " + (partMaterial.name || "Malzeme atanmadı") + " · " + sceneMaterialSourceLabels[partMaterial.source]}
                                    onClick={() => focusSceneFurniture(item.id, part.id)}
                                  >
                                    <span className="studio-tree-part-line" />
                                    <span className="studio-tree-part-type-icon" aria-hidden="true">
                                      {part.type === "door" ? <DoorOpen /> : part.type === "drawer" ? <Package /> : part.type === "shelf" ? <Layers3 /> : <PanelLeft />}
                                    </span>
                                    <span className="studio-tree-part-copy">
                                      <span className="studio-tree-part-name">{part.name}</span>
                                      <small className="studio-tree-material-line studio-tree-part-material">
                                        <span className={`studio-tree-material-source is-${partMaterial.source}`}>
                                          {sceneMaterialSourceLabels[partMaterial.source]}
                                        </span>
                                        <span className="studio-tree-material-name">
                                          {partMaterial.name || "Malzeme atanmadı"}
                                        </span>
                                        {inheritsFurnitureMaterial && (
                                          <span className="studio-tree-material-inheritance">VARSAYILAN</span>
                                        )}
                                      </small>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </SidebarContent>
          </Sidebar>

          <div className={`cad-main-area${bottomDockCollapsed ? " has-collapsed-production-dock" : ""}`}>
            <div className="studio-workspace-heading">
              <div className="studio-breadcrumb" aria-label="Proje konumu">
                <span>PROJELER</span>
                <i aria-hidden="true">/</i>
                <strong title={projectName}>{projectName}</strong>
                <b
                  className={hasUnsavedChanges ? "is-dirty" : "is-saved"}
                  style={{
                    background: hasUnsavedChanges ? "rgba(195, 148, 112, .16)" : "rgba(120, 169, 209, .14)",
                    color: hasUnsavedChanges ? "#d9aa84" : "#a8cbe2",
                  }}
                  aria-live="polite"
                  title={documentStatusTitle}
                >
                  <span aria-hidden="true">{hasUnsavedChanges ? "●" : "✓"}</span> {documentStatusLabel}
                </b>
              </div>
              <div className="studio-heading-actions"><span className="studio-live-indicator"><i /> 3D MOTOR AKTİF</span><span className="studio-heading-divider" /><span>{furniture.length} nesne · {productionParts.length} üretim parçası</span></div>
            </div>
            <div className="cad-viewport-toolbar">
              <div className="cad-viewport-title">
                <span className="cad-viewport-title-icon"><BoxSelect /></span>
                <div><strong>Modelleme alanı</strong><small>ORTOGRAFİK / 3 BOYUTLU SAHNE</small></div>
              </div>
              <div className="studio-viewport-actions" role="group" aria-label="3D görünüm ve panel araçları">
                <span className="studio-view-label">DÖNÜŞÜM</span>
                <div className="studio-transform-tools" role="group" aria-label="Nesne dönüştürme">
                  <button type="button" aria-pressed={transformMode === "translate"} className={transformMode === "translate" ? "active" : ""} onClick={() => setTransformMode("translate")}><Move3D /> Taşı</button>
                  <button type="button" aria-pressed={transformMode === "scale"} className={transformMode === "scale" ? "active" : ""} onClick={() => setTransformMode("scale")}><Maximize2 /> Ölçekle</button>
                  <button type="button" aria-pressed={transformMode === "rotate"} className={transformMode === "rotate" ? "active" : ""} onClick={() => setTransformMode("rotate")}><RotateCw /> Döndür</button>
                </div>
                <span className="studio-heading-divider" aria-hidden="true" />
                <div className="studio-panel-tools" role="group" aria-label="Panel görünürlüğü">
                  <button type="button" className="studio-panel-toggle" aria-label={leftDockCollapsed ? "Sol paneli göster" : "Sol paneli gizle"} title={leftDockCollapsed ? "Sol paneli göster" : "Sol paneli gizle"} aria-pressed={!leftDockCollapsed} aria-expanded={!leftDockCollapsed} aria-controls="cad-left-dock" onClick={() => setLeftDockCollapsed((current) => !current)}><PanelLeft /></button>
                  <button type="button" className="studio-panel-toggle" aria-label={inspectorCollapsed ? "Özellik panelini göster" : "Özellik panelini gizle"} title={inspectorCollapsed ? "Özellik panelini göster" : "Özellik panelini gizle"} aria-pressed={!inspectorCollapsed} aria-expanded={!inspectorCollapsed} aria-controls="cad-inspector" onClick={() => setInspectorCollapsed((current) => !current)}><PanelRight /></button>
                </div>
                <span className="studio-unit-pill">MM</span>
              </div>
            </div>

            <div className={`cad-workspace-content${inspectorCollapsed ? " inspector-collapsed" : ""}`}>
              <main
                className={`cad-viewport${catalogDragActive ? " cad-viewport--drop-ready" : ""}`}
                onDragOver={(event) => {
                  if (event.dataTransfer.types.includes("application/x-mobilyacad-catalog-id")) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }
                }}
                onDrop={(event) => {
                  const catalogId = event.dataTransfer.getData("application/x-mobilyacad-catalog-id");
                  if (!catalogId) return;
                  event.preventDefault();
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * (roomWidth / 1000);
                  const z = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * (roomLength / 1000);
                  addFurniture(catalogId, [x, 0, z]);
                  setCatalogDragActive(false);
                }}
              >
                <div className="cad-viewport-info">
                  <span>MODEL ALANI</span>
                  <span>
                    {roomWidth} × {roomLength} × {roomHeight} mm
                  </span>
                </div>

                <Scene3D
                  width={roomWidth}
                  length={roomLength}
                  height={roomHeight}
                  furniture={furniture}
                  hiddenFurnitureIds={hiddenFurnitureIds}
                  isolatedFurnitureId={isolatedFurnitureId}
                  selectedFurnitureId={selectedFurnitureId}
                  selectedPartId={selectedPartId}
                  focusRequestId={focusRequestId}
                  transformMode={transformMode}
                  onSelectFurniture={setSelectedFurnitureId}
                  onSelectPart={(furnitureId, partId) => {
                    setSelectedFurnitureId(furnitureId);
                    setSelectedPartId(partId);
                  }}
                  onTransformChange={updateFurniturePosition}
                  onResize={resizeFurniture}
                  onRotate={updateFurnitureRotation}
                />

                <div className="cad-viewport-hint">
                  <MousePointer2 />
                  <span>{furniture.length === 0 ? "Sol panelden bir modül seçerek tasarıma başla" : "Nesneyi seç · Taşı, ölçekle veya döndür"}</span>
                </div>
                <div className="studio-canvas-footer"><span><i /> SAHNE GÖRÜNÜMÜ</span><span>GRID · SNAP 10 MM</span><span>{furniture.length} / {furnitureCatalog.length} MODÜL</span></div>
              </main>

              <aside id="cad-inspector" className="cad-inspector" aria-hidden={mobileInspectorHidden} inert={mobileInspectorHidden}>
                <div className="cad-inspector-header">
                  <div>
                    <strong>Özellikler</strong>
                    <span>NESNE VE PROJE AYARLARI</span>
                  </div>
                  <Settings2 />
                </div>

                <div className="flex min-w-0 items-center gap-2 border-b border-border/70 bg-muted/20 px-3 py-2" aria-live="polite">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    {selectedPart ? <Layers3 className="size-4" /> : selectedFurniture ? <Box className="size-4" /> : <House className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {selectedPart ? "Parça seçili" : selectedFurniture ? "Mobilya seçili" : "Oda düzenleme"}
                    </span>
                    <strong className="block truncate text-xs font-semibold text-foreground">
                      {selectedPart ? selectedPart.name : selectedFurniture ? selectedFurniture.name : "Çalışma alanı"}
                    </strong>
                  </div>
                  {selectedFurniture && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Mobilya ve parça seçimini temizle"
                      title="Seçimi temizle"
                      onClick={() => {
                        setSelectedPartId(null);
                        setSelectedFurnitureId(null);
                        setInspectorTab("room");
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>

                <Tabs
                  value={inspectorTab}
                  onValueChange={(value) => {
                    if (value === "room" || value === "furniture" || value === "production" || value === "materials") {
                      setInspectorTab(value);
                    }
                  }}
                  className="cad-inspector-tabs"
                >
                  <TabsList className="cad-inspector-tab-list">
                    <TabsTrigger value="room">
                      <House />
                      Oda
                    </TabsTrigger>
                    <TabsTrigger value="furniture">
                      <Box />
                      Mobilya
                    </TabsTrigger>
                    <TabsTrigger value="production">
                      <Ruler />
                      Üretim
                    </TabsTrigger>
                    <TabsTrigger value="materials">
                      <Package />
                      Malzeme
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="cad-inspector-scroll">
                    <TabsContent value="room" className="cad-tab-content cad-tab-content-room">
                      <section className="cad-property-section">
                        <div className="cad-section-heading">
                          <span>ODA ÖLÇÜLERİ</span>
                          <House />
                        </div>

                        <div className="cad-field">
                          <Label htmlFor="room-width">Genişlik</Label>
                          <div className="cad-input-with-unit">
                            <Input
                              id="room-width"
                              type="number"
                              min="100"
                              value={roomWidth}
                              onChange={(event) =>
                                setRoomWidth(Number(event.target.value))
                              }
                            />
                            <span>mm</span>
                          </div>
                        </div>

                        <div className="cad-field">
                          <Label htmlFor="room-length">Uzunluk</Label>
                          <div className="cad-input-with-unit">
                            <Input
                              id="room-length"
                              type="number"
                              min="100"
                              value={roomLength}
                              onChange={(event) =>
                                setRoomLength(Number(event.target.value))
                              }
                            />
                            <span>mm</span>
                          </div>
                        </div>

                        <div className="cad-field">
                          <Label htmlFor="room-height">Yükseklik</Label>
                          <div className="cad-input-with-unit">
                            <Input
                              id="room-height"
                              type="number"
                              min="100"
                              value={roomHeight}
                              onChange={(event) =>
                                setRoomHeight(Number(event.target.value))
                              }
                            />
                            <span>mm</span>
                          </div>
                        </div>
                      </section>

                      <Separator className="cad-section-separator" />

                      <section className="cad-property-section">
                        <div className="cad-section-heading">
                          <span>PROJE ÖZETİ</span>
                          <Layers />
                        </div>

                        <div className="cad-summary-row">
                          <span>Toplam mobilya</span>
                          <strong>{furniture.length}</strong>
                        </div>
                        <div className="cad-summary-row">
                          <span>Zemin alanı</span>
                          <strong>
                            {(roomWidth * roomLength / 1000000).toFixed(2)} m²
                          </strong>
                        </div>
                        <div className="cad-summary-row">
                          <span>Ölçü birimi</span>
                          <strong>Milimetre</strong>
                        </div>
                      </section>
                    </TabsContent>

                    <TabsContent value="furniture" className="cad-tab-content">
                      {selectedFurniture ? (
                        <>
                          <section className="cad-property-section">
                            <div className="cad-section-heading">
                              <span>SEÇİLİ MOBİLYA</span>
                              <Box />
                            </div>

                            <div className="cad-selected-object">
                              <div className="cad-selected-object-icon">
                                <Box />
                              </div>
                              <div>
                                <strong>{selectedFurniture.name}</strong>
                                <small>
                                  {selectedCatalogItem
                                    ? categoryLabels[selectedCatalogItem.category] ||
                                      selectedCatalogItem.category
                                    : "Mobilya"}
                                </small>
                              </div>
                            </div>

                            <div className="cad-dimension-fields">
                              {([
                                { field: "width", label: "Genişlik" },
                                { field: "height", label: "Yükseklik" },
                                { field: "depth", label: "Derinlik" },
                              ] as const).map(({ field, label }) => (
                                <div className="cad-dimension-field" key={field}>
                                  <Label>{label}</Label>
                                  <div className="cad-input-with-unit">
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        dimensionDraft?.id === selectedFurniture.id
                                          ? dimensionDraft.values[field]
                                          : String(selectedFurniture[field])
                                      }
                                      onChange={(event) => {
                                        const values =
                                          dimensionDraft?.id === selectedFurniture.id
                                            ? dimensionDraft.values
                                            : {
                                                width: String(selectedFurniture.width),
                                                height: String(selectedFurniture.height),
                                                depth: String(selectedFurniture.depth),
                                              };

                                        setDimensionDraft({
                                          id: selectedFurniture.id,
                                          values: {
                                            ...values,
                                            [field]: event.target.value,
                                          },
                                        });
                                      }}
                                      onBlur={(event) => {
                                        const value = Number(event.target.value);

                                        if (
                                          event.target.value.trim() !== "" &&
                                          Number.isFinite(value) &&
                                          value >= 100 &&
                                          value <= 280000
                                        ) {
                                          updateFurniture(field, value);
                                        }

                                        setDimensionDraft(null);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.currentTarget.blur();
                                        }
                                      }}
                                    />
                                    <span>mm</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <FurnitureTransformFields
                              furniture={selectedFurniture}
                              onPositionCommit={(position) =>
                                updateFurniturePosition(selectedFurniture.id, position)
                              }
                              onRotationCommit={(rotation) =>
                                updateFurnitureRotation(selectedFurniture.id, rotation)
                              }
                            />

                            <div className="cad-field">
                              <Label htmlFor="furniture-material">Malzeme kataloğu</Label>
                              <select
                                id="furniture-material"
                                className="cad-native-select"
                                value={selectedFurniture.materialId ?? ""}
                                onChange={(event) =>
                                  updateFurnitureMaterial(selectedFurniture.id, event.target.value)
                                }
                              >
                                <option value="">Serbest metin · {selectedFurniture.material}</option>
                                {materials.map((material) => (
                                  <option key={material.id} value={material.id}>
                                    {material.name}{material.decor ? " · " + material.decor : ""}
                                  </option>
                                ))}
                              </select>
                              <p className="cad-field-note">
                                Atanan malzeme desteklenen gövde kesim parçalarına uygulanır.
                                Gövde ve kullanılan arkalık kalınlıkları katalogda tanımlı olmalıdır.
                                Çekmece kutusu kendi malzeme ayarını korur.
                              </p>
                            </div>

                          </section>

                          <Separator className="cad-section-separator" />

                          {selectedPart && (
                            <>
                              <Separator className="cad-section-separator" />
                              <FurniturePartInspector
                                part={selectedPart}
                                materials={materials}
                                defaultMaterial={selectedFurniture?.material ?? selectedPart.material}
                                defaultMaterialId={selectedFurniture?.materialId}
                                materialUsage={selectedPartMaterialUsage}
                                onSelectUsage={focusSceneFurniture}
                                onFieldChange={updateSelectedPart}
                                onPositionChange={updateSelectedPartPosition}
                                onOpenMaterialLibrary={() => setInspectorTab("materials")}
                                onClearSelection={() => setSelectedPartId(null)}
                              />
                            </>
                          )}

                          <Button
                            variant="destructive"
                            className="cad-delete-button"
                            onClick={deleteFurniture}
                          >
                            <Trash2 />
                            Mobilyayı Sil
                          </Button>
                        </>
                      ) : (
                        <div className="cad-inspector-empty">
                          <div>
                            <Box />
                          </div>
                          <strong>Mobilya seçilmedi</strong>
                          <p>
                            Özelliklerini düzenlemek için 3D sahneden veya
                            proje listesinden bir mobilya seç.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="production" className="cad-tab-content">
                      <div className="mc-production-tab">
                        {selectedFurniture &&
                          isSupportedCabinetCatalogItem(selectedCatalogItem) &&
                          selectedFurniture.drawerCount > 0 && (
                            <DrawerBoxConfigurator
                              key={selectedFurniture.id}
                              furnitureId={selectedFurniture.id}
                              expectedDrawerCount={selectedFurniture.drawerCount}
                              configs={selectedFurniture.drawerBoxSpecs ?? []}
                              materials={materials}
                              onChange={(drawerBoxSpecs) =>
                                setFurniture((previous) =>
                                  previous.map((item) =>
                                    item.id === selectedFurniture.id
                                      ? { ...item, drawerBoxSpecs }
                                      : item
                                  )
                                )
                              }
                            />
                          )}

                        <ProductionOverview
                          furnitureCount={furniture.length}
                          selectedFurnitureId={selectedFurnitureId}
                          onFocusFurniture={focusProductionFurniture}
                          production={projectProduction}
                          edgeBanding={edgeBandingSummary}
                          materialConsumption={materialConsumptionSummary}
                          onExport={exportProductionCsv}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="materials" className="cad-tab-content">
                      <MaterialCatalogManager
                        materials={materials}
                        referencedMaterialIds={referencedMaterialIds}
                        usageByMaterialId={materialUsageById}
                        onSelectUsage={focusSceneFurniture}
                        onChange={updateMaterials}
                      />
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </aside>
            </div>
            <section className={`cad-bottom-dock${bottomDockCollapsed ? " is-collapsed" : ""}`} aria-label="Proje üretim ve parça paneli">
              <div className="cad-bottom-dock-header">
                <div className="cad-bottom-dock-title">
                  <span className="cad-dock-grip" />
                  <div><strong>Üretim masası</strong><small>PROJE VERİLERİ · CANLI HESAP</small></div>
                  <button
                    type="button"
                    className="cad-dock-collapse"
                    aria-label={bottomDockCollapsed ? "Üretim masasını genişlet" : "Üretim masasını daralt"}
                    title={bottomDockCollapsed ? "Üretim masasını genişlet" : "Üretim masasını daralt"}
                    aria-expanded={!bottomDockCollapsed}
                    aria-controls="cad-bottom-dock-body"
                    onClick={() => setBottomDockCollapsed((current) => !current)}
                  >
                    {bottomDockCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                  </button>
                </div>
                <div className="cad-bottom-dock-tabs" role="tablist" aria-label="Alt panel sekmeleri">
                  <button type="button" role="tab" aria-selected={bottomPanelTab === "parts"} className={bottomPanelTab === "parts" ? "active" : ""} onClick={() => { setBottomPanelTab("parts"); setBottomDockCollapsed(false); }}>Parça listesi <b>{productionParts.length}</b></button>
                  <button type="button" role="tab" aria-selected={bottomPanelTab === "materials"} className={bottomPanelTab === "materials" ? "active" : ""} onClick={() => { setBottomPanelTab("materials"); setBottomDockCollapsed(false); }}>Malzeme özeti <b>{materials.length}</b></button>
                  <button type="button" role="tab" aria-selected={bottomPanelTab === "issues"} className={bottomPanelTab === "issues" ? "active" : ""} onClick={() => { setBottomPanelTab("issues"); setBottomDockCollapsed(false); }}>Kontroller <b>{projectProduction.errors.length + projectProduction.blockedFurniture.length + projectProduction.unsupportedFurniture.length}</b></button>
                </div>
                <div className="cad-bottom-dock-metrics"><span>{furniture.length} mobilya</span><i /> <span>{productionParts.length} parça</span><i /> <span>{materials.length} malzeme</span></div>
              </div>
              <div id="cad-bottom-dock-body" className="cad-bottom-dock-body" hidden={bottomDockCollapsed}>
                {bottomPanelTab === "parts" && (productionParts.length > 0 ? (
                  <div className="cad-dock-table-wrap"><table className="cad-dock-table"><thead><tr><th>PARÇA</th><th>MOBİLYA</th><th>EN</th><th>BOY</th><th>KALINLIK</th><th>ADET</th><th>MALZEME</th></tr></thead><tbody>
                    {productionParts.slice(0, 80).map((part) => <tr key={part.id}><td><strong>{part.name}</strong></td><td>{projectProduction.furnitureNames.get(part.furnitureId) ?? "—"}</td><td>{part.width} mm</td><td>{part.length} mm</td><td>{part.thickness} mm</td><td>{part.quantity}</td><td>{part.material || "Atanmamış"}</td></tr>)}
                  </tbody></table></div>
                ) : <div className="cad-dock-empty"><Layers3 /><strong>Henüz üretim parçası yok</strong><span>Üretim hesabını görmek için desteklenen bir mutfak gövdesi ekle.</span></div>)}
                {bottomPanelTab === "materials" && (materials.length > 0 ? (
                  <div className="cad-dock-materials">{materials.slice(0, 12).map((material) => <div key={material.id}><span className="cad-material-swatch" /><strong>{material.name}</strong><small>{material.decor || "Dekor tanımlanmamış"}</small></div>)}</div>
                ) : <div className="cad-dock-empty"><Package /><strong>Malzeme kataloğu boş</strong><span>Sağdaki Malzeme sekmesinden proje malzemelerini yönetebilirsin.</span></div>)}
                {bottomPanelTab === "issues" && (
                  <div className="cad-dock-issues">
                    {furniture.length === 0 ? (
                      <div className="cad-dock-empty cad-dock-empty--waiting" role="status">
                        <span className="cad-dock-empty__eyebrow">VERİ BEKLENİYOR</span>
                        <strong>Henüz kontrol edilecek mobilya yok</strong>
                        <span>Üretim kontrolleri, sahneye mobilya eklendiğinde burada görünür.</span>
                      </div>
                    ) : [...projectProduction.errors, ...projectProduction.blockedFurniture, ...projectProduction.unsupportedFurniture].length === 0 ? (
                      <div className="cad-dock-empty cad-dock-empty--clear" role="status">
                        <span className="cad-dock-empty__eyebrow">DOĞRULAMA</span>
                        <strong>Üretim uyarısı bulunmuyor</strong>
                        <span>Mevcut üretim hesabında engel veya kapsam uyarısı yok.</span>
                      </div>
                    ) : (
                      [...projectProduction.errors, ...projectProduction.blockedFurniture, ...projectProduction.unsupportedFurniture]
                        .slice(0, 12)
                        .map((issue, index) => (
                          <div className="cad-dock-issue" key={issue.furnitureId + "-" + index}>
                            <b>{issue.furnitureName}</b>
                            <span>{issue.reason}</span>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </SidebarProvider>
        )}

        {workspaceMode === "design" && (
        <nav className="cad-mobile-toolbar" aria-label="Mobil çalışma araçları">
          <button type="button" onClick={() => setMobilePanel(mobilePanel === "catalog" ? null : "catalog")} aria-pressed={mobilePanel === "catalog"} aria-expanded={mobilePanel === "catalog"} aria-controls="cad-left-dock">
            <Package />
            <span>Katalog</span>
          </button>
          <button type="button" onClick={() => { setTransformMode("translate"); setMobilePanel(null); }} aria-pressed={transformMode === "translate"}>
            <Move3D />
            <span>Taşı</span>
          </button>
          <button type="button" onClick={() => { setTransformMode("scale"); setMobilePanel(null); }} aria-pressed={transformMode === "scale"}>
            <Maximize2 />
            <span>Boyut</span>
          </button>
          <button type="button" onClick={() => { setTransformMode("rotate"); setMobilePanel(null); }} aria-pressed={transformMode === "rotate"}>
            <RotateCw />
            <span>Döndür</span>
          </button>
          <button type="button" onClick={() => setMobilePanel(mobilePanel === "inspector" ? null : "inspector")} aria-pressed={mobilePanel === "inspector"} aria-expanded={mobilePanel === "inspector"} aria-controls="cad-inspector">
            <Settings2 />
            <span>Özellik</span>
          </button>
        </nav>
        )}

        <footer className="cad-statusbar">
          <div className="cad-status-item">
            <span className="cad-status-light" />
            Sistem hazır
          </div>
          <Separator orientation="vertical" />
          <div className="cad-status-item">
            <span>ODA</span>
            {roomWidth} × {roomLength} × {roomHeight} mm
          </div>
          <Separator orientation="vertical" />
          <div className="cad-status-item">
            <span>MOBİLYA</span>
            {furniture.length} nesne
          </div>
          <Separator orientation="vertical" />
          <div className="cad-status-item cad-status-selection">
            <span>SEÇİM</span>
            {selectedPart
              ? selectedPart.name
              : selectedFurniture
                ? selectedFurniture.name
                : "Seçim yok"}
          </div>
          <div className="cad-status-right">BİRİM: mm</div>
        </footer>
      </div>
      )}
    </TooltipProvider>
  );
}

export default App;