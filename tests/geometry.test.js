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

import {
  calculateAdaptiveScale, getZoneFullScale, ZONE_FULL_SCALE,
  calculateBlurRadius, calculateTanDegradation, getOrientedGLCMScore,
} from "../src/utils/calibrationEngine.js";

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

// ──────────────────────────────────────── calibrationEngine.js unit tests ────

// FIX 1 — calculateAdaptiveScale

test("calculateAdaptiveScale: all-zero input clamps to floor 0.5", () => {
  const result = calculateAdaptiveScale(new Float32Array(20));
  assert.equal(result, 0.5, "all-zero structureness should return the floor (0.5)");
});

test("calculateAdaptiveScale: uniform 0.06 input returns exactly 2.0", () => {
  const vals = new Float32Array(100).fill(0.06);
  const result = calculateAdaptiveScale(vals);
  // Float32 stores 0.06 as ~0.05999999865889549, so the result is marginally
  // below 2.0 due to floating-point representation. Accept 1e-4 tolerance.
  assert.ok(Math.abs(result - 2.0) < 1e-4, `expected ≈2.0, got ${result}`);
});

test("calculateAdaptiveScale: realistic mixed input stays within [0.5, 4.0]", () => {
  // Simulate a real frame: most pixels near noise floor (~0.02–0.08),
  // a minority reaching furrow-level structureness (~0.12–0.18).
  const vals = new Float32Array(200);
  for (let i = 0; i < 180; i++) vals[i] = 0.02 + (i / 180) * 0.06;  // 0.02–0.08
  for (let i = 180; i < 200; i++) vals[i] = 0.10 + (i - 180) * 0.01; // 0.10–0.29
  const result = calculateAdaptiveScale(vals);
  assert.ok(result >= 0.5, `result ${result} is below floor`);
  assert.ok(result <= 4.0, `result ${result} exceeds ceiling`);
  assert.ok(result > 1.0, "realistic input with genuine structure should produce scale > 1");
});

// FIX 2 — getZoneFullScale

test("getZoneFullScale: all 6 named zones return their specified values", () => {
  assert.equal(getZoneFullScale("forehead"),    ZONE_FULL_SCALE.forehead);
  assert.equal(getZoneFullScale("glabella"),    ZONE_FULL_SCALE.glabella);
  assert.equal(getZoneFullScale("periorbital"), ZONE_FULL_SCALE.periorbital);
  assert.equal(getZoneFullScale("nasolabial"),  ZONE_FULL_SCALE.nasolabial);
  assert.equal(getZoneFullScale("cheeks"),      ZONE_FULL_SCALE.cheeks);
  assert.equal(getZoneFullScale("chin"),        ZONE_FULL_SCALE.chin);

  // Spot-check the literal values match the spec.
  assert.equal(getZoneFullScale("forehead"),    0.08);
  assert.equal(getZoneFullScale("glabella"),    0.09);
  assert.equal(getZoneFullScale("periorbital"), 0.04);
});

test("getZoneFullScale: unknown zone falls back to default (0.06)", () => {
  assert.equal(getZoneFullScale("unknown_zone"), 0.06);
  assert.equal(getZoneFullScale(""), 0.06);
});

// FIX 3 — calculateBlurRadius

test("calculateBlurRadius: tiny zone (5 pixels) returns the floor 0.6", () => {
  const r = calculateBlurRadius(5);
  // 1.2 * sqrt(5/1000) ≈ 0.085 < 0.6 → clamped to 0.6
  assert.ok(Math.abs(r - 0.6) < 1e-9, `expected 0.6, got ${r}`);
});

test("calculateBlurRadius: medium zone (500 pixels) is between floor and 1.2", () => {
  const r = calculateBlurRadius(500);
  // 1.2 * sqrt(0.5) ≈ 0.849
  const expected = 1.2 * Math.sqrt(500 / 1000);
  assert.ok(Math.abs(r - expected) < 1e-9, `expected ${expected}, got ${r}`);
  assert.ok(r > 0.6, "500-pixel zone should exceed floor");
  assert.ok(r < 1.2, "500-pixel zone should be less than original static sigma");
});

