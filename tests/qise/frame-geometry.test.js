/*
 * PHASE 8 — the buffer→box mapping, and the guide sized from it.
 *
 * `object-fit: cover` is the whole hazard: it lets the visible frame be a
 * scaled, cropped WINDOW onto the camera buffer, so a guide sized as a
 * fraction of the box has no necessary relationship to the fraction of the
 * BUFFER the `distance` gate actually measures. Three shapes are required —
 * a landscape buffer inside a portrait box (the reported failure: a 4:3
 * sensor cropped into a taller plate), a portrait buffer at a different
 * portrait box size (no crop, just scale), and matching aspect ratios (no
 * crop at all, the case `setPlateAspectRatio` reaches deliberately).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  coverTransform, bufferRectToBox, faceGuideRect, GUIDE_TO_INTEROCULAR_RATIO, FACE_GUIDE_ASPECT,
} from "../../src/qise/frame-geometry.js";
import { canonicalFace } from "../fixtures/canonical-face.js";
import { OUTER_CANTHI, DISTANCE_MIN_FRACTION } from "../../src/qise/gates.js";

/* ── the pin against the live fixture ────────────────────────────────────── */

test("GUIDE_TO_INTEROCULAR_RATIO matches a fresh measurement of the canonical mesh", () => {
  // If tests/fixtures/canonical-face.js ever changes, this is what notices —
  // the constant in src/ is hardcoded on purpose (see the comment there) and
  // cannot import the fixture itself.
  for (const bizygomatic of [200, 1000, 4000]) {
    const pts = canonicalFace({ bizygomatic, cx: bizygomatic, cy: bizygomatic });
    const [a, b] = OUTER_CANTHI.map((i) => pts[i]);
    const canthi = Math.hypot(a.x - b.x, a.y - b.y);
    const measured = bizygomatic / canthi;
    assert.ok(Math.abs(measured - GUIDE_TO_INTEROCULAR_RATIO) < 1e-6,
      `at bizygomatic=${bizygomatic}, measured ${measured} vs pinned ${GUIDE_TO_INTEROCULAR_RATIO}`);
  }
});

/* ── coverTransform: the three required shapes ───────────────────────────── */

test("cover: a 4:3 landscape buffer inside a portrait box crops the WIDTH, not the height", () => {
  // This is the reported failure's exact shape: a 1280x960 sensor inside a
  // taller-than-wide plate.
  const t = coverTransform({ bufferWidth: 1280, bufferHeight: 960, boxWidth: 400, boxHeight: 600 });
  // cover picks the LARGER of the two axis scales so the box is fully
  // covered: height needs scale 600/960=0.625, width needs 400/1280=0.3125 —
  // the height ratio wins, so height is exactly filled (offsetY 0) and width
  // overflows the box (negative offsetX, i.e. cropped on both sides).
  assert.ok(Math.abs(t.scale - 0.625) < 1e-9);
  assert.ok(Math.abs(t.offsetY) < 1e-9, "height must be exactly filled, no vertical crop");
  assert.ok(t.offsetX < 0, "width must be cropped (buffer wider than the box can show)");
  const displayedWidth = 1280 * t.scale;
  assert.ok(displayedWidth > 400, "the scaled buffer must overflow the box horizontally");
});

test("cover: a portrait buffer in a differently-sized portrait box scales without disproportionate crop on either dominant axis", () => {
  const t = coverTransform({ bufferWidth: 960, bufferHeight: 1280, boxWidth: 300, boxHeight: 500 });
  // width needs 300/960=0.3125, height needs 500/1280=0.390625 — height wins.
  assert.ok(Math.abs(t.scale - 500 / 1280) < 1e-9);
  assert.ok(Math.abs(t.offsetY) < 1e-9);
  assert.ok(t.offsetX < 0);
});

test("cover: matching aspect ratios crop NOTHING — the case setPlateAspectRatio reaches deliberately", () => {
  const t = coverTransform({ bufferWidth: 1280, bufferHeight: 960, boxWidth: 640, boxHeight: 480 });
  assert.ok(Math.abs(t.offsetX) < 1e-9);
  assert.ok(Math.abs(t.offsetY) < 1e-9);
  assert.ok(Math.abs(t.scale - 0.5) < 1e-9);
});

test("cover: rejects non-positive dimensions rather than returning a nonsensical transform", () => {
  assert.throws(() => coverTransform({ bufferWidth: 0, bufferHeight: 960, boxWidth: 400, boxHeight: 600 }));
  assert.throws(() => coverTransform({ bufferWidth: 1280, bufferHeight: -1, boxWidth: 400, boxHeight: 600 }));
});

/* ── bufferRectToBox ──────────────────────────────────────────────────────── */

test("bufferRectToBox: a rectangle centred in the buffer maps to one still centred in the box, once crop is applied", () => {
  const t = coverTransform({ bufferWidth: 1280, bufferHeight: 960, boxWidth: 400, boxHeight: 600 });
  // The rectangle spanning the whole buffer must map to something whose
  // centre matches the box centre, whatever the crop.
  const whole = bufferRectToBox({ x: 0, y: 0, width: 1280, height: 960 }, t);
  const centreX = whole.x + whole.width / 2;
  const centreY = whole.y + whole.height / 2;
  assert.ok(Math.abs(centreX - 200) < 1e-6, `expected the buffer's centre to land at the box's horizontal centre, got ${centreX}`);
  assert.ok(Math.abs(centreY - 300) < 1e-6);
});

