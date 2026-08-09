/*
 * PHASE 2 gate, second half — the illuminant estimate.
 *
 * Gate 2 names four things: the laterality test (in rois.test.js),
 * `insufficient` on a synthetic black eye region, valid gains on a synthetic
 * neutral, and `sclera-drift` when a sample is shifted 3 MAD in red.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sampleSclera, mad, SCLERA_MIN_PIXELS, SCLERA_DRIFT_MADS, SCLERA_MAD_FLOOR,
  SCLERA_ABSOLUTE_TOLERANCE, SCLERA_MIN_HISTORY, SCLERA_HISTORY_LENGTH,
  SCLERA_DRIFT_MESSAGE,
} from "../../src/qise/sclera.js";
import {
  srgbToLinear, applyGains, labFromLinear, deltaE76, labFromSrgb8, chroma,
} from "../../src/qise/color.js";
import { hullFor } from "../../src/roi.js";
import {
  canonicalFace, syntheticFace, fillPolygon, SCLERA_TRIANGLES, FRAME_W, FRAME_H,
} from "./fixtures/synthetic.js";

const opts = { mirrored: false };

/* ───────────────────────────────────────────────────────── the happy path ─── */

test("a neutral sclera yields near-unity gains and enough surviving pixels", () => {
  const { img, pts } = syntheticFace({ sclera: [230, 230, 228] });
  const s = sampleSclera(img, pts, opts);

  assert.equal(s.confidence, "ok", JSON.stringify(s.stages));
  assert.ok(s.pixelCount >= SCLERA_MIN_PIXELS,
    `only ${s.pixelCount} pixels survived the four filters (need ${SCLERA_MIN_PIXELS})`);

  // 230/230/228 is very slightly warm, so the blue gain lifts a little.
  for (const k of ["r", "g", "b"]) {
    assert.ok(Math.abs(s.gains[k] - 1) < 0.05, `gain ${k} = ${s.gains[k]}`);
    assert.ok(Math.abs(s.rawRatios[k] - 1) < 0.05, `ratio ${k} = ${s.rawRatios[k]}`);
  }
  assert.equal(s.withinAbsoluteTolerance, true);

  // gains and rawRatios are reciprocal views of the same estimate.
  for (const k of ["r", "g", "b"]) {
    assert.ok(Math.abs(s.gains[k] * s.rawRatios[k] - 1) < 1e-9);
  }
});

test("the estimated gains actually undo a synthetic illuminant", () => {
  // The point of the whole file. Without this, "gains near 1 on neutral" would
  // pass for an implementation that always returns 1.
  const warm = { r: 1.18, g: 1.0, b: 0.78 };
  const bend = (rgb) => rgb.map((c, i) => {
    const lin = srgbToLinear(c) * [warm.r, warm.g, warm.b][i];
    const s = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(255, s * 255)));
  });

  const neutral = syntheticFace({ skin: [200, 150, 140], sclera: [230, 230, 228] });
  const lit = syntheticFace({ skin: bend([200, 150, 140]), sclera: bend([230, 230, 228]) });

  const sN = sampleSclera(neutral.img, neutral.pts, opts);
  const sL = sampleSclera(lit.img, lit.pts, opts);
  assert.equal(sL.confidence, "ok");

  const skinLin = (rgb) => ({ r: srgbToLinear(rgb[0]), g: srgbToLinear(rgb[1]), b: srgbToLinear(rgb[2]) });
  const corrected = labFromLinear(applyGains(skinLin(bend([200, 150, 140])), sL.gains));
  const reference = labFromLinear(applyGains(skinLin([200, 150, 140]), sN.gains));
  const uncorrected = labFromLinear(skinLin(bend([200, 150, 140])));

  const residual = deltaE76(corrected, reference);
  const before = deltaE76(uncorrected, labFromLinear(skinLin([200, 150, 140])));
  assert.ok(residual < before / 5,
    `correction barely helped: ${residual.toFixed(3)} residual against ${before.toFixed(3)} uncorrected`);
});

/* ──────────────────────────────────────────────────────────── insufficient ─── */

