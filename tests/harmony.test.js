import { test } from "node:test";
import assert from "node:assert/strict";

import { geometryReport, canonMatch, CANON, jawAngle, symmetryIndex, LM }
  from "../src/geometry.js";
import { readHarmony, surfaceEvenness, HARMONY_WEIGHTS, SOURCES_DIFFER }
  from "../src/reading/harmony.js";

// ---------------------------------------------------------------- helpers ---

/**
 * Synthetic 478-point face. Built from an explicit ring so the landmarks the
 * canon measurements need are in defensible places rather than noise.
 */
function makeFace({ yaw = 0, mouthWidth = 50, noseWidth = 31, jawInset = 20 } = {}) {
  const pts = new Array(478).fill(null).map(() => ({ x: 200, y: 200 }));
  const set = (i, x, y) => { pts[i] = { x, y }; };

  set(LM.OVAL_APEX, 200, 60);
  set(LM.MENTON, 200, 340);
  set(LM.GLABELLA, 200, 150);
  set(LM.SUBNASALE, 200, 245);
  set(LM.LABIALE_SUPERIUS, 200, 275);

  // Yaw shrinks one side in the image plane.
  const l = 1 - yaw, r = 1 + yaw;
  set(LM.ZYGION_A, 200 - 90 * l, 200);
  set(LM.ZYGION_B, 200 + 90 * r, 200);
  set(LM.FRONTOTEMPORAL_A, 200 - 78 * l, 120);
  set(LM.FRONTOTEMPORAL_B, 200 + 78 * r, 120);
  set(LM.GONION_A, 200 - 72 * l, 280);
  set(LM.GONION_B, 200 + 72 * r, 280);

  // Ring neighbours either side of each gonion. jawInset controls the corner.
  set(LM.RAMUS_A, 200 - (72 + jawInset) * l, 240);
  set(LM.JAWBODY_A, 200 - (72 - jawInset) * l, 315);
  set(LM.RAMUS_B, 200 + (72 + jawInset) * r, 240);
  set(LM.JAWBODY_B, 200 + (72 - jawInset) * r, 315);

  // Eyes — corners level so roll normalisation is a no-op.
  set(33, 150, 190); set(133, 178, 190);
  set(362, 222, 190); set(263, 250, 190);
  set(LM.UPPER_LID_A, 164, 182); set(LM.UPPER_LID_B, 236, 182);

  set(LM.CHEILION_A, 200 - mouthWidth / 2, 285);
  set(LM.CHEILION_B, 200 + mouthWidth / 2, 285);
  set(LM.ALARE_A, 200 - noseWidth / 2, 245);
  set(LM.ALARE_B, 200 + noseWidth / 2, 245);
  return pts;
}

// --------------------------------------------------------- canon matching ---

test("canon match is a distance from a stated figure, not a comparison", () => {
  // Exactly on the canon is 1; a full tolerance away is 0; further is still 0
  // rather than negative, because a match cannot be worse than absent.
  const c = { value: 2, tolerance: 0.5 };
  assert.equal(canonMatch(2, c), 1);
  assert.equal(canonMatch(2.5, c), 0);
  assert.equal(canonMatch(9, c), 0);
  assert.ok(Math.abs(canonMatch(2.25, c) - 0.5) < 1e-9);
  // Symmetric: being under the canon is the same distance as being over.
  assert.equal(canonMatch(1.75, c), canonMatch(2.25, c));
  assert.equal(canonMatch(NaN, c), null);
});

test("each ratio is measured against its OWN canon, not all against phi", () => {
  // The correction that matters. Only mouth-to-nose is a golden-section claim;
  // the courts and fifths have canonical values of 1/3 and 1/5, and scoring
  // them against 1.618 would be a different and false test.
  assert.ok(Math.abs(CANON.MOUTH_TO_NOSE.value - 1.618) < 0.001);
  assert.ok(Math.abs(CANON.MIDDLE_COURT.value - 1 / 3) < 1e-9);
  assert.ok(Math.abs(CANON.CENTRAL_FIFTH.value - 1 / 5) < 1e-9);

  const g = geometryReport(makeFace());
  assert.equal(g.canon.middleCourt.canon, 1 / 3);
  assert.equal(g.canon.centralFifth.canon, 1 / 5);
  for (const k of ["mouthToNose", "middleCourt", "centralFifth"]) {
    assert.ok(g.canon[k].source.length > 0, `${k} must name where its canon comes from`);
  }
});

test("a mouth at phi times the nose matches, a mouth at parity does not", () => {
  const phi = geometryReport(makeFace({ noseWidth: 30, mouthWidth: 30 * 1.618 }));
  const flat = geometryReport(makeFace({ noseWidth: 30, mouthWidth: 30 }));
  assert.ok(canonMatch(phi.canon.mouthToNose.value, CANON.MOUTH_TO_NOSE) > 0.98);
  assert.equal(canonMatch(flat.canon.mouthToNose.value, CANON.MOUTH_TO_NOSE), 0);
});

// -------------------------------------------------------------- geometry ----

test("the jaw angle is taken at the corner, between ring-adjacent points", () => {
  const sharp = jawAngle(makeFace({ jawInset: 45 }));
  const soft = jawAngle(makeFace({ jawInset: 0 }));
  assert.ok(Number.isFinite(sharp.degrees) && Number.isFinite(soft.degrees));
  assert.ok(sharp.degrees < soft.degrees, "a more inset ramus is a sharper corner");
  // Both sides agree on a symmetric face — if they did not, the left/right
  // neighbour assignment would be crossed.
  assert.ok(Math.abs(sharp.left - sharp.right) < 1e-6);
});

