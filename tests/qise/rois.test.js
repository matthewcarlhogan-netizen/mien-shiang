/*
 * PHASE 2 gate, first half — regions and their validity.
 *
 * The laterality test is built PHYSICALLY: it paints a mark on the anatomical
 * left cheek, flips the actual image the way a front camera does, and asserts
 * which region the mark lands in. Asserting on index numbers instead would
 * only restate the mapping the code already contains.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractRois, readRois, roiValidity, sampleRoiPixels, QISE_ROIS,
  MIN_VALID_ROIS, ROI_INSET,
} from "../../src/qise/rois.js";
import * as color from "../../src/qise/color.js";
import {
  canonicalFace, syntheticFace, blankImage, fillPolygon, flipHorizontal,
  roiHull, meanOf, FRAME_W, FRAME_H,
} from "./fixtures/synthetic.js";

const PTS = canonicalFace();

/* ─────────────────────────────────────────────────── the required flag ─── */

test("extractRois REFUSES to guess the mirroring", () => {
  // A default would let a caller who never thought about it produce a
  // laterally inverted reading. Both cheeks are still cheeks, so nothing
  // downstream looks wrong.
  assert.throws(() => extractRois(PTS, FRAME_W, FRAME_H), TypeError);
  assert.throws(() => extractRois(PTS, FRAME_W, FRAME_H, {}), TypeError);
  assert.throws(() => extractRois(PTS, FRAME_W, FRAME_H, { mirrored: undefined }), TypeError);
  assert.throws(() => extractRois(PTS, FRAME_W, FRAME_H, { mirrored: "yes" }), TypeError,
    "a truthy string is not a boolean; the flag must be explicit");

  assert.doesNotThrow(() => extractRois(PTS, FRAME_W, FRAME_H, { mirrored: false }));
  assert.doesNotThrow(() => extractRois(PTS, FRAME_W, FRAME_H, { mirrored: true }));
});

/* ───────────────────────────────────────────────── every ROI has area ─── */

test("EVERY region encloses area on the canonical mesh — none is silently dropped", () => {
  // CLAUDE.md item 23. `nose_bridge` was five collinear midline points, so its
  // hull had no width and it was dropped on every real face — which killed the
  // safety gate that read it, while the app looked like it was honestly
  // declining to measure. `shangen` is the same anatomy and the same trap.
  const rois = extractRois(PTS, FRAME_W, FRAME_H, { mirrored: false });

  assert.equal(Object.keys(rois).length, 8, "the brief names eight regions");

  const dropped = Object.values(rois).filter((r) => r.dropped);
  assert.deepEqual(dropped.map((r) => `${r.name}: ${r.dropped}`), []);

  for (const r of Object.values(rois)) {
    for (const p of r.polygons) {
      const w = p.bbox.x1 - p.bbox.x0, h = p.bbox.y1 - p.bbox.y0;
      assert.ok(w >= 8 && h >= 8,
        `${r.name} is ${w}x${h}px — too few pixels for the colorimetry to mean anything`);
    }
  }
});

test("shangen spans the sidewalls, not the dorsal midline", () => {
  // The specific failure: a midline-only set is collinear, `pad` expands about
  // the centroid so a sliver stays a sliver, and the zone vanishes.
  const { shangen } = extractRois(PTS, FRAME_W, FRAME_H, { mirrored: false });
  const w = shangen.polygons[0].bbox.x1 - shangen.polygons[0].bbox.x0;
  assert.ok(w >= 16, `shangen is only ${w}px wide; it has collapsed back onto the midline`);
});

test("periorbital is TWO pooled polygons, never one hull across the nose", () => {
  const { periorbital, shangen } = extractRois(PTS, FRAME_W, FRAME_H, { mirrored: false });
  assert.equal(periorbital.polygons.length, 2);

  // A single hull over both under-eye areas would swallow the nose root, which
  // is separately measured and is not periorbital skin.
  const spansNose = periorbital.polygons.some((p) =>
    p.bbox.x0 <= shangen.polygons[0].bbox.x0 && p.bbox.x1 >= shangen.polygons[0].bbox.x1);
  assert.equal(spansNose, false, "a periorbital polygon has swallowed the nose root");
});

