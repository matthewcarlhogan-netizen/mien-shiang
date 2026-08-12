/*
 * Module A reading behaviour.
 *
 * Copy compliance is tests/copy-guard.test.js. This file asserts what the
 * reading DOES: that it refuses when the measurement will not support it, that
 * it never presents a partial basis as a complete one, and that it never
 * quietly picks a side where the classical sources disagree.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { composeReading, readFiveElements, readThreeCourts, readTwelvePalaces, readQiSe }
  from "../src/reading/index.js";
import { SHAPE_TO_ELEMENT } from "../src/reading/five-elements.js";
import { PALACES, leadPalaceOf, LEAD_COPY } from "../src/reading/twelve-palaces.js";
import { geometryReport, LM } from "../src/geometry.js";
import { readComplexion } from "../src/adapters/entertainment.js";

function makeFace({ length = 115, cheekW = 100, jawW = 95, foreheadW = 90, cx = 200,
  yawZygionA = null } = {}) {
  const pts = Array.from({ length: 478 }, () => ({ x: cx, y: length / 2 }));
  const Y = (f) => f * length, at = (i, x, y) => { pts[i] = { x, y }; };
  at(LM.OVAL_APEX, cx, Y(0)); at(LM.MENTON, cx, Y(1));
  at(LM.GLABELLA, cx, Y(0.30)); at(LM.SUBNASALE, cx, Y(0.62));
  at(LM.LABIALE_SUPERIUS, cx, Y(0.72));
  at(LM.ZYGION_A, yawZygionA ?? cx - cheekW / 2, Y(0.45));
  at(LM.ZYGION_B, cx + cheekW / 2, Y(0.45));
  at(LM.GONION_A, cx - jawW / 2, Y(0.75)); at(LM.GONION_B, cx + jawW / 2, Y(0.75));
  at(LM.FRONTOTEMPORAL_A, cx - foreheadW / 2, Y(0.15));
  at(LM.FRONTOTEMPORAL_B, cx + foreheadW / 2, Y(0.15));
  at(33, cx - cheekW * 0.40, Y(0.42)); at(263, cx + cheekW * 0.40, Y(0.42));
  at(133, cx - cheekW * 0.14, Y(0.42)); at(362, cx + cheekW * 0.14, Y(0.42));
  at(LM.UPPER_LID_A, cx - cheekW * 0.27, Y(0.40));
  at(LM.UPPER_LID_B, cx + cheekW * 0.27, Y(0.40));
  return pts;
}

function makeRaw({ regime = "full", deltaEi = 0, deltaMi = 0 } = {}) {
  const keys = ["glabella", "center_forehead", "nose_bridge", "nose_apex",
    "eyebrow_right", "eyebrow_left", "upper_eyelid_right", "upper_eyelid_left",
    "outer_eye_right", "outer_eye_left", "temple_right", "temple_left",
    "fortune_forehead_right", "fortune_forehead_left",
    "parent_forehead_right", "parent_forehead_left",
    "periorbital_left", "periorbital_right", "cheek_left", "cheek_right", "chin"];
  const zones = {};
  for (const k of keys) {
    zones[k] = {
      deltaEi: regime === "low" ? null : deltaEi, deltaMi,
      deltaContrast: 0, ridge: 0.01, ridgeDelta: 0, ridgeAxis: "horizontal",
      L: 60, b: 15, pixels: 4000,
    };
  }
  return { baseline: { regime, band: regime === "low" ? "dark" : "light", n: 9000 }, zones };
}

// ───────────────────────────────────────────────────────── Five Elements ────

test("a square face types as Earth and names Metal as the other reading", () => {
  const r = readFiveElements(geometryReport(makeFace({ length: 115, jawW: 95, foreheadW: 90 })));
  assert.equal(r.available, true);
  assert.equal(r.element, "earth");
  assert.ok(r.alternates.some((a) => a.element === "metal"),
    "the square face is Earth in some texts and Metal in others — both must be shown");
  assert.match(r.sourcesDiffer, /Earth/);
  assert.match(r.sourcesDiffer, /Metal/);
});

test("every shape maps to an element and no mapping is silent about disagreement", () => {
  for (const [shape, m] of Object.entries(SHAPE_TO_ELEMENT)) {
    assert.ok(m.primary, `${shape} must have a primary element`);
    assert.ok(m.alternates.length > 0, `${shape} must name at least one competing reading`);
    assert.ok(m.sourcesDiffer.length > 60, `${shape} must explain the disagreement`);
  }
});

test("oval is flagged as the residual shape, so its typing is not overstated", () => {
  const g = geometryReport(makeFace({ length: 135, jawW: 88, foreheadW: 90 }));
  assert.equal(g.shape.residual, true, "precondition: oval is the residual class");
  assert.equal(readFiveElements(g).residualShape, true);
});

test("a turned head is REFUSED a Five Elements typing rather than typed badly", () => {
  const g = geometryReport(makeFace({ yawZygionA: 185 }));
  assert.equal(g.shapeReliable, false, "precondition: not frontal");
  const r = readFiveElements(g);
  assert.equal(r.available, false);
  assert.equal(r.why, "headTurned");
  assert.match(r.note, /square to the camera/i);
});

// ─────────────────────────────────────────────────────────── Three Courts ───

test("Three Courts carries the trichion caveat into the reading", () => {
  const r = readThreeCourts(geometryReport(makeFace()));
  assert.equal(r.available, true);
  assert.match(r.measurementCaveat, /hairline/i,
    "the upper court is measured short and the reading must say so");
  const sum = r.fractions.upper + r.fractions.middle + r.fractions.lower;
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("near-equal courts read as balanced rather than picking a winner", () => {
  // Built so the three courts land within the dominance threshold.
  const pts = makeFace({ length: 300 });
  pts[LM.GLABELLA] = { x: 200, y: 100 };
  pts[LM.SUBNASALE] = { x: 200, y: 200 };
  const r = readThreeCourts(geometryReport(pts));
  assert.equal(r.balanced, true);
  assert.equal(r.dominant, null);
  assert.match(r.reading, /balance/i);
});

// ───────────────────────────────────────────────────────── Twelve Palaces ───

test("all twelve palaces have real region mappings and are measured", () => {
  const r = readTwelvePalaces(makeRaw());
  assert.equal(r.totalCount, 12);
  assert.equal(r.supportedCount, 12);
  assert.equal(r.measuredCount, 12);
  assert.equal(r.palaces.length, 12);
  assert.equal(PALACES.every((palace) => palace.zone || palace.zones?.length), true);
  for (const p of r.palaces) {
    assert.equal(p.measured, true, `${p.key}: must be measured`);
    assert.ok(["clear", "even", "shadowed"].includes(p.tone));
    assert.ok(p.toneGloss.length > 0);
  }
});

test("a missing bilateral sample refuses that palace instead of averaging one side", () => {
  const raw = makeRaw();
  delete raw.zones.temple_left;
  const r = readTwelvePalaces(raw);
  const travel = r.palaces.find((palace) => palace.key === "travel");
  assert.equal(r.measuredCount, 11);
  assert.equal(travel.measured, false);
  assert.equal(travel.tone, null);
  assert.match(travel.notMeasuredNote, /could not be measured/i);
});

test("bilateral palace tones deterministically combine both sides", () => {
  const raw = makeRaw();
  raw.zones.eyebrow_right.deltaMi = 5;
  raw.zones.eyebrow_left.deltaMi = -1;
  const siblings = readTwelvePalaces(raw).palaces.find((palace) => palace.key === "siblings");
  assert.equal(siblings.tone, "shadowed");
});

test("the illness palace is rendered as trials, and the narrowing is declared", () => {
  const trials = PALACES.find((p) => p.key === "trials");
  assert.equal(trials.hanzi, "疾厄宮");
  assert.equal(trials.name, "Palace of Trials");
  // The classical name carries a health sense this build does not use. Saying
  // so openly is the point; performing the narrowing silently is not.
  assert.match(trials.translationNote, /Health Palace/);
  assert.match(trials.translationNote, /adversity/i);
  assert.doesNotMatch(trials.reading, /health|illness|disease/i);
});

test("palace tone tracks the measured pigment difference", () => {
  const shadowed = readTwelvePalaces(makeRaw({ deltaMi: 5 }));
  const clear = readTwelvePalaces(makeRaw({ deltaMi: -5 }));
  const even = readTwelvePalaces(makeRaw({ deltaMi: 0 }));
  const toneOf = (r) => r.palaces.find((p) => p.key === "life").tone;
  assert.equal(toneOf(shadowed), "shadowed");
  assert.equal(toneOf(clear), "clear");
  assert.equal(toneOf(even), "even");
});

test("every palace keeps its OWN reading, so twelve cards are not three sentences", () => {
  // The regression this pins is a VIEW defect with a measurable shape: the
  // reading screen rendered `toneGloss` as each palace's body, and toneGloss
  // has three values. A full 12-of-12 scan therefore paid out three distinct
  // sentences — the better the capture, the more generic the result.
  const r = readTwelvePalaces(makeRaw({ deltaMi: 5 }));
  const readings = new Set(r.palaces.map((p) => p.reading));
  const glosses = new Set(r.palaces.map((p) => p.toneGloss));

  assert.equal(readings.size, 12, "each palace must carry its own distinct reading");
  assert.equal(glosses.size, 1, "the tone gloss is per-TONE, which is why it cannot be the body");
  for (const p of r.palaces) {
    assert.ok(p.reading.length > 60, `${p.key}: the palace reading must survive measurement`);
  }
});

test("the lead palace is the one furthest from baseline, and ties are deterministic", () => {
  const raw = makeRaw({ deltaMi: 2 });
  // Career sits furthest; sign must not decide, so it is driven NEGATIVE while
  // everything else is positive. A signed comparison would pick a shadowed
  // palace here and call the sign convention a finding.
  raw.zones.center_forehead.deltaMi = -9;
  const r = readTwelvePalaces(raw);
  const lead = leadPalaceOf(r);

  assert.equal(lead.palace.key, "career");
  assert.equal(lead.distance, 9);
  assert.equal(lead.palace.tone, "clear");

  // Same frame, same lead, every time — including where several palaces tie.
  const flat = readTwelvePalaces(makeRaw({ deltaMi: 5 }));
  const first = leadPalaceOf(flat);
  assert.equal(first.palace.key, "life", "a tie breaks on PALACES order, not insertion order");
  assert.equal(leadPalaceOf(flat).palace.key, first.palace.key);
});

test("no lead is named when nothing stood out, and none is invented for old records", () => {
  // Within the tone threshold: the honest answer is that no palace led.
  assert.equal(leadPalaceOf(readTwelvePalaces(makeRaw({ deltaMi: 0 }))), null);

  // Records stored before `deltaMi` was carried. Ranking these would mean
  // ranking on a value that was never measured.
  const legacy = { palaces: readTwelvePalaces(makeRaw({ deltaMi: 5 })).palaces
    .map(({ deltaMi, ...rest }) => rest) };
  assert.equal(leadPalaceOf(legacy), null);
  assert.equal(leadPalaceOf(null), null);
  assert.equal(leadPalaceOf({ palaces: [] }), null);
});

test("an unmeasured palace can never lead, whatever it carries", () => {
  const raw = makeRaw({ deltaMi: 2 });
  delete raw.zones.temple_left;
  const r = readTwelvePalaces(raw);
  const travel = r.palaces.find((p) => p.key === "travel");
  assert.equal(travel.measured, false);
  assert.equal(travel.deltaMi, null, "an unmeasured palace must not carry a delta");

  // Even with a large value welded on, `measured: false` decides.
  travel.deltaMi = 99;
  assert.notEqual(leadPalaceOf(r).palace.key, "travel");
});

// ────────────────────────────────────────────────────────────────── qi se ───

test("a complete basis produces no basis note", () => {
  const r = readQiSe(readComplexion(makeRaw({ regime: "full", deltaEi: 2 })));
  assert.equal(r.available, true);
  assert.equal(r.basisComplete, true);
  assert.equal(r.basisNote, null);
  assert.equal(r.signalsMissing.length, 0);
});

test("a reduced basis is stated in the reading, in the required wording", () => {
  const r = readQiSe(readComplexion(makeRaw({ regime: "low" })));
  assert.equal(r.basisComplete, false);
  assert.deepEqual(r.signalsMissing, ["warmth"]);
  assert.equal(
    r.basisNote,
    "Today's reading is based on two of three colour signals — complexion warmth wasn't measurable in this lighting.",
  );
});

test("qi se never silently presents a partial reading as a full one", () => {
  const full = readQiSe(readComplexion(makeRaw({ regime: "full", deltaEi: 7 })));
  const low = readQiSe(readComplexion(makeRaw({ regime: "low" })));
  assert.equal(full.basisNote, null);
  assert.ok(low.basisNote, "a short basis must always be declared");
  // And the basis key differs, so nothing downstream can compare them blindly.
  assert.notEqual(full.basis, low.basis);
});

test("qi se refuses when there is not enough skin rather than inventing a band", () => {
  const r = readQiSe(readComplexion({ baseline: {}, zones: {} }));
  assert.equal(r.available, false);
  assert.equal(r.why, "notEnoughSkinVisible");
});

test("qi se consumes the entertainment adapter only — no condition names reach it", () => {
  const r = readQiSe(readComplexion(makeRaw({ regime: "full", deltaEi: 3 })));
  const blob = JSON.stringify(r).toLowerCase();
  for (const term of ["erythema", "pallor", "hyperpigmentation", "xerosis", "rhytide", "severity"]) {
    assert.ok(!blob.includes(term), `qi se output leaked "${term}"`);
  }
});

// ───────────────────────────────────────────────────────────── composition ──

test("composeReading assembles all four readings and stays Module A", () => {
  const geometry = geometryReport(makeFace());
  const raw = makeRaw();
  const reading = composeReading(geometry, readComplexion(raw), raw);

  assert.equal(reading.module, "A");
  for (const k of ["fiveElements", "threeCourts", "twelvePalaces", "qiSe"]) {
    assert.ok(reading[k], `${k} missing from the composed reading`);
  }
  // No referral, advisory or safety field may ride along inside Module A.
  const blob = JSON.stringify(reading).toLowerCase();
  for (const term of ["referral", "clinician", "doctor", "diagnos"]) {
    assert.ok(!blob.includes(term), `Module A reading leaked "${term}"`);
  }
});

test("composeReading degrades rather than throwing when inputs are missing", () => {
  assert.doesNotThrow(() => composeReading(null, null, null));
  const r = composeReading(null, null, null);
  assert.equal(r.fiveElements, null);
  assert.equal(r.qiSe, null);
});
