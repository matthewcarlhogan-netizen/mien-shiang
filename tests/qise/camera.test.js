/*
 * PHASE 4 — everything about the capture path that can be checked without a
 * phone. Gate 4 itself (a real Android device, captureMode and frameJitter
 * logged into docs/QISE_NOTES.md) cannot be run here and is recorded there as
 * NOT VERIFIED.
 *
 * What IS checkable is every branch the device would otherwise be the only
 * thing exercising: the browser that strips a constraint, the browser that
 * throws, the browser that supports neither.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  openCamera, negotiateCaptureMode, createLandmarkerGuarded, PolygonSmoother,
  trimmedMedianLab, reduceBurst, iqr, releaseCapture, GreenLatch,
  attachCameraPreview, describeCameraError,
  settleAndNegotiate, releaseCaptureMode, EXPOSURE_WARMUP_MS,
  BURST_FRAMES, GATES_GREEN_MS, SMOOTHING_FRAMES, CAPTURE_CONSTRAINTS,
} from "../../src/qise/camera.js";
import { createConsent, memoryStorage, ConsentRequiredError } from "../../src/qise/consent.js";
import * as color from "../../src/qise/color.js";

const granted = () => { const c = createConsent(memoryStorage()); c.grant(); return c; };
const denied = () => createConsent(memoryStorage());

/** A media device stack whose track behaves the way `shape` says. */
function fakeMediaDevices(shape = {}) {
  const calls = [];
  const settings = { ...(shape.initialSettings || {}) };
  const track = {
    getCapabilities: shape.capabilities === null ? undefined : () => (shape.capabilities || {}),
    getSettings: () => ({ ...settings }),
    applyConstraints: async (c) => {
      calls.push(c);
      if (shape.throwOnApply) throw new Error("OverconstrainedError: exposureMode");
      // The default browser behaviour: accept, silently strip what is not
      // supported, resolve successfully.
      for (const req of c.advanced || []) {
        for (const [k, v] of Object.entries(req)) {
          if ((shape.actuallyApplies || []).includes(k)) settings[k] = v;
        }
      }
    },
    stop: () => { track.stopped = true; },
  };
  const stream = { getVideoTracks: () => [track], getTracks: () => [track] };
  return {
    calls, track, stream,
    getUserMedia: async (constraints) => { calls.push(constraints); return stream; },
  };
}

/* ─────────────────────────────────────────────────── consent comes first ── */

test("openCamera THROWS without consent, and never reaches getUserMedia", async () => {
  const md = fakeMediaDevices();
  let reached = false;
  md.getUserMedia = async () => { reached = true; return md.stream; };

  await assert.rejects(() => openCamera({ consent: denied(), mediaDevices: md }), ConsentRequiredError);
  assert.equal(reached, false, "getUserMedia was called before consent existed");
});

test("createLandmarkerGuarded THROWS without consent, and never builds a mesh", async () => {
  // The second door. Guarding the camera alone leaves the mesh reachable from
  // a still image nobody thought about, and a facial mesh is the collection.
  let built = false;
  const factory = async () => { built = true; return {}; };

  await assert.rejects(() => createLandmarkerGuarded({ consent: denied(), factory }), ConsentRequiredError);
  assert.equal(built, false);

  await createLandmarkerGuarded({ consent: granted(), factory });
  assert.equal(built, true);
});

test("with consent, the documented constraints are what is requested", async () => {
  const md = fakeMediaDevices();
  await openCamera({ consent: granted(), mediaDevices: md });
  assert.deepEqual(md.calls[0], CAPTURE_CONSTRAINTS);
  assert.deepEqual(CAPTURE_CONSTRAINTS.video.facingMode, "user");
});

test("the preview waits for real dimensions instead of drawing a 0x0 Safari frame", async () => {
  const stream = {};
  const video = {
    videoWidth: 1280, videoHeight: 960, srcObject: null,
    play: async () => {},
  };
  assert.equal(await attachCameraPreview(video, stream), video);
  assert.equal(video.srcObject, stream);
});

test("camera failures always offer a useful retry or selfie path", () => {
  assert.match(describeCameraError({ name: "NotAllowedError" }), /choose a selfie/i);
  assert.match(describeCameraError({ name: "NotFoundError" }), /No front camera/i);
  assert.match(describeCameraError({ name: "NotReadableError" }), /Another app/i);
  assert.match(describeCameraError(new Error("unknown")), /Retry/i);
});

/* ────────────────────────────────────────────── the three capture modes ── */

test("captureMode is read back from getSettings, never inferred from a resolved promise", async () => {
  // applyConstraints does NOT reject an unsupported constraint. It strips it
  // and resolves. Trusting the resolution reports "locked" on a device that
  // locked nothing, and then every downstream assumption is wrong.
  const both = fakeMediaDevices({
    capabilities: { whiteBalanceMode: ["continuous", "manual"], exposureMode: ["continuous", "manual"] },
    actuallyApplies: ["whiteBalanceMode", "exposureMode"],
  });
  assert.equal((await negotiateCaptureMode(both.track)).captureMode, "locked");

  const stripsAll = fakeMediaDevices({
    capabilities: { whiteBalanceMode: ["continuous", "manual"], exposureMode: ["continuous", "manual"] },
    actuallyApplies: [],
  });
  assert.equal((await negotiateCaptureMode(stripsAll.track)).captureMode, "auto");
});

test("EXPOSURE is never switched to manual, whatever the device advertises", async () => {
  // The defect this pins, observed on a real Android handset: with the warm-up
  // in front of it the preview converged and looked correct for a second or
  // two, then went black the moment the lock landed, and the underexposed gate
  // fired on the pixel buffer afterwards.
  //
  // `exposureMode: "manual"` carries no exposure VALUE — the spec pairs it with
  // `exposureTime` — so with nothing supplied the device may drop to its
  // default or minimum rather than hold what AE just converged on. Warming up
  // first fixed WHEN the lock happened and could never fix WHAT it does.
  const md = fakeMediaDevices({
    capabilities: { whiteBalanceMode: ["continuous", "manual"], exposureMode: ["continuous", "manual"] },
    actuallyApplies: ["whiteBalanceMode", "exposureMode"],
  });

  const r = await negotiateCaptureMode(md.track);

  assert.deepEqual(r.requested, ["whiteBalanceMode"], "exposure must not be requested at all");
  assert.deepEqual(r.locked, ["whiteBalanceMode"]);
  for (const call of md.calls) {
    for (const req of call.advanced || []) {
      assert.equal("exposureMode" in req, false,
        "a manual exposure mode with no exposureTime is what blacked out the capture");
    }
  }
  assert.equal(md.track.getSettings().exposureMode, undefined,
    "the camera's own exposure routine must be left running");
});

test("a device offering only manual exposure is left on auto, not half-locked", async () => {
  // Nothing to lock once exposure is off the table, so this must report auto
  // rather than inventing a partial state from a capability we never use.
  const md = fakeMediaDevices({
    capabilities: { exposureMode: ["continuous", "manual"] },
    actuallyApplies: ["exposureMode"],
  });
  const r = await negotiateCaptureMode(md.track);
  assert.equal(r.captureMode, "auto");
  assert.deepEqual(r.requested, []);
  assert.equal(md.calls.length, 0, "no applyConstraints call should have been made at all");
});

test("a device advertising no manual mode is not asked, and reports auto", async () => {
  const md = fakeMediaDevices({ capabilities: { whiteBalanceMode: ["continuous"] } });
  const r = await negotiateCaptureMode(md.track);
  assert.equal(r.captureMode, "auto");
  assert.deepEqual(r.requested, []);
  assert.equal(md.calls.length, 0, "no applyConstraints call should have been made at all");
});

test("a device with no getCapabilities at all still yields a usable capture", async () => {
  const md = fakeMediaDevices({ capabilities: null });
  const r = await negotiateCaptureMode(md.track);
  assert.equal(r.captureMode, "auto");
  assert.deepEqual(r.capabilities, {});
});

test("a browser that THROWS from applyConstraints degrades to auto and reports the error", async () => {
  // Some browsers reject rather than strip. A silent catch here would present
  // a hard failure as a successful auto capture.
  const md = fakeMediaDevices({
    capabilities: { whiteBalanceMode: ["manual"], exposureMode: ["manual"] },
    throwOnApply: true,
  });
  const r = await negotiateCaptureMode(md.track);
  assert.equal(r.captureMode, "auto");
  assert.match(r.error, /Overconstrained/);
  assert.deepEqual(r.locked, []);
});

test("openCamera surfaces the capture mode alongside the stream", async () => {
  const md = fakeMediaDevices({
    capabilities: { whiteBalanceMode: ["manual"], exposureMode: ["manual"] },
    actuallyApplies: ["whiteBalanceMode", "exposureMode"],
  });
  const r = await openCamera({ consent: granted(), mediaDevices: md });
  assert.equal(r.captureMode, "locked");
  assert.ok(r.stream && r.track);
});

/* ──────────────────────────────────────────────────── polygon smoothing ── */

test("the smoother averages VERTICES over the trailing window", () => {
  assert.equal(SMOOTHING_FRAMES, 20);
  const s = new PolygonSmoother(4);
  for (const dx of [0, 2, 4, 6]) {
    s.push({ tian: [[{ x: 100 + dx, y: 50 }, { x: 200 + dx, y: 50 }, { x: 150 + dx, y: 90 }]] });
  }
  const m = s.mean();
  assert.equal(m.tian[0][0].x, 103);   // mean of 100,102,104,106
  assert.equal(m.tian[0][0].y, 50);
});

test("the window slides, so old frames stop counting", () => {
  const s = new PolygonSmoother(2);
  s.push({ a: [[{ x: 0, y: 0 }]] });
  s.push({ a: [[{ x: 10, y: 0 }]] });
  s.push({ a: [[{ x: 20, y: 0 }]] });
  assert.equal(s.length, 2);
  assert.equal(s.mean().a[0][0].x, 15);
});

test("a frame whose vertex count changed is skipped, not averaged element-wise", () => {
  // Hulls gain and lose points between frames. Zipping polygons of different
  // lengths silently pairs vertex 3 of one with vertex 3 of a differently
  // shaped hull, which drags the region somewhere neither frame put it.
  const s = new PolygonSmoother(3);
  s.push({ a: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }, { x: 1, y: 5 }]] });  // 4 vertices
  s.push({ a: [[{ x: 100, y: 0 }, { x: 110, y: 0 }, { x: 105, y: 10 }]] });             // 3
  s.push({ a: [[{ x: 200, y: 0 }, { x: 210, y: 0 }, { x: 205, y: 10 }]] });             // 3
  const m = s.mean();
  assert.equal(m.a[0].length, 3);
  assert.equal(m.a[0][0].x, 150, "the 4-vertex frame should not have contributed");
});

test("an empty smoother returns null rather than a polygon of NaN", () => {
  assert.equal(new PolygonSmoother().mean(), null);
});

/* ────────────────────────────────────────────────────── burst reduction ── */

const px = (r, g, b, n = 1) => Array.from({ length: n }, () => ({ r, g, b }));

test("the per-frame trim is by L*, and a* and b* follow the same pixels", () => {
  // Trimming each channel independently averages three different subsets of
  // the region and reports the result as one colour.
  const pixels = [...px(200, 150, 140, 80), ...px(255, 255, 255, 10), ...px(0, 0, 0, 10)];
  const lab = trimmedMedianLab(pixels, color);
  const pure = color.labFromSrgb8(200, 150, 140);
  assert.ok(Math.abs(lab.L - pure.L) < 1e-6, `L ${lab.L} vs ${pure.L}`);
  assert.ok(Math.abs(lab.a - pure.a) < 1e-6);
  assert.ok(Math.abs(lab.b - pure.b) < 1e-6);
});

test("the trim never empties a small region", () => {
  const one = trimmedMedianLab(px(200, 150, 140, 1), color);
  assert.ok(one && Number.isFinite(one.L));
  assert.equal(trimmedMedianLab([], color), null);
  assert.equal(trimmedMedianLab(null, color), null);
});

test("a burst collapses to the median, and the IQR becomes frameJitter", () => {
  assert.equal(BURST_FRAMES, 15);
  const steady = Array.from({ length: 15 }, () => ({ L: 60, a: 12, b: 10 }));
  const noisy = Array.from({ length: 15 }, (_, i) => ({ L: 60 + (i % 5) - 2, a: 12, b: 10 }));

  const r = reduceBurst({ tian: steady, quan_l: noisy });
  assert.equal(r.lab.tian.L, 60);
  assert.equal(r.lab.tian.frames, 15);
  assert.equal(r.frameJitter.byRoi.tian.magnitude, 0);
  assert.ok(r.frameJitter.byRoi.quan_l.magnitude > 0,
    "a visibly noisy region must report jitter");

  // A single outlier frame must not move the result — that is the whole point
  // of a median across the burst rather than a mean.
  const withSpike = [...steady.slice(0, 14), { L: 200, a: 12, b: 10 }];
  assert.equal(reduceBurst({ tian: withSpike }).lab.tian.L, 60);
});

test("the overall jitter is the median across regions, not the maximum", () => {
  // One region on a moving shadow should not condemn the reading: ROI validity
  // already handles a region that has genuinely gone bad, and firing both on
  // the same event double-counts it.
  const calm = Array.from({ length: 15 }, () => ({ L: 60, a: 12, b: 10 }));
  const wild = Array.from({ length: 15 }, (_, i) => ({ L: 60 + i * 4, a: 12, b: 10 }));
  const r = reduceBurst({ a: calm, b: calm, c: calm, d: wild });
  assert.equal(r.frameJitter.overall, 0);
  assert.ok(r.frameJitter.byRoi.d.magnitude > 10, "the wild region still records its own jitter");
});

