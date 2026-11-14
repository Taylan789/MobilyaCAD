import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import {
  Box,
  CookingPot,
  Layers,
  DoorOpen,
  BookOpen,
  Monitor,
  Table2,
  Undo2,
  Redo2,
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
  PanelLeft,
  MousePointer2,
  Layers3,
  DraftingCompass,
  AlertTriangle,
} from "lucide-react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

import Scene3D from "./components/viewport/Scene3D";
import { furnitureCatalog } from "./data/furnitureCatalog";
import {
  createPlacedFurniture,
  regenerateFurnitureParts
} from "./types/placedFurniture";
import type { PlacedFurniture } from "./types/placedFurniture";
import type { Furniture } from "./types/furniture";
import { calculateFurnitureParts } from "./engine/furnitureCalculator";
import type { CabinetConstructionRules } from "./types/construction/cabinetRules";
import {
  buildCutList,
  cutListToCsv,
  cutListToJson,
  summarizeCutList
} from "./engine/cutList";
import { calculateMaterialConsumption } from "./engine/materialCalculator";
import {
  createHistory,
  recordChange,
  undoChange,
  redoChange,
  canUndo,
  canRedo
} from "./engine/history";
import type { HistoryStack } from "./engine/history";
import {
  parseProject,
  serializeProject,
  projectFileName,
  duplicateProjectFurniture
} from "./engine/project";
import {
  validateFurnitureConstraints,
  defaultManufacturingConstraints
} from "./engine/manufacturingConstraints";
import { generateFrontElevationSvg } from "./engine/technicalDrawing";

const AUTOSAVE_KEY = "mobilyacad-autosave";

