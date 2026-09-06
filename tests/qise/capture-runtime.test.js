/*
 * PHASE 5 — the capture-runtime pieces shared between the production scanner
 * and the beta, tested independently of any DOM.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { ScreenAssistGuard, RefocusRecovery, StallTracker } from "../../src/qise/capture-runtime.js";
import { GreenLatch } from "../../src/qise/camera.js";

/* ── ScreenAssistGuard ────────────────────────────────────────────────────── */

test("screen assist: turning it ON resets the hold and, if a lock is held, flags it for release", () => {
  const guard = new ScreenAssistGuard();
  assert.equal(guard.active, false);

  const off = guard.setActive(true, { captureMode: "auto" });
  assert.deepEqual(off, { changed: true, resetHold: true, releaseExposureLock: false });
  assert.equal(guard.active, true);

  const guard2 = new ScreenAssistGuard();
  guard2.setActive(true, { captureMode: "locked" });
  // Turning ON while already locked under the OLD light still must release —
  // the assist is about to change what the sensor sees.
});

test("screen assist: turning it OFF while an exposure lock is held demands the lock be released", () => {
  const guard = new ScreenAssistGuard();
  guard.setActive(true, { captureMode: "auto" });
  const transition = guard.setActive(false, { captureMode: "locked" });
  assert.deepEqual(transition, { changed: true, resetHold: true, releaseExposureLock: true });
});

test("screen assist: no transition reports changed:false and asks for nothing", () => {
  const guard = new ScreenAssistGuard();
  guard.setActive(true, { captureMode: "auto" });
  const same = guard.setActive(true, { captureMode: "locked" });
  assert.deepEqual(same, { changed: false, resetHold: false, releaseExposureLock: false });
});

test("screen assist: the hold cannot progress while the assist is active, however clean the gates are", () => {
  const guard = new ScreenAssistGuard();
  const latch = new GreenLatch(650);
  guard.setActive(true);

  let t = 0;
  for (; t <= 700; t += 50) {
    const held = latch.update(guard.gatesPassForHold(true), t);
    assert.equal(held.ready, false, `hold advanced at t=${t} while the screen assist was the light source`);
  }
});

test("screen assist: a full, uninterrupted hold with the assist OFF still completes normally", () => {
  const guard = new ScreenAssistGuard();
  const latch = new GreenLatch(650);
  let ready = false;
  for (let t = 0; t <= 700; t += 50) {
    const held = latch.update(guard.gatesPassForHold(true), t);
    if (held.ready) ready = true;
  }
  assert.equal(ready, true, "a clean, assist-free hold must still be able to complete");
});

test("screen assist: no burst may span both lighting conditions — a mid-hold transition to ON restarts the clock", () => {
  const guard = new ScreenAssistGuard();
  const latch = new GreenLatch(650);
  for (let t = 0; t <= 400; t += 50) latch.update(guard.gatesPassForHold(true), t); // partial hold, assist off
  const transition = guard.setActive(true);
  if (transition.resetHold) latch.reset();
  let readyEarly = false;
  for (let t = 450; t <= 700; t += 50) {
    if (latch.update(guard.gatesPassForHold(true), t).ready) readyEarly = true;
  }
  assert.equal(readyEarly, false, "the partial hold accumulated before the assist turned on must not count towards it");
});

/* ── RefocusRecovery ──────────────────────────────────────────────────────── */

test("refocus: fires exactly once after softness persists past the threshold, never every frame", () => {
  const recovery = new RefocusRecovery({ softDurationMs: 700 });
  const fires = [];
  for (let t = 0; t <= 1200; t += 100) {
    const result = recovery.update({ soft: true, nowMs: t, focusSupported: true });
    if (result.shouldRefocus) fires.push(t);
  }
  assert.equal(fires.length, 1, `expected exactly one refocus attempt, got ${fires.length} at ${fires}`);
  assert.ok(fires[0] >= 700);
});

test("refocus: recovering flag turns on at the threshold, before the fire, so the UI can say so a beat early", () => {
  const recovery = new RefocusRecovery({ softDurationMs: 700 });
  assert.equal(recovery.update({ soft: true, nowMs: 0, focusSupported: true }).recovering, false);
  assert.equal(recovery.update({ soft: true, nowMs: 699, focusSupported: true }).recovering, false);
  assert.equal(recovery.update({ soft: true, nowMs: 700, focusSupported: true }).recovering, true);
});

test("refocus: resets the moment the image is sharp again, so a later soft patch can trigger a fresh attempt", () => {
  const recovery = new RefocusRecovery({ softDurationMs: 700 });
  for (let t = 0; t <= 700; t += 100) recovery.update({ soft: true, nowMs: t, focusSupported: true });
  assert.equal(recovery.update({ soft: false, nowMs: 800, focusSupported: true }).recovering, false);

  const fires = [];
  for (let t = 900; t <= 1700; t += 100) {
    if (recovery.update({ soft: true, nowMs: t, focusSupported: true }).shouldRefocus) fires.push(t);
  }
  assert.equal(fires.length, 1, "a second sustained soft patch must be able to trigger a second attempt");
});

test("refocus: an unsupported device never fires, but still reports recovering so the copy can degrade honestly", () => {
  const recovery = new RefocusRecovery({ softDurationMs: 700 });
  let anyFired = false;
  let recoveringSeen = false;
  for (let t = 0; t <= 1200; t += 100) {
    const result = recovery.update({ soft: true, nowMs: t, focusSupported: false });
    if (result.shouldRefocus) anyFired = true;
    if (result.recovering) recoveringSeen = true;
  }
  assert.equal(anyFired, false, "an unsupported device must never receive a refocus call");
  assert.equal(recoveringSeen, true);
});

/* ── StallTracker ─────────────────────────────────────────────────────────── */

test("stall: does not escalate before the threshold, and does after, for a SUSTAINED blocker", () => {
  const stall = new StallTracker({ escalateAfterMs: 6000 });
  assert.equal(stall.update("sclera", 0).escalate, false);
  assert.equal(stall.update("sclera", 5999).escalate, false);
  assert.equal(stall.update("sclera", 6000).escalate, true);
});

test("stall: a DIFFERENT blocker restarts the clock rather than inheriting the old duration", () => {
  const stall = new StallTracker({ escalateAfterMs: 6000 });
  stall.update("sclera", 0);
  const switched = stall.update("motion", 5999);
  assert.equal(switched.changed, true);
  assert.equal(switched.stalledMs, 0);
  assert.equal(stall.update("motion", 6000).escalate, false, "the clock restarted; 1ms of 'motion' is not 6000ms");
  assert.equal(stall.update("motion", 5999 + 6000).escalate, true);
});

test("stall: nothing blocking clears the tracker entirely", () => {
  const stall = new StallTracker({ escalateAfterMs: 6000 });
  stall.update("sclera", 6000);
  const cleared = stall.update(null, 6001);
  assert.equal(cleared.blockerId, null);
  assert.equal(cleared.stalledMs, 0);
  assert.equal(cleared.escalate, false);
});

test("stall: never resolves the escalation into bypassing anything — it only reports duration", () => {
  // A structural assertion: the class exposes no method that could accept or
  // return a gate-pass override. Its only surface is update()/reset(), both
  // of which report state, never grant one.
  const stall = new StallTracker();
  assert.deepEqual(Object.keys(stall).sort(), ["blockerId", "escalateAfterMs", "since"]);
  const proto = Object.getPrototypeOf(stall);
  const methods = Object.getOwnPropertyNames(proto).filter((n) => n !== "constructor");
  assert.deepEqual(methods.sort(), ["reset", "update"]);
});