test("the 15% inset pulls the polygon inside its landmarks", () => {
  assert.equal(ROI_INSET, 0.15);
  const raw = roiHull(PTS, "dige");
  const lm = QISE_ROIS.dige.polygons[0].map((i) => PTS[i]);
  const spanRaw = Math.max(...raw.map((p) => p.x)) - Math.min(...raw.map((p) => p.x));
  const spanLm = Math.max(...lm.map((p) => p.x)) - Math.min(...lm.map((p) => p.x));
  assert.ok(spanRaw < spanLm, `inset hull (${spanRaw}) must be narrower than its landmarks (${spanLm})`);
});

/* ──────────────────────────────────────────────────────────── laterality ─── */

test("mirrored:true maps quan_l to the anatomical left, and mirrored:false does not", () => {
  const MARK = [40, 200, 90];   // nothing skin-coloured, so it cannot be confused
  const SKIN = [200, 150, 140];

  // 1. The world: a mark on the subject's ANATOMICAL LEFT cheek. MediaPipe
  //    names sides from the subject, so in an un-mirrored frame that is the
  //    454 set — and it lands on the high-x side of the image, which is where
  //    an observer facing the subject sees their left.
  const unmirrored = blankImage(FRAME_W, FRAME_H, [20, 20, 24]);
  for (const name of Object.keys(QISE_ROIS)) {
    for (let i = 0; i < QISE_ROIS[name].polygons.length; i++) {
      fillPolygon(unmirrored, roiHull(PTS, name, i), SKIN);
    }
  }
  const anatomicalLeftHull = roiHull(PTS, "quan_l");
  assert.ok(anatomicalLeftHull.every((p) => p.x > FRAME_W / 2),
    "sanity: in an un-mirrored frame the subject's left cheek sits at high x");
  fillPolygon(unmirrored, anatomicalLeftHull, MARK);

  // 2. The front camera mirrors the preview. The mark is now on the other side
  //    of the image. The canonical mesh is exactly bilaterally symmetric, so
  //    the landmarker run on the flipped frame emits the same coordinate array
  //    with the anatomical labels swapped — which is the whole bug.
  const mirroredFrame = flipHorizontal(unmirrored);

  const markFraction = (imageData, mirrored) => {
    const rois = extractRois(PTS, FRAME_W, FRAME_H, { mirrored });
    const px = sampleRoiPixels(imageData, rois.quan_l);
    assert.ok(px.length > 100, "the region sampled nothing");
    const hits = px.filter((p) => p.g > 150 && p.r < 100).length;
    return hits / px.length;
  };

  // 3. Told the frame is mirrored, quan_l must find the mark.
  assert.ok(markFraction(mirroredFrame, true) > 0.95,
    "mirrored:true failed to map quan_l onto the anatomical left cheek");

  // 4. Told it is not, it must not — this is the inversion that shipped.
  assert.ok(markFraction(mirroredFrame, false) < 0.05,
    "mirrored:false found the mark anyway, so the flag is doing nothing");

  // 5. And the positive control, so the test cannot pass by both sides failing:
  //    on the genuinely un-mirrored frame the polarity is the other way round.
  assert.ok(markFraction(unmirrored, false) > 0.95);
  assert.ok(markFraction(unmirrored, true) < 0.05);
});

test("midline and bilateral regions are laterality-invariant by construction", () => {
  const a = extractRois(PTS, FRAME_W, FRAME_H, { mirrored: false });
  const b = extractRois(PTS, FRAME_W, FRAME_H, { mirrored: true });
  for (const name of ["tian", "yintang", "shangen", "zhuntou", "dige", "periorbital"]) {
    assert.deepEqual(a[name].polygons.map((p) => p.bbox), b[name].polygons.map((p) => p.bbox),
      `${name} moved when the mirror flag changed, and it should not have`);
  }
  // The cheeks, on the other hand, must swap.
  assert.deepEqual(a.quan_l.polygons[0].bbox, b.quan_r.polygons[0].bbox);
  assert.deepEqual(a.quan_r.polygons[0].bbox, b.quan_l.polygons[0].bbox);
});

/* ─────────────────────────────────────────────────────────────── validity ─── */

const pixelsOf = (rgb, n = 400) => Array.from({ length: n }, (_, i) =>
  ({ x: i % 20, y: Math.floor(i / 20), r: rgb[0], g: rgb[1], b: rgb[2] }));