test("a region with no usable frames reports null rather than zero", () => {
  const r = reduceBurst({ tian: [null, null, null] });
  assert.equal(r.lab.tian, null);
  assert.equal(r.frameJitter.byRoi.tian, null);
});

test("iqr is interpolated, so it is stable at burst-sized n", () => {
  assert.equal(iqr([1, 2, 3, 4, 5]), 2);
  assert.equal(iqr([]), null);
});

/* ───────────────────────────────────────────────────── the 900ms latch ── */

test("the burst fires only after the gates have been green for 900ms", () => {
  assert.equal(GATES_GREEN_MS, 900);
  const latch = new GreenLatch();
  assert.equal(latch.update(true, 0).ready, false);
  assert.equal(latch.update(true, 500).ready, false);
  assert.equal(latch.update(true, 899).ready, false);
  assert.equal(latch.update(true, 900).ready, true);
  // Exactly once. A second ready would start a second burst mid-burst.
  assert.equal(latch.update(true, 1500).ready, false);
});

test("one bad frame resets the clock, because the point is SUSTAINED stillness", () => {
  const latch = new GreenLatch();
  latch.update(true, 0);
  latch.update(true, 850);
  assert.equal(latch.update(false, 860).ready, false);
  assert.equal(latch.update(true, 870).heldMs, 0, "the hold must restart, not resume");
  assert.equal(latch.update(true, 1600).ready, false, "still 130ms short of a fresh 900");
  assert.equal(latch.update(true, 1770).ready, true);
});

test("the latch reports progress, so the ring can fill instead of snapping", () => {
  const latch = new GreenLatch();
  latch.update(true, 0);
  assert.ok(Math.abs(latch.update(true, 450).progress - 0.5) < 1e-9);
  assert.equal(latch.update(true, 5000).progress, 1);
  assert.equal(latch.update(false, 5001).progress, 0);
});

/* ─────────────────────────────────────────────────────────── teardown ── */

test("teardown ZEROES the pixels rather than only dropping the reference", () => {
  // Nulling a reference asks the collector to get round to it on its own
  // schedule while a face, and a mesh that is a biometric template, sit in
  // memory. The posture is that the photograph is discarded, so discarding it
  // has to be an action.
  const image = { width: 4, height: 4, data: new Uint8ClampedArray(64).fill(200) };
  const landmarks = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
  const canvas = { width: 1280, height: 960 };
  const md = fakeMediaDevices();

  const released = releaseCapture({
    images: [image], landmarks: [landmarks], canvas, stream: md.stream,
    landmarker: { close: () => { md.landmarkerClosed = true; } },
    video: { srcObject: md.stream, pause: () => { md.previewPaused = true; } },
  });

  assert.ok(image.data.every((v) => v === 0), "pixel data survived teardown");
  assert.equal(landmarks.length, 0, "the landmark array survived teardown");
  assert.equal(canvas.width, 0);
  assert.equal(canvas.height, 0);
  assert.equal(md.track.stopped, true, "the camera light is still on");
  assert.equal(md.landmarkerClosed, true);
  assert.equal(md.previewPaused, true);
  assert.deepEqual(released, {
    images: 1, landmarkArrays: 1, canvasCleared: true, tracksStopped: 1,
    landmarkerClosed: true, previewCleared: true,
    // False because this scratch never took one, not because teardown skipped
    // it — the paired assertion is in "releaseCapture hands the screen back".
    wakeLockReleased: false,
  });
});

test("teardown is safe on a partly-built or already-released scratch", () => {
  assert.doesNotThrow(() => releaseCapture(null));
  assert.doesNotThrow(() => releaseCapture({}));
  const s = { images: [null], landmarks: [null], canvas: null };
  assert.doesNotThrow(() => releaseCapture(s));
  assert.doesNotThrow(() => releaseCapture(s));
});

test("releaseCapture hands the screen back to the OS idle timer", () => {
  // There are four ways out of a capture — the burst completing, the loop
  // error handler, a re-entrant runCapture() and withdrawal — and a lock
  // released on only some of them leaves the phone awake indefinitely. Doing
  // it here rather than at each call site is what makes that unrepresentable.
  let releases = 0;
  const scratch = {
    canvas: { width: 8, height: 8 },
    images: [], landmarks: [],
    wakeLock: { release() { releases++; return Promise.resolve(true); } },
  };

  const released = releaseCapture(scratch);
  assert.equal(releases, 1);
  assert.equal(released.wakeLockReleased, true);
  assert.equal(scratch.wakeLock, null, "a held reference outlives the capture that owned it");
});

