/*
 * PHASE 5 gate — uniform synthetic face gives han ~ 0 and xue ~ 0; cheeks
 * lifted by 5 a* give xue ~ 5.
 *
 * The uniform case runs end to end from painted pixels rather than from a
 * hand-written Lab map, so the region geometry, the pixel sampling and the
 * trimmed median are all in the path. A metric test fed synthetic Lab proves
 * only the arithmetic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeMetrics, computeReadingMetrics, lumRatioP90P50, FACE_ROIS, MING_ROIS,
} from "../../src/qise/metrics.js";
import { readRois } from "../../src/qise/rois.js";
import { trimmedMedianLab } from "../../src/qise/camera.js";
import * as color from "../../src/qise/color.js";
import { syntheticFace } from "./fixtures/synthetic.js";

/** Measure a painted face the way the capture path does. */
function measure(spec) {
  const { img, pts } = syntheticFace(spec);
  const { rois } = readRois(img, pts, { mirrored: false }, color);
  const lab = {}, lumRatio = {};
  for (const [name, r] of Object.entries(rois)) {
    if (!r.pixels.length) continue;
    lab[name] = trimmedMedianLab(r.pixels, color);
    lumRatio[name] = lumRatioP90P50(r.pixels, color);
  }
  return { lab, lumRatio };
}

/** An sRGB triple whose a* sits `delta` above the reference, found by search. */
function liftedBy(base, delta) {
  const want = color.labFromSrgb8(...base).a + delta;
  let best = null, bestErr = Infinity;
  for (let r = base[0] - 20; r <= Math.min(255, base[0] + 40); r++) {
    for (let g = Math.max(0, base[1] - 30); g <= base[1] + 10; g++) {
      const err = Math.abs(color.labFromSrgb8(r, g, base[2]).a - want);
      if (err < bestErr) { bestErr = err; best = [r, g, base[2]]; }
    }
  }
  assert.ok(bestErr < 0.02, `could not hit a* + ${delta} (closest ${bestErr})`);
  return best;
}

/* ────────────────────────────────────────────────────────────── the gate ── */

test("a uniform face gives han ~ 0 and xue ~ 0", () => {
  const { lab, lumRatio } = measure({ skin: [200, 150, 140] });
  const m = computeMetrics(lab, lumRatio);

  assert.ok(Math.abs(m.han) < 1e-9, `han = ${m.han} on a uniform face`);
  assert.ok(Math.abs(m.xue) < 1e-9, `xue = ${m.xue} on a uniform face`);
  assert.equal(m.roisRead, FACE_ROIS.length);
});

test("cheeks lifted 5 a* give xue ~ 5", () => {
  const base = [200, 150, 140];
  const cheek = liftedBy(base, 5);
  const { lab, lumRatio } = measure({ skin: base, perRoi: { quan_l: cheek, quan_r: cheek } });
  const m = computeMetrics(lab, lumRatio);

  assert.ok(Math.abs(m.xue - 5) < 0.05, `xue = ${m.xue}, expected ~5`);
  // And containment falls, because the face is no longer one colour.
  assert.ok(m.han < -0.1, `han = ${m.han}; a two-tone face is less contained than a uniform one`);
});

test("xue is a WITHIN-image differential, so a global illuminant cancels out", () => {
  // The property that makes it the primary metric: it survives even when the
  // sclera correction is untrustworthy, because everything global subtracts.
  const base = [200, 150, 140];
  const cheek = liftedBy(base, 5);

  const neutral = measure({ skin: base, perRoi: { quan_l: cheek, quan_r: cheek } });
  const xueNeutral = computeMetrics(neutral.lab, neutral.lumRatio).xue;

  // The same face under a global gain. Not a perfect cancellation — the sRGB
  // transfer function is non-linear, so a multiplicative gain is not additive
  // in a* — but it must survive as the same signal, not be swamped.
  const bend = (rgb) => rgb.map((c) => Math.round(Math.min(255, c * 1.12)));
  const lit = measure({ skin: bend(base), perRoi: { quan_l: bend(cheek), quan_r: bend(cheek) } });
  const xueLit = computeMetrics(lit.lab, lit.lumRatio).xue;

  assert.ok(Math.abs(xueLit - xueNeutral) < 0.6,
    `xue moved from ${xueNeutral.toFixed(3)} to ${xueLit.toFixed(3)} under a global gain`);
});

/* ──────────────────────────────────────────────────── the other metrics ── */

test("hueVector excludes periorbital, which is darker on everyone", () => {
  // Including it drags the mean toward a constant offset that says nothing
  // about today. It is still measured, and `hei` weights it specifically.
  assert.equal(FACE_ROIS.includes("periorbital"), false);

  const withDark = measure({ skin: [200, 150, 140], perRoi: { periorbital: [120, 80, 75] } });
  const without = measure({ skin: [200, 150, 140] });
  const a = computeMetrics(withDark.lab, withDark.lumRatio);
  const b = computeMetrics(without.lab, without.lumRatio);

  assert.ok(Math.abs(a.hueVector.a - b.hueVector.a) < 1e-9,
    "a much darker periorbital moved hueVector, so it is not being excluded");
  assert.ok(Math.abs(a.han - b.han) < 1e-9, "and it must not move han either");
});

