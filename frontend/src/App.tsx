import { useState } from "react";
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
import { createPlacedFurniture } from "./types/placedFurniture";
import type { PlacedFurniture } from "./types/placedFurniture";
import { calculateCabinetParts } from "./engine/cabinetParts";
import type { CabinetConstructionRules } from "./types/construction/cabinetRules";

function App() {
  const [roomWidth, setRoomWidth] = useState(4000);
  const [roomLength, setRoomLength] = useState(5000);
  const [roomHeight, setRoomHeight] = useState(2800);

  const [furniture, setFurniture] = useState<PlacedFurniture[]>([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<"translate" | "scale" | "rotate">("translate");
  const [mobilePanel, setMobilePanel] = useState<"catalog" | "inspector" | null>(null);

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

  const productionParts =
    selectedFurniture && selectedCatalogItem?.type === "kitchen"
      ? calculateCabinetParts(
          {
            id: selectedFurniture.id,
            name: selectedFurniture.name,
            type: selectedCatalogItem.type,
            width: selectedFurniture.width,
            height: selectedFurniture.height,
            depth: selectedFurniture.depth,
            positionX: selectedFurniture.position[0],
            positionY: selectedFurniture.position[1],
            positionZ: selectedFurniture.position[2],
            rotation: selectedFurniture.rotation,
            materialThickness: constructionRules.panelThickness,
          },
          constructionRules
        )
      : [];

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
    if (!selectedFurniture || productionParts.length === 0) return;

    const escapeCsv = (value: string | number) => {
      const text = String(value);
      return /[;"\\n\\r]/.test(text)
        ? `"${text.replace(/"/g, '""')} "`.replace(/" "/g, '""')
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

    const csv = "\\uFEFF" + rows
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\\r\\n");
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
    const project = {
      format: "MobilyaCAD",
      formatVersion: 1,
      savedAt: new Date().toISOString(),
      room: {
        width: roomWidth,
        length: roomLength,
        height: roomHeight,
        unit: "mm",
      },
      furniture,
    };

    const json = JSON.stringify(project, null, 2);
    const file = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    const date = new Date().toISOString().replace(/[:.]/g, "-");

    link.href = url;
    link.download = `mobilyacad-proje-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function loadProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as {
        format?: unknown;
        formatVersion?: unknown;
        room?: { width?: unknown; length?: unknown; height?: unknown };
        furniture?: unknown;
      };

      const room = parsed.room;
      const isRecord = (
        value: unknown
      ): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value);
      const isPositiveNumber = (value: unknown) =>
        typeof value === "number" && Number.isFinite(value) && value > 0;
      const isValidPosition = (value: unknown) =>
        Array.isArray(value) &&
        value.length === 3 &&
        value.every(
          (coordinate) =>
            typeof coordinate === "number" && Number.isFinite(coordinate)
        );

      const validFurniture =
        Array.isArray(parsed.furniture) &&
        parsed.furniture.every((item: unknown) => {
          if (!isRecord(item)) return false;

          const parts = item.parts;
          const validParts =
            Array.isArray(parts) &&
            parts.every((part: unknown) => {
              if (!isRecord(part)) return false;
              return (
                typeof part.id === "string" &&
                typeof part.name === "string" &&
                ["door", "drawer", "shelf", "panel"].includes(
                  String(part.type)
                ) &&
                isPositiveNumber(part.width) &&
                isPositiveNumber(part.height) &&
                isPositiveNumber(part.depth) &&
                isValidPosition(part.position) &&
                typeof part.rotation === "number" &&
                Number.isFinite(part.rotation) &&
                typeof part.color === "string" &&
                typeof part.material === "string"
              );
            });

          return (
            typeof item.id === "string" &&
            typeof item.catalogId === "string" &&
            typeof item.name === "string" &&
            isPositiveNumber(item.width) &&
            isPositiveNumber(item.height) &&
            isPositiveNumber(item.depth) &&
            isValidPosition(item.position) &&
            typeof item.rotation === "number" &&
            Number.isFinite(item.rotation) &&
            typeof item.color === "string" &&
            Number.isInteger(item.doorCount) &&
            Number(item.doorCount) >= 0 &&
            Number.isInteger(item.drawerCount) &&
            Number(item.drawerCount) >= 0 &&
            Number.isInteger(item.shelfCount) &&
            Number(item.shelfCount) >= 0 &&
            typeof item.hasBackPanel === "boolean" &&
            isPositiveNumber(item.backThickness) &&
            typeof item.edgeBanding === "boolean" &&
            typeof item.material === "string" &&
            validParts
          );
        });

      if (
        parsed.format !== "MobilyaCAD" ||
        parsed.formatVersion !== 1 ||
        !room ||
        typeof room.width !== "number" ||
        !Number.isFinite(room.width) ||
        room.width < 100 ||
        typeof room.length !== "number" ||
        !Number.isFinite(room.length) ||
        room.length < 100 ||
        typeof room.height !== "number" ||
        !Number.isFinite(room.height) ||
        room.height < 100 ||
        !validFurniture
      ) {
        throw new Error("Dosya MobilyaCAD proje formatıyla uyumlu değil.");
      }

      setRoomWidth(room.width);
      setRoomLength(room.length);
      setRoomHeight(room.height);
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

  function deleteFurniture() {
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
            <span>Yeni Tasarım</span>
            <span className="cad-document-status">Kaydedilmedi</span>
          </div>

          <div className="cad-top-actions">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" disabled>
                    <Undo2 />
                  </Button>
                }
              />
              <TooltipContent>Geri al</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon" disabled>
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
                          <span>ÜRETİM PARÇALARI</span>
                          <Ruler />
                        </div>

                        {selectedFurniture &&
                        selectedCatalogItem?.type === "kitchen" ? (
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
                              Kesim Listesini CSV İndir
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
                              Mutfak tipi bir modül seçildiğinde hesaplanan
                              üretim parçaları burada görüntülenir.
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