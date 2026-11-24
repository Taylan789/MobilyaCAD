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
import "./styles/ui-workspace-vertical-rhythm-001.css";

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
