/*
 * ROI extraction — the layer that had no coverage at all.
 *
 * A real-photo run found that `nose_bridge` was never extracted on any face:
 * its landmark set was five COLLINEAR midline points, so the convex hull had
 * ~no width and the size floor dropped it. That silently disabled the Module B
 * malar gate, which reads that zone — and the refusal it produced was
 * byte-identical to the honest deep-skin refusal, so nothing looked wrong.
 *
 * 199 tests passed while the gate was dead, because every fixture supplied
 * `nose_bridge` BY HAND and none built a region set from ROIS + landmarks. The
 * tests asserted the threshold logic on top of geometry they assumed. These
 * tests assert the geometry.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROIS } from "../src/zones.js";
import { roiFootprint, hullFor, MIN_ROI_PX } from "../src/roi.js";
import { evaluateSafety, SAFETY_THRESHOLDS } from "../src/adapters/safety.js";
import { DELTA_EI_FULL_SCALE } from "../src/engine.js";
import { canonicalFace } from "./fixtures/canonical-face.js";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

// A working canvas the size a real phone photo lands at after drawToCanvas.
const W = 768, H = 1024;

test("EVERY zone in ROIS survives extraction on the canonical face", () => {
  const pts = canonicalFace();
  const dropped = [];

  for (const [key, def] of Object.entries(ROIS)) {
    const fp = roiFootprint(def, pts, W, H);
    if (fp.dropped) dropped.push(`${key}: ${fp.dropped} (${fp.rw}x${fp.rh}px)`);
  }

  assert.deepEqual(dropped, [],
    "a zone defined in zones.js but dropped at extraction is invisible to every " +
    "other test in this suite, because they all supply regions by hand");
});

test("no ROI is degenerate — each hull encloses real area on BOTH axes", () => {
  const pts = canonicalFace();

  for (const [key, def] of Object.entries(ROIS)) {
    const fp = roiFootprint(def, pts, W, H);
    assert.equal(fp.dropped, null, `${key} was dropped`);

    // The specific failure: landmarks collinear along one axis. The canonical
    // mesh is bilaterally symmetric, so a pure-midline set measures EXACTLY
    // zero width there — which is how nose_bridge died.
    assert.ok(fp.rw >= MIN_ROI_PX,
      `${key} is ${fp.rw}px wide — its landmarks are collinear or near-collinear`);
    assert.ok(fp.rh >= MIN_ROI_PX, `${key} is ${fp.rh}px tall`);
  }
});

test("nose_bridge spans both sidewalls, not just the dorsal midline", () => {
  // Pins the fix directly. On a symmetric mesh a midline-only set has zero
  // width, so this is the assertion the original definition could never pass.
  const pts = canonicalFace();
  const fp = roiFootprint(ROIS.nose_bridge, pts, W, H);

  assert.equal(fp.dropped, null);
  assert.ok(fp.rw > 20, `expected a real bridge patch, got ${fp.rw}px wide`);

  const midline = pts[168].x;
  const xs = ROIS.nose_bridge.idx.map((i) => pts[i].x);
  assert.ok(Math.min(...xs) < midline - 5, "no landmark on the subject's right sidewall");
  assert.ok(Math.max(...xs) > midline + 5, "no landmark on the subject's left sidewall");
});

test("a collinear landmark set is caught, not silently skipped", () => {
  // The negative control: the ORIGINAL nose_bridge definition, which must be
  // reported as dropped with a reason rather than vanishing.
  const pts = canonicalFace();
  const collinear = { idx: [6, 197, 195, 5, 168], pad: 0.10 };

  const fp = roiFootprint(collinear, pts, W, H);
  assert.equal(fp.dropped, "too_small");
  assert.equal(fp.rw, 0, "midline points on a symmetric mesh have exactly zero width");

  // And the positive control in the same test: the replacement passes.
  assert.equal(roiFootprint(ROIS.nose_bridge, pts, W, H).dropped, null);
});

test("hullFor refuses a set that cannot make a polygon", () => {
  const pts = canonicalFace();
  assert.equal(hullFor([1, 2], pts, 0.1), null);
  assert.equal(roiFootprint({ idx: [1, 2], pad: 0.1 }, pts, W, H).dropped, "no_hull");
});

test("every zone key referenced in src/ resolves to a key in ROIS", () => {
  // The reverse direction, which nothing checked: a consumer naming a zone that
  // does not exist reads `undefined` and degrades silently.
  const files = [
    "adapters/safety.js", "rules-a.js", "rules-b.js", "ui.js",
    "reading/twelve-palaces.js",
  ];
  const known = new Set(Object.keys(ROIS));
  const bad = [];

  for (const rel of files) {
    const text = fs.readFileSync(path.join(SRC, rel), "utf8");
    // Zone names are referenced as bare string literals in every one of these.
    for (const m of text.matchAll(/["'`](nose_[a-z_]+|cheek_[a-z]+|periorbital_[a-z]+|nasolabial_[a-z]+|perioral_[a-z]+|glabella|center_forehead|chin)["'`]/g)) {
      if (!known.has(m[1])) bad.push(`${rel}: ${m[1]}`);
    }
  }

  assert.deepEqual(bad, [], "zone key referenced that zones.js does not define");
});

// ─────────────────────────────────────────────── the gate, through geometry ─

/**
 * Build the `rawScalars()`-shaped object from the REAL extraction path, so the
 * safety adapter is exercised against zones that actually survived rather than
 * a hand-written map. Only deltaEi is populated — that is all the malar gate
 * reads, and inventing the rest would be fixture-building again.
 */
