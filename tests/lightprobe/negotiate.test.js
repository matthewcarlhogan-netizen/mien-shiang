import { test } from "node:test";
import assert from "node:assert/strict";
import {
  probeLockState, fieldMismatches, prefixVerdict, LOCK_UNVERIFIED_PREFIX,
} from "../../lightprobe/negotiate.js";

/**
 * A track that ADVERTISES manual support in getCapabilities() but whose
 * getSettings() shows the constraint was silently stripped -- the exact
 * "Chromium says it supports this and doesn't honour it" case requirement
 * 1.5 asks the probe to surface as a mismatch, not fold into a bare "auto".
 */
function mockAutoTrack() {
  return {
    getCapabilities: () => ({
      whiteBalanceMode: ["continuous", "manual"],
      exposureMode: ["continuous", "manual"],
    }),
    applyConstraints: async () => {},
    getSettings: () => ({ whiteBalanceMode: "continuous", exposureMode: "continuous" }),
  };
}

function mockLockedTrack() {
  return {
    getCapabilities: () => ({
      whiteBalanceMode: ["continuous", "manual"],
      exposureMode: ["continuous", "manual"],
    }),
    applyConstraints: async () => {},
    getSettings: () => ({ whiteBalanceMode: "manual", exposureMode: "manual" }),
  };
}

function mockPartialTrack() {
  return {
    getCapabilities: () => ({
      whiteBalanceMode: ["continuous", "manual"],
      exposureMode: ["continuous", "manual"],
    }),
    applyConstraints: async () => {},
    getSettings: () => ({ whiteBalanceMode: "manual", exposureMode: "continuous" }),
  };
}

test("a track reporting continuous WB after a manual request produces captureMode 'auto'", async () => {
  const state = await probeLockState(mockAutoTrack());
  assert.equal(state.captureMode, "auto");
  assert.equal(state.unverified, true);
});

test("mismatches lists fields Chromium advertised as manual-capable but did not lock", async () => {
  const state = await probeLockState(mockAutoTrack());
  assert.deepEqual([...state.mismatches].sort(), ["exposureMode", "whiteBalanceMode"]);
});

test("a locked track has captureMode 'locked', is verified, and has no mismatches", async () => {
  const state = await probeLockState(mockLockedTrack());
  assert.equal(state.captureMode, "locked");
  assert.equal(state.unverified, false);
  assert.deepEqual(state.mismatches, []);
});

test("a partially-locked track is reported as 'partial' and is NOT marked unverified (requirement 1.3 is auto-only)", async () => {
  const state = await probeLockState(mockPartialTrack());
  assert.equal(state.captureMode, "partial");
  assert.equal(state.unverified, false);
  assert.deepEqual(state.mismatches, ["exposureMode"]);
});

test("every ROI verdict is prefixed LOCK_UNVERIFIED when the run's lock state is auto", async () => {
  const state = await probeLockState(mockAutoTrack());
  const verdictA = prefixVerdict("nose_bridge: PASS lampSnr=42.0", state.unverified);
  const verdictB = prefixVerdict("center_forehead: FAIL lampSnr=2.0", state.unverified);
  assert.ok(verdictA.startsWith(LOCK_UNVERIFIED_PREFIX));
  assert.ok(verdictB.startsWith(LOCK_UNVERIFIED_PREFIX));
});

test("verdicts are NOT prefixed when locked", async () => {
  const state = await probeLockState(mockLockedTrack());
  const verdict = prefixVerdict("nose_bridge: PASS lampSnr=42.0", state.unverified);
  assert.equal(verdict.startsWith(LOCK_UNVERIFIED_PREFIX), false);
});

test("fieldMismatches is a pure function of requested/locked, independent of negotiation", () => {
  assert.deepEqual(fieldMismatches({ requested: ["a", "b"], locked: ["a"] }), ["b"]);
  assert.deepEqual(fieldMismatches({ requested: ["a"], locked: ["a"] }), []);
  assert.deepEqual(fieldMismatches({ requested: [], locked: [] }), []);
});