test("ming reads the four regions that catch a highlight, on untrimmed pixels", () => {
  assert.deepEqual([...MING_ROIS], ["tian", "zhuntou", "quan_l", "quan_r"]);

  // A flat region has no specular shoulder: P90 == P50, so the ratio is 1.
  const flat = Array.from({ length: 500 }, () => ({ r: 200, g: 150, b: 140 }));
  assert.ok(Math.abs(lumRatioP90P50(flat, color) - 1) < 1e-9);

  // A specular shoulder lifts it above 1. The shoulder has to be WIDER than
  // the top decile for P90 to sit inside it — at exactly 10% the percentile
  // lands on the boundary and the ratio barely moves, which is a property of
  // the statistic rather than of the skin.
  const shoulder = Array.from({ length: 60 }, () => ({ r: 240, g: 200, b: 192 }));
  const lustrous = [...flat.slice(0, 440), ...shoulder];
  const untrimmed = lumRatioP90P50(lustrous, color);
  assert.ok(untrimmed > 1.05, `lustre ratio ${untrimmed} did not rise`);

  // And the trim is deliberately NOT applied first: the tail IS the signal.
  // Drop the brightest tenth, as the per-frame trim does, and a visibly
  // lustrous region reports itself as matte.
  const byL = [...lustrous].sort((p, q) =>
    color.labFromSrgb8(p.r, p.g, p.b).L - color.labFromSrgb8(q.r, q.g, q.b).L);
  const trimmed = byL.slice(0, Math.floor(byL.length * 0.9));
  assert.ok(Math.abs(lumRatioP90P50(trimmed, color) - 1) < 1e-9,
    `trimming first reports ${lumRatioP90P50(trimmed, color)} — it destroys what ming measures`);

  assert.equal(lumRatioP90P50([], color), null);
});

test("run is scaled by the BASELINE chroma, so two users get comparable sensitivity", () => {
  const { lab, lumRatio } = measure({ skin: [200, 150, 140] });

  const own = computeMetrics(lab, lumRatio);
  const lowChromaUser = computeMetrics(lab, lumRatio, { baselineChroma: 5 });
  const highChromaUser = computeMetrics(lab, lumRatio, { baselineChroma: 40 });

  assert.ok(highChromaUser.run > lowChromaUser.run,
    "the scaling is not being applied");
  // With no baseline it falls back to the reading's own chroma, so a first
  // reading is still a number rather than a null.
  assert.ok(Number.isFinite(own.run));
  assert.ok(Math.abs(own.run - own.meanChroma * (1 + 0.045 * own.meanChroma)) < 1e-9);
});

test("han uses dE00, not dE76 — the one place a true distance is compared", () => {
  // A pair separated mostly in chroma in the red/yellow region is exactly
  // where dE76 over-weights, so the two metrics disagree measurably there.
  const lab = {
    tian: { L: 60, a: 10, b: 10 }, yintang: { L: 60, a: 30, b: 10 },
    shangen: { L: 60, a: 10, b: 10 }, zhuntou: { L: 60, a: 10, b: 10 },
    quan_l: { L: 60, a: 10, b: 10 }, quan_r: { L: 60, a: 10, b: 10 },
    dige: { L: 60, a: 10, b: 10 },
  };
  const m = computeMetrics(lab, {});

  // Reconstruct what the same computation would give under dE76.
  const rois = Object.keys(lab);
  const pairs76 = [], pairs00 = [];
  for (let i = 0; i < rois.length; i++) {
    for (let j = i + 1; j < rois.length; j++) {
      pairs76.push(color.deltaE76(lab[rois[i]], lab[rois[j]]));
      pairs00.push(color.deltaE2000(lab[rois[i]], lab[rois[j]]));
    }
  }
  const sd = (xs) => {
    const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, x) => s + (x - mu) ** 2, 0) / xs.length);
  };
  assert.ok(Math.abs(m.han - -sd(pairs00)) < 1e-9, "han is not the dE00 spread");
  assert.ok(Math.abs(m.han - -sd(pairs76)) > 0.5, "han appears to be the dE76 spread");
});

test("han is negative, so more contained is a larger number like every other metric", () => {
  const uniform = measure({ skin: [200, 150, 140] });
  const patchy = measure({ skin: [200, 150, 140], perRoi: { quan_l: [225, 130, 120], dige: [180, 165, 150] } });
  assert.ok(computeMetrics(uniform.lab, uniform.lumRatio).han
    > computeMetrics(patchy.lab, patchy.lumRatio).han);
});

/* ────────────────────────────────────────────────── basis, and both pipes ── */

test("every metric set carries the basis it was computed over", () => {
  // The glowIndex trap, CLAUDE.md item 18: rescaling over a different set of
  // components makes two values incomparable, and dropping a below-average one
  // makes the composite go UP. Grouping by basis is the only defence.
  const full = measure({ skin: [200, 150, 140] });
  const m = computeMetrics(full.lab, full.lumRatio);
  assert.equal(m.basis, [...FACE_ROIS].sort().join("+"));

  const partial = { ...full.lab };
  delete partial.dige;
  assert.notEqual(computeMetrics(partial, full.lumRatio).basis, m.basis);
});

test("fewer than two regions yields nulls, not a metric built from one point", () => {
  const m = computeMetrics({ tian: { L: 60, a: 12, b: 10 } }, {});
  assert.equal(m.han, null);
  assert.equal(m.xue, null);
  assert.equal(m.hueVector, null);
  assert.equal(m.roisRead, 1);
});

test("both pipelines are computed and stored, because Phase 5b needs both", () => {
  const face = measure({ skin: [200, 150, 140] });
  const corrected = Object.fromEntries(
    Object.entries(face.lab).map(([k, v]) => [k, { ...v, a: v.a - 1.5 }]));

  const both = computeReadingMetrics({
    rawLab: face.lab, correctedLab: corrected, lumRatio: face.lumRatio,
  });

  assert.ok(both.raw && both.corrected);
  assert.ok(Math.abs(both.raw.hueVector.a - both.corrected.hueVector.a - 1.5) < 1e-9);
  // Storage is cheap; a wrong irreversible choice is not.
  assert.notDeepEqual(both.raw, both.corrected);
});