test("a black eye region reports `insufficient` rather than a confident nonsense", () => {
  const pts = canonicalFace();
  const { img } = syntheticFace({ pts });
  // Paint the sclera out entirely. The luminance trim then has nothing above
  // the floor and the estimate must refuse rather than divide by a near-zero.
  for (const idx of SCLERA_TRIANGLES) {
    const hull = hullFor(idx, pts, -0.25);
    if (hull) fillPolygon(img, hull, [0, 0, 0]);
  }
  const s = sampleSclera(img, pts, opts);

  assert.equal(s.confidence, "insufficient");
  assert.equal(s.confidenceValue, 0);
  assert.equal(s.gains, null, "a refused estimate must not hand back gains anyway");
  assert.equal(s.rawRatios, null);
  assert.equal(s.withinAbsoluteTolerance, false);
});

test("the refusal distinguishes `too dark` from `too few pixels`", () => {
  // Not a pedantic distinction. An all-black eye region yields PLENTY of
  // pixels — 500-odd of them — so a pixel-count guard alone reports a
  // confident neutral estimate built from quantisation noise. The two refusals
  // also point at different bugs: too dark is a capture problem, too few
  // pixels is a landmark problem.
  const pts = canonicalFace();
  const img = syntheticFace({ pts }).img;

  const dark = sampleSclera(
    { width: FRAME_W, height: FRAME_H, data: new Uint8ClampedArray(img.data.length) }, pts, opts);
  assert.equal(dark.confidence, "insufficient");
  assert.equal(dark.reason, "too_dark");
  assert.ok(dark.pixelCount > SCLERA_MIN_PIXELS,
    "the point of this case is that the pixel count is HEALTHY and the sample is still worthless");

  // Landmarks off the frame: genuinely nothing to sample.
  const offFrame = pts.map((p) => ({ x: p.x + FRAME_W, y: p.y }));
  const gone = sampleSclera(img, offFrame, opts);
  assert.equal(gone.confidence, "insufficient");
  assert.equal(gone.reason, "too_few_pixels");
  assert.ok(gone.pixelCount < SCLERA_MIN_PIXELS);
});

/* ─────────────────────────────────────────────────────── the four filters ─── */

test("conjunctival vessels are dropped by the chromaticity filter, not by luminance", () => {
  // Vessels sit in the MIDDLE of the luminance distribution, which is exactly
  // why a naive luminance trim leaves them in. Paint a red streak across each
  // triangle at sclera-like brightness and check it does not move the estimate.
  const pts = canonicalFace();
  const clean = syntheticFace({ pts, sclera: [230, 230, 228] });
  const veined = syntheticFace({ pts, sclera: [230, 230, 228] });
  // A vessel colour matched in L* to the sclera around it and differing only
  // in chroma, so a luminance trim genuinely cannot see it. Solved for rather
  // than eyeballed: eyeballing gives a colour that is also brighter, and then
  // the test passes for the wrong reason.
  const base = labFromSrgb8(230, 230, 228);
  let vessel = null;
  for (let r = 231; r <= 255 && !vessel; r++) {
    for (let g = 200; g <= 230; g++) {
      const lab = labFromSrgb8(r, g, g - 2);
      if (Math.abs(lab.L - base.L) < 0.25 && chroma(lab.a, lab.b) > chroma(base.a, base.b) + 6) {
        vessel = [r, g, g - 2];
        break;
      }
    }
  }
  assert.ok(vessel, "could not construct an equal-luminance vessel colour");

  for (const idx of SCLERA_TRIANGLES) {
    const hull = hullFor(idx, pts, -0.25);
    if (!hull) continue;
    // Every fourth row: 25% of the region, inside the 30% the chroma filter
    // removes. More than that and the filter is being asked to do the
    // impossible rather than being tested.
    fillPolygon(veined.img, hull, (x, y) => (y % 4 === 0 ? vessel : [230, 230, 228]));
  }

  const a = sampleSclera(clean.img, clean.pts, opts);
  const b = sampleSclera(veined.img, veined.pts, opts);
  assert.equal(b.confidence, "ok");
  for (const k of ["r", "g", "b"]) {
    assert.ok(Math.abs(a.rawRatios[k] - b.rawRatios[k]) < 0.01,
      `vessels moved the ${k} ratio from ${a.rawRatios[k]} to ${b.rawRatios[k]}`);
  }
});

test("the corneal catchlight is dropped, and the filter reports having done it", () => {
  const pts = canonicalFace();
  const clean = syntheticFace({ pts, sclera: [230, 230, 228] });
  const glint = syntheticFace({ pts, sclera: [230, 230, 228] });

  // A small blown-out disc inside one triangle: bright AND neutral, which is
  // what makes it invisible to the chromaticity filter.
  const hull = hullFor(SCLERA_TRIANGLES[0], pts, -0.25);
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  for (let y = Math.round(cy) - 2; y <= Math.round(cy) + 2; y++) {
    for (let x = Math.round(cx) - 2; x <= Math.round(cx) + 2; x++) {
      const i = (y * glint.img.width + x) * 4;
      glint.img.data[i] = 255; glint.img.data[i + 1] = 255; glint.img.data[i + 2] = 253;
    }
  }

  const s = sampleSclera(glint.img, glint.pts, opts);
  assert.ok(s.stages.afterSpecular < s.stages.geometric,
    "the specular filter removed nothing, so the catchlight is still in the average");

  const a = sampleSclera(clean.img, clean.pts, opts);
  for (const k of ["r", "g", "b"]) {
    assert.ok(Math.abs(a.rawRatios[k] - s.rawRatios[k]) < 0.01, `catchlight moved the ${k} ratio`);
  }
});

/* ───────────────────────────────────────────────────────── personal drift ─── */

/** A stable history with a little jitter, so the MAD is non-degenerate. */
function history(n, jitter = 0.01) {
  return Array.from({ length: n }, (_, i) => ({
    r: 1.00 + ((i % 3) - 1) * jitter,
    g: 1.00 + ((i % 2) - 0.5) * jitter,
    b: 1.00 - ((i % 3) - 1) * jitter,
  }));
}

test("sclera-drift fires when today is 3 MAD off the user's own red ratio", () => {
  const samples = history(30);
  const madR = mad(samples.map((s) => s.r));
  assert.ok(madR > 0, "the fixture history must have a non-zero MAD or the test proves nothing");

  const pts = canonicalFace();
  // Shift the sclera toward red by 3 MAD in ratio terms. Work out the target
  // ratio first, then find the sclera colour that produces it.
  const target = 1 + 3 * madR;
  const baseline = { samples };

  const clean = syntheticFace({ pts, sclera: [230, 230, 228] });
  const before = sampleSclera(clean.img, clean.pts, opts, baseline);
  assert.equal(before.confidence, "ok",
    `an unshifted sample must NOT drift: delta ${JSON.stringify(before.personalDelta)}`);

  // Nudge red until the measured ratio clears the threshold. Doing it by
  // measurement rather than by algebra keeps the test honest about the whole
  // pipeline rather than just the comparison at the end.
  let shifted = null;
  for (let red = 231; red <= 255; red++) {
    const f = syntheticFace({ pts, sclera: [red, 230, 228] });
    const s = sampleSclera(f.img, f.pts, opts, baseline);
    if (s.rawRatios && s.rawRatios.r >= target) { shifted = s; break; }
  }
  assert.ok(shifted, "could not construct a 3-MAD red shift within the 8-bit range");
  assert.equal(shifted.confidence, "sclera-drift",
    `delta ${JSON.stringify(shifted.personalDelta)} did not trip the ${SCLERA_DRIFT_MADS}-MAD gate`);

  // Flagged, not discarded: the reading is still complete.
  assert.ok(shifted.gains, "a drifting sclera still produces gains; it is flagged, not dropped");
  assert.ok(shifted.pixelCount >= SCLERA_MIN_PIXELS);
  assert.ok(shifted.confidenceValue > 0 && shifted.confidenceValue < 1);
});