/* ── faceGuideRect: the actual bug ────────────────────────────────────────── */

/** A face at exactly the distance threshold: interocular span == 22% of buffer width. */
function faceAtThreshold(bufferWidth) {
  return DISTANCE_MIN_FRACTION * bufferWidth;
}

test("the guide, once cropped into the box, represents the SAME buffer fraction the distance gate enforces — not a fraction of the cropped box", () => {
  // The historical bug: the beta's oval was 52% of the (cropped) PLATE width,
  // while `object-fit: cover` on a 1280x960 buffer inside a 3:4 plate showed
  // only ~56% of the buffer's width at all — so a face that exactly filled
  // the old guide measured well short of 22% of the true buffer width.
  const bufferWidth = 1280, bufferHeight = 960;
  const boxWidth = 400, boxHeight = 600; // uncropped 3:4-ish portrait plate
  const guide = faceGuideRect({
    bufferWidth, bufferHeight, boxWidth, boxHeight, minInterocularFraction: DISTANCE_MIN_FRACTION,
  });

  const transform = coverTransform({ bufferWidth, bufferHeight, boxWidth, boxHeight });
  const guideWidthInBuffer = (guide.widthFraction * boxWidth) / transform.scale;
  const impliedBizygomaticFraction = guideWidthInBuffer / bufferWidth;
  const impliedInterocularFraction = impliedBizygomaticFraction / GUIDE_TO_INTEROCULAR_RATIO;

  assert.ok(Math.abs(impliedInterocularFraction - DISTANCE_MIN_FRACTION) < 1e-9,
    `the guide's buffer-space interocular fraction ${impliedInterocularFraction} must equal the gate's own threshold ${DISTANCE_MIN_FRACTION}`);
});

test("a face exactly filling the guide clears the distance gate; one 10% narrower does not", () => {
  const bufferWidth = 1280, bufferHeight = 960;
  const boxWidth = 400, boxHeight = 600;
  const guide = faceGuideRect({
    bufferWidth, bufferHeight, boxWidth, boxHeight, minInterocularFraction: DISTANCE_MIN_FRACTION,
  });
  const transform = coverTransform({ bufferWidth, bufferHeight, boxWidth, boxHeight });
  const guideWidthInBuffer = (guide.widthFraction * boxWidth) / transform.scale;
  const bizygomaticFillingGuide = guideWidthInBuffer;
  const interocularFillingGuide = bizygomaticFillingGuide / GUIDE_TO_INTEROCULAR_RATIO;

  assert.ok(interocularFillingGuide / bufferWidth >= DISTANCE_MIN_FRACTION - 1e-9,
    "a face filling the guide must clear the gate");
  assert.ok((interocularFillingGuide * 0.9) / bufferWidth < DISTANCE_MIN_FRACTION,
    "a face 10% narrower than the guide must fail the gate — the guide is not padded with slack");
});

test("faceGuideRect is centred in the box on both axes", () => {
  const guide = faceGuideRect({
    bufferWidth: 1280, bufferHeight: 960, boxWidth: 400, boxHeight: 600,
    minInterocularFraction: DISTANCE_MIN_FRACTION,
  });
  assert.ok(Math.abs(guide.leftFraction - (1 - guide.widthFraction) / 2) < 1e-9);
  assert.ok(Math.abs(guide.topFraction - (1 - guide.heightFraction) / 2) < 1e-9);
});

test("faceGuideRect height follows FACE_GUIDE_ASPECT off the same width, and reports overflow honestly", () => {
  const bufferWidth = 1280, bufferHeight = 960, boxWidth = 400, boxHeight = 600;
  const guide = faceGuideRect({
    bufferWidth, bufferHeight, boxWidth, boxHeight, minInterocularFraction: DISTANCE_MIN_FRACTION,
  });
  const widthPx = guide.widthFraction * boxWidth;
  const heightPx = guide.heightFraction * boxHeight;
  assert.ok(Math.abs(heightPx / widthPx - FACE_GUIDE_ASPECT) < 1e-6);
  assert.equal(guide.overflowsBox, false);

  // A pathological box (extremely short) where the derived guide would not
  // physically fit must say so rather than silently drawing off-frame.
  const cramped = faceGuideRect({
    bufferWidth: 1280, bufferHeight: 960, boxWidth: 400, boxHeight: 40,
    minInterocularFraction: DISTANCE_MIN_FRACTION,
  });
  assert.equal(cramped.overflowsBox, true);
});

test("faceGuideRect reduces to a fixed buffer fraction when the box aspect matches the buffer's (no crop)", () => {
  // The setPlateAspectRatio() case: the plate's CSS aspect-ratio is set to
  // the live stream's, so cover crops nothing and the guide is simply a
  // fixed fraction of the visible width, independent of the box's absolute
  // size — verified at two different absolute sizes of the same aspect.
  const a = faceGuideRect({
    bufferWidth: 1280, bufferHeight: 960, boxWidth: 1280, boxHeight: 960,
    minInterocularFraction: DISTANCE_MIN_FRACTION,
  });
  const b = faceGuideRect({
    bufferWidth: 1280, bufferHeight: 960, boxWidth: 320, boxHeight: 240,
    minInterocularFraction: DISTANCE_MIN_FRACTION,
  });
  assert.ok(Math.abs(a.widthFraction - b.widthFraction) < 1e-9);
  assert.ok(Math.abs(a.widthFraction - DISTANCE_MIN_FRACTION * GUIDE_TO_INTEROCULAR_RATIO) < 1e-9);
});
