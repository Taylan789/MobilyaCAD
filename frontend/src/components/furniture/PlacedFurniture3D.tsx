
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Plane, Vector2, Vector3 } from "three";
import type { Group } from "three";
import type {
  FurniturePart,
  PlacedFurniture
} from "../../types/placedFurniture";

interface Props {
  furniture: PlacedFurniture;
  selected: boolean;
  selectedPartId: string | null;
  mode: "translate" | "scale" | "rotate";
  onSelect: (id: string) => void;
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

type PartType = "door" | "drawer" | "shelf";

export default function PlacedFurniture3D({
  furniture,
  selected,
  selectedPartId,
  mode,
  onSelect,
  onSelectPart,
  onTransformChange,
  onResize,
  onRotate
}: Props) {
  const groupRef = useRef<Group>(null!);
  const controls = useThree(state => state.controls);
  const { camera, gl, raycaster } = useThree();

  const dragging = useRef<{
    position: [number, number, number];
  } | null>(null);
  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new Vector3());

  const resizeDrag = useRef<{
    axis: "x" | "y" | "z";
    sign: number;
    start: number;
    initial: number;
    origin: Vector3;
    axisVector: Vector3;
    initialPosition: [number, number, number];
    initialDimensions: { width: number; height: number; depth: number };
  } | null>(null);
  const resizePointerId = useRef<number | null>(null);

  const rotationDrag = useRef<{
    startAngle: number;
    initialRotation: number;
    currentRotation: number;
  } | null>(null);

  const rotationPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const rotationPoint = useRef(new Vector3());
  const rotationLabelRef = useRef<HTMLDivElement>(null);

  function getRotationAngle(event: any) {
    rotationPlane.current.constant = -(furniture.position[1] + furniture.height / 2000 + 0.14);

    const point = event.ray.intersectPlane(
      rotationPlane.current,
      rotationPoint.current
    );

    if (!point) return null;

    const dx = point.x - furniture.position[0];
    const dz = point.z - furniture.position[2];

    return Math.atan2(dx, dz);
  }

  function startRotation(event: any) {
    if (mode !== "rotate" || (event.button !== 0 && event.pointerType !== "touch")) return;

    event.stopPropagation();

    const angle = getRotationAngle(event);
    if (angle === null) return;

    onSelect(furniture.id);

    rotationDrag.current = {
      startAngle: angle,
      initialRotation: furniture.rotation,
      currentRotation: furniture.rotation
    };

    const cameraControls = controls as { enabled?: boolean } | null;
    if (cameraControls) cameraControls.enabled = false;

    (event.target as unknown as {
          setPointerCapture: (pointerId: number) => void;
        }).setPointerCapture(event.pointerId);
  }

  function moveRotation(event: any) {
    const drag = rotationDrag.current;
    if (!drag) return;

    event.stopPropagation();

    const currentAngle = getRotationAngle(event);
    if (currentAngle === null) return;

    let delta = currentAngle - drag.startAngle;

    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    const rawRotation =
      drag.initialRotation + (delta * 180) / Math.PI;

    const normalizedRotation =
      ((rawRotation % 360) + 360) % 360;

    // 15 derecelik açılara yaklaşınca akıllı yakalama
    const snapTarget =
      (Math.round(normalizedRotation / 15) * 15) % 360;

    const snapDifference =
      ((snapTarget - normalizedRotation + 540) % 360) - 180;

    const nextRotation =
      Math.abs(snapDifference) <= 2.5
        ? snapTarget
        : normalizedRotation;

    drag.currentRotation = nextRotation;

    if (groupRef.current) {
      groupRef.current.rotation.y = (nextRotation * Math.PI) / 180;
    }
    if (rotationLabelRef.current) {
      rotationLabelRef.current.textContent =
        `${Math.round(drag.currentRotation)}°`;
    }
  }

