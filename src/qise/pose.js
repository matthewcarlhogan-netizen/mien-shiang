/*
 * PHASE 3 support — head pose. Pure, DOM-free.
 *
 * ── WHY THIS FILE EXISTS SEPARATELY ────────────────────────────────────────
 * `gates.js` was written first and takes pose as an input, and the capture
 * loop initially fed it `{yaw: 0, pitch: 0, roll: 0}`. A gate that is fully
 * implemented, fully tested, and can never fire in production is worse than no
 * gate: it reports itself passing on every frame and contributes a constant to
 * the ring. Same shape as CLAUDE.md item 23, where the malar gate was correct,
 * tested, and dead because the region it read had been silently dropped.
 *
 * ── WHY THIS DOES NOT USE MediaPipe's TRANSFORMATION MATRIX ────────────────
 * The obvious implementation is to decompose `facialTransformationMatrixes`.
 * It was written that way first, and abandoned, for a reason worth recording
 * because it is not obvious:
 *
 * The matrix arrives as sixteen floats with an externally-owned memory layout,
 * and reading a rotation matrix row-major when it is column-major yields its
 * TRANSPOSE — a different rotation, decomposing to different angles. The
 * tempting guard is "keep whichever reading is orthonormal", and it does not
 * work at all: **the transpose of an orthonormal matrix is orthonormal**, so
 * the check passes for both readings and silently returns the first. That
 * guard was written here, looked convincing, and was caught only by a test
 * that composed a known rotation and asked for it back.
 *
 * There is also no fixed convention to decompose to. Twelve Tait-Bryan
 * orderings exist and they disagree by tens of degrees on a turned head, so
 * "the Euler angles of a matrix" is not a thing a matrix has.
 *
 * Both problems are external assumptions that cannot be settled without a
 * device. The landmarks carry depth already, so the geometry below needs
 * neither: it is exact on synthetic input and testable with no phone.
 *
 * ── SIGNS DO NOT MATTER HERE, AND THAT IS DELIBERATE ───────────────────────
 * The gate tests |yaw|, |pitch| and |roll| against symmetric limits, so the
 * only thing that has to be right is the MAGNITUDE. MediaPipe's z is a depth
 * relative to the head centre whose sign convention is not worth depending on;
 * by only ever taking an absolute value, nothing downstream does.
 */

/** Outer eye corners: subject's right, subject's left. Same pair gates.js uses. */
export const ROLL_LANDMARKS = Object.freeze([33, 263]);

/** Cheek extremes, for the horizontal axis. Subject's right, subject's left. */
export const YAW_LANDMARKS = Object.freeze([234, 454]);

/** Forehead and chin, for the vertical axis. */
export const PITCH_LANDMARKS = Object.freeze([10, 152]);

const deg = (rad) => (rad * 180) / Math.PI;
const has3d = (p) => p && typeof p.z === "number" && Number.isFinite(p.z);

/**
 * Roll, in degrees, from the inter-ocular axis.
 *
 * Exact, needs no depth, and available on every frame that has a face in it.
 * Positive is clockwise in image space.
 */
export function rollFromLandmarks(landmarks) {
  const [right, left] = ROLL_LANDMARKS.map((i) => landmarks && landmarks[i]);
  if (!right || !left) return null;
  return deg(Math.atan2(left.y - right.y, left.x - right.x));
}

/**
 * Yaw, from the depth difference across the cheeks.
 *
 * Turning the head brings one cheek toward the camera and the other away, and
 * foreshortens the horizontal span between them by exactly cos(yaw). The
 * arctangent of the two recovers the angle without needing to know the scale
 * of either — which matters, because MediaPipe's x and z are both normalised
 * by image width but that is a fact about the API, not about the face.
 */
export function yawFromLandmarks(landmarks) {
  const [right, left] = YAW_LANDMARKS.map((i) => landmarks && landmarks[i]);
  if (!has3d(right) || !has3d(left)) return null;
  const span = left.x - right.x;
  const depth = left.z - right.z;
  if (span === 0 && depth === 0) return null;
  return deg(Math.atan2(-depth, span));
}

/**
 * Pitch, from the depth difference between forehead and chin.
 *
 * Same construction on the vertical axis. Note that a face can be measured for
 * roll and refused for pitch on the same frame: roll needs two points, pitch
 * needs those two points to carry depth.
 */
export function pitchFromLandmarks(landmarks) {
  const [top, bottom] = PITCH_LANDMARKS.map((i) => landmarks && landmarks[i]);
  if (!has3d(top) || !has3d(bottom)) return null;
  const span = bottom.y - top.y;
  const depth = bottom.z - top.z;
  if (span === 0 && depth === 0) return null;
  return deg(Math.atan2(depth, span));
}

/**
 * Head pose for one frame.
 *
 * `axesMeasured` travels with the result, and the reading stores it, so "the
 * head was straight" stays distinguishable from "two of the three axes were
 * never checked". Those are different facts and only one is a measurement —
 * the same distinction `basis` carries on `glowIndex` (CLAUDE.md item 18) and
 * `zoneNotExtracted` carries on the safety adapter (item 23).
 */
export function headPose(landmarks) {
  const roll = rollFromLandmarks(landmarks);
  const yaw = yawFromLandmarks(landmarks);
  const pitch = pitchFromLandmarks(landmarks);

  const values = { yaw, pitch, roll };
  const axesMeasured = ["yaw", "pitch", "roll"].filter((k) => values[k] !== null);

  return {
    yaw, pitch, roll, axesMeasured,
    source: axesMeasured.length === 3 ? "landmarks3d" : (roll === null ? "none" : "landmarks2d"),
  };
}