function App() {
  const [roomWidth, setRoomWidth] = useState(4000);
  const [roomLength, setRoomLength] = useState(5000);
  const [roomHeight, setRoomHeight] = useState(2800);

  const [furniture, setFurniture] = useState<PlacedFurniture[]>([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<"translate" | "scale" | "rotate">("translate");
  const [mobilePanel, setMobilePanel] = useState<"catalog" | "inspector" | null>(null);
  const [projectName, setProjectName] = useState("Yeni Tasarım");
  const [autosaveTime, setAutosaveTime] = useState<string | null>(null);
  const firstRenderRef = useRef(true);

  // Geri al / yinele geçmişi (sahne anlık görüntüleri).
  interface SceneSnapshot {
    furniture: PlacedFurniture[];
    roomWidth: number;
    roomLength: number;
    roomHeight: number;
  }

  const [history, setHistory] = useState<HistoryStack<SceneSnapshot>>(() =>
    createHistory()
  );

  function takeSnapshot(): SceneSnapshot {
    return { furniture, roomWidth, roomLength, roomHeight };
  }

  function recordSnapshot() {
    setHistory(previous => recordChange(previous, takeSnapshot()));
  }

  function undo() {
    const result = undoChange(history, takeSnapshot());
    if (!result) return;

    setHistory(result.stack);
    setFurniture(result.state.furniture);
    setRoomWidth(result.state.roomWidth);
    setRoomLength(result.state.roomLength);
    setRoomHeight(result.state.roomHeight);
    setSelectedPartId(null);
  }

  function redo() {
    const result = redoChange(history, takeSnapshot());
    if (!result) return;

    setHistory(result.stack);
    setFurniture(result.state.furniture);
    setRoomWidth(result.state.roomWidth);
    setRoomLength(result.state.roomLength);
    setRoomHeight(result.state.roomHeight);
    setSelectedPartId(null);
  }

  // Klavye kısayolları: Ctrl+Z geri al, Ctrl+Shift+Z / Ctrl+Y yinele.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();

      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Geri al sonrası seçili nesne yoksa seçimi temizler.
  useEffect(() => {
    if (
      selectedFurnitureId &&
      !furniture.some(item => item.id === selectedFurnitureId)
    ) {
      setSelectedFurnitureId(null);
    }
  }, [furniture, selectedFurnitureId]);

  // Uygulama açıldığında otomatik kayıttan kurtarma yapılır.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return;

      const project = parseProject(saved);
      setProjectName(project.projectName);
      setRoomWidth(project.room.width);
      setRoomLength(project.room.length);
      setRoomHeight(project.room.height);
      setFurniture(project.furniture);
    } catch {
      // Kurtarılamazsa varsayılan sahne kullanılır.
    }
  }, []);

  // Otomatik kaydetme: ilk render atlanır, kurtarma önce okunur.
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    try {
      const file = serializeProject(
        projectName,
        { width: roomWidth, length: roomLength, height: roomHeight },
        furniture
      );
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(file));
      setAutosaveTime(new Date().toLocaleTimeString("tr-TR"));
    } catch {
      // Yerel depolama kullanılamıyorsa otomatik kaydetme atlanır.
    }
  }, [projectName, roomWidth, roomLength, roomHeight, furniture]);

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
    drawerGap: 2,
    drawerBoxThickness: 12,
    drawerBottomThickness: 6,
    drawerFrontMaxHeight: 240,
  });

  const [dimensionDraft, setDimensionDraft] = useState<{
    id: string;
    values: { width: string; height: string; depth: string };
  } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [catalogSearch, setCatalogSearch] = useState("");

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

  const productionParts = selectedFurniture
    ? calculateFurnitureParts(
        {
          id: selectedFurniture.id,
          name: selectedFurniture.name,
          type: selectedCatalogItem?.type ?? "custom",
          width: selectedFurniture.width,
          height: selectedFurniture.height,
          depth: selectedFurniture.depth,
          positionX: selectedFurniture.position[0],
          positionY: selectedFurniture.position[1],
          positionZ: selectedFurniture.position[2],
          rotation: selectedFurniture.rotation,
          materialThickness: constructionRules.panelThickness,
          doorCount: selectedFurniture.doorCount,
          drawerCount: selectedFurniture.drawerCount,
          shelfCount: selectedFurniture.shelfCount,
          hasBackPanel: selectedFurniture.hasBackPanel,
          backThickness: selectedFurniture.backThickness,
          edgeBanding: selectedFurniture.edgeBanding,
          material: selectedFurniture.material,
        },
        constructionRules
      )
    : [];

  // Sahnedeki mobilyayı üretim motoru veri modeline çevirir.
  function toFurniture(item: PlacedFurniture): Furniture {
    const catalogItem = furnitureCatalog.find(
      product => product.id === item.catalogId
    );

    return {
      id: item.id,
      name: item.name,
      type: catalogItem?.type ?? "custom",
      width: item.width,
      height: item.height,
      depth: item.depth,
      positionX: item.position[0],
      positionY: item.position[1],
      positionZ: item.position[2],
      rotation: item.rotation,
      materialThickness: constructionRules.panelThickness,
      doorCount: item.doorCount,
      drawerCount: item.drawerCount,
      shelfCount: item.shelfCount,
      hasBackPanel: item.hasBackPanel,
      backThickness: item.backThickness,
      edgeBanding: item.edgeBanding,
      material: item.material
    };
  }

  const productionDrawing = selectedFurniture
    ? generateFrontElevationSvg(toFurniture(selectedFurniture), constructionRules)
    : "";

  const productionWarnings = selectedFurniture
    ? validateFurnitureConstraints(
        toFurniture(selectedFurniture),
        constructionRules,
        defaultManufacturingConstraints
      )
    : [];

  function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportProjectCutListCsv() {
    if (furniture.length === 0) return;

    const rows = buildCutList(
      furniture.map(toFurniture),
      constructionRules
    );

    downloadFile(
      cutListToCsv(rows),
      "mobilyacad-kesim-listesi.csv",
      "text/csv;charset=utf-8"
    );
  }

  function exportProjectCutListJson() {
    if (furniture.length === 0) return;

    const rows = buildCutList(
      furniture.map(toFurniture),
      constructionRules
    );

    downloadFile(
      cutListToJson(rows),
      "mobilyacad-kesim-listesi.json",
      "application/json"
    );
  }

  const projectCutList =
    furniture.length > 0
      ? buildCutList(
          furniture.map(toFurniture),
          constructionRules
        )
      : [];

  const projectConsumption = calculateMaterialConsumption(
    projectCutList.map(row => row.part)
  );

  const projectSummary = summarizeCutList(projectCutList);

  function addFurniture(catalogId: string) {
    const item = furnitureCatalog.find(
      (product) => product.id === catalogId
    );

    if (!item) return;

    const placed = createPlacedFurniture(item, [
      0,
      item.height / 2000,
      0,
    ]);

    recordSnapshot();
    setFurniture((previous) => [...previous, placed]);
    setSelectedFurnitureId(placed.id);
    setSelectedPartId(null);
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

    recordSnapshot();
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

  function updateFurniture(
    field: "width" | "height" | "depth",
    value: number
  ) {
    if (!selectedFurnitureId || !Number.isFinite(value) || value < 100) return;

    recordSnapshot();
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

        return regenerateFurnitureParts({
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
        });
      })
    );
  }

  function updateFurnitureRotation(id: string, rotation: number) {
    if (!Number.isFinite(rotation)) return;

    recordSnapshot();
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
    recordSnapshot();
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
    recordSnapshot();
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

        return regenerateFurnitureParts({
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
        });
      })
    );
  }
  // Oda ölçüsü değiştiğinde mobilyaları yeni sınırlara göre sabitler.
  function clampFurnitureToRoom(
    item: PlacedFurniture,
    roomW: number,
    roomL: number,
    roomH: number
  ): PlacedFurniture {
    const aci = (item.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(aci));
    const sin = Math.abs(Math.sin(aci));
    const genislik = item.width / 1000;
    const derinlik = item.depth / 1000;

    const yariGenislik = (cos * genislik + sin * derinlik) / 2;
    const yariDerinlik = (sin * genislik + cos * derinlik) / 2;

    const minX = -roomW / 2000 + yariGenislik;
    const maxX = roomW / 2000 - yariGenislik;
    const minZ = -roomL / 2000 + yariDerinlik;
    const maxZ = roomL / 2000 - yariDerinlik;
    const minY = item.height / 2000;
    const maxY = roomH / 1000 - item.height / 2000;

    return {
      ...item,
      position: [
        maxX >= minX
          ? Math.max(minX, Math.min(maxX, item.position[0]))
          : item.position[0],
        maxY >= minY
          ? Math.max(minY, Math.min(maxY, item.position[1]))
          : item.position[1],
        maxZ >= minZ
          ? Math.max(minZ, Math.min(maxZ, item.position[2]))
          : item.position[2],
      ],
    };
  }

  function updateRoomDimension(
    field: "width" | "length" | "height",
    value: number
  ) {
    if (!Number.isFinite(value) || value < 100) return;

    recordSnapshot();
    if (field === "width") setRoomWidth(value);
    if (field === "length") setRoomLength(value);
    if (field === "height") setRoomHeight(value);

    setFurniture((previous) =>
      previous.map((item) =>
        clampFurnitureToRoom(
          item,
          field === "width" ? value : roomWidth,
          field === "length" ? value : roomLength,
          field === "height" ? value : roomHeight
        )
      )
    );
  }

  function exportDrawingSvg() {
    if (!selectedFurniture || !productionDrawing) return;

    const safeName = selectedFurniture.name
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim()
      .slice(0, 60);

    downloadFile(
      productionDrawing,
      `mobilyacad-${safeName || "cizim"}-onu-yuz.svg`,
      "image/svg+xml"
    );
  }

  function exportProductionCsv() {
    if (!selectedFurniture || productionParts.length === 0) return;

    const escapeCsv = (value: string | number) => {
      const text = String(value);
      return /[;"\n\r]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    };

    const rows = [
      [
        "Mobilya",
        "Parça",
        "Genişlik (mm)",
        "Uzunluk (mm)",
        "Kalınlık (mm)",
        "Adet",
        "Malzeme",
        "Bant Üst",
        "Bant Alt",
        "Bant Sol",
        "Bant Sağ",
      ],
      ...productionParts.map((part) => [
        selectedFurniture.name,
        part.name,
        part.width,
        part.length,
        part.thickness,
        part.quantity,
        part.material,
        part.edgeBanding.top ? "Evet" : "Hayır",
        part.edgeBanding.bottom ? "Evet" : "Hayır",
        part.edgeBanding.left ? "Evet" : "Hayır",
        part.edgeBanding.right ? "Evet" : "Hayır",
      ]),
    ];

    const csv = "\uFEFF" + rows
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mobilyacad-kesim-listesi-${selectedFurniture.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function saveProject() {
    const project = serializeProject(
      projectName,
      { width: roomWidth, length: roomLength, height: roomHeight },
      furniture
    );

    const json = JSON.stringify(project, null, 2);
    const file = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${projectFileName(projectName)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function loadProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = parseProject(await file.text());

      recordSnapshot();
      setProjectName(parsed.projectName);
      setRoomWidth(parsed.room.width);
      setRoomLength(parsed.room.length);
      setRoomHeight(parsed.room.height);
      setFurniture(parsed.furniture as PlacedFurniture[]);
      setSelectedFurnitureId(null);
      setSelectedPartId(null);
      setDimensionDraft(null);
      setMobilePanel(null);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Proje dosyası okunamadı."
      );
    } finally {
      event.target.value = "";
    }
  }

  function renameProject() {
    const name = window.prompt("Proje adı:", projectName);

    if (name && name.trim().length > 0) {
      setProjectName(name.trim());
    }
  }

  function duplicateProject() {
    recordSnapshot();
    setFurniture((previous) => duplicateProjectFurniture(previous));
    setProjectName(`${projectName} (Kopya)`);
    setSelectedFurnitureId(null);
    setSelectedPartId(null);
  }

  function newProject() {
    if (!window.confirm("Yeni proje başlatılsın mı? Otomatik kaydedilmiş sahne değişir.")) {
      return;
    }

    recordSnapshot();
    setProjectName("Yeni Tasarım");
    setRoomWidth(4000);
    setRoomLength(5000);
    setRoomHeight(2800);
    setFurniture([]);
    setSelectedFurnitureId(null);
    setSelectedPartId(null);
    setDimensionDraft(null);
  }

  function deleteFurniture() {
    recordSnapshot();
    setFurniture((previous) =>
      previous.filter((item) => item.id !== selectedFurnitureId)
    );

    setSelectedFurnitureId(null);
    setSelectedPartId(null);
  }

  function getCatalogIcon(type: string) {
    if (type === "kitchen") return CookingPot;
    if (type === "wardrobe") return DoorOpen;
    if (type === "bookcase") return BookOpen;
    if (type === "desk") return Monitor;
    if (type === "tv-unit") return Table2;
    return Layers;
  }

  const sidebarStyle = {
    "--sidebar-width": "278px",
    "--sidebar-width-icon": "52px",
  } as CSSProperties;

  return (
    <TooltipProvider>
      <div className="cad-app">
        <header className="cad-topbar">
          <div className="cad-brand">
            <div className="cad-brand-mark">
              <svg viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 3L44 14V34L24 45L4 34V14L24 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M4 14L24 25L44 14M24 25V45"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M13 19.5V31L24 37L35 31V19.5"
                  stroke="#8DBCE3"
                  strokeWidth="2"
                />
                <path
                  d="M13 19.5L24 13L35 19.5L24 26L13 19.5Z"
                  fill="#5799D1"
                  fillOpacity="0.2"
                  stroke="#8DBCE3"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="cad-brand-copy">
              <strong>
                MOBİLYA<span>CAD</span>
              </strong>
              <small>DESIGN &amp; MANUFACTURING</small>
            </div>
          </div>

          <Separator orientation="vertical" className="cad-top-separator" />

          <div className="cad-document-name">
            <span className="cad-document-dot" />
            <button
              type="button"
              className="cad-document-name-button"
              onClick={renameProject}
              title="Proje adını değiştir"
            >
              {projectName}
            </button>
            <span className="cad-document-status">
              {autosaveTime
                ? `Otomatik kaydedildi ${autosaveTime}`
                : "Kaydedilmedi"}
            </span>
          </div>

          <div className="cad-top-actions">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canUndo(history)}
                    onClick={undo}
                  >
                    <Undo2 />
                  </Button>
                }
              />
              <TooltipContent>Geri al</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canRedo(history)}
                    onClick={redo}
                  >
                    <Redo2 />
                  </Button>
                }
              />
              <TooltipContent>Yinele</TooltipContent>
            </Tooltip>

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
                    <ToggleGroupItem value="translate" aria-label="Taşı">
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
                    <ToggleGroupItem value="scale" aria-label="Boyutlandır">
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
                    <ToggleGroupItem value="rotate" aria-label="Döndür">
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
              Tasarım modu
            </div>
            <input
              id="mobilyacad-project-file"
              type="file"
              accept=".json,application/json"
              onChange={loadProject}
              hidden
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("mobilyacad-project-file")?.click()}
            >
              Proje Aç
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" onClick={duplicateProject}>
                    Çoğalt
                  </Button>
                }
              />
              <TooltipContent>Projeyi kopyala</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" onClick={newProject}>
                    Yeni
                  </Button>
                }
              />
              <TooltipContent>Yeni proje</TooltipContent>
            </Tooltip>
            <Button className="cad-save-button" onClick={saveProject}>
              <Save />
              Projeyi İndir
            </Button>
          </div>
        </header>

        <SidebarProvider
          defaultOpen
          style={sidebarStyle}
          className={`cad-workspace${mobilePanel === "catalog" ? " mobile-catalog-open" : mobilePanel === "inspector" ? " mobile-inspector-open" : ""}`}
        >
          <Sidebar
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
                  <span>PARAMETRİK MODELLER</span>
                </div>
                <span className="cad-library-count">
                  {furnitureCatalog.length}
                </span>
              </div>

              <div className="cad-search">
                <Search />
                <Input
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Model veya mobilya ara..."
                />
                <kbd>⌘ K</kbd>
              </div>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent className="cad-sidebar-content">
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
                      {filteredFurnitureCatalog.map((item) => {
                        const Icon = getCatalogIcon(item.type);

                        return (
                          <button
                            key={item.id}
                            className="cad-catalog-card"
                            onClick={() => addFurniture(item.id)}
                            title={`${item.name} modelini odaya ekle`}
                          >
                            <span className="cad-catalog-card-icon">
                              <Icon />
                            </span>
                            <span className="cad-catalog-card-add">
                              <Plus />
                            </span>
                            <strong>{item.name}</strong>
                            <small>
                              {item.width} × {item.height} × {item.depth} mm
                            </small>
                          </button>
                        );
                      })}
                    </div>

                    {filteredFurnitureCatalog.length === 0 && (
                      <p className="cad-empty-state">
                        Aramanızla eşleşen model bulunamadı.
                      </p>
                    )}
                  </ScrollArea>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter className="cad-project-footer">
              <div className="cad-project-heading">
                <div>
                  <strong>Proje Nesneleri</strong>
                  <span>SAHNEDEKİ MOBİLYALAR</span>
                </div>
                <span>{furniture.length}</span>
              </div>

              <ScrollArea className="cad-project-scroll">
                <SidebarMenu>
                  {furniture.length === 0 && (
                    <p className="cad-empty-state">
                      Henüz odaya mobilya eklenmedi.
                    </p>
                  )}

                  {furniture.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={selectedFurnitureId === item.id}
                        onClick={() => {
                          setSelectedFurnitureId(item.id);
                          setSelectedPartId(null);
                        }}
                      >
                        <Box />
                        <span>{item.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </ScrollArea>
            </SidebarFooter>
          </Sidebar>

          <div className="cad-main-area">
            <div className="cad-viewport-toolbar">
              <div className="cad-viewport-title">
                <span className="cad-viewport-title-icon">
                  <House />
                </span>
                <div>
                  <strong>3D Çalışma Alanı</strong>
                  <small>MODELLEME / PERSPEKTİF</small>
                </div>
              </div>

              <div className="cad-viewport-tools">
                <span className="cad-view-label">GÖRÜNÜM</span>
                <Button variant="outline" size="sm">
                  <BoxSelect />
                  Perspektif
                </Button>
                <Button variant="ghost" size="icon" disabled>
                  <PanelLeft />
                </Button>
              </div>
            </div>

            <div className="cad-workspace-content">
              <main className="cad-viewport">
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
                  selectedFurnitureId={selectedFurnitureId}
                  selectedPartId={selectedPartId}
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
                  <span>
                    Katalogdan model ekle · Seçmek ve düzenlemek için nesneye tıkla
                  </span>
                </div>
              </main>

              <aside className="cad-inspector">
                <div className="cad-inspector-header">
                  <div>
                    <strong>Özellikler</strong>
                    <span>NESNE VE PROJE AYARLARI</span>
                  </div>
                  <Settings2 />
                </div>

                <Tabs defaultValue="room" className="cad-inspector-tabs">
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
                  </TabsList>

                  <ScrollArea className="cad-inspector-scroll">
                    <TabsContent value="room" className="cad-tab-content">
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
                                updateRoomDimension(
                                  "width",
                                  Number(event.target.value)
                                )
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
                                updateRoomDimension(
                                  "length",
                                  Number(event.target.value)
                                )
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
                                updateRoomDimension(
                                  "height",
                                  Number(event.target.value)
                                )
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

                            <div className="cad-field cad-rotation-field">
                              <Label htmlFor="furniture-rotation">Dönüş Açısı</Label>
                              <div className="cad-input-with-unit">
                                <Input
                                  id="furniture-rotation"
                                  type="number"
                                  min="0"
                                  max="359"
                                  step="1"
                                  value={selectedFurniture.rotation}
                                  onChange={(event) => {
                                    if (event.target.value.trim() !== "") {
                                      updateFurnitureRotation(
                                        selectedFurniture.id,
                                        Number(event.target.value)
                                      );
                                    }
                                  }}
                                />
                                <span>°</span>
                              </div>
                            </div>
                          </section>

                          <Separator className="cad-section-separator" />

                          {selectedPart && (
                            <section className="cad-property-section">
                              <div className="cad-section-heading">
                                <span>SEÇİLİ PARÇA</span>
                                <Layers3 />
                              </div>

                              <div className="cad-field">
                                <Label>Parça adı</Label>
                                <Input
                                  value={selectedPart.name}
                                  onChange={(event) =>
                                    updateSelectedPart("name", event.target.value)
                                  }
                                />
                              </div>

                              {([
                                { field: "width", label: "Genişlik" },
                                { field: "height", label: "Yükseklik" },
                                { field: "depth", label: "Derinlik" },
                              ] as const).map(({ field, label }) => (
                                <div className="cad-field" key={field}>
                                  <Label>{label} (mm)</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={selectedPart[field]}
                                    onChange={(event) => {
                                      const value = Number(event.target.value);
                                      if (value >= 1) {
                                        updateSelectedPart(field, value);
                                      }
                                    }}
                                  />
                                </div>
                              ))}

                              <div className="cad-field">
                                <Label>Malzeme</Label>
                                <select
                                  className="cad-native-select"
                                  value={selectedPart.material}
                                  onChange={(event) =>
                                    updateSelectedPart("material", event.target.value)
                                  }
                                >
                                  <option value="Suntalam">Suntalam</option>
                                  <option value="MDF">MDF</option>
                                  <option value="MDF Lam">MDF Lam</option>
                                  <option value="Kontrplak">Kontrplak</option>
                                  <option value="Masif Ahşap">Masif Ahşap</option>
                                  <option value="Lake">Lake</option>
                                </select>
                              </div>

                              <Button
                                variant="outline"
                                className="cad-full-button"
                                onClick={() => setSelectedPartId(null)}
                              >
                                Parça seçimini kaldır
                              </Button>

                              <p className="cad-field-note">
                                Parça bilgileri mobilya verisine kaydedilir.
                                3D ölçü bağlantısı sonraki aşamada yapılacaktır.
                              </p>
                            </section>
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
                      <section className="cad-property-section">
                        <div className="cad-section-heading">
                          <span>PROJE KESİM LİSTESİ</span>
                          <Layers3 />
                        </div>

                        <div className="cad-summary-row">
                          <span>Toplam parça adedi</span>
                          <strong>{projectSummary.totalPartCount}</strong>
                        </div>
                        <div className="cad-summary-row">
                          <span>Toplam panel alanı</span>
                          <strong>
                            {projectSummary.totalAreaSquareMeters.toFixed(2)} m²
                          </strong>
                        </div>
                        <div className="cad-summary-row">
                          <span>Toplam bant uzunluğu</span>
                          <strong>
                            {projectSummary.totalEdgeBandingLengthMm.toLocaleString(
                              "tr-TR"
                            )}{" "}
                            mm
                          </strong>
                        </div>
                        <div className="cad-summary-row">
                          <span>Farklı malzeme</span>
                          <strong>{projectSummary.distinctMaterials}</strong>
                        </div>

                        <div className="cad-production-actions">
                          <Button
                            className="cad-production-export"
                            variant="outline"
                            onClick={exportProjectCutListCsv}
                            disabled={furniture.length === 0}
                          >
                            Kesim Listesi CSV İndir
                          </Button>
                          <Button
                            className="cad-production-export"
                            variant="outline"
                            onClick={exportProjectCutListJson}
                            disabled={furniture.length === 0}
                          >
                            Kesim Listesi JSON İndir
                          </Button>
                        </div>

                        {furniture.length === 0 && (
                          <div className="cad-inspector-empty">
                            <div>
                              <Package />
                            </div>
                            <strong>Üretim verisi bulunmuyor</strong>
                            <p>
                              Odaya mobilya eklediğinizde kesim listesi burada
                              görüntülenir.
                            </p>
                          </div>
                        )}

                        {projectConsumption.byMaterial.length > 0 && (
                          <>
                            <Separator className="cad-section-separator" />
                            <div className="cad-section-heading">
                              <span>MALZEME TÜKETİMİ</span>
                              <Layers />
                            </div>
                            {projectConsumption.byMaterial.map(entry => (
                              <div
                                key={entry.material}
                                className="cad-production-card"
                              >
                                <strong>{entry.material}</strong>
                                <span>
                                  {entry.totalAreaSquareMeters.toFixed(2)} m² ·{" "}
                                  {entry.totalEdgeBandingLengthMm.toLocaleString(
                                    "tr-TR"
                                  )}{" "}
                                  mm bant
                                </span>
                                <small>{entry.partCount} parça</small>
                              </div>
                            ))}
                          </>
                        )}
                      </section>

                      <Separator className="cad-section-separator" />

                      <section className="cad-property-section">
                        <div className="cad-section-heading">
                          <span>SEÇİLİ MOBİLYA ÜRETİM PARÇALARI</span>
                          <Ruler />
                        </div>

                        {selectedFurniture && productionParts.length > 0 ? (
                          <>
                            <div className="cad-production-summary">
                              <span>Hesaplanan parça türü</span>
                              <strong>{productionParts.length}</strong>
                            </div>
                            <Button
                              className="cad-production-export"
                              variant="outline"
                              onClick={exportProductionCsv}
                              disabled={productionParts.length === 0}
                            >
                              Seçili Mobilya CSV İndir
                            </Button>

                            {productionParts.map((part) => (
                              <div
                                key={part.id}
                                className="cad-production-card"
                              >
                                <strong>{part.name}</strong>
                                <span>
                                  {part.width} × {part.length} × {part.thickness} mm
                                </span>
                                <small>Adet: {part.quantity}</small>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="cad-inspector-empty">
                            <div>
                              <Package />
                            </div>
                            <strong>Üretim verisi bulunmuyor</strong>
                            <p>
                              Seçili mobilya için hesaplanan üretim parçaları
                              burada görüntülenir.
                            </p>
                          </div>
                        )}
                      </section>

                      <Separator className="cad-section-separator" />

                      <section className="cad-property-section">
                        <div className="cad-section-heading">
                          <span>TEKNİK ÇİZİM</span>
                          <DraftingCompass />
                        </div>

                        {selectedFurniture && productionDrawing ? (
                          <>
                            <div
                              className="cad-drawing-viewer"
                              dangerouslySetInnerHTML={{
                                __html: productionDrawing
                              }}
                            />
                            <Button
                              className="cad-production-export"
                              variant="outline"
                              onClick={exportDrawingSvg}
                            >
                              Çizim SVG İndir
                            </Button>
                          </>
                        ) : (
                          <div className="cad-inspector-empty">
                            <div>
                              <DraftingCompass />
                            </div>
                            <strong>Çizim verisi bulunmuyor</strong>
                            <p>
                              Seçili mobilyanın ön yüz elevasyon çizimi burada
                              görüntülenir.
                            </p>
                          </div>
                        )}
                      </section>

                      <Separator className="cad-section-separator" />

                      <section className="cad-property-section">
                        <div className="cad-section-heading">
                          <span>ÜRETİM UYARILARI</span>
                          <AlertTriangle />
                        </div>

                        {selectedFurniture ? (
                          productionWarnings.length === 0 ? (
                            <div className="cad-summary-row">
                              <span>Üretim kısıtlamaları</span>
                              <strong>Tamam</strong>
                            </div>
                          ) : (
                            productionWarnings.map((warning, index) => (
                              <div
                                key={`${warning.partName}-${index}`}
                                className="cad-production-card cad-production-warning"
                              >
                                <strong>{warning.partName}</strong>
                                <span>{warning.message}</span>
                              </div>
                            ))
                          )
                        ) : (
                          <div className="cad-inspector-empty">
                            <div>
                              <AlertTriangle />
                            </div>
                            <strong>Üretim uyarısı yok</strong>
                            <p>
                              Seçili mobilya için üretim kısıtlaması kontrolleri
                              burada görüntülenir.
                            </p>
                          </div>
                        )}
                      </section>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </aside>
            </div>
          </div>
        </SidebarProvider>

        <nav className="cad-mobile-toolbar" aria-label="Mobil çalışma araçları">
          <button type="button" onClick={() => setMobilePanel(mobilePanel === "catalog" ? null : "catalog")} aria-pressed={mobilePanel === "catalog"}>
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
          <button type="button" onClick={() => setMobilePanel(mobilePanel === "inspector" ? null : "inspector")} aria-pressed={mobilePanel === "inspector"}>
            <Settings2 />
            <span>Özellik</span>
          </button>
        </nav>

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
    </TooltipProvider>
  );
}

export default App;