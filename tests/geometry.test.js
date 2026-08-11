/*
 * Geometry layer tests.
 *
 * Synthetic landmark sets, not photos: every named landmark is placed at a
 * known coordinate so each ratio has an arithmetically knowable answer. That
 * is the point — it tests the geometry, not MediaPipe's detector, and runs
 * with no browser and no 3.76 MB model.
 *
 * Real-photo verification is a separate obligation and is NOT covered here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LM, geometryReport, faceMetrics, classifyFaceShape, thirds, fifths, fwhr,
  frontality, normaliseRoll, shapeRatios, SHAPE_THRESHOLDS,
} from "../src/geometry.js";
import { canonicalFace } from "./fixtures/canonical-face.js";

/**
 * Build a 478-point set with the landmarks this layer reads placed
 * deliberately. Unused indices are filled with the face centre, which is
 * harmless because nothing reads them.
 */
function makeFace({
  length = 125, cheekW = 100, jawW = 90, foreheadW = 90, cx = 200, cy = 0,
  yawZygionA = null,
} = {}) {
  const pts = Array.from({ length: 478 }, () => ({ x: cx, y: cy + length / 2 }));
  const at = (i, x, y) => { pts[i] = { x, y }; };
  const Y = (f) => cy + f * length;

  at(LM.OVAL_APEX, cx, Y(0));
  at(LM.MENTON, cx, Y(1));
  at(LM.GLABELLA, cx, Y(0.30));
  at(LM.SUBNASALE, cx, Y(0.62));
  at(LM.LABIALE_SUPERIUS, cx, Y(0.72));

  at(LM.ZYGION_A, yawZygionA ?? cx - cheekW / 2, Y(0.45));
  at(LM.ZYGION_B, cx + cheekW / 2, Y(0.45));
  at(LM.GONION_A, cx - jawW / 2, Y(0.75));
  at(LM.GONION_B, cx + jawW / 2, Y(0.75));
  at(LM.FRONTOTEMPORAL_A, cx - foreheadW / 2, Y(0.15));
  at(LM.FRONTOTEMPORAL_B, cx + foreheadW / 2, Y(0.15));

  at(33, cx - cheekW * 0.40, Y(0.42));   // outer corners
  at(263, cx + cheekW * 0.40, Y(0.42));
  at(133, cx - cheekW * 0.14, Y(0.42));  // inner corners
  at(362, cx + cheekW * 0.14, Y(0.42));

  at(LM.UPPER_LID_A, cx - cheekW * 0.27, Y(0.40));
  at(LM.UPPER_LID_B, cx + cheekW * 0.27, Y(0.40));

  return pts;
}

const rotate = (pts, deg, ox = 0, oy = 0) => {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return pts.map((p) => {
    const dx = p.x - ox, dy = p.y - oy;
    return { x: ox + dx * c - dy * s, y: oy + dx * s + dy * c };
  });
};

// ───────────────────────────────────────────────────────── raw measures ────

test("faceMetrics recovers the widths the face was built with", () => {
  const m = faceMetrics(makeFace({ length: 125, cheekW: 100, jawW: 90, foreheadW: 80 }));
  assert.equal(Math.round(m.faceLength), 125);
  assert.equal(Math.round(m.bizygomaticWidth), 100);
  assert.equal(Math.round(m.bigonialWidth), 90);
  assert.equal(Math.round(m.frontotemporalWidth), 80);
});

test("geometry report calculates scale-independent face ratios from real landmarks", () => {
  const report = geometryReport(canonicalFace());
  assert.ok(report.measurementRatios.interPupillaryDistance > 0);
  assert.ok(report.measurementRatios.noseToChinLength > 0);
  assert.ok(report.measurementRatios.interPupillaryToFaceWidth > 0);
  assert.ok(report.measurementRatios.noseToChinToFaceLength > 0);
  assert.ok(report.measurementRatios.faceWidthToHeight > 0);
  assert.ok(report.fwhr.value > 0);
});

test("thirds sum to the whole and declare the trichion limitation", () => {
  const t = thirds(makeFace({ length: 200 }));
  assert.ok(Math.abs(t.upperFraction + t.middleFraction + t.lowerFraction - 1) < 1e-9);
  assert.equal(Math.round(t.upper), 60);    // 0.30 of 200
  assert.equal(Math.round(t.middle), 64);   // 0.32
  assert.equal(Math.round(t.lower), 76);    // 0.38

  // The limitation must be reported, not silently corrected for.
  assert.equal(t.trichionEstimated, false);
  assert.match(t.caveat, /hairline/i);
});

test("fifths partition the face width into five segments that sum to the whole", () => {
  const f = fifths(makeFace({ cheekW: 100 }));
  assert.equal(f.segments.length, 5);
  assert.ok(Math.abs(f.segments.reduce((a, b) => a + b, 0) - f.total) < 1e-9);
  assert.ok(Math.abs(f.fractions.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  // Built symmetric, so the outer pair and the eye pair must mirror.
  assert.ok(Math.abs(f.segments[0] - f.segments[4]) < 1e-9);
  assert.ok(Math.abs(f.segments[1] - f.segments[3]) < 1e-9);
});

test("fifths are correct on a MIRRORED frame — corners are sorted, not assumed", () => {
  const pts = makeFace({ cheekW: 100 });
  const mirrored = pts.map((p) => ({ x: 400 - p.x, y: p.y }));
  const a = fifths(pts), b = fifths(mirrored);
  a.segments.forEach((s, i) => assert.ok(Math.abs(s - b.segments[i]) < 1e-9));
});

// ─────────────────────────────────────────────────────────── roll / pose ───

test("roll normalisation makes the measurements invariant to head tilt", () => {
  const upright = makeFace({ length: 125, cheekW: 100, jawW: 90, foreheadW: 85 });
  const tilted = rotate(upright, 20, 200, 60);

  const a = geometryReport(upright);
  const b = geometryReport(tilted);

  // Without normaliseRoll these diverge badly; the fifths shear worst.
  assert.ok(Math.abs(a.shape.ratios.lengthToWidth - b.shape.ratios.lengthToWidth) < 1e-6);
  assert.ok(Math.abs(a.shape.ratios.jawToCheek - b.shape.ratios.jawToCheek) < 1e-6);
  a.fifths.fractions.forEach((f, i) =>
    assert.ok(Math.abs(f - b.fifths.fractions[i]) < 1e-6, `fifth ${i} moved under tilt`));
  assert.equal(a.shape.shape, b.shape.shape);

  // And the tilt itself is reported rather than hidden.
  assert.ok(Math.abs(Math.abs(b.rollDegrees) - 20) < 1e-6);
});

test("a turned head is flagged as unreliable rather than classified confidently", () => {
  const square = frontality(makeFace({ cx: 200, cheekW: 100 }));
  assert.ok(square.asymmetry < 1e-9);
  assert.equal(square.frontal, true);

  // Pull one cheekbone toward the midline, as yaw does.
  const turned = makeFace({ cx: 200, cheekW: 100, yawZygionA: 185 });
  assert.equal(frontality(turned).frontal, false);
  assert.equal(geometryReport(turned).shapeReliable, false);
});

// ──────────────────────────────────────────────────────────── classifier ───

/* Each face below is built to land in exactly one class. The assertion is on
 * the label AND on the trace, because a label with no working shown is the
 * black box this layer exists to avoid. */

test("square: short and wide-jawed", () => {
  const c = classifyFaceShape(faceMetrics(
    makeFace({ length: 115, cheekW: 100, jawW: 95, foreheadW: 90 })));
  assert.equal(c.shape, "square");
  assert.ok(c.because.length >= 3);
  assert.ok(c.because.every((t) => t.passed));
  assert.ok(c.because.some((t) => /bigonialWidth/.test(t.label)));
});

test("round: short with a softer jaw", () => {
  const c = classifyFaceShape(faceMetrics(
    makeFace({ length: 110, cheekW: 100, jawW: 80, foreheadW: 85 })));
  assert.equal(c.shape, "round");
});

test("heart: wide forehead tapering to a narrow chin", () => {
  const c = classifyFaceShape(faceMetrics(
    makeFace({ length: 130, cheekW: 100, jawW: 70, foreheadW: 98 })));
  assert.equal(c.shape, "heart");
});

test("oblong: long, with the three widths nearly equal", () => {
  const c = classifyFaceShape(faceMetrics(
    makeFace({ length: 150, cheekW: 100, jawW: 93, foreheadW: 95 })));
  assert.equal(c.shape, "oblong");
});

test("diamond: cheekbones dominant, narrow at forehead and jaw", () => {
  const c = classifyFaceShape(faceMetrics(
    makeFace({ length: 130, cheekW: 100, jawW: 80, foreheadW: 82 })));
  assert.equal(c.shape, "diamond");
});

test("oval is the RESIDUAL class and says so", () => {
  const c = classifyFaceShape(faceMetrics(
    makeFace({ length: 135, cheekW: 100, jawW: 88, foreheadW: 90 })));
  assert.equal(c.shape, "oval");
  // Not a positive finding: it means no other rule matched, and the payload
  // must admit that rather than implying the face was measured as oval.
  assert.equal(c.residual, true);
  assert.equal(c.because.length, 0);
});

test("every classification can be explained by the ratio that triggered it", () => {
  const faces = [
    makeFace({ length: 115, cheekW: 100, jawW: 95, foreheadW: 90 }),
    makeFace({ length: 110, cheekW: 100, jawW: 80, foreheadW: 85 }),
    makeFace({ length: 130, cheekW: 100, jawW: 70, foreheadW: 98 }),
    makeFace({ length: 150, cheekW: 100, jawW: 93, foreheadW: 95 }),
    makeFace({ length: 130, cheekW: 100, jawW: 80, foreheadW: 82 }),
  ];
  for (const f of faces) {
    const c = classifyFaceShape(faceMetrics(f));
    for (const t of c.because) {
      assert.equal(typeof t.value, "number");
      assert.equal(typeof t.threshold, "number");
      assert.ok(Number.isFinite(t.value), `${c.shape}: ${t.label} produced no number`);
      // The recorded test must actually hold for the recorded numbers.
      const holds = t.op === ">=" ? t.value >= t.threshold : t.value < t.threshold;
      assert.ok(holds, `${c.shape}: recorded trace "${t.label}" does not hold`);
    }
  }
});

test("near-miss classes are surfaced so a borderline face does not read as decisive", () => {
  // Sits just past the square/round jaw boundary.
  const m = faceMetrics(makeFace({ length: 115, cheekW: 100, jawW: 89.5, foreheadW: 90 }));
  const c = classifyFaceShape(m);
  assert.equal(c.shape, "round");
  assert.ok(c.alternatives.some((a) => a.shape === "square"),
    "square missed by one test and should be listed as an alternative");
});

// ───────────────────────────────────────────────────────────────── fWHR ────

test("fWHR uses the eyelid-based definition and pins it in the payload", () => {
  // width 100; height = |0.72L - 0.40L| = 0.32 * 125 = 40  ->  100/40 = 2.5
  const f = fwhr(makeFace({ length: 125, cheekW: 100 }));
  assert.ok(Math.abs(f.value - 2.5) < 1e-9, `expected 2.5, got ${f.value}`);

  // These strings are the guard against a silently swapped denominator: the
  // nasion-based convention gives different numbers and is not comparable.
  assert.match(f.definition, /eyelid-based/);
  assert.match(f.definition, /not nasion-based/);
  assert.match(f.presentAs, /never as a dominance/i);
});

// ──────────────────────────────────────────────────────────── the report ───

test("geometryReport refuses a landmark set that is not 478 points", () => {
  assert.throws(() => geometryReport(new Array(468).fill({ x: 0, y: 0 })), /478/);
  assert.throws(() => geometryReport([]), /478/);
});

test("the geometry report contains NO global rating, score or rank", () => {
  const report = geometryReport(makeFace());
  const banned = /(attractive|beauty|rating|ranking|\brank\b|\bscore\b|percentile|overall)/i;

  const walk = (node, path) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        assert.ok(!banned.test(k), `report exposes a rating-like key: ${path}.${k}`);
        walk(v, `${path}.${k}`);
      }
    }
  };
  walk(report, "report");

  // And no bare number that reads as an out-of-ten style verdict.
  assert.equal(report.overall, undefined);
  assert.equal(report.score, undefined);
});

test("shapeRatios are pure ratios — scaling the whole face changes nothing", () => {
  const small = shapeRatios(faceMetrics(makeFace({ length: 125, cheekW: 100, jawW: 90, foreheadW: 85 })));
  const large = shapeRatios(faceMetrics(makeFace({ length: 500, cheekW: 400, jawW: 360, foreheadW: 340 })));
  for (const k of Object.keys(small)) {
    assert.ok(Math.abs(small[k] - large[k]) < 1e-9, `${k} is not scale-invariant`);
  }
});

test("thresholds are exported so the debug view can show what was compared", () => {
  for (const [k, v] of Object.entries(SHAPE_THRESHOLDS)) {
    assert.equal(typeof v, "number", `${k} must be a number`);
  }
});