  function endRotation(event: any) {
    if (!rotationDrag.current) return;

    event.stopPropagation();

    const finalRotation = rotationDrag.current.currentRotation;
    rotationDrag.current = null;

    onRotate(furniture.id, finalRotation);

    const cameraControls = controls as { enabled?: boolean } | null;
    if (cameraControls) cameraControls.enabled = true;

    (event.target as unknown as {
          releasePointerCapture: (pointerId: number) => void;
        }).releasePointerCapture(event.pointerId);
  }

  const w = furniture.width / 1000;
  const h = furniture.height / 1000;
  const d = furniture.depth / 1000;

  const thickness = Math.min(0.018, w * 0.04, h * 0.04, d * 0.04);

  const isCountertop = furniture.catalogId === "countertop";
  const isDesk = furniture.catalogId === "desk";

  const isBookcase =
    furniture.catalogId === "bookcase" ||
    furniture.name.toLocaleLowerCase("tr").includes("kitaplık");

  const doorCount = Math.max(0, Math.min(8, Math.floor(furniture.doorCount || 0)));
  const drawerCount = Math.max(0, Math.min(8, Math.floor(furniture.drawerCount || 0)));
  const shelfCount = Math.max(0, Math.min(12, Math.floor(furniture.shelfCount || 0)));

  const hasDoors = !isCountertop && !isDesk && !isBookcase && doorCount > 0;

  const drawerHeight = drawerCount > 0
    ? Math.min(0.24, (h * 0.4) / drawerCount)
    : 0;

  const drawerArea = drawerHeight * drawerCount;

  const doorAreaHeight = Math.max(
    0.02,
    h - thickness * 2 - drawerArea
  );

  function getParts(type: PartType): FurniturePart[] {
    return (furniture.parts ?? []).filter(part => part.type === type);
  }

  function getPart(type: PartType, index: number): FurniturePart | undefined {
    return getParts(type)[index];
  }

  function getPartId(type: PartType, index: number) {
    return getPart(type, index)?.id ?? `${type}-${index}`;
  }

  function selectPart(type: PartType, index: number) {
    onSelectPart(furniture.id, getPartId(type, index));
  }

  function partColor(type: PartType, index: number) {
    return selectedPartId === getPartId(type, index)
      ? "#71e0a0"
      : furniture.color;
  }

  function partDimensions(
    type: PartType,
    index: number,
    defaults: { width: number; height: number; depth: number }
  ) {
    const part = getPart(type, index);

    if (!part) return defaults;

    return {
      width: Math.max(0.01, part.width / 1000),
      height: Math.max(0.01, part.height / 1000),
      depth: Math.max(0.01, part.depth / 1000)
    };
  }

  function partPosition(
    type: PartType,
    index: number,
    defaults: [number, number, number]
  ): [number, number, number] {
    const part = getPart(type, index);

    if (!part) return defaults;

    return part.position;
  }

  function partEvents(type: PartType, index: number) {
    return {
      onClick: (event: any) => {
        event.stopPropagation();
        selectPart(type, index);
      },
      onPointerDown: (event: any) => {
        event.stopPropagation();
      }
    };
  }

  function getAxisParameter(ray: any, origin: Vector3, axis: Vector3) {
    const direction = ray.direction;
    const offset = origin.clone().sub(ray.origin);

    const dot = axis.dot(direction);
    const denominator = 1 - dot * dot;

    if (denominator < 0.000001) return null;

    return (
      dot * direction.dot(offset) - axis.dot(offset)
    ) / denominator;
  }

