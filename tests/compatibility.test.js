/*
 * Five Elements compatibility engine.
 *
 * Tests cover:
 *   - The full matrix: every non-identical pair is classified
 *   - Symmetry: (a, b) and (b, a) are related readings in the same cycle
 *   - Rejection of unknown element names
 *   - That no reading in the matrix carries health vocabulary or a verdict
 */
import test from "node:test";
import assert from "node:assert/strict";

import { readCompatibility, INTERACTION_READINGS, VALID_ELEMENTS } from "../src/compatibility.js";

const ALL_ELEMENTS = [...VALID_ELEMENTS];

// ──────────────────────────────────────────────────── matrix coverage ──

test("every pair of elements returns a non-null result", () => {
  for (const a of ALL_ELEMENTS) {
    for (const b of ALL_ELEMENTS) {
      const r = readCompatibility(a, b);
      assert.ok(r !== null, `readCompatibility("${a}", "${b}") returned null`);
      assert.ok(r.type, `readCompatibility("${a}", "${b}") has no type`);
      assert.ok(r.reading, `readCompatibility("${a}", "${b}") has no reading`);
    }
  }
});

test("same-element pairs always return type 'same'", () => {
  for (const el of ALL_ELEMENTS) {
    const r = readCompatibility(el, el);
    assert.equal(r?.type, "same", `same-element pair "${el}" must return type "same"`);
  }
});

test("generating pairs are classified as sheng_ab or sheng_ba, not ke", () => {
  // Generating cycle: wood→fire→earth→metal→water→wood
  const SHENG = [
    ["wood", "fire"], ["fire", "earth"], ["earth", "metal"],
    ["metal", "water"], ["water", "wood"],
  ];
  for (const [a, b] of SHENG) {
    const ab = readCompatibility(a, b);
    assert.equal(ab?.type, "sheng_ab", `(${a}, ${b}) should be sheng_ab`);
    const ba = readCompatibility(b, a);
    assert.equal(ba?.type, "sheng_ba", `(${b}, ${a}) should be sheng_ba`);
  }
});

test("overcoming pairs are classified as ke_ab or ke_ba, not sheng", () => {
  // Overcoming cycle: wood→earth→water→fire→metal→wood
  const KE = [
    ["wood", "earth"], ["earth", "water"], ["water", "fire"],
    ["fire", "metal"], ["metal", "wood"],
  ];
  for (const [a, b] of KE) {
    const ab = readCompatibility(a, b);
    assert.equal(ab?.type, "ke_ab", `(${a}, ${b}) should be ke_ab`);
    const ba = readCompatibility(b, a);
    assert.equal(ba?.type, "ke_ba", `(${b}, ${a}) should be ke_ba`);
  }
});

// ──────────────────────────────────────────────────────── robustness ──

test("readCompatibility rejects unknown element names", () => {
  assert.equal(readCompatibility("gold", "fire"), null);
  assert.equal(readCompatibility("wood", ""), null);
  assert.equal(readCompatibility(null, "fire"), null);
  assert.equal(readCompatibility(undefined, undefined), null);
});

test("readCompatibility is case-insensitive", () => {
  const r = readCompatibility("Wood", "FIRE");
  assert.equal(r?.type, "sheng_ab");
});

// ──────────────────────────────── copy compliance: every reading uses ──

const MODULE_A_BLOCKLIST = [
  "diagnose", "diagnosis", "treat", "treatment", "symptom", "condition",
  "cure", "disorder", "disease", "pathology", "severity", "referral",
  "medical", "clinical", "anaemia", "thyroid", "iron", "circulation", "blood",
  "acne", "rosacea", "dermatitis", "eczema", "melanoma", "cancer", "lesion",
];

test("INTERACTION_READINGS contain no Module A blocklisted vocabulary", () => {
  for (const [key, entry] of Object.entries(INTERACTION_READINGS)) {
    for (const term of MODULE_A_BLOCKLIST) {
      const re = new RegExp(String.raw`\b${term}\b`, "i");
      assert.doesNotMatch(entry.reading, re,
        `INTERACTION_READINGS.${key} contains blocked term "${term}"`);
    }
  }
});

test("every INTERACTION_READINGS entry names the tradition inline", () => {
  const ATTRIBUTION =
    /Mian Xiang|Classical Chinese face reading|Chinese (and Western )?tradition|classical texts?|the texts/i;
  for (const [key, entry] of Object.entries(INTERACTION_READINGS)) {
    assert.match(entry.reading, ATTRIBUTION,
      `INTERACTION_READINGS.${key}: reading must name the source tradition`);
  }
});

test("INTERACTION_READINGS include all five interaction types", () => {
  assert.ok("same"     in INTERACTION_READINGS);
  assert.ok("sheng_ab" in INTERACTION_READINGS);
  assert.ok("sheng_ba" in INTERACTION_READINGS);
  assert.ok("ke_ab"    in INTERACTION_READINGS);
  assert.ok("ke_ba"    in INTERACTION_READINGS);
});
