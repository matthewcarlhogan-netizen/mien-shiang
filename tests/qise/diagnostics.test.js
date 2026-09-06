/*
 * PHASE 14 — device diagnostics that record capability/timing/duration data
 * only, and cost nothing when disabled.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDiagnosticsSession, diagnosticsRequested } from "../../src/qise/diagnostics.js";

test("disabled by default, and every recorder is then a true no-op", () => {
  const session = createDiagnosticsSession();
  assert.equal(session.enabled, false);
  session.recordDeviceInfo({ userAgent: "x", videoWidth: 1280 });
  session.recordFrame(100);
  session.recordMilestone("firstFace", 100);
  session.recordRefocusAttempt();
  session.recordScreenAssistCycle();
  session.recordBlockerMs("sclera", 500);
  session.setFinalCaptureMode("locked");
  const summary = session.summary();
  for (const [key, value] of Object.entries(summary)) {
    if (key === "blockerDurations") { assert.deepEqual(value, {}); continue; }
    if (["distinctFramesProcessed", "refocusAttempts", "screenAssistCycles"].includes(key)) {
      assert.equal(value, 0); continue;
    }
    assert.equal(value, null, `${key} should stay null while disabled, got ${JSON.stringify(value)}`);
  }
});

test("enabled: records device capabilities and settings verbatim, nothing else inferred", () => {
  const session = createDiagnosticsSession({ enabled: true });
  const focusCapabilities = { focusMode: ["continuous", "single-shot"] };
  session.recordDeviceInfo({
    userAgent: "Mozilla/5.0 (Linux; Android 14)",
    deviceLabel: "camera2 0, facing front",
    videoWidth: 1280, videoHeight: 960, frameRate: 30, facingMode: "user",
    focusCapabilities, exposureCapabilities: { exposureMode: ["continuous", "manual"] },
    whiteBalanceCapabilities: { whiteBalanceMode: ["continuous", "manual"] },
    actualTrackSettings: { width: 1280, height: 960, frameRate: 30 },
  });
  const summary = session.summary();
  assert.equal(summary.videoWidth, 1280);
  assert.equal(summary.videoHeight, 960);
  assert.deepEqual(summary.focusCapabilities, focusCapabilities);
  assert.equal(summary.deviceLabel, "camera2 0, facing front");
});

test("enabled: distinct frame throughput is derived from recordFrame timestamps only", () => {
  const session = createDiagnosticsSession({ enabled: true });
  for (let t = 0; t <= 300; t += 33) session.recordFrame(t);
  const summary = session.summary();
  assert.ok(summary.distinctFramesProcessed >= 9);
  assert.ok(summary.distinctFrameRate > 25 && summary.distinctFrameRate < 35,
    `expected roughly 30fps, got ${summary.distinctFrameRate}`);
});

test("enabled: each milestone records its OWN elapsed time from the session start, once, first-write-wins", () => {
  const session = createDiagnosticsSession({ enabled: true });
  session.recordFrame(0);
  session.recordMilestone("firstFace", 150);
  session.recordMilestone("sharp", 400);
  session.recordMilestone("ready", 900);
  session.recordMilestone("capture", 1550);
  session.recordMilestone("firstFace", 9999); // must not overwrite the first value
  const summary = session.summary();
  assert.equal(summary.timeToFirstFace, 150);
  assert.equal(summary.timeToSharp, 400);
  assert.equal(summary.timeToReady, 900);
  assert.equal(summary.timeToCapture, 1550);
});

test("enabled: an unknown milestone name is rejected rather than silently recorded under the wrong key", () => {
  const session = createDiagnosticsSession({ enabled: true });
  assert.throws(() => session.recordMilestone("frobnicate", 100), /unknown milestone/);
});

test("enabled: refocus attempts and screen-assist cycles are simple counters", () => {
  const session = createDiagnosticsSession({ enabled: true });
  session.recordRefocusAttempt();
  session.recordRefocusAttempt();
  session.recordScreenAssistCycle();
  const summary = session.summary();
  assert.equal(summary.refocusAttempts, 2);
  assert.equal(summary.screenAssistCycles, 1);
});

test("enabled: blocker durations accumulate per id across multiple spans", () => {
  const session = createDiagnosticsSession({ enabled: true });
  session.recordBlockerMs("sclera", 400);
  session.recordBlockerMs("sclera", 250);
  session.recordBlockerMs("motion", 90);
  session.recordBlockerMs("motion", 0); // no-op, zero duration
  const summary = session.summary();
  assert.deepEqual(summary.blockerDurations, { sclera: 650, motion: 90 });
});

test("enabled: final capture mode is recorded verbatim", () => {
  const session = createDiagnosticsSession({ enabled: true });
  session.setFinalCaptureMode("assisted");
  assert.equal(session.summary().finalCaptureMode, "assisted");
});

test("no method on the session accepts anything shaped like a frame — the surface is capabilities, counts and durations only", () => {
  const session = createDiagnosticsSession({ enabled: true });
  const methodNames = Object.keys(session).filter((k) => typeof session[k] === "function");
  assert.deepEqual(methodNames.sort(), [
    "recordBlockerMs", "recordDeviceInfo", "recordFrame", "recordMilestone",
    "recordRefocusAttempt", "recordScreenAssistCycle", "setFinalCaptureMode", "summary",
  ]);
  // recordFrame and recordMilestone take TIMESTAMPS (numbers), never an
  // object that could carry pixels — verified by feeding each a plain number
  // and confirming it does not throw, and that nothing resembling image data
  // appears anywhere in the summary shape.
  session.recordFrame(1);
  session.recordMilestone("firstFace", 1);
  const summaryKeys = Object.keys(session.summary());
  for (const key of summaryKeys) {
    assert.doesNotMatch(key, /pixel|image|mesh|landmark|frame(?!Rate|sProcessed)/i, `suspicious diagnostics field: ${key}`);
  }
});

/* ── diagnosticsRequested ─────────────────────────────────────────────────── */

test("diagnosticsRequested: recognises either flag name, and nothing else", () => {
  // Neither flag string spells the banned "diagnos" stem — see the comment
  // above diagnosticsRequested — so this also stands as the positive half of
  // that guard: tests/qise/no-medical-language.test.js is the negative half.
  assert.equal(diagnosticsRequested(new URLSearchParams("devtelemetry=1")), true);
  assert.equal(diagnosticsRequested(new URLSearchParams("captdbg=1")), true);
  assert.equal(diagnosticsRequested(new URLSearchParams("debug=1")), false);
  assert.equal(diagnosticsRequested(new URLSearchParams("")), false);
  assert.equal(diagnosticsRequested(null), false);
  assert.equal(diagnosticsRequested(undefined), false);
});
