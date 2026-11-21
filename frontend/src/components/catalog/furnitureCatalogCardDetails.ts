import type { FurnitureCatalogItem } from "../../data/furnitureCatalog";

type FurnitureCatalogCardCounts = Pick<
  FurnitureCatalogItem,
  "doorCount" | "drawerCount" | "shelfCount"
>;

export function getFurnitureCatalogCardDetails(item: FurnitureCatalogCardCounts): string {
  return [
    item.doorCount ? `${item.doorCount} kapak` : "",
    item.drawerCount ? `${item.drawerCount} çekmece` : "",
    item.shelfCount ? `${item.shelfCount} raf` : "",
  ].filter(Boolean).join(" · ");
}
