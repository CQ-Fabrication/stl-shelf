import { MathUtils } from "three";

// Pull the camera back slightly past an exact sphere fit so the model leaves a
// margin instead of touching the frame edges. 1.2 makes the bounding sphere
// fill ~83% of the limiting dimension (the actual silhouette sits ~80%).
export const FRAME_FILL_FACTOR = 1.2;

// The diagonal 3/4 view direction the camera looks from (normalized at use).
export const FRAME_DIRECTION: readonly [number, number, number] = [1, 1, 1];

/**
 * Distance from a perspective camera to the center of a bounding sphere so the
 * sphere fits the frame. `radius / sin(fov/2)` is the exact fit (the sphere is
 * tangent to the frustum); `fillFactor > 1` moves the camera back for margin.
 *
 * The horizontal field of view derives from the vertical fov and the aspect
 * ratio. When `aspect < 1` the frame is narrower than it is tall, so the
 * horizontal fov is the limiting (smaller) one and drives the distance.
 */
export function computeCameraDistance(
  radiusScaled: number,
  fovDeg: number,
  aspect: number,
  fillFactor: number = FRAME_FILL_FACTOR,
): number {
  if (!(radiusScaled > 0)) {
    return 0;
  }

  const verticalFov = MathUtils.degToRad(fovDeg);
  const horizontalFov =
    aspect > 0 ? 2 * Math.atan(Math.tan(verticalFov / 2) * aspect) : verticalFov;
  const limitingFov = Math.min(verticalFov, horizontalFov);

  return (radiusScaled / Math.sin(limitingFov / 2)) * fillFactor;
}