test("calculateBlurRadius: large zone (5000 pixels) exceeds original sigma 1.2", () => {
  const r = calculateBlurRadius(5000);
  // 1.2 * sqrt(5) ≈ 2.683
  assert.ok(r > 1.2, `large zone should get more blur than the old static 1.2, got ${r}`);
  assert.ok(r < 5,   `unreasonably large sigma for 5000 pixels: ${r}`);
});

// FIX 4 — calculateTanDegradation

test("calculateTanDegradation: erythema rises with melanin index", () => {
  const e0 = calculateTanDegradation("erythema", 0);   // 0.55 * (1 + 0) = 0.55
  const e1 = calculateTanDegradation("erythema", 1);   // 0.55 * 1.2 = 0.66
  const e3 = calculateTanDegradation("erythema", 3);   // 0.55 * 1.6 = 0.88 → clamped 0.85

  assert.ok(Math.abs(e0 - 0.55) < 1e-9,  `MI=0: expected 0.55, got ${e0}`);
  assert.ok(Math.abs(e1 - 0.66) < 1e-9,  `MI=1: expected 0.66, got ${e1}`);
  assert.equal(e3, 0.85, `MI=3: expected upper clamp 0.85, got ${e3}`);

  // Monotonically increasing with melanin for erythema.
  assert.ok(e0 < e1, "erythema confidence should rise with melanin index");
  assert.ok(e1 < e3, "erythema confidence should continue rising until clamped");
});

test("calculateTanDegradation: pallor falls with melanin index", () => {
  const p0 = calculateTanDegradation("pallor", 0);   // 0.55 * 1.0 = 0.55
  const p1 = calculateTanDegradation("pallor", 1);   // 0.55 * 0.9 = 0.495
  const p3 = calculateTanDegradation("pallor", 3);   // 0.55 * 0.7 = 0.385

  assert.ok(Math.abs(p0 - 0.55)   < 1e-9, `MI=0: expected 0.55, got ${p0}`);
  assert.ok(Math.abs(p1 - 0.495)  < 1e-9, `MI=1: expected 0.495, got ${p1}`);
  assert.ok(Math.abs(p3 - 0.385)  < 1e-9, `MI=3: expected 0.385, got ${p3}`);

  // Monotonically decreasing with melanin for pallor.
  assert.ok(p0 > p1, "pallor confidence should fall with melanin index");
  assert.ok(p1 > p3, "pallor confidence should continue falling");
});

test("calculateTanDegradation: output is always in [0.3, 0.85]", () => {
  for (const condition of ["erythema", "pallor"]) {
    for (const mi of [0, 0.5, 1, 3, 10, 100]) {
      const c = calculateTanDegradation(condition, mi);
      assert.ok(c >= 0.3 && c <= 0.85,
        `${condition} MI=${mi}: ${c} is outside [0.3, 0.85]`);
    }
  }
});

// FIX 6 — getOrientedGLCMScore

test("getOrientedGLCMScore: returns dominantAngle in [0, 45, 90, 135]", () => {
  const valid = new Set([0, 45, 90, 135]);
  const zones = ["forehead", "nasolabial", "cheeks", "unknown"];
  // Random-ish pixel array: 20×20 square patch.
  const pixels = new Uint8Array(400);
  for (let i = 0; i < 400; i++) pixels[i] = (i * 37 + 13) % 256;

  for (const zone of zones) {
    const { energy, dominantAngle } = getOrientedGLCMScore(zone, pixels);
    assert.ok(valid.has(dominantAngle),
      `zone "${zone}": dominantAngle ${dominantAngle} not in [0, 45, 90, 135]`);
    assert.ok(Number.isFinite(energy) && energy >= 0,
      `zone "${zone}": energy should be a non-negative finite number, got ${energy}`);
  }
});

test("getOrientedGLCMScore: empty pixel array returns dominantAngle 0", () => {
  const { dominantAngle, energy } = getOrientedGLCMScore("forehead", []);
  assert.equal(dominantAngle, 0);
  assert.equal(energy, 0);
});
