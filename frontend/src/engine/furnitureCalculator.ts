import type { Furniture } from "../types/furniture";
import type { Part } from "../types/part";

// Mobilya üretim parçalarını hesaplama motoru
export function calculateFurnitureParts(
  furniture: Furniture
): Part[] {
  // Ölçü kontrolleri
  if (
    furniture.width <= 0 ||
    furniture.height <= 0 ||
    furniture.depth <= 0 ||
    furniture.materialThickness <= 0
  ) {
    throw new Error("Mobilya ölçüleri sıfırdan büyük olmalıdır.");
  }

  // Bu fonksiyon şimdilik hesaplama altyapısıdır.
  // Mobilya türüne ve konstrüksiyona göre kurallar eklenecektir.
  return [];
}