function rawFromExtraction(deltaEiByZone) {
  const pts = canonicalFace();
  const zones = {};
  for (const [key, def] of Object.entries(ROIS)) {
    if (roiFootprint(def, pts, W, H).dropped) continue;   // as the pipeline does
    zones[key] = { deltaEi: deltaEiByZone[key] ?? 0 };
  }
  return { baseline: { regime: "full" }, zones };
}

test("Module B can REACH a decision when the zones it needs are extractable", () => {
  // This is the test that would have caught the dead gate. `assessable: false`
  // was returned on every real photo, in every skin tone, because nose_bridge
  // was missing — and it wore the same reason as the legitimate refusal.
  const out = evaluateSafety(rawFromExtraction({}));

  assert.equal(out.enabled, true);
  assert.equal(out.assessable, true,
    "the gate must reach a decision, not refuse, when its zones exist");
  assert.deepEqual(out.referrals, [], "a clear face yields no referral");
});

test("a missing zone is reported as a BUG, not as an honest refusal", () => {
  const raw = rawFromExtraction({});
  delete raw.zones.nose_bridge;

  const out = evaluateSafety(raw);
  assert.equal(out.assessable, false);
  assert.equal(out.reason, "zoneNotExtracted");
  assert.deepEqual(out.missingZones, ["nose_bridge"]);

  // The deep-skin refusal must remain distinguishable from it — that half of
  // the behaviour was always correct and must survive this fix.
  const nulled = rawFromExtraction({});
  for (const k of Object.keys(nulled.zones)) nulled.zones[k].deltaEi = null;
  const refused = evaluateSafety(nulled);
  assert.equal(refused.assessable, false);
  assert.equal(refused.reason, "colourNotMeasurable");
  assert.notEqual(out.reason, refused.reason,
    "'the zone is missing' and 'colour is not measurable here' are different events");
});

test("the malar gate fires end to end, through real ROI geometry", () => {
  // Redness on both cheeks and the bridge, smile lines spared.
  const red = (DELTA_EI_FULL_SCALE * SAFETY_THRESHOLDS.MALAR_CHEEK_SEVERITY) + 1;
  const out = evaluateSafety(rawFromExtraction({
    cheek_left: red, cheek_right: red, nose_bridge: red,
    nasolabial_left: 0, nasolabial_right: 0,
  }));

  assert.equal(out.assessable, true);
  assert.equal(out.referrals.length, 1, "the malar pattern must produce a referral");
  assert.equal(out.referrals[0].id, "SG-001-MALAR");
  assert.equal(out.referrals[0].billable, false);

  // Negative control, same run: involve the smile lines and the pattern is a
  // different picture, so the gate must NOT fire.
  const spared = evaluateSafety(rawFromExtraction({
    cheek_left: red, cheek_right: red, nose_bridge: red,
    nasolabial_left: red, nasolabial_right: red,
  }));
  assert.deepEqual(spared.referrals, [], "nasolabial involvement must suppress the gate");
});
