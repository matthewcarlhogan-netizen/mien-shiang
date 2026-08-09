/*
 * PHASE 2 — the eight Qi Se regions, and whether each one is readable.
 *
 * Pure and DOM-free. Takes plain landmark objects and an ImageData-shaped
 * `{width, height, data}`, so the whole file runs under `node --test` with no
 * browser and no face photograph.
 *
 * ── WHY `mirrored` IS REQUIRED RATHER THAN DEFAULTED ───────────────────────
 * MediaPipe names sides from the SUBJECT's anatomy: index 234 is the subject's
 * right cheek, 454 the subject's left (verified against its own
 * FaceLandmarksConnections in src/zones.js). Those names are only true if the
 * landmarker ran on an UN-mirrored frame. Run it on the front camera's
 * mirrored preview and every anatomical label is inverted — the subject's left
 * cheek is delivered under the indices MediaPipe calls "right".
 *
 * That inversion has shipped in this repo once already, so the flag is a
 * required argument and `extractRois` throws without it. A default would let a
 * caller that never thought about it produce a laterally-inverted reading that
 * looks entirely plausible: both cheeks are still cheeks.
 *
 * ── WHY THE POLYGONS COME FROM src/roi.js ──────────────────────────────────
 * `hullFor()` already encodes CLAUDE.md item 23: an ROI whose landmarks are
 * collinear has a hull with no width, and a sliver is silently dropped on every
 * real face. `shangen` is exactly that trap — the nose root is a midline
 * structure whose anatomical landmarks genuinely do run down the centre — so it
 * reuses the sidewall-spanning index set that was derived when the same defect
 * killed the malar gate. A negative pad is the 15% inset.
 */
import { hullFor } from "../roi.js";

/** Inset each polygon 15% toward its centroid, away from the boundary. */
export const ROI_INSET = 0.15;

/** Fewer valid regions than this and the reading is refused outright. */
export const MIN_VALID_ROIS = 6;

/* ── skin plausibility ───────────────────────────────────────────────────── */

export const SKIN_HUE_MIN = 5;
export const SKIN_HUE_MAX = 70;
export const SKIN_CHROMA_MIN = 3;
export const MAX_CLIPPED_FRACTION = 0.20;

/* ── the regions ─────────────────────────────────────────────────────────── */

/*
 * Landmark sets are shared with src/zones.js where the anatomy is the same
 * region, so the two measurement paths cannot drift apart on geometry.
 *
 * `subjectLeft` / `subjectRight` name the ANATOMY, not the image side. Which
 * index set is which flips with `mirrored`; see resolveIndices below.
 */
const SUBJECT_RIGHT_CHEEK = [234, 118, 119, 100, 120, 47, 126, 209];
const SUBJECT_LEFT_CHEEK = [454, 347, 348, 329, 349, 277, 355, 429];
const SUBJECT_RIGHT_PERIORBITAL = [33, 133, 7, 144, 145, 153, 154, 155, 246];
const SUBJECT_LEFT_PERIORBITAL = [263, 362, 373, 374, 380, 381, 382, 249, 466];

export const QISE_ROIS = Object.freeze({
  tian: {
    label: "Upper court", anatomy: "midline",
    polygons: [[10, 21, 54, 67, 251, 284, 297]],
  },
  yintang: {
    label: "Between the brows", anatomy: "midline",
    polygons: [[9, 151, 108, 107, 55, 8, 285, 336, 337]],
  },
  shangen: {
    label: "Root of the nose", anatomy: "midline",
    // MUST span both sidewalls. The dorsal midline alone is collinear and its
    // hull has no width -- CLAUDE.md item 23, which cost this repo a dead
    // safety gate that looked like an honest refusal to measure.
    polygons: [[168, 6, 197, 195, 196, 419, 3, 248]],
  },
  zhuntou: {
    label: "Tip of the nose", anatomy: "midline",
    polygons: [[4, 1, 19, 94, 2, 98, 327, 129, 358]],
  },
  quan_l: {
    label: "Cheekbone, anatomical left", anatomy: "subjectLeft",
    polygons: [SUBJECT_LEFT_CHEEK],
  },
  quan_r: {
    label: "Cheekbone, anatomical right", anatomy: "subjectRight",
    polygons: [SUBJECT_RIGHT_CHEEK],
  },
  dige: {
    label: "Lower court", anatomy: "midline",
    polygons: [[152, 148, 149, 150, 377, 378, 379, 176, 400, 175]],
  },
  periorbital: {
    // TWO polygons, pooled, never one hull over both. A single convex hull
    // spanning both under-eye areas would swallow the nose bridge, which is
    // not periorbital skin and is measured separately as `shangen`.
    label: "Under the eyes", anatomy: "bilateral",
    polygons: [SUBJECT_RIGHT_PERIORBITAL, SUBJECT_LEFT_PERIORBITAL],
  },
});

/**
 * Swap the anatomically-named index sets when the landmarker ran mirrored.
 *
 * `bilateral` and `midline` regions need no swap: pooling both sides, or
 * sitting on the axis, makes them laterality-invariant by construction.
 */
function resolveIndices(def, mirrored) {
  if (!mirrored) return def.polygons;
  if (def.anatomy === "subjectLeft") return [SUBJECT_RIGHT_CHEEK];
  if (def.anatomy === "subjectRight") return [SUBJECT_LEFT_CHEEK];
  return def.polygons;
}

/* ── geometry ────────────────────────────────────────────────────────────── */

/** Ray casting. Points exactly on an edge are not worth a special case here. */
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Region geometry for one frame.
 *
 * @param {Array<{x:number,y:number}>} landmarks image-space, 478 of them
 * @param {number} w frame width
 * @param {number} h frame height
 * @param {{mirrored:boolean}} options `mirrored` is REQUIRED
 * @returns {Object<string, {name:string, label:string, polygons:Array, dropped:string|null}>}
 */
export function extractRois(landmarks, w, h, options) {
  if (!options || typeof options.mirrored !== "boolean") {
    throw new TypeError(
      "extractRois requires an explicit `mirrored` flag: MediaPipe's left/right " +
      "landmark names are only true for an un-mirrored frame, and guessing " +
      "produces a laterally inverted reading that looks entirely plausible"
    );
  }
  if (!Array.isArray(landmarks)) throw new TypeError("extractRois requires a landmark array");

  const out = {};
  for (const [name, def] of Object.entries(QISE_ROIS)) {
    const polygons = [];
    let dropped = null;
    for (const idx of resolveIndices(def, options.mirrored)) {
      const hull = hullFor(idx, landmarks, -ROI_INSET);
      if (!hull) { dropped = dropped ?? "no_hull"; continue; }
      const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
      const bbox = {
        x0: Math.max(0, Math.floor(Math.min(...xs))),
        y0: Math.max(0, Math.floor(Math.min(...ys))),
        x1: Math.min(w, Math.ceil(Math.max(...xs))),
        y1: Math.min(h, Math.ceil(Math.max(...ys))),
      };
      if (bbox.x1 - bbox.x0 < 2 || bbox.y1 - bbox.y0 < 2) {
        dropped = dropped ?? "too_small";
        continue;
      }
      polygons.push({ hull, bbox });
    }
    if (polygons.length === 0) dropped = dropped ?? "no_hull";
    out[name] = { name, label: def.label, anatomy: def.anatomy, polygons, dropped: polygons.length ? null : dropped };
  }
  return out;
}

/* ── pixels ──────────────────────────────────────────────────────────────── */

/**
 * Every pixel inside a region's polygons.
 *
 * @returns {Array<{x:number,y:number,r:number,g:number,b:number}>}
 */
export function sampleRoiPixels(imageData, region) {
  const { width, data } = imageData;
  const px = [];
  for (const { hull, bbox } of region.polygons) {
    for (let y = bbox.y0; y < bbox.y1; y++) {
      for (let x = bbox.x0; x < bbox.x1; x++) {
        if (!pointInPolygon(x + 0.5, y + 0.5, hull)) continue;
        const i = (y * width + x) * 4;
        px.push({ x, y, r: data[i], g: data[i + 1], b: data[i + 2] });
      }
    }
  }
  return px;
}

/* ── validity ────────────────────────────────────────────────────────────── */

/**
 * Is this region's pixel set plausibly lit skin?
 *
 * ── WHY THIS EXISTS, AND WHY IT IS A FAIRNESS CHECK ────────────────────────
 * Landmark accuracy is reported to degrade on Fitzpatrick IV-VI. Left
 * unchecked that does not announce itself as an error: it silently produces
 * worse-placed regions, hence noisier baselines, for darker-skinned users
 * only. That is a fairness defect wearing a noise problem's clothing, which is
 * why the rejection rate has to be logged STRATIFIED by the user's own
 * baseline tone band during device testing rather than pooled.
 *
 * The three criteria reject the three ways a region stops being measurable:
 * it has drifted onto hair, brow or background (hue), it has been washed to
 * neutral by glare or crushed to black (chroma), or the sensor has run out of
 * range (clipping). None of them is a statement about the person.
 *
 * @param {Array} pixels from sampleRoiPixels
 * @param {{labFromSrgb8:Function, chroma:Function, hueDeg:Function}} color
 */
export function roiValidity(pixels, color) {
  if (!pixels || pixels.length === 0) {
    return { valid: false, reasons: ["no_pixels"], pixelCount: 0, medianHue: null, medianChroma: null, clippedFraction: 1 };
  }

  let clipped = 0;
  const hues = [], chromas = [];
  for (const p of pixels) {
    // A pixel is clipped if ANY channel is at a rail: one blown channel is
    // enough to move hue, and hue is what the plausibility test turns on.
    if (p.r >= 255 || p.g >= 255 || p.b >= 255 || p.r <= 0 || p.g <= 0 || p.b <= 0) clipped++;
    const lab = color.labFromSrgb8(p.r, p.g, p.b);
    hues.push(color.hueDeg(lab.a, lab.b));
    chromas.push(color.chroma(lab.a, lab.b));
  }

  const med = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const medianHue = med(hues);
  const medianChroma = med(chromas);
  const clippedFraction = clipped / pixels.length;

  const reasons = [];
  if (medianHue < SKIN_HUE_MIN || medianHue > SKIN_HUE_MAX) reasons.push("hue_out_of_range");
  if (medianChroma < SKIN_CHROMA_MIN) reasons.push("chroma_too_low");
  if (clippedFraction > MAX_CLIPPED_FRACTION) reasons.push("clipped");

  return {
    valid: reasons.length === 0,
    reasons,
    pixelCount: pixels.length,
    medianHue,
    medianChroma,
    clippedFraction,
  };
}

/**
 * Geometry, pixels and validity for one frame, in one call.
 *
 * `landmarkConfidence` is passed IN rather than invented: the MediaPipe JS API
 * exposes no per-landmark confidence, so the honest value here is whatever the
 * caller can actually supply, and `null` where it can supply nothing. A
 * fabricated 1.0 would make the ROI-validity fraction look better than it is
 * on exactly the faces the fairness check is watching.
 */
export function readRois(imageData, landmarks, options, color) {
  const regions = extractRois(landmarks, imageData.width, imageData.height, options);
  const confidence = (options && options.landmarkConfidence) || null;

  const out = {};
  let validCount = 0;
  for (const [name, region] of Object.entries(regions)) {
    if (region.dropped) {
      out[name] = {
        ...region, pixels: [], valid: false, reasons: [region.dropped],
        pixelCount: 0, medianHue: null, medianChroma: null, clippedFraction: null,
        landmarkConfidence: confidence ? (confidence[name] ?? null) : null,
      };
      continue;
    }
    const pixels = sampleRoiPixels(imageData, region);
    const v = roiValidity(pixels, color);
    if (v.valid) validCount++;
    out[name] = {
      ...region, pixels, ...v,
      landmarkConfidence: confidence ? (confidence[name] ?? null) : null,
    };
  }

  const total = Object.keys(QISE_ROIS).length;
  return {
    rois: out,
    validCount,
    validFraction: validCount / total,
    accepted: validCount >= MIN_VALID_ROIS,
  };
}