test("drift cannot fire before there is a baseline to drift from", () => {
  const pts = canonicalFace();
  const f = syntheticFace({ pts, sclera: [250, 220, 210] });   // wildly warm
  const s = sampleSclera(f.img, f.pts, opts, { samples: history(SCLERA_MIN_HISTORY - 1) });
  assert.equal(s.personalDelta, null, "no baseline means no personal delta, not a delta against zero");
  assert.notEqual(s.confidence, "sclera-drift");
});

test("an identical history cannot make every subsequent reading drift", () => {
  // MAD = 0 over a flat history. Without the floor, any deviation at all is
  // infinitely many MADs and drift fires forever after.
  //
  // The history is built from the ACTUAL measured ratios of this sclera, not
  // from an idealised 1.00/1.00/1.00. A user's flat history is thirty repeats
  // of their own measurement; seeding it with the ideal instead would make
  // this a test of how neutral the fixture happens to be.
  const pts = canonicalFace();
  const f = syntheticFace({ pts, sclera: [230, 230, 228] });
  const measured = sampleSclera(f.img, f.pts, opts).rawRatios;

  const flat = Array.from({ length: 30 }, () => ({ ...measured }));
  assert.equal(mad(flat.map((s) => s.r)), 0);

  const s = sampleSclera(f.img, f.pts, opts, { samples: flat });

  assert.ok(s.personalDelta.mads.r >= SCLERA_MAD_FLOOR,
    "the MAD floor is not being applied");
  assert.equal(s.confidence, "ok",
    `a normal reading against a flat history drifted: ${JSON.stringify(s.personalDelta)}`);
});

test("the baseline uses only the trailing window", () => {
  const stale = Array.from({ length: 40 }, () => ({ r: 1.4, g: 0.8, b: 0.8 }));
  const recent = history(SCLERA_HISTORY_LENGTH);
  const pts = canonicalFace();
  const f = syntheticFace({ pts, sclera: [230, 230, 228] });

  const s = sampleSclera(f.img, f.pts, opts, { samples: [...stale, ...recent] });
  // If the ancient samples were still in the window the median would sit near
  // 1.4 and today's ~1.0 would read as a large negative drift.
  assert.ok(Math.abs(s.personalDelta.r) < 0.05,
    `stale samples are still in the window: delta ${s.personalDelta.r}`);
});

/* ────────────────────────────────────────────────── the absolute backstop ─── */

test("the +/-25% absolute gate is kept as a backstop, and is not the primary test", () => {
  assert.equal(SCLERA_ABSOLUTE_TOLERANCE, 0.25);
  const pts = canonicalFace();

  // Deep amber light: outside the coarse tolerance.
  const wild = syntheticFace({ pts, sclera: [255, 190, 90] });
  const s = sampleSclera(wild.img, wild.pts, opts);
  assert.equal(s.withinAbsoluteTolerance, false);

  // But the backstop does NOT set the confidence — a bloodshot-eye shift and a
  // strange-light shift are different events, and only the personal baseline
  // can tell them apart. That separation is the whole reason it exists.
  assert.equal(s.confidence, "ok");
});

test("the drift message describes today's light, not the reader", () => {
  assert.match(SCLERA_DRIFT_MESSAGE, /less reliable/i);
  assert.doesNotMatch(SCLERA_DRIFT_MESSAGE, /\byou (are|have|will)\b/i);
});

test("mad() is the median absolute deviation, and survives an even-length series", () => {
  assert.equal(mad([1, 1, 1, 1]), 0);
  assert.equal(mad([1, 2, 3, 4]), 1);
  assert.equal(mad([]), null);
});

test("sampleSclera refuses to guess the mirroring, exactly as extractRois does", () => {
  const { img, pts } = syntheticFace();
  assert.throws(() => sampleSclera(img, pts, {}), TypeError);
  assert.throws(() => sampleSclera(img, pts), TypeError);
});

test("the pooled estimate is laterality-invariant, because both eyes are used", () => {
  const { img, pts } = syntheticFace();
  const a = sampleSclera(img, pts, { mirrored: false });
  const b = sampleSclera(img, pts, { mirrored: true });
  assert.deepEqual(a.rawRatios, b.rawRatios);
  assert.equal(a.pixelCount, b.pixelCount);
});
