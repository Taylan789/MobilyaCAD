// Kapı ve pencere gibi duvar açıklıkları

export interface Opening {
  id: string;
  name: string;

  // Açıklık türü
  type: "door" | "window";

  // Ölçüler (mm)
  width: number;
  height: number;

  // Zeminden yüksekliği (mm)
  elevation: number;

  // Hangi duvarda bulunduğu
  wallId: string;

  // Duvar üzerindeki yatay konumu (mm)
  position: number;
}