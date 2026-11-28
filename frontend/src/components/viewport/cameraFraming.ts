export type CameraBounds3 = readonly [width: number, height: number, depth: number];

/**
 * Returns a conservative perspective-camera distance for a box centered on the
 * orbit target. A bounding sphere keeps all corners visible at every yaw angle.
 * The limiting horizontal/vertical field of view accounts for portrait canvases.
 */
export function calculatePerspectiveFitDistance(
  bounds: CameraBounds3,
  verticalFovDegrees: number,
  aspectRatio: number,
  paddingFactor = 1.12,
): number {
  const safeBounds = bounds.map((value) =>
    Number.isFinite(value) ? Math.max(0, value) : 0
  );
  const radius = Math.hypot(...safeBounds) / 2;
  if (radius <= 0) return 1;

  const safeFov = Number.isFinite(verticalFovDegrees)
    ? Math.min(179, Math.max(1, verticalFovDegrees))
    : 42;
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0
    ? aspectRatio
    : 1;
  const safePadding = Number.isFinite(paddingFactor) && paddingFactor >= 1
    ? paddingFactor
    : 1.12;

  const verticalHalfAngle = (safeFov * Math.PI) / 360;
  const horizontalHalfAngle = Math.atan(
    Math.tan(verticalHalfAngle) * safeAspect
  );
  const limitingHalfAngle = Math.min(verticalHalfAngle, horizontalHalfAngle);
  const sine = Math.sin(limitingHalfAngle);
  if (!Number.isFinite(sine) || sine <= 0) return 1;

  const distance = (radius / sine) * safePadding;
  return Number.isFinite(distance) ? Math.max(1, distance) : 1;
}