test("releaseCapture still works when no wake lock was ever taken", () => {
  // The API is absent on plenty of hosts, and teardown must not depend on it.
  const released = releaseCapture({ canvas: { width: 4, height: 4 }, images: [], landmarks: [] });
  assert.equal(released.wakeLockReleased, false);
  assert.equal(released.canvasCleared, true);
});

/* ── exposure warm-up ────────────────────────────────────────────────────── */

const lockable = () => fakeMediaDevices({
  capabilities: { whiteBalanceMode: ["continuous", "manual"], exposureMode: ["continuous", "manual"] },
  actuallyApplies: ["whiteBalanceMode", "exposureMode"],
});

test("openCamera does NOT lock exposure before the first frame exists", async () => {
  // The shipped defect. negotiateCaptureMode ran on the line after
  // getUserMedia, and `exposureMode: "manual"` does not CHOOSE an exposure —
  // it freezes whatever the sensor is at. Applied before AE had run and before
  // the preview was even attached, it pinned the capture to the sensor's
  // opening value, which on Android is dark. The camera visibly came on and
  // then stayed dark, with the underexposed gate firing on every frame and
  // "find more light" unable to help, because a locked sensor cannot respond
  // to more light.
  const md = lockable();

  const opened = await openCamera({ consent: granted(), mediaDevices: md, negotiate: false });

  assert.equal(opened.captureMode, "pending", "a mode was decided before any frame was seen");
  assert.equal(md.calls.length, 1, "only getUserMedia should have been called");
  assert.deepEqual(md.calls[0], CAPTURE_CONSTRAINTS, "the one call was the constraints, not a lock");
  assert.ok(opened.stream && opened.track, "the caller still gets what it needs to settle later");
});

test("settleAndNegotiate waits BEFORE reading what the camera settled on", async () => {
  const md = lockable();
  const seen = [];
  const wait = async (ms) => {
    seen.push(ms);
    assert.equal(md.calls.length, 0, "the lock was taken before the warm-up finished");
  };

  const negotiated = await settleAndNegotiate(md.track, { warmUpMs: 1500, wait });

  assert.deepEqual(seen, [1500], "the warm-up did not run");
  assert.equal(md.calls.length, 1, "nothing was locked after the warm-up");
  assert.equal(negotiated.captureMode, "locked");
});

test("the default warm-up is long enough for AE to have moved at all", async () => {
  // Not a magic number to preserve, but a floor: sub-second windows do not
  // cover the convergence this exists for.
  assert.ok(EXPOSURE_WARMUP_MS >= 1000, "a warm-up shorter than AE convergence is not a warm-up");
});

test("a zero warm-up still negotiates, so the window is tunable and not load-bearing", async () => {
  const md = lockable();
  let waited = false;
  const r = await settleAndNegotiate(md.track, { warmUpMs: 0, wait: async () => { waited = true; } });
  assert.equal(waited, false);
  assert.equal(r.captureMode, "locked");
});

test("exposure can be handed BACK, or 'find more light' is advice the app disabled", async () => {
  // A lock correct when taken can be wrong a moment later — the subject turns
  // towards a window, or a lamp goes off. Without a way back the underexposed
  // gate instructs the user to add light while the only thing that could act
  // on it is switched off.
  const md = lockable();
  await negotiateCaptureMode(md.track);

  const reverted = await releaseCaptureMode(md.track);

  assert.equal(reverted.reverted, true);
  assert.equal(reverted.captureMode, "auto");
  const last = md.calls[md.calls.length - 1];
  assert.equal(last.advanced[0].exposureMode, "continuous");
  assert.equal(last.advanced[0].whiteBalanceMode, "continuous");
  assert.equal(md.track.getSettings().exposureMode, "continuous", "the revert was not read back");
});

test("handing exposure back reports failure instead of pretending it worked", async () => {
  const r = await releaseCaptureMode({
    applyConstraints: async () => { throw new Error("not supported"); },
  });
  assert.equal(r.reverted, false, "a rejected revert must not be reported as done");
  assert.equal(r.error, "not supported");

  // A host with no applyConstraints at all is not an error, just nothing to do.
  const bare = await releaseCaptureMode({});
  assert.equal(bare.reverted, false);
  assert.equal(bare.error, null);
});