  function startResize(
    event: any,
    axis: "x" | "y" | "z",
    sign: number,
    initial: number
  ) {
    event.stopPropagation();
    onSelect(furniture.id);

    const origin = new Vector3();
    event.object.getWorldPosition(origin);

    const axisVector = new Vector3(
      axis === "x" ? 1 : 0,
      axis === "y" ? 1 : 0,
      axis === "z" ? 1 : 0
    );

    if (groupRef.current) {
      axisVector.applyQuaternion(groupRef.current.quaternion);
    }

    axisVector.normalize();

    const start = getAxisParameter(event.ray, origin, axisVector);
    if (start === null) return;

    resizeDrag.current = {
      axis,
      sign,
      start,
      initial,
      origin,
      axisVector,
      initialPosition: [...furniture.position],
      initialDimensions: {
        width: furniture.width,
        height: furniture.height,
        depth: furniture.depth
      }
    };

    resizePointerId.current = event.pointerId;
    window.addEventListener("pointermove", handleGlobalResizeMove);
    window.addEventListener("pointerup", handleGlobalResizeEnd);
    window.addEventListener("pointercancel", handleGlobalResizeEnd);

    const cameraControls = controls as { enabled?: boolean } | null;
    if (cameraControls) cameraControls.enabled = false;

    (event.target as unknown as {
      setPointerCapture: (pointerId: number) => void;
    }).setPointerCapture(event.pointerId);
  }

  function handleGlobalResizeMove(event: PointerEvent) {
    const drag = resizeDrag.current;
    if (!drag || event.pointerId !== resizePointerId.current) return;

    const rect = gl.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const current = getAxisParameter(
      raycaster.ray,
      drag.origin,
      drag.axisVector
    );

    if (current === null) return;

    const delta = (current - drag.start) * drag.sign;
    const value = Math.max(
      100,
      Math.round(drag.initial + delta * 1000)
    );

    onResize(furniture.id, {
      width: drag.axis === "x" ? value : drag.initialDimensions.width,
      height: drag.axis === "y" ? value : drag.initialDimensions.height,
      depth: drag.axis === "z" ? value : drag.initialDimensions.depth
    }, drag.initialPosition);
  }

  function endResize(event?: any) {
    if (!resizeDrag.current) return;

    event?.stopPropagation?.();

    resizeDrag.current = null;
    resizePointerId.current = null;

    window.removeEventListener("pointermove", handleGlobalResizeMove);
    window.removeEventListener("pointerup", handleGlobalResizeEnd);
    window.removeEventListener("pointercancel", handleGlobalResizeEnd);

    const cameraControls = controls as { enabled?: boolean } | null;
    if (cameraControls) cameraControls.enabled = true;
  }

  function handleGlobalResizeEnd(event: PointerEvent) {
    if (
      resizePointerId.current !== null &&
      event.pointerId !== resizePointerId.current
    ) return;

    endResize();
  }

