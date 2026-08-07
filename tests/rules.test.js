import { test } from "node:test";
import assert from "node:assert/strict";

import { runRules } from "../src/rules.js";
import { ROIS } from "../src/zones.js";
import { ZONE_READINGS } from "../src/rules-a.js";
import { analyse } from "../src/engine.js";
import { region } from "./engine.test.js";

const obs = (zone, condition, severity, measured = {}) =>
  ({ fact: "observation", zone, condition, severity, measured });

const SKIN = [175, 140, 120];
const REDDER = [195, 120, 110];

// ------------------------------------------------------------- laterality ---

test("cheek laterality follows MediaPipe's subject-anatomical convention", () => {
  // Verified against MediaPipe's own FaceLandmarksConnections:
  //   FACE_LANDMARKS_RIGHT_EYE contains 33, 133
  //   FACE_LANDMARKS_LEFT_EYE  contains 263, 362
  // The original spec had these swapped, which would invert the whole
  // Liver/Lung cheek distinction.
  assert.ok(ROIS.cheek_right.idx.includes(234));
  assert.ok(ROIS.cheek_left.idx.includes(454));
  assert.ok(ROIS.periorbital_right.idx.includes(33));
  assert.ok(ROIS.periorbital_left.idx.includes(263));

  // The correspondences moved to Module A when rules.js was split — the zone
  // geometry is measurement config, the organ reading is attributed tradition.
  // The laterality assertion is the same one either way.
  assert.match(ZONE_READINGS.cheek_right.correspondence, /Lung/);
  assert.match(ZONE_READINGS.cheek_left.correspondence, /Liver/);
});

// ----------------------------------------------------------- safety gates ---

test("malar pattern fires the gate and suppresses all TCM output", () => {
  const r = runRules([
    obs("cheek_left", "erythema", 0.7),
    obs("cheek_right", "erythema", 0.7),
    obs("nose_bridge", "erythema", 0.65),
    obs("glabella", "deep_rhytide_vertical", 0.9),   // would otherwise fire
  ]);
  assert.equal(r.halted, true);
  assert.equal(r.haltedBy, "SG-001-MALAR");
  assert.equal(r.referrals.length, 1);
  assert.equal(r.recommendations.length, 0,
    "a referral must not sit beside reassuring lifestyle advice");
});

test("referral never names a disease", () => {
  // TGA exclusion 14B (general health/wellness software) does not apply to
  // software making claims about a serious disease, and EVERY function must
  // qualify or the exclusion is void for the whole product.
  const r = runRules([
    obs("cheek_left", "erythema", 0.7),
    obs("cheek_right", "erythema", 0.7),
    obs("nose_bridge", "erythema", 0.65),
  ]);
  const blob = JSON.stringify(r).toLowerCase();
  for (const term of ["lupus", "sle", "autoimmune", "butterfly", "malar rash"]) {
    assert.ok(!blob.includes(term), `leaked "${term}" to the user`);
  }
  assert.ok(r.referrals[0].message.length > 0, "but the user is still told to seek care");
});

test("nasolabial involvement stops the gate firing", () => {
  // Redness that includes the smile lines is not the butterfly distribution.
  const r = runRules([
    obs("cheek_left", "erythema", 0.7),
    obs("cheek_right", "erythema", 0.7),
    obs("nose_bridge", "erythema", 0.65),
    obs("nasolabial_left", "erythema", 0.6),
    obs("nasolabial_right", "erythema", 0.6),
    obs("glabella", "deep_rhytide_vertical", 0.9),
  ]);
  assert.equal(r.halted, false);
  assert.ok(r.recommendations.some((x) => x.rule === "TCM-101-LIVER-QI"));
});

// -------------------------------------------------------- forward chaining --

test("derived facts re-enter working memory and chain", () => {
  const r = runRules([
    obs("perioral_upper", "xerosis", 0.7),
    obs("periorbital_left", "hyperpigmentation", 0.7),
    obs("periorbital_right", "hyperpigmentation", 0.7),
  ]);
  const names = r.recommendations.map((x) => x.name);
  assert.ok(names.includes("Stomach Heat"));
  assert.ok(names.includes("Kidney Qi Deficiency"));
  assert.ok(names.includes("Damp-Heat"), "second-order rule must fire");
});

test("rules do not re-fire on the same binding", () => {
  const r = runRules([obs("glabella", "deep_rhytide_vertical", 0.9)]);
  const ids = r.trace.map((t) => t.rule);
  assert.equal(ids.length, new Set(ids).size);
});

test("sub-threshold observations fire nothing", () => {
  const r = runRules([obs("glabella", "deep_rhytide_vertical", 0.3)]);
  assert.equal(r.recommendations.length, 0);
});

// -------------------------------------------------- end to end from pixels --

test("measured pixels alone drive the safety gate", () => {
  // No hand-written severities anywhere: synthetic pixels -> colorimetry ->
  // facts -> gate.
  const { observations, baseline } = analyse({
    center_forehead: region(SKIN, { seed: 1 }),
    chin: region(SKIN, { seed: 2 }),
    cheek_left: region(REDDER, { seed: 3 }),
    cheek_right: region(REDDER, { seed: 4 }),
    nose_bridge: region(REDDER, { seed: 5 }),
    nasolabial_left: region(SKIN, { seed: 6 }),
    nasolabial_right: region(SKIN, { seed: 7 }),
  });
  assert.equal(baseline.regime, "full");

  const r = runRules(observations.map((o) => ({ fact: "observation", ...o })));
  assert.equal(r.halted, true);
  assert.equal(r.haltedBy, "SG-001-MALAR");
});

test("a uniform face from pixels produces no conclusions", () => {
  const { observations } = analyse({
    center_forehead: region(SKIN, { seed: 1 }),
    chin: region(SKIN, { seed: 2 }),
    cheek_left: region(SKIN, { seed: 3 }),
    cheek_right: region(SKIN, { seed: 4 }),
    nose_bridge: region(SKIN, { seed: 5 }),
  });
  const r = runRules(observations.map((o) => ({ fact: "observation", ...o })));
  assert.equal(r.halted, false);
  assert.equal(r.recommendations.length, 0);
});

test("glabella furrows from pixels produce Liver Qi Stagnation", () => {
  const { observations } = analyse({
    center_forehead: region(SKIN, { seed: 1 }),
    chin: region(SKIN, { seed: 2 }),
    glabella: region(SKIN, { seed: 3, lines: "v" }),
  });
  const r = runRules(observations.map((o) => ({ fact: "observation", ...o })));
  assert.ok(r.recommendations.some((x) => x.name === "Liver Qi Stagnation"));
});
