import type { FurnitureCatalogItem } from "../../data/furnitureCatalog";

interface Furniture3DProps {
  item: FurnitureCatalogItem;
  position: [number, number, number];
  rotation?: number;
}

export default function Furniture3D({
  item,
  position,
  rotation = 0
}: Furniture3DProps) {
  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry
          args={[
            item.width / 1000,
            item.height / 1000,
            item.depth / 1000
          ]}
        />
        <meshStandardMaterial
          color={item.color}
          roughness={0.65}
        />
      </mesh>

      {/* Ön yüzey */}
      <mesh
        position={[
          0,
          0,
          item.depth / 2000 + 0.006
        ]}
      >
        <boxGeometry
          args={[
            item.width / 1000 - 0.025,
            item.height / 1000 - 0.025,
            0.012
          ]}
        />
        <meshStandardMaterial
          color={item.color}
          roughness={0.45}
        />
      </mesh>
    </group>
  );
}