  const furnitureModel = (
    <group
      ref={groupRef}
      position={furniture.position}
      rotation={[0, (furniture.rotation * Math.PI) / 180, 0]}
      onClick={event => {
        event.stopPropagation();
        onSelect(furniture.id);
      }}
      onPointerDown={event => {
        if (mode !== "translate" || (event.button !== 0 && event.pointerType !== "touch")) return;

        event.stopPropagation();
        onSelect(furniture.id);

        const point = new Vector3();
        dragPlane.current.constant = -furniture.position[1];

        if (!event.ray.intersectPlane(dragPlane.current, point)) return;

        dragOffset.current.set(
          furniture.position[0] - point.x,
          0,
          furniture.position[2] - point.z
        );

        dragging.current = {
          position: [...furniture.position]
        };

        const cameraControls = controls as { enabled?: boolean } | null;
        if (cameraControls) cameraControls.enabled = false;

        (event.target as unknown as {
          setPointerCapture: (pointerId: number) => void;
        }).setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!dragging.current) return;

        event.stopPropagation();

        const point = new Vector3();

        if (event.ray.intersectPlane(dragPlane.current, point)) {
          const nextPosition: [number, number, number] = [
            point.x + dragOffset.current.x,
            furniture.position[1],
            point.z + dragOffset.current.z
          ];

          dragging.current.position = nextPosition;

          if (groupRef.current) {
            groupRef.current.position.set(...nextPosition);
          }
        }
      }}
      onPointerUp={event => {
        if (!dragging.current) return;

        event.stopPropagation();

        const finalPosition = dragging.current.position;
        dragging.current = null;

        onTransformChange(furniture.id, finalPosition);

        const cameraControls = controls as { enabled?: boolean } | null;
        if (cameraControls) cameraControls.enabled = true;

        (event.target as unknown as {
          releasePointerCapture: (pointerId: number) => void;
        }).releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        if (dragging.current) {
          const finalPosition = dragging.current.position;
          dragging.current = null;
          onTransformChange(furniture.id, finalPosition);
        }

        const cameraControls = controls as { enabled?: boolean } | null;
        if (cameraControls) cameraControls.enabled = true;
      }}
    >
      {isCountertop ? (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={furniture.color}
              roughness={0.28}
              metalness={0.08}
            />
          </mesh>

          <mesh position={[0, -h / 2 + 0.006, 0]}>
            <boxGeometry args={[w, 0.012, d]} />
            <meshStandardMaterial color="#777873" roughness={0.5} />
          </mesh>
        </>
      ) : isDesk ? (
        <>
          <mesh
            position={[0, h / 2 - thickness / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, thickness, d]} />
            <meshStandardMaterial color={furniture.color} roughness={0.48} />
          </mesh>

          {[-1, 1].map(x =>
            [-1, 1].map(z => (
              <mesh
                key={`${x}-${z}`}
                position={[
                  x * (w / 2 - thickness * 1.5),
                  -h / 2 + (h - thickness) / 2,
                  z * (d / 2 - thickness * 1.5)
                ]}
                castShadow
              >
                <boxGeometry args={[
                  thickness * 1.5,
                  h - thickness,
                  thickness * 1.5
                ]} />
                <meshStandardMaterial color="#77736d" roughness={0.65} />
              </mesh>
            ))
          )}

          {Array.from({ length: drawerCount }, (_, index) => {
            const defaults = {
              width: w * 0.42,
              height: Math.max(0.04, Math.min(0.16, (h - thickness) / (drawerCount + 2))),
              depth: thickness
            };

            const size = partDimensions("drawer", index, defaults);
            const y = h / 2 - thickness - size.height / 2 -
              index * (size.height + 0.006);
            const position = partPosition("drawer", index, [
              0,
              y,
              d / 2 + thickness / 2
            ]);

            return (
              <group
                key={`desk-drawer-${index}`}
                {...partEvents("drawer", index)}
              >
                <mesh position={position} castShadow>
                  <boxGeometry args={[size.width, size.height, size.depth]} />
                  <meshStandardMaterial color={partColor("drawer", index)} />
                </mesh>
              </group>
            );
          })}
        </>
      ) : (
        <>
          {/* Dolap yan panelleri */}
          {[-1, 1].map(side => (
            <mesh
              key={`side-${side}`}
              position={[side * (w / 2 - thickness / 2), 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[thickness, h, d]} />
              <meshStandardMaterial color={furniture.color} roughness={0.58} />
            </mesh>
          ))}

          {/* Alt ve üst tablalar */}
          {[-1, 1].map(vertical => (
            <mesh
              key={`horizontal-${vertical}`}
              position={[0, vertical * (h / 2 - thickness / 2), 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[w - thickness * 2, thickness, d]} />
              <meshStandardMaterial color={furniture.color} roughness={0.58} />
            </mesh>
          ))}

          {/* Arkalık */}
          <mesh position={[0, 0, -d / 2 + thickness / 2]}>
            <boxGeometry args={[
              w - thickness * 2,
              h - thickness * 2,
              thickness
            ]} />
            <meshStandardMaterial color="#a69d8f" roughness={0.8} />
          </mesh>

          {/* Raflar */}
          {Array.from({ length: shelfCount }, (_, index) => {
            const defaults = {
              width: w - thickness * 2,
              height: thickness,
              depth: d - thickness
            };

            const size = partDimensions("shelf", index, defaults);

            const defaultY =
              -h / 2 +
              thickness +
              ((h - thickness * 2) * (index + 1)) /
              (shelfCount + 1);

            const position = partPosition("shelf", index, [
              0,
              defaultY,
              0
            ]);

            return (
              <group
                key={`shelf-${index}`}
                {...partEvents("shelf", index)}
              >
                <mesh position={position} castShadow receiveShadow>
                  <boxGeometry args={[size.width, size.height, size.depth]} />
                  <meshStandardMaterial
                    color={partColor("shelf", index)}
                    roughness={0.55}
                  />
                </mesh>
              </group>
            );
          })}

          {/* Kapaklar */}
          {hasDoors && Array.from({ length: doorCount }, (_, index) => {
            const defaultWidth = w / doorCount - 0.003;

            const defaultX =
              -w / 2 +
              defaultWidth / 2 +
              index * (w / doorCount);

            const defaultY = drawerCount > 0
              ? h / 2 - thickness - doorAreaHeight / 2
              : 0;

            const defaults = {
              width: Math.max(0.02, defaultWidth),
              height: Math.max(0.02, doorAreaHeight),
              depth: thickness
            };

            const size = partDimensions("door", index, defaults);
            const position = partPosition("door", index, [
              defaultX,
              defaultY,
              d / 2 - thickness / 2
            ]);

            return (
              <group
                key={`door-${index}`}
                {...partEvents("door", index)}
              >
                <mesh position={position} castShadow>
                  <boxGeometry args={[size.width, size.height, size.depth]} />
                  <meshStandardMaterial
                    color={partColor("door", index)}
                    roughness={0.42}
                  />
                </mesh>

                <mesh
                  position={[
                    position[0] + size.width * 0.35,
                    position[1],
                    position[2] + size.depth * 0.65
                  ]}
                  castShadow
                >
                  <boxGeometry args={[0.012, 0.09, 0.018]} />
                  <meshStandardMaterial
                    color="#b9b9b5"
                    metalness={0.85}
                    roughness={0.25}
                  />
                </mesh>
              </group>
            );
          })}

          {/* Çekmeceler */}
          {Array.from({ length: drawerCount }, (_, index) => {
            const defaultY =
              -h / 2 +
              thickness +
              drawerHeight / 2 +
              index * drawerHeight;

            const defaults = {
              width: w - thickness * 2,
              height: Math.max(0.03, drawerHeight - 0.006),
              depth: thickness
            };

            const size = partDimensions("drawer", index, defaults);
            const position = partPosition("drawer", index, [
              0,
              defaultY,
              d / 2 + thickness / 2
            ]);

            return (
              <group
                key={`drawer-${index}`}
                {...partEvents("drawer", index)}
              >
                <mesh position={position} castShadow receiveShadow>
                  <boxGeometry args={[size.width, size.height, size.depth]} />
                  <meshStandardMaterial
                    color={partColor("drawer", index)}
                    roughness={0.4}
                  />
                </mesh>

                <mesh
                  position={[
                    position[0],
                    position[1],
                    position[2] + size.depth * 0.6
                  ]}
                  castShadow
                >
                  <boxGeometry args={[
                    Math.min(0.12, size.width * 0.25),
                    0.012,
                    0.018
                  ]} />
                  <meshStandardMaterial
                    color="#b9b9b5"
                    metalness={0.85}
                    roughness={0.25}
                  />
                </mesh>
              </group>
            );
          })}
        </>
      )}

      {/* Profesyonel döndürme kontrolü */}
      {selected && mode === "rotate" && (() => {
        const rotateRadius = Math.max(w, d) / 2 + 0.22;

        return (
          <group
            position={[0, h / 2 + 0.14, 0]}
            onPointerDown={startRotation}
            onPointerMove={moveRotation}
            onPointerUp={endRotation}
            onPointerCancel={endRotation}
          >
            {/* Ana döndürme halkası */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[rotateRadius, 0.025, 12, 128]} />
              <meshBasicMaterial color="#55c8ff" depthTest={false} />
            </mesh>

            {/* Dokunmatik kontrol noktaları */}
            {[
              [rotateRadius, 0, 0],
              [-rotateRadius, 0, 0],
              [0, 0, rotateRadius],
              [0, 0, -rotateRadius]
            ].map((position, index) => (
              <group
                key={index}
                position={position as [number, number, number]}
              >
                {/* Parmak için geniş, görünmez dokunma alanı */}
                <mesh>
                  <sphereGeometry args={[0.19, 16, 16]} />
                  <meshBasicMaterial
                    transparent
                    opacity={0}
                    depthWrite={false}
                  />
                </mesh>

                {/* Görünen kontrol noktası */}
                <mesh>
                  <sphereGeometry args={[0.075, 24, 24]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    depthTest={false}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            ))}

            {/* Anlık derece göstergesi */}
            <Html
              position={[0, 0.28, 0]}
              center
              distanceFactor={8}
              style={{ pointerEvents: "none" }}
            >
              <div
                ref={rotationLabelRef}
                style={{
                  padding: "7px 13px",
                  borderRadius: "9px",
                  background: "rgba(12, 22, 35, 0.94)",
                  border: "1px solid #55c8ff",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  fontFamily: "sans-serif",
                  whiteSpace: "nowrap",
                  boxShadow: "0 3px 14px rgba(0,0,0,0.3)"
                }}
              >
                {Math.round(furniture.rotation)}°
              </div>
            </Html>
          </group>
        );
      })()}

      {/* Boyutlandırma tutamaçları */}
      {selected && mode === "scale" && (
        <group>
          {([
            { axis: "x", sign: -1, position: [-w / 2, 0, d / 2], size: furniture.width },
            { axis: "x", sign: 1, position: [w / 2, 0, d / 2], size: furniture.width },
            { axis: "y", sign: -1, position: [0, -h / 2, 0], size: furniture.height },
            { axis: "y", sign: 1, position: [0, h / 2, 0], size: furniture.height },
            { axis: "z", sign: -1, position: [0, 0, -d / 2], size: furniture.depth },
            { axis: "z", sign: 1, position: [0, 0, d / 2], size: furniture.depth }
          ] as const).map(handle => {
            const color =
              handle.axis === "x"
                ? "#ff626b"
                : handle.axis === "y"
                  ? "#55d99a"
                  : "#55aaff";

            return (
              <group
                key={`${handle.axis}-${handle.sign}-${handle.position.join("-")}`}
                position={handle.position as [number, number, number]}
              >
                {/* Bağımsız ve geniş yakalama alanı */}
                <mesh
                  onPointerDown={event =>
                    startResize(event, handle.axis, handle.sign, handle.size)
                  }
                  onPointerUp={endResize}
                  onPointerCancel={endResize}
                  onLostPointerCapture={endResize}
                >
                  <sphereGeometry args={[0.13, 16, 16]} />
                  <meshBasicMaterial
                    transparent
                    opacity={0}
                    colorWrite={false}
                    depthWrite={false}
                  />
                </mesh>

                {/* Görünen CAD tutamacı */}
                <mesh raycast={() => null}>
                  <sphereGeometry args={[0.045, 24, 24]} />
                  <meshStandardMaterial
                    color={color}
                    metalness={0.35}
                    roughness={0.24}
                    emissive={color}
                    emissiveIntensity={0.18}
                    depthTest={false}
                  />
                </mesh>

                {/* Eksen halkası */}
                <mesh
                  raycast={() => null}
                  rotation={
                    handle.axis === "z"
                      ? [Math.PI / 2, 0, 0]
                      : [0, 0, 0]
                  }
                >
                  <torusGeometry args={[0.075, 0.007, 8, 28]} />
                  <meshBasicMaterial color={color} depthTest={false} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* Seçili mobilya çerçevesi */}
      {selected && (
        <mesh>
          <boxGeometry args={[w + 0.025, h + 0.025, d + 0.025]} />
          <meshBasicMaterial color="#71e0a0" wireframe />
        </mesh>
      )}
    </group>
  );

  return furnitureModel;
}
