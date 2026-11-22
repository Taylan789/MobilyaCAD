
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { Box, Focus, Maximize2, PanelLeft, PanelRight, PanelTop, Square } from "lucide-react";
import {
  OrbitControls,
  Grid,
  Environment,
  PerspectiveCamera,
  ContactShadows,
  GizmoHelper,
  GizmoViewport
} from "@react-three/drei";

import PlacedFurniture3D from "../furniture/PlacedFurniture3D";
import type { PlacedFurniture } from "../../types/placedFurniture";
import { calculatePlacementIssues } from "../../engine/placementValidation";
import "./ViewportCameraControls.css";
import "./ViewportCameraCurrentView.css";

interface Scene3DProps {
  width: number;
  length: number;
  height: number;
  furniture: PlacedFurniture[];
  hiddenFurnitureIds: string[];
  isolatedFurnitureId: string | null;
  selectedFurnitureId: string | null;
  selectedPartId: string | null;
  focusRequestId: number;
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

type CameraOrientation = "perspective" | "top" | "front" | "back" | "left" | "right";

const cameraViewLabels: Record<CameraOrientation, string> = {
  perspective: "PERSPEKTİF",
  top: "ÜST",
  front: "ÖN",
  back: "ARKA",
  left: "SOL",
  right: "SAĞ",
};

interface CameraCommand {
  id: number;
  orientation: CameraOrientation;
  target: [number, number, number];
  distance: number;
}

interface OrbitControlsApi {
  target: Vector3;
  update: () => void;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface CameraTransition {
  fromPosition: Vector3;
  toPosition: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  elapsed: number;
  duration: number;
}

function CameraRig({
  command,
  reducedMotion,
}: {
  command: CameraCommand | null;
  reducedMotion: boolean;
}) {
  const { camera, controls } = useThree();
  const transition = useRef<CameraTransition | null>(null);

  useEffect(() => {
    if (!command) return;

    const orbit = controls as unknown as OrbitControlsApi | null;
    if (!orbit?.target) return;

    const target = new Vector3(...command.target);
    const direction = new Vector3();
    const up = new Vector3(0, 1, 0);

    if (command.orientation === "top") {
      direction.set(0, 1, 0);
      up.set(0, 0, -1);
    } else if (command.orientation === "front") {
      direction.set(0, 0, 1);
    } else if (command.orientation === "back") {
      direction.set(0, 0, -1);
    } else if (command.orientation === "left") {
      direction.set(-1, 0, 0);
    } else if (command.orientation === "right") {
      direction.set(1, 0, 0);
    } else {
      direction.set(0.72, 0.58, 0.82);
    }

    const toPosition = target.clone().add(
      direction.normalize().multiplyScalar(command.distance)
    );

    camera.up.copy(up);

    if (reducedMotion) {
      camera.position.copy(toPosition);
      orbit.target.copy(target);
      camera.lookAt(orbit.target);
      orbit.update();
      transition.current = null;
      return;
    }

    transition.current = {
      fromPosition: camera.position.clone(),
      toPosition,
      fromTarget: orbit.target.clone(),
      toTarget: target,
      elapsed: 0,
      duration: 0.24,
    };
  }, [camera, command, controls, reducedMotion]);

  useEffect(() => {
    const orbit = controls as unknown as OrbitControlsApi | null;
    if (!orbit?.addEventListener) return;

    const cancelTransition = () => {
      transition.current = null;
    };

    orbit.addEventListener("start", cancelTransition);
    return () => orbit.removeEventListener?.("start", cancelTransition);
  }, [controls]);

  useFrame((_, delta) => {
    const current = transition.current;
    const orbit = controls as unknown as OrbitControlsApi | null;
    if (!current || !orbit?.target) return;

    current.elapsed += Math.min(delta, 0.05);
    const progress = Math.min(1, current.elapsed / current.duration);
    const eased = progress * progress * (3 - 2 * progress);

    camera.position.lerpVectors(current.fromPosition, current.toPosition, eased);
    orbit.target.lerpVectors(current.fromTarget, current.toTarget, eased);
    camera.lookAt(orbit.target);
    orbit.update();

    if (progress >= 1) transition.current = null;
  });

  return null;
}

function ResponsiveCamera({ width, length, height }: {
  width: number;
  length: number;
  height: number;
}) {
  const { camera, size, controls } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

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

function PlacementWarnings({ furniture, roomWidth, roomLength }: {
  furniture: PlacedFurniture[];
  roomWidth: number;
  roomLength: number;
}) {
  const issues = calculatePlacementIssues(furniture, roomWidth, roomLength);
  const issueById = new Map<string, "collision" | "outside-room">();

  for (const issue of issues) {
    for (const id of issue.furnitureIds) {
      const current = issueById.get(id);
      if (issue.type === "collision" || current === undefined) {
        issueById.set(id, issue.type);
      }
    }
  }

  return (
    <>
      {furniture.filter((item) => issueById.has(item.id)).map((item) => {
        const issueType = issueById.get(item.id);
        return (
          <mesh
            key={item.id}
            position={[
              item.position[0],
              item.position[1],
              item.position[2]
            ]}
            rotation={[0, (item.rotation * Math.PI) / 180, 0]}
          >
            <boxGeometry args={[
              item.width / 1000 + 0.025,
              item.height / 1000 + 0.025,
              item.depth / 1000 + 0.025
            ]} />
            <meshBasicMaterial
              color={issueType === "collision" ? "#ef4444" : "#f59e0b"}
              wireframe
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

export default function Scene3D({
  width,
  length,
  height,
  furniture,
  hiddenFurnitureIds,
  isolatedFurnitureId,
  selectedFurnitureId,
  selectedPartId,
  focusRequestId,
  transformMode,
  onSelectFurniture,
  onSelectPart,
  onTransformChange,
  onResize,
  onRotate
}: Scene3DProps) {
  const visibleFurniture = furniture.filter((item) =>
    !hiddenFurnitureIds.includes(item.id) &&
    (isolatedFurnitureId === null || isolatedFurnitureId === item.id)
  );
  const maxDimension = Math.max(
    width / 1000,
    length / 1000,
    height / 1000
  );
  const [activeView, setActiveView] = useState<CameraOrientation>("perspective");
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const cameraRequestId = useRef(0);
  const handledFocusRequestId = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  const requestCamera = useCallback((
    orientation: CameraOrientation,
    target: [number, number, number],
    distance: number
  ) => {
    cameraRequestId.current += 1;
    setCameraCommand({
      id: cameraRequestId.current,
      orientation,
      target,
      distance,
    });
  }, []);

  function selectCameraView(orientation: CameraOrientation) {
    setActiveView(orientation);
    requestCamera(
      orientation,
      [0, height / 2000, 0],
      Math.max(1, maxDimension * 2.7)
    );
  }

  function fitRoomToView() {
    setActiveView("perspective");
    requestCamera(
      "perspective",
      [0, height / 2000, 0],
      Math.max(1, maxDimension * 2.8)
    );
  }

  const focusSelectedObject = useCallback(() => {
    const selected = furniture.find((item) => item.id === selectedFurnitureId);
    if (!selected) return;

    const part = selectedPartId
      ? selected.parts.find((item) => item.id === selectedPartId)
      : undefined;
    const target = new Vector3(...selected.position);
    let extent = Math.max(selected.width, selected.height, selected.depth) / 1000;

    if (part) {
      const localOffset = new Vector3(...part.position);
      localOffset.applyAxisAngle(
        new Vector3(0, 1, 0),
        (selected.rotation * Math.PI) / 180
      );
      target.add(localOffset);
      extent = Math.max(part.width, part.height, part.depth) / 1000;
    }

    setActiveView("perspective");
    requestCamera(
      "perspective",
      [target.x, target.y, target.z],
      Math.max(1, extent * 3.6)
    );
  }, [furniture, selectedFurnitureId, selectedPartId, requestCamera]);

  useEffect(() => {
    if (focusRequestId <= 0) {
      handledFocusRequestId.current = 0;
      return;
    }
    if (handledFocusRequestId.current === focusRequestId) return;

    handledFocusRequestId.current = focusRequestId;
    focusSelectedObject();
  }, [focusRequestId, focusSelectedObject]);

  return (
    <>
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

      {/* Mobilyalar: görünürlük yalnızca viewport sunumunu etkiler, proje verisini değiştirmez. */}
      {visibleFurniture.map(item => (
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

      {/* Yerleşim doğrulama uyarıları */}
      <PlacementWarnings
        furniture={visibleFurniture}
        roomWidth={width}
        roomLength={length}
      />

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
      <CameraRig command={cameraCommand} reducedMotion={reducedMotion} />

      {/* CAD görünüm yönlendiricisi: eksenlere tıklayarak kamerayı hizala */}
      <GizmoHelper alignment="bottom-right" margin={[76, 76]}>
        <GizmoViewport
          axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
          labelColor="#e2e8f0"
          hideNegativeAxes
          axisHeadScale={0.9}
        />
      </GizmoHelper>
    </Canvas>
      <div className="cad-viewport-camera-tools" role="toolbar" aria-label="Kamera görünüşleri">
        <span className="cad-viewport-camera-tools__label">GÖRÜNÜŞ</span>
        <span
          className="cad-viewport-camera-tools__current-view"
          data-view={activeView}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {cameraViewLabels[activeView]}
        </span>
        <button
          type="button"
          className={activeView === "perspective" ? "is-active" : ""}
          aria-label="Perspektif görünüş"
          aria-pressed={activeView === "perspective"}
          title="Perspektif görünüş"
          onClick={() => selectCameraView("perspective")}
        >
          <Box aria-hidden="true" />
          <span>3D</span>
        </button>
        <button
          type="button"
          className={activeView === "top" ? "is-active" : ""}
          aria-label="Üst görünüş"
          aria-pressed={activeView === "top"}
          title="Üst görünüş"
          onClick={() => selectCameraView("top")}
        >
          <PanelTop aria-hidden="true" />
          <span>Üst</span>
        </button>
        <button
          type="button"
          className={activeView === "front" ? "is-active" : ""}
          aria-label="Ön görünüş"
          aria-pressed={activeView === "front"}
          title="Ön görünüş"
          onClick={() => selectCameraView("front")}
        >
          <Square aria-hidden="true" />
          <span>Ön</span>
        </button>
        <button
          type="button"
          className={activeView === "back" ? "is-active" : ""}
          aria-label="Arka görünüş"
          aria-pressed={activeView === "back"}
          title="Arka görünüş"
          onClick={() => selectCameraView("back")}
        >
          <Square aria-hidden="true" />
          <span>Arka</span>
        </button>
        <button
          type="button"
          className={activeView === "left" ? "is-active" : ""}
          aria-label="Sol görünüş"
          aria-pressed={activeView === "left"}
          title="Sol görünüş"
          onClick={() => selectCameraView("left")}
        >
          <PanelLeft aria-hidden="true" />
          <span>Sol</span>
        </button>
        <button
          type="button"
          className={activeView === "right" ? "is-active" : ""}
          aria-label="Sağ görünüş"
          aria-pressed={activeView === "right"}
          title="Sağ görünüş"
          onClick={() => selectCameraView("right")}
        >
          <PanelRight aria-hidden="true" />
          <span>Sağ</span>
        </button>
        <span className="cad-viewport-camera-tools__divider" />
        <button
          type="button"
          aria-label="Odayı görünüme sığdır"
          title="Odayı görünüme sığdır"
          onClick={fitRoomToView}
        >
          <Maximize2 aria-hidden="true" />
          <span>Sığdır</span>
        </button>
        <button
          type="button"
          aria-label={selectedPartId ? "Seçili parçaya odaklan" : "Seçili mobilyaya odaklan"}
          title={selectedPartId ? "Seçili parçaya odaklan" : "Seçili mobilyaya odaklan"}
          disabled={!selectedFurnitureId}
          onClick={focusSelectedObject}
        >
          <Focus aria-hidden="true" />
          <span>Odakla</span>
        </button>
      </div>
    </>
  );
}
