/*
 * PHASE 8 — mapping the camera BUFFER onto the visible capture box.
 *
 * ── WHY THE GUIDE AND THE GATE CAN DISAGREE ─────────────────────────────────
 * `distance` in gates.js measures the outer-canthi span as a fraction of the
 * BUFFER width — the actual pixels the camera decoded. What a person sees is
 * a `<video>` element rendered with `object-fit: cover` into a box whose
 * aspect ratio need not match the buffer's at all (a 4:3 sensor inside a
 * portrait plate, say). `cover` scales the buffer up until it fills the box
 * on the SHORTER axis and crops the longer one — so the visible frame is a
 * scaled, cropped WINDOW onto the buffer, not the buffer itself. A guide
 * drawn as "52% of the box" has no principled relationship to "22% of the
 * buffer width" unless the crop is accounted for; get it wrong and the guide
 * teaches a person to sit exactly where the gate rejects them, which is
 * CLAUDE.md item 23's failure mode wearing a different hat — the geometry
 * looks plausible on screen and is silently measuring something else.
 *
 * This module owns that mapping as a pure function, so the guide's size is
 * DERIVED from the same threshold the gate enforces rather than chosen to
 * look right on one phone.
 */
/**
 * Bizygomatic (full face) width divided by outer-canthi span, on MediaPipe's
 * published canonical mesh — the same reference fixture item 23 measures ROI
 * extraction against (`tests/fixtures/canonical-face.js`), not an eyeballed
 * number. That fixture lives under `tests/` on purpose (a 478-point mesh is a
 * biometric-template shape and does not belong shipped in the artefact, and
 * `dist/` is a copy of `src/` only — see CLAUDE.md), so it cannot be imported
 * from here. The constant is hardcoded and PINNED instead:
 * `tests/qise/frame-geometry.test.js` recomputes this exact ratio from the
 * live fixture and asserts it still matches, so a fixture change cannot
 * silently invalidate the guide without a failing test to show it.
 *
 * Derivation: OUTER_CANTHI (gates.js: landmarks 33, 263) on the canonical
 * mesh at bizygomatic width 1000 measures a canthi span of ~580.1, scale
 * invariant at every bizygomatic value tried — 1000 / 580.1.
 */
export const GUIDE_TO_INTEROCULAR_RATIO = 1000 / 580.1148225469728;

/**
 * The oval's height relative to its own width. Purely cosmetic — the
 * `distance` gate reads only a horizontal span, so nothing here is
 * gate-critical the way `GUIDE_TO_INTEROCULAR_RATIO` is. Kept close to the
 * two ovals already shipped (52/68 and 66/76, both roughly 1.3–1.35) so this
 * change does not also relitigate the guide's shape.
 */
export const FACE_GUIDE_ASPECT = 1.3;

/**
 * How `object-fit: cover` maps a buffer of one aspect ratio into a box of
 * another: uniform scale-up until the box is filled on its SHORTER relative
 * axis, then centred, cropping whichever axis overflows.
 *
 * @returns {{scale:number, offsetX:number, offsetY:number}} offsetX/offsetY
 *   are the box-space position of the buffer's top-left corner — zero or
 *   negative on the cropped axis, exactly zero on both when the aspect
 *   ratios already match (the no-crop case beta.js reaches by setting the
 *   plate's aspect-ratio to the stream's).
 */
export function coverTransform({ bufferWidth, bufferHeight, boxWidth, boxHeight }) {
  if (!(bufferWidth > 0) || !(bufferHeight > 0) || !(boxWidth > 0) || !(boxHeight > 0)) {
    throw new RangeError("coverTransform requires four positive dimensions");
  }
  const scale = Math.max(boxWidth / bufferWidth, boxHeight / bufferHeight);
  const offsetX = (boxWidth - bufferWidth * scale) / 2;
  const offsetY = (boxHeight - bufferHeight * scale) / 2;
  return { scale, offsetX, offsetY };
}

/** A rectangle given in BUFFER pixels, mapped into BOX pixels under a cover transform. */
export function bufferRectToBox(rect, transform) {
  return {
    x: rect.x * transform.scale + transform.offsetX,
    y: rect.y * transform.scale + transform.offsetY,
    width: rect.width * transform.scale,
    height: rect.height * transform.scale,
  };
}

/**
 * The face guide, as box-relative FRACTIONS (0..1) ready to apply as CSS
 * percentages — so the DOM layer does not need to re-run this on every
 * resize as long as it re-reads `boxWidth`/`boxHeight` when they change.
 *
 * The width is sized so that a face whose outer-canthi span exactly equals
 * `minInterocularFraction` of the BUFFER width — the `distance` gate's own
 * threshold — exactly fills the guide. No comfort margin is added: this is a
 * single target ring, not a too-far/target/too-close band, which needs
 * physical-device calibration this sandbox cannot do (see CLAUDE.md and the
 * Samsung diagnostics note). Filling the guide means "at least the passing
 * distance," and getting closer than that remains comfortable, not required.
 */
export function faceGuideRect({
  bufferWidth, bufferHeight, boxWidth, boxHeight,
  minInterocularFraction, guideToInterocularRatio = GUIDE_TO_INTEROCULAR_RATIO,
  aspect = FACE_GUIDE_ASPECT,
}) {
  const transform = coverTransform({ bufferWidth, bufferHeight, boxWidth, boxHeight });
  const guideBufferWidth = minInterocularFraction * guideToInterocularRatio * bufferWidth;
  const guideBoxWidth = guideBufferWidth * transform.scale;
  const guideBoxHeight = guideBoxWidth * aspect;

  return {
    widthFraction: guideBoxWidth / boxWidth,
    heightFraction: guideBoxHeight / boxHeight,
    leftFraction: (boxWidth - guideBoxWidth) / 2 / boxWidth,
    topFraction: (boxHeight - guideBoxHeight) / 2 / boxHeight,
    // Exposed so a caller can warn (or clamp) rather than silently render a
    // guide that overflows the box — an extreme aspect mismatch between an
    // unusual camera and a very short viewport is not impossible.
    overflowsBox: guideBoxWidth > boxWidth || guideBoxHeight > boxHeight,
  };
}
