/*
 * Sensor-noise confidence (Initiative 2 of the lighting-consistency review).
 *
 * A screen-flash or a dim room can force a phone's auto-exposure to raise
 * ISO rather than lengthen exposure, which fills the erythema/pigmentation
 * deltas with sensor grain instead of physiological signal. There is no way
 * to read the sensor's actual ISO from getUserMedia, so this measures the
 * SYMPTOM instead: high-frequency energy in a region that should be flat
 * (the peripheral baseline zones item 6 already treats as the colour
 * reference). See sensorNoiseConfidence() in engine.js for why this is a
 * confidence flag and never a hard rejection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { sensorNoiseConfidence, rawScalars, SENSOR_NOISE_VARIANCE_CEILING } from "../src/engine.js";
import { patch, region } from "./engine.test.js";

const SKIN = [175, 140, 120];

test("a cleanly-exposed baseline reads full confidence", () => {
  const regions = {
    center_forehead: region(SKIN, { seed: 1, noise: 3 }),
    chin: region(SKIN, { seed: 2, noise: 3 }),
  };
  const result = sensorNoiseConfidence(regions);
  assert.equal(result.confidence, "full");
  assert.ok(result.noiseVariance < SENSOR_NOISE_VARIANCE_CEILING);
  assert.equal(result.zonesRead, 2);
});

test("a forced-high-ISO baseline reads degraded confidence, not a refusal", () => {
  const regions = {
    center_forehead: region(SKIN, { seed: 1, noise: 24 }),
    chin: region(SKIN, { seed: 2, noise: 24 }),
  };
  const result = sensorNoiseConfidence(regions);
  assert.equal(result.confidence, "degraded");
  assert.ok(result.noiseVariance > SENSOR_NOISE_VARIANCE_CEILING,
    `expected noise variance above the ceiling, got ${result.noiseVariance}`);
  assert.equal(result.reason, "high_frequency_energy_exceeds_flat_skin_ceiling");
});

test("too few baseline pixels reads 'unknown', not a false 'full'", () => {
  const tinyMask = new Uint8Array(80 * 80); // all zero — nothing survives
  const regions = {
    center_forehead: { w: 80, h: 80, mask: tinyMask, stats: { gray: new Uint8Array(80 * 80) } },
  };
  const result = sensorNoiseConfidence(regions);
  assert.equal(result.confidence, "unknown");
  assert.equal(result.noiseVariance, null);
  assert.equal(result.reason, "not_enough_baseline_pixels");
});

test("only the configured baseline zones are pooled, not every region", () => {
  const clean = region(SKIN, { seed: 1, noise: 3 });
  const noisy = region(SKIN, { seed: 2, noise: 24 });
  // "quan_l" (a cheek) is not a baseline zone — its noise must not leak into
  // a confidence signal that is supposed to describe the peripheral baseline.
  const regions = { center_forehead: clean, chin: clean, quan_l: noisy };
  const result = sensorNoiseConfidence(regions);
  assert.equal(result.confidence, "full");
  assert.equal(result.zonesRead, 2);
});

test("degraded noise confidence is advisory — zone deltas are still emitted", () => {
  const regions = {
    center_forehead: region(SKIN, { seed: 1, noise: 24 }),
    chin: region(SKIN, { seed: 2, noise: 24 }),
    quan_l: region([195, 120, 110], { seed: 3, noise: 3 }),
  };
  const raw = rawScalars(regions);
  assert.equal(raw.baseline.sensorNoiseConfidence, "degraded");
  // Advisory, not blocking: deltaEi is still a real number, not null/withheld
  // on account of noise — only the low-ITA regime (item: dark-skin limit) is
  // allowed to withhold an observation, and that is a different signal.
  assert.equal(typeof raw.zones.quan_l.deltaEi, "number");
});

test("rawScalars() carries the same confidence sensorNoiseConfidence() computes directly", () => {
  const regions = {
    center_forehead: region(SKIN, { seed: 1, noise: 3 }),
    chin: region(SKIN, { seed: 2, noise: 3 }),
  };
  const direct = sensorNoiseConfidence(regions);
  const raw = rawScalars(regions);
  assert.equal(raw.baseline.sensorNoiseConfidence, direct.confidence);
  assert.equal(raw.baseline.sensorNoiseVariance, direct.noiseVariance);
});