test("plausible skin passes, and the three implausible shapes each fail", () => {
  const ok = roiValidity(pixelsOf([200, 150, 140]), color);
  assert.equal(ok.valid, true, `plausible skin was rejected: ${ok.reasons}`);
  assert.ok(ok.medianHue > 5 && ok.medianHue < 70);

  // Drifted onto hair, brow or background: the hue is nowhere near skin.
  const green = roiValidity(pixelsOf([40, 200, 90]), color);
  assert.equal(green.valid, false);
  assert.ok(green.reasons.includes("hue_out_of_range"), green.reasons.join(","));

  // Washed to neutral by glare, or crushed to black.
  const grey = roiValidity(pixelsOf([128, 128, 128]), color);
  assert.equal(grey.valid, false);
  assert.ok(grey.reasons.includes("chroma_too_low"), grey.reasons.join(","));

  // Sensor out of range. More than a fifth of the pixels at a rail.
  const half = [...pixelsOf([255, 255, 255], 200), ...pixelsOf([200, 150, 140], 200)];
  const clipped = roiValidity(half, color);
  assert.equal(clipped.valid, false);
  assert.ok(clipped.reasons.includes("clipped"), clipped.reasons.join(","));
  assert.ok(Math.abs(clipped.clippedFraction - 0.5) < 1e-9);

  // A minority of clipped pixels is tolerated — a few specular highlights are
  // normal and rejecting on them would refuse most real captures.
  const few = [...pixelsOf([255, 255, 255], 40), ...pixelsOf([200, 150, 140], 360)];
  assert.equal(roiValidity(few, color).valid, true);
});

test("an empty region is invalid, and says why, rather than dividing by zero", () => {
  const v = roiValidity([], color);
  assert.equal(v.valid, false);
  assert.deepEqual(v.reasons, ["no_pixels"]);
  assert.equal(v.pixelCount, 0);
});

/* ─────────────────────────────────────────────────────── the 6-of-8 floor ─── */

test("a clean synthetic face reads all eight regions and is accepted", () => {
  const { img, pts } = syntheticFace();
  const r = readRois(img, pts, { mirrored: false }, color);
  assert.equal(r.validCount, 8, JSON.stringify(
    Object.fromEntries(Object.entries(r.rois).map(([k, v]) => [k, v.reasons]))));
  assert.equal(r.accepted, true);
  assert.equal(r.validFraction, 1);
});

test("fewer than six readable regions is a refused reading", () => {
  assert.equal(MIN_VALID_ROIS, 6);
  // Three regions blown out to white, so five remain.
  const { img, pts } = syntheticFace({
    perRoi: { tian: [255, 255, 255], yintang: [255, 255, 255], shangen: [255, 255, 255] },
  });
  const r = readRois(img, pts, { mirrored: false }, color);
  assert.equal(r.validCount, 5);
  assert.equal(r.accepted, false);

  // Two blown out leaves six, which is exactly the floor and must be accepted:
  // an off-by-one here quietly costs the user a fifth of their captures.
  const two = syntheticFace({ perRoi: { tian: [255, 255, 255], yintang: [255, 255, 255] } });
  const r2 = readRois(two.img, two.pts, { mirrored: false }, color);
  assert.equal(r2.validCount, 6);
  assert.equal(r2.accepted, true);
});

test("landmark confidence is reported as given, and null when nothing supplies it", () => {
  // The MediaPipe JS API exposes no per-landmark confidence. Fabricating 1.0
  // would make the validity fraction look best on exactly the faces the
  // fairness check is watching.
  const { img, pts } = syntheticFace();
  const bare = readRois(img, pts, { mirrored: false }, color);
  assert.equal(bare.rois.tian.landmarkConfidence, null);

  const withConf = readRois(img, pts,
    { mirrored: false, landmarkConfidence: { tian: 0.42 } }, color);
  assert.equal(withConf.rois.tian.landmarkConfidence, 0.42);
  assert.equal(withConf.rois.dige.landmarkConfidence, null);
});

test("the synthetic face really does carry the colour it was asked for", () => {
  // Positive control on the fixture itself. Every assertion above about a
  // region failing is worthless if the painter never painted anything.
  const { img, pts } = syntheticFace({ perRoi: { quan_l: [220, 130, 120] } });
  const m = meanOf(img, roiHull(pts, "quan_l"));
  assert.ok(m.n > 100, `painted region has only ${m.n} pixels`);
  assert.ok(Math.abs(m.r - 220) < 1 && Math.abs(m.g - 130) < 1 && Math.abs(m.b - 120) < 1,
    `painted region measured ${JSON.stringify(m)}`);
});
