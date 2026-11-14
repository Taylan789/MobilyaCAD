import type { Room } from "./room";
import type { Wall } from "./wall";
import type { Opening } from "./opening";
import type { Furniture } from "./furniture";
import type { Part } from "./part";
import type { Hardware } from "./hardware";
import type { Material } from "./material";

// MobilyaCAD proje veri yapısı
export interface Project {
  id: string;
  name: string;

  // Projenin oluşturulma ve güncellenme tarihleri
  createdAt: string;
  updatedAt: string;

  // Oda ve mimari bilgiler
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];

  // Mobilyalar ve üretim bilgileri
  furniture: Furniture[];
  parts: Part[];
  hardware: Hardware[];
  materials: Material[];
}
