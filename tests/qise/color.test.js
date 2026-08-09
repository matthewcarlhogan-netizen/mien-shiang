/*
 * PHASE 1 gate — the colour maths.
 *
 * The fixture table is computed independently of this implementation and
 * matched to 1e-3, and ΔE00 is validated against the published Sharma-Wu-Dalal
 * set rather than against values this file produced. A self-consistent colour
 * pipeline that is uniformly wrong passes every test you write from its own
 * output; that is the failure mode these two choices exist to prevent.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  srgbToLinear, linearToSrgb, linearRgbToXyz, xyzToLab, labFromSrgb8,
  chroma, hueDeg, ita, melaninIndexProxy, deltaE76, deltaE2000, sCWeight,
  vonKriesGains, applyGains, labFromLinear, SRGB_TO_XYZ, D65,
} from "../../src/qise/color.js";

import { CIEDE2000_TEST_DATA } from "./fixtures/ciede2000-sharma.js";

const TOL = 1e-3;
const near = (got, want, tol = TOL, what = "") =>
  assert.ok(Math.abs(got - want) <= tol,
    `${what} expected ${want}, got ${got} (delta ${Math.abs(got - want).toExponential(2)})`);

/* ────────────────────────────────────────────────────── the fixture table ── */

/** sRGB, linear RGB, XYZ, Lab, C*, h, ITA, MI proxy. Computed, not observed. */
const FIXTURES = [
  { srgb: [200, 150, 140], lin: [0.577580, 0.304987, 0.262251], xyz: [39.4603, 35.9876, 29.6737],
    lab: [66.5104, 17.3530, 12.5911], C: 21.4398, h: 35.9641, ita: 52.6703, mi: 17.7110 },
  { srgb: [120, 80, 65], lin: [0.187821, 0.080220, 0.052861], xyz: [11.5691, 10.1129, 6.3427],
    lab: [38.0443, 14.8439, 15.6503], C: 21.5702, h: 46.5147, ita: -37.3772, mi: 41.9710 },
  { srgb: [60, 40, 35], lin: [0.045186, 0.021219, 0.016807], xyz: [2.9257, 2.5998, 1.9375],
    lab: [18.3640, 8.5795, 7.0339], C: 11.0943, h: 39.3466, ita: -77.4648, mi: 73.6033 },
  { srgb: [240, 220, 215], lin: [0.871367, 0.715694, 0.679542], xyz: [73.7931, 74.6192, 74.7924],
    lab: [89.2143, 6.0361, 4.9374], C: 7.7983, h: 39.2826, ita: 82.8237, mi: 4.9565 },
];

test("every fixture row reproduces to 1e-3, end to end", () => {
  for (const f of FIXTURES) {
    const tag = `sRGB(${f.srgb.join(",")})`;
    const lin = f.srgb.map(srgbToLinear);
    lin.forEach((v, i) => near(v, f.lin[i], TOL, `${tag} linear[${i}]`));

    const { X, Y, Z } = linearRgbToXyz(...lin);
    near(X, f.xyz[0], TOL, `${tag} X`);
    near(Y, f.xyz[1], TOL, `${tag} Y`);
    near(Z, f.xyz[2], TOL, `${tag} Z`);

    const lab = xyzToLab(X, Y, Z);
    near(lab.L, f.lab[0], TOL, `${tag} L*`);
    near(lab.a, f.lab[1], TOL, `${tag} a*`);
    near(lab.b, f.lab[2], TOL, `${tag} b*`);

    // labFromSrgb8 is the path every pixel actually takes; it must agree with
    // the step-by-step route rather than being a second implementation.
    const direct = labFromSrgb8(...f.srgb);
    near(direct.L, lab.L, 1e-12, `${tag} labFromSrgb8 L*`);
    near(direct.a, lab.a, 1e-12, `${tag} labFromSrgb8 a*`);
    near(direct.b, lab.b, 1e-12, `${tag} labFromSrgb8 b*`);

    near(chroma(lab.a, lab.b), f.C, TOL, `${tag} C*`);
    near(hueDeg(lab.a, lab.b), f.h, TOL, `${tag} h`);
    near(ita(lab.L, lab.b), f.ita, TOL, `${tag} ITA`);
    near(melaninIndexProxy(lab.L), f.mi, TOL, `${tag} MI proxy`);
  }
});

test("the transfer function round-trips for every 8-bit value", () => {
  let worst = 0;
  for (let c = 0; c <= 255; c++) {
    worst = Math.max(worst, Math.abs(linearToSrgb(srgbToLinear(c)) - c));
  }
  assert.ok(worst < 0.5, `worst round-trip error ${worst}`);
});

test("the transfer function is continuous across its own breakpoint", () => {
  // The two branches meet at c' = 0.04045. A sign slip in the constant shows up
  // nowhere else: mid-tones stay plausible and only near-black skews.
  const below = srgbToLinear(0.04045 * 255 - 1e-6);
  const above = srgbToLinear(0.04045 * 255 + 1e-6);
  assert.ok(Math.abs(above - below) < 1e-6, `discontinuity at the breakpoint: ${below} vs ${above}`);
});

test("ITA uses atan2, so cool-toned skin does not mis-bin toward lighter", () => {
  // The CLAUDE.md item 3 defect, re-pinned for this module: with a clamped
  // positive b*, a negative-b* sample resolves into the wrong quadrant and
  // reads LIGHTER than it is — desensitising every check keyed on tone band.
  const cool = ita(40, -6);
  assert.ok(cool < -90, `a dark, cool sample must resolve below -90 deg, got ${cool}`);
  assert.ok(ita(40, 6) > -90);
  // And the sign of L-50 drives the sign of the angle for positive b*.
  assert.ok(ita(70, 10) > 0 && ita(30, 10) < 0);
});

test("hue is reported on 0..360, never negative", () => {
  assert.ok(hueDeg(1, -1) > 180, `expected the fourth quadrant to wrap, got ${hueDeg(1, -1)}`);
  for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1], [0, -1], [-1, 0]]) {
    const h = hueDeg(a, b);
    assert.ok(h >= 0 && h < 360, `hue out of range for (${a},${b}): ${h}`);
  }
});

test("the matrix and white point are the documented ones", () => {
  // Pinned as data. A transposed matrix still produces plausible-looking Lab.
  assert.deepEqual(SRGB_TO_XYZ.map((r) => [...r]), [
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.0721750],
    [0.0193339, 0.1191920, 0.9503041],
  ]);
  assert.deepEqual({ ...D65 }, { Xn: 95.047, Yn: 100.0, Zn: 108.883 });

  // Row 2 is the luminance row: equal-energy white must land on Y = 100.
  // Not to 1e-9 — the published coefficients sum to 1.0000001, so white lands
  // on 100.00001. Rounding them "cleaner" changes the luminance definition.
  const { X, Y, Z } = linearRgbToXyz(1, 1, 1);
  near(Y, 100, 1e-4, "white Y");
  near(X, D65.Xn, 1e-2, "white X");
  near(Z, D65.Zn, 1e-2, "white Z");

  // ...and therefore on L* = 100, a* = b* = 0.
  const white = labFromSrgb8(255, 255, 255);
  near(white.L, 100, 1e-4, "white L*");
  near(white.a, 0, 1e-2, "white a*");
  near(white.b, 0, 1e-2, "white b*");
});

/* ───────────────────────────────────────────────────────────── CIEDE2000 ── */

test("deltaE2000 matches all 34 published Sharma-Wu-Dalal pairs", () => {
  assert.equal(CIEDE2000_TEST_DATA.length, 34,
    "the published set has 34 pairs; a short fixture is a broken fixture");

  let worst = 0;
  const failures = [];
  for (const [L1, a1, b1, L2, a2, b2, expected] of CIEDE2000_TEST_DATA) {
    const got = deltaE2000({ L: L1, a: a1, b: b1 }, { L: L2, a: a2, b: b2 });
    const d = Math.abs(got - expected);
    worst = Math.max(worst, d);
    // The published values are rounded to 4 dp, so 1e-4 is exact agreement.
    if (d > 1e-4) failures.push(`(${L1},${a1},${b1}) vs (${L2},${a2},${b2}): got ${got.toFixed(4)}, published ${expected}`);
  }
  assert.deepEqual(failures, [],
    `CIEDE2000 disagrees with the published set (worst ${worst.toExponential(2)}):\n  `
    + failures.join("\n  "));
});

test("deltaE2000 is symmetric and zero on identity", () => {
  for (const [L1, a1, b1, L2, a2, b2] of CIEDE2000_TEST_DATA) {
    const p = { L: L1, a: a1, b: b1 }, q = { L: L2, a: a2, b: b2 };
    near(deltaE2000(p, q), deltaE2000(q, p), 1e-12, "symmetry");
    near(deltaE2000(p, p), 0, 1e-12, "identity");
  }
});

test("deltaE2000 handles the neutral axis, where hue is undefined", () => {
  // Both chromas zero: hue is meaningless and the mean-hue branch must fall
  // back to the sum rather than averaging in an angle that does not exist.
  const d = deltaE2000({ L: 50, a: 0, b: 0 }, { L: 60, a: 0, b: 0 });
  assert.ok(Number.isFinite(d) && d > 0, `neutral pair produced ${d}`);
  assert.ok(Number.isFinite(deltaE2000({ L: 50, a: 0, b: 0 }, { L: 50, a: 5, b: 0 })));
});

