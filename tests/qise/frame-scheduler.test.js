/*
 * PHASE 2 — a display repaint must never become a processed camera frame.
 *
 * Both halves of `createFrameScheduler` are driven here: the
 * `requestVideoFrameCallback` path (trivially distinct by browser contract)
 * and the `requestAnimationFrame` fallback, where distinctness has to be
 * ENFORCED by a currentTime dedupe guard rather than assumed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createFrameScheduler } from "../../src/qise/frame-scheduler.js";

/** A fake video exposing ONLY currentTime — forces the rAF fallback path. */
function fakeVideoNoRvfc(initialTime = 0) {
  return { currentTime: initialTime };
}

/** A controllable fake rAF: `tick()` fires the most recently queued callback. */
function fakeRafClock() {
  let queued = null;
  let nextHandle = 1;
  const cancelled = new Set();
  return {
    raf: (cb) => {
      const handle = nextHandle++;
      queued = { handle, cb };
      return handle;
    },
    caf: (handle) => { cancelled.add(handle); },
    /** Fire the queued callback if it has not been cancelled since queuing. */
    tick: (now) => {
      if (!queued) return false;
      const { handle, cb } = queued;
      queued = null;
      if (cancelled.has(handle)) return false;
      cb(now);
      return true;
    },
    isCancelled: (handle) => cancelled.has(handle),
  };
}

test("rAF fallback: a repaint at the SAME currentTime is not processed, and the loop keeps polling", () => {
  const video = fakeVideoNoRvfc(0);
  const clock = fakeRafClock();
  const scheduler = createFrameScheduler(video, { raf: clock.raf, caf: clock.caf });
  assert.equal(scheduler.usesVideoFrameCallback, false);

  const processed = [];
  // The scheduler's very first armed poll has no prior baseline, so — exactly
  // like a real capture loop's first frame after attach — it legitimately
  // fires for whatever frame is already current. This priming tick
  // establishes that baseline; the interesting assertions are about the
  // repaints that follow it.
  scheduler.schedule((info) => processed.push(info));
  clock.tick(0);
  assert.equal(processed.length, 1, "the first-ever poll has no baseline and must fire once");

  scheduler.schedule((info) => processed.push(info));
  // Three display repaints at 120Hz cadence with NO new decoded frame —
  // exactly the case a 120Hz panel produces against a 30-60fps camera.
  clock.tick(1000 / 120);
  clock.tick(2000 / 120);
  clock.tick(3000 / 120);
  assert.equal(processed.length, 1, "no new decoded frame existed since the baseline; nothing new should have processed");

  // Now the camera actually decodes a new frame.
  video.currentTime = 0.0334;
  clock.tick(4000 / 120);
  assert.equal(processed.length, 2, "the first tick with a genuinely new currentTime must be processed");
  assert.equal(processed[1].mediaTime, 0.0334);
});

test("rAF fallback: distinct frames enter the pipeline once each, never fewer, never duplicated", () => {
  const video = fakeVideoNoRvfc(0);
  const clock = fakeRafClock();
  const scheduler = createFrameScheduler(video, { raf: clock.raf, caf: clock.caf });

  const mediaTimes = [];
  const step = () => scheduler.schedule((info) => { mediaTimes.push(info.mediaTime); step(); });

  // Prime the baseline exactly as the previous test does: the first-ever poll
  // fires unconditionally (there is nothing to compare it against), the same
  // way a real capture loop's first frame after attach does. That priming
  // frame is deliberately NOT counted — it is not one of the nine repaint
  // cycles this test measures, only the establishment of "frame zero".
  scheduler.schedule(() => {});
  clock.tick(-1);
  step();

  // Simulate a display refreshing at 4x the camera's frame rate: three
  // repaint ticks per genuine decoded frame, nine real frames total.
  let mediaTime = 0;
  for (let frame = 0; frame < 9; frame++) {
    clock.tick(frame * 4); // repaint before the frame arrives
    clock.tick(frame * 4 + 1); // repaint before the frame arrives
    mediaTime += 1 / 30;
    video.currentTime = mediaTime;
    clock.tick(frame * 4 + 2); // the tick that actually sees the new frame
  }

  assert.equal(mediaTimes.length, 9, `expected 9 distinct frames processed, got ${mediaTimes.length}`);
  const unique = new Set(mediaTimes.map((t) => t.toFixed(6)));
  assert.equal(unique.size, 9, "every processed frame must carry a unique mediaTime");
});

test("stop() cancels a pending rAF poll", () => {
  const video = fakeVideoNoRvfc(0);
  const clock = fakeRafClock();
  const scheduler = createFrameScheduler(video, { raf: clock.raf, caf: clock.caf });
  let fired = false;
  scheduler.schedule(() => { fired = true; });
  scheduler.stop();
  video.currentTime = 1;
  clock.tick(16);
  assert.equal(fired, false, "a stopped scheduler must not invoke a callback for a frame queued before stop()");
});

test("requestVideoFrameCallback path: every registration is distinct by construction, and metadata mediaTime is carried through", () => {
  let registered = null;
  let nextHandle = 1;
  const cancelledHandles = new Set();
  const video = {
    currentTime: 0,
    requestVideoFrameCallback(cb) {
      const handle = nextHandle++;
      registered = { handle, cb };
      return handle;
    },
    cancelVideoFrameCallback(handle) { cancelledHandles.add(handle); },
  };
  const scheduler = createFrameScheduler(video);
  assert.equal(scheduler.usesVideoFrameCallback, true);

  const seen = [];
  scheduler.schedule((info) => seen.push(info));
  assert.ok(registered, "requestVideoFrameCallback must be called synchronously by schedule()");
  registered.cb(123.456, { mediaTime: 0.5, presentedFrames: 42 });
  assert.deepEqual(seen, [{ now: 123.456, mediaTime: 0.5, presentedFrames: 42 }]);
});

test("requestVideoFrameCallback path: stop() cancels the outstanding registration", () => {
  let registered = null;
  const cancelledHandles = [];
  const video = {
    currentTime: 0,
    requestVideoFrameCallback(cb) { registered = { handle: 7, cb }; return 7; },
    cancelVideoFrameCallback(handle) { cancelledHandles.push(handle); },
  };
  const scheduler = createFrameScheduler(video);
  scheduler.schedule(() => {});
  scheduler.stop();
  assert.deepEqual(cancelledHandles, [7]);
});

test("a video exposing neither requestVideoFrameCallback nor a raf dependency throws rather than silently doing nothing", () => {
  const video = fakeVideoNoRvfc(0);
  const scheduler = createFrameScheduler(video, { raf: null, caf: null });
  assert.throws(() => scheduler.schedule(() => {}), /requestAnimationFrame/);
});
