import { test } from "node:test";
import assert from "node:assert/strict";
import { temporalNoiseFloor, lampSnr } from "../../lightprobe/noiseFloor.js";

test("temporalNoiseFloor returns null under three usable frames rather than a misleading 0", () => {
  assert.equal(temporalNoiseFloor([]), null);
  assert.equal(temporalNoiseFloor([10]), null);
  assert.equal(temporalNoiseFloor([10, 11]), null);
});

test("temporalNoiseFloor on a constant signal is exactly 0", () => {
  assert.equal(temporalNoiseFloor([10, 10, 10, 10]), 0);
});

test("temporalNoiseFloor scales with the spread of the samples", () => {
  const tight = temporalNoiseFloor([10, 10.1, 9.9, 10.05, 9.95]);
  const spread = temporalNoiseFloor([10, 12, 8, 11, 9]);
  assert.ok(spread > tight);
});

// requirement 2's VERIFY: doubling the noise floor input halves lampSnr proportionally.
test("doubling the noise floor's input spread proportionally lowers lampSnr", () => {
  const unlitBase = [100, 101, 99, 100.5, 99.5, 100, 100.2, 99.8];
  const unlitDoubled = unlitBase.map((v) => 100 + (v - 100) * 2);
  const lit = [140, 141, 139, 140.5, 139.5, 140, 140.2, 139.8];

  const base = lampSnr({ litSamples: lit, unlitSamples: unlitBase });
  const doubled = lampSnr({ litSamples: lit, unlitSamples: unlitDoubled });

  assert.ok(base.noiseFloor > 0 && doubled.noiseFloor > 0);
  // MAD scales linearly with a linear rescale of deviations from the median.
  assert.ok(Math.abs(doubled.noiseFloor / base.noiseFloor - 2) < 1e-9);
  // Signal (lit mean - unlit mean) is unchanged, since only the unlit spread
  // was rescaled about its own mean/median, not shifted.
  assert.ok(Math.abs(doubled.signal - base.signal) < 1e-6);
  // lampSnr = signal / noiseFloor, so doubling the floor halves the ratio.
  assert.ok(Math.abs(base.lampSnr / doubled.lampSnr - 2) < 1e-6);
});

test("lampSnr reports null with a reason when too few frames exist, never a fabricated ratio", () => {
  const result = lampSnr({ litSamples: [10, 11], unlitSamples: [] });
  assert.equal(result.lampSnr, null);
  assert.equal(result.reason, "insufficient_frames");
});

test("lampSnr reports a zero-noise-floor reason rather than an infinite ratio when the unlit leg is perfectly constant", () => {
  const result = lampSnr({ litSamples: [50, 51, 49], unlitSamples: [10, 10, 10] });
  assert.equal(result.lampSnr, null);
  assert.equal(result.noiseFloor, 0);
  assert.equal(result.reason, "zero_noise_floor");
});

test("lampSnr carries the noise floor and the signal alongside the ratio, per requirement 2.4", () => {
  const result = lampSnr({
    litSamples: [140, 141, 139, 140.5, 139.5],
    unlitSamples: [100, 101, 99, 100.5, 99.5],
  });
  assert.ok(typeof result.lampSnr === "number");
  assert.ok(typeof result.noiseFloor === "number");
  assert.ok(typeof result.signal === "number");
});