test("symmetry refuses to report from a turned head", () => {
  // A flat photo cannot separate genuine asymmetry from yaw, and reporting a
  // number anyway is the easiest way for this measurement to be confidently
  // wrong.
  const straight = geometryReport(makeFace({ yaw: 0 }));
  assert.equal(straight.symmetry.reliable, true);
  assert.ok(straight.symmetry.value > 0.99);

  const turned = geometryReport(makeFace({ yaw: 0.3 }));
  assert.equal(turned.pose.frontal, false);
  assert.equal(turned.symmetry.reliable, false);
  assert.ok(turned.symmetry.caveat.length > 0, "must explain, not just refuse");
});

// --------------------------------------------------------------- reading ----

test("the harmony value describes canons and never ranks a person", () => {
  const h = readHarmony(geometryReport(makeFace()));
  assert.ok(h.value >= 0 && h.value <= 100);

  // Nothing in the payload may carry comparison-to-others vocabulary. This is
  // the whole line the module exists on the right side of.
  // Comparison CONSTRUCTIONS, not bare direction words — "named below" is a
  // layout reference and banning it would be a lint about English rather than
  // about claims.
  const text = JSON.stringify(h).toLowerCase();
  for (const banned of ["percentile", "above average", "below average",
                        "better than", "worse than", "more attractive",
                        "rank", "attractiveness", "beauty", "out of 10"]) {
    assert.ok(!text.includes(banned), `harmony output must not contain "${banned}"`);
  }
});

test("the canons are stated as disagreeing, because they are", () => {
  const h = readHarmony(geometryReport(makeFace()));
  assert.equal(h.sourcesDiffer, SOURCES_DIFFER);
  assert.ok(/Mian Xiang/.test(h.sourcesDiffer));
  assert.ok(/European/.test(h.sourcesDiffer),
    "the note must name both traditions, or it is not a disagreement");
});

test("a dropped component changes the basis, and the basis travels", () => {
  // Same hazard as glowIndex: rescaling over fewer components makes two
  // values incomparable, and dropping a below-average one RAISES the result.
  const straight = readHarmony(geometryReport(makeFace({ yaw: 0 })));
  const turned = readHarmony(geometryReport(makeFace({ yaw: 0.3 })));

  assert.ok(straight.basis.includes("symmetry"));
  assert.ok(!turned.basis.includes("symmetry"),
    "an unmeasurable component must leave the basis, not default to a value");
  assert.notEqual(straight.basis, turned.basis);
  assert.equal(turned.dropped[0].key, "symmetry");
  assert.ok(turned.dropped[0].why.length > 0);

  // Sorted, so the same component set always produces the same string.
  assert.equal(straight.basis, [...straight.basis.split("+")].sort().join("+"));
});

test("weights are declared and sum to 1 with 4:3:2 ratio", () => {
  const total = Object.values(HARMONY_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, "weights must sum to 1");
  // Check 4:3:2 ratio: canon:sym:jaw = 4:3:2
  const canon = HARMONY_WEIGHTS.canon;
  const symmetry = HARMONY_WEIGHTS.symmetry;
  const jaw = HARMONY_WEIGHTS.jaw;
  assert.ok(Math.abs(canon / 4 - symmetry / 3) < 1e-9);
  assert.ok(Math.abs(symmetry / 3 - jaw / 2) < 1e-9);
});

test("cheekbone input is inert to harmony", () => {
  const g1 = geometryReport(makeFace());
  const g2 = { ...g1, cheekbones: { value: 1.0 } };
  const h1 = readHarmony(g1);
  const h2 = readHarmony(g2);
  assert.equal(h1.value, h2.value);
  assert.equal(h1.basis, h2.basis);
  assert.deepEqual(h1.components, h2.components);
});

test("the surface term needs real scalars and never substitutes a default", () => {
  // A stand-in here would let the composite imply a reading that did not happen.
  assert.equal(surfaceEvenness(null), null);
  assert.equal(surfaceEvenness({ zones: {} }), null);
  assert.equal(surfaceEvenness({ zones: { a: { deltaContrast: null } } }), null,
    "a refused colour regime is not evenness of zero");

  const even = surfaceEvenness({ zones: {
    a: { deltaContrast: 0 }, b: { deltaContrast: 0 }, c: { deltaContrast: 0 } } });
  const uneven = surfaceEvenness({ zones: {
    a: { deltaContrast: 0.006 }, b: { deltaContrast: 0.006 }, c: { deltaContrast: 0.006 } } });
  assert.equal(even.value, 1);
  assert.equal(uneven.value, 0);

  // Absent scalars must leave the composite untouched, not shift it.
  const g = geometryReport(makeFace());
  assert.equal(readHarmony(g).value, readHarmony(g).withoutSurface);
});

test("a face with no measurable geometry reports nothing, not zero", () => {
  assert.equal(readHarmony(null), null);
  const empty = readHarmony({ canon: {}, symmetry: null, jaw: {}, cheekbones: {} });
  assert.equal(empty.value, null, "silence, not a value of zero");
  assert.equal(empty.basis, "");
});