test("deltaE76 is retained and is NOT deltaE2000", () => {
  // Kept for the regression fixtures only. If someone aliases one to the other
  // the fixtures keep passing and every threshold in the app silently moves.
  const p = { L: 50, a: 2.6772, b: -79.7751 }, q = { L: 50, a: 0, b: -82.7485 };
  near(deltaE76(p, q), Math.hypot(0, 2.6772, 2.9734), 1e-4, "dE76");
  assert.ok(Math.abs(deltaE76(p, q) - deltaE2000(p, q)) > 1,
    "dE76 and dE00 must not be the same function");
});

test("sCWeight is the dE00 chroma weighting, exposed on its own", () => {
  near(sCWeight(0), 1, 1e-12);
  near(sCWeight(20), 1.9, 1e-12);
  // It must be the same term the distance formula uses internally. The check
  // has to account for CIEDE2000's G factor, which rescales a* before chroma
  // is taken: a pure chroma step dC at mean chroma Cbar becomes (1+G)*dC at
  // mean PRIMED chroma (1+G)*Cbar, so dE00 = (1+G)*dC / sCWeight((1+G)*Cbar).
  // Testing against sCWeight(Cbar) instead fails by ~13% at skin chroma, which
  // is the size of error that would otherwise hide in the `run` scaling.
  const Cbar = 20, dC = 0.02;
  const c7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(c7 / (c7 + Math.pow(25, 7))));
  const p = { L: 50, a: Cbar - dC / 2, b: 0 };
  const q = { L: 50, a: Cbar + dC / 2, b: 0 };
  near(deltaE2000(p, q) * sCWeight((1 + G) * Cbar), (1 + G) * dC, 5e-5,
    "sCWeight matches the internal SC term");
});

/* ─────────────────────────────────────────── von Kries recovery fixture ── */

test("von Kries recovers a synthetic diagonal illuminant to the documented ceiling", () => {
  const lin = ([r, g, b]) => ({ r: srgbToLinear(r), g: srgbToLinear(g), b: srgbToLinear(b) });
  const skin = lin([200, 150, 140]);
  const sclera = lin([230, 230, 228]);
  const warm = { r: 1.18, g: 1.00, b: 0.78 };

  const warmSkin = applyGains(skin, warm);
  const warmSclera = applyGains(sclera, warm);

  const warmLab = labFromLinear(warmSkin);
  near(warmLab.L, 67.860, 0.01, "uncorrected warm L*");
  near(warmLab.a, 21.499, 0.01, "uncorrected warm a*");
  near(warmLab.b, 23.119, 0.01, "uncorrected warm b*");
  near(deltaE76(warmLab, labFromLinear(skin)), 11.395, 0.01, "uncorrected dE76");

  const recovered = vonKriesGains(warmSclera);
  near(recovered.r, 0.831849, 1e-5, "recovered gain r");
  near(recovered.g, 0.981582, 1e-5, "recovered gain g");
  near(recovered.b, 1.283541, 1e-5, "recovered gain b");

  // Like for like: BOTH sides normalised by their own sclera. Comparing a
  // corrected sample against an uncorrected reference measures the grey-world
  // shift as well as the illuminant, and reports a residual ~2.6x too large.
  const residual = deltaE76(
    labFromLinear(applyGains(warmSkin, recovered)),
    labFromLinear(applyGains(skin, vonKriesGains(sclera)))
  );
  near(residual, 0.341, 0.01, "like-for-like residual dE76");

  // Synthetic diagonal-gain illuminant model. Real phone ISPs apply a
  // non-diagonal Colour Correction Matrix before sRGB encoding, and may apply
  // spatially-variant local tone mapping. A diagonal von Kries gain CANNOT
  // exactly invert a non-diagonal CCM. 0.34 is a CEILING, not an expectation.
  // Phase 5b is what decides whether this correction ships at all.
  assert.ok(residual < 11.395, "correction must at least beat doing nothing");
});

test("vonKriesGains normalises to the mean, so a neutral sample is left alone", () => {
  const g = vonKriesGains({ r: 0.5, g: 0.5, b: 0.5 });
  near(g.r, 1, 1e-12); near(g.g, 1, 1e-12); near(g.b, 1, 1e-12);
  // And the gains are relative: scaling the sclera scales nothing.
  const a = vonKriesGains({ r: 0.6, g: 0.5, b: 0.4 });
  const b = vonKriesGains({ r: 0.3, g: 0.25, b: 0.2 });
  near(a.r, b.r, 1e-12); near(a.g, b.g, 1e-12); near(a.b, b.b, 1e-12);
});
