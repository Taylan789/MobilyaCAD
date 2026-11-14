
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import {
  OrbitControls,
  Grid,
  Environment,
  PerspectiveCamera,
  ContactShadows
} from "@react-three/drei";

import PlacedFurniture3D from "../furniture/PlacedFurniture3D";
import type { PlacedFurniture } from "../../types/placedFurniture";

interface Scene3DProps {
  width: number;
  length: number;
  height: number;
  furniture: PlacedFurniture[];
  selectedFurnitureId: string | null;
  selectedPartId: string | null;
  transformMode: "translate" | "scale" | "rotate";
  onSelectFurniture: (id: string) => void;
  onSelectPart: (furnitureId: string, partId: string) => void;
  onTransformChange: (
    id: string,
    position: [number, number, number]
  ) => void;
  onResize: (
    id: string,
    dimensions: { width: number; height: number; depth: number },
    position: [number, number, number]
  ) => void;
  onRotate: (id: string, rotation: number) => void;
}

function ResponsiveCamera({ width, length, height }: {
  width: number;
  length: number;
  height: number;
}) {
  const { camera, size, controls } = useThree();

  useEffect(() => {
    const maxDimension = Math.max(width / 1000, length / 1000, height / 1000);
    const mobile = size.width <= 700;
    const targetY = height / 2000;

    if (mobile) {
      const distance = maxDimension * 3.6;
      camera.position.set(distance * 0.58, distance * 0.48, distance * 0.72);
      camera.lookAt(0, targetY, 0);
      camera.updateProjectionMatrix();

      const orbit = controls as {
        target?: { set: (x: number, y: number, z: number) => void };
        update?: () => void;
      } | null;

      orbit?.target?.set(0, targetY, 0);
      orbit?.update?.();
    } else {
      camera.position.set(maxDimension * 1.5, maxDimension * 1.2, maxDimension * 1.8);
      camera.lookAt(0, targetY, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, controls, size.width, width, length, height]);

  return null;
}

function Room({
  width,
  length,
  height
}: {
  width: number;
  length: number;
  height: number;
}) {
  const roomWidth = width / 1000;
  const roomLength = length / 1000;
  const roomHeight = height / 1000;

  const wallThickness = 0.12;
  const skirtingHeight = 0.09;
  const skirtingDepth = 0.025;

  return (
    <group>
      {/* Zemin */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomWidth, roomLength]} />
        <meshStandardMaterial
          color="#858d94"
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* Arka duvar */}
      <mesh
        position={[0, roomHeight / 2, -roomLength / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[roomWidth, roomHeight, wallThickness]} />
        <meshStandardMaterial
          color="#b9c0c5"
          roughness={0.88}
        />
      </mesh>

      {/* Sol duvar */}
      <mesh
        position={[-roomWidth / 2, roomHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, roomHeight, roomLength]} />
        <meshStandardMaterial
          color="#aab4bc"
          roughness={0.88}
        />
      </mesh>

      {/* Sağ duvar */}
      <mesh
        position={[roomWidth / 2, roomHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, roomHeight, roomLength]} />
        <meshStandardMaterial
          color="#c6cbd0"
          roughness={0.88}
        />
      </mesh>

      {/* Arka duvar süpürgeliği */}
      <mesh
        position={[
          0,
          skirtingHeight / 2,
          -roomLength / 2 + wallThickness / 2 + 0.012
        ]}
      >
        <boxGeometry
          args={[roomWidth, skirtingHeight, skirtingDepth]}
        />
        <meshStandardMaterial
          color="#697782"
          roughness={0.65}
        />
      </mesh>

      {/* Sol duvar süpürgeliği */}
      <mesh
        position={[
          -roomWidth / 2 + wallThickness / 2 + 0.012,
          skirtingHeight / 2,
          0
        ]}
      >
        <boxGeometry
          args={[skirtingDepth, skirtingHeight, roomLength]}
        />
        <meshStandardMaterial
          color="#697782"
          roughness={0.65}
        />
      </mesh>

      {/* Sağ duvar süpürgeliği */}
      <mesh
        position={[
          roomWidth / 2 - wallThickness / 2 - 0.012,
          skirtingHeight / 2,
          0
        ]}
      >
        <boxGeometry
          args={[skirtingDepth, skirtingHeight, roomLength]}
        />
        <meshStandardMaterial
          color="#697782"
          roughness={0.65}
        />
      </mesh>

      {/* Teknik ölçüm ızgarası */}
      <Grid
        position={[0, 0.012, 0]}
        args={[roomWidth, roomLength]}
        cellSize={0.25}
        cellThickness={0.6}
        cellColor="#899ba8"
        sectionSize={1}
        sectionColor="#a9bac6"
        sectionThickness={1}
        fadeDistance={Math.max(roomWidth, roomLength) * 1.5}
        infiniteGrid={false}
      />
    </group>
  );
}

export default function Scene3D({
  width,
  length,
  height,
  furniture,
  selectedFurnitureId,
  selectedPartId,
  transformMode,
  onSelectFurniture,
  onSelectPart,
  onTransformChange,
  onResize,
  onRotate
}: Scene3DProps) {
  const maxDimension = Math.max(
    width / 1000,
    length / 1000,
    height / 1000
  );

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        powerPreference: "high-performance"
      }}
    >
      {/* Kamera */}
      <PerspectiveCamera
        makeDefault
        position={[
          maxDimension * 1.5,
          maxDimension * 1.2,
          maxDimension * 1.8
        ]}
        fov={42}
        near={0.1}
        far={100}
      />

      {/* Arka plan */}
      <color attach="background" args={["#111820"]} />

      {/* Genel aydınlatma */}
      <ambientLight intensity={0.65} />

      <hemisphereLight
        args={["#dce8f0", "#59636d", 1.1]}
      />

      {/* Ana ışık */}
      <directionalLight
        position={[5, 9, 6]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0002}
      />

      {/* Dolgu ışığı */}
      <directionalLight
        position={[-5, 5, -4]}
        intensity={0.45}
        color="#b5cbdc"
      />

      {/* Oda */}
      <Room
        width={width}
        length={length}
        height={height}
      />

      {/* Mobilyalar */}
      {furniture.map(item => (
        <PlacedFurniture3D
          key={item.id}
          furniture={item}
          selected={selectedFurnitureId === item.id}
          selectedPartId={selectedPartId}
          mode={transformMode}
          onSelect={onSelectFurniture}
          onSelectPart={onSelectPart}
          onTransformChange={onTransformChange}
          onResize={onResize}
          onRotate={onRotate}
        />
      ))}

      {/* Yumuşak temas gölgeleri */}
      <ContactShadows
        position={[0, 0.018, 0]}
        opacity={0.25}
        scale={maxDimension * 2}
        blur={2}
        far={maxDimension * 2}
      />

      {/* Ortam yansımaları */}
      <Environment preset="warehouse" />

      <ResponsiveCamera width={width} length={length} height={height} />

      {/* Kamera kontrolleri */}
      <OrbitControls
        makeDefault
        target={[0, height / 2000, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={maxDimension * 5}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}
