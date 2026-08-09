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
 * The PROJECTED angle of the inter-ocular axis, in degrees.
 *
 * Needs no depth and is available on any frame with a face in it. It is the
 * true roll only when the head is not simultaneously yawed and pitched — see
 * `correctRoll` for why, and for the exact correction.
 *
 * Positive is clockwise in image space.
 */
export function rollFromLandmarks(landmarks) {
  const [right, left] = ROLL_LANDMARKS.map((i) => landmarks && landmarks[i]);
  if (!right || !left) return null;
  const dx = left.x - right.x, dy = left.y - right.y;
  // Coincident corners give atan2(0, 0) === 0, which is a confident report of
  // "perfectly level" from a frame that measured nothing at all.
  if (dx === 0 && dy === 0) return null;
  return deg(Math.atan2(dy, dx));
}

/**
 * Recover true roll from the projected angle, given yaw and pitch.
 *
 * ── WHY THE PROJECTED ANGLE IS NOT THE ROLL ────────────────────────────────
 * Take the inter-ocular vector as (d, 0, 0) and apply yaw b, pitch a, roll c.
 * Its projection onto the image plane comes out as
 *
 *   x' = d(cos b cos c − sin b sin a sin c)
 *   y' = d(cos b sin c + sin b sin a cos c)
 *
 * so atan2(y', x') = c + atan(tan b · sin a). The bias vanishes when either
 * yaw or pitch is zero — which is exactly why per-axis tests pass and the
 * error only appears when the head is turned in two directions at once.
 *
 * Uncorrected it reaches 3.45 degrees over the gate's window, and that is
 * enough to matter: a head at yaw −12, pitch −11, roll −10 projects to −7.68
 * and clears the 8-degree roll limit. The mitigation originally recorded here
 * — "yaw has already failed by then" — was simply wrong, because
 * `marginBelow(12, 12)` is 0, and 0 passes.
 *
 * Correcting it takes the worst error over the same window to 0.105 degrees,
 * the residue being pitch's own measurement error propagating through.
 */
export function correctRoll(projectedRoll, yaw, pitch) {
  if (projectedRoll === null) return null;
  if (yaw === null || pitch === null) return projectedRoll;
  const bias = deg(Math.atan(Math.tan((yaw * Math.PI) / 180) * Math.sin((pitch * Math.PI) / 180)));
  return projectedRoll - bias;
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
  const yaw = yawFromLandmarks(landmarks);
  const pitch = pitchFromLandmarks(landmarks);
  const roll = correctRoll(rollFromLandmarks(landmarks), yaw, pitch);

  const values = { yaw, pitch, roll };
  const axesMeasured = ["yaw", "pitch", "roll"].filter((k) => values[k] !== null);

  // Derived from what was measured, not from roll alone: a frame with depth
  // but no usable eye corners measures two axes, and reporting "none" beside
  // an axesMeasured of length two is a contradiction a reader has to resolve.
  const source = axesMeasured.length === 0
    ? "none"
    : (axesMeasured.length === 3 ? "landmarks3d" : "landmarks2d");

  return { yaw, pitch, roll, axesMeasured, source };
}
