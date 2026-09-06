/*
 * PHASE 2 — distinct video-frame scheduling.
 *
 * ── WHY A DISPLAY REPAINT IS NOT A CAMERA FRAME ─────────────────────────────
 * Both capture loops in this repo drove their measurement pipeline from
 * `requestAnimationFrame`, which fires once per DISPLAY REFRESH, not once per
 * DECODED VIDEO FRAME. A 120Hz Samsung panel refreshes twice as often as a
 * 60fps camera stream decodes, so roughly half of every rAF tick re-reads a
 * `<video>` element that has not actually produced a new frame since the
 * previous tick. Feeding that into motion history, the green-hold latch and
 * the burst is feeding it the SAME frame twice — motion reports itself
 * falsely still (nothing moved between two reads of one frame), the hold can
 * advance on a paint that measured nothing new, and a "nine-frame" burst can
 * quietly contain fewer than nine distinct captures with some frames
 * duplicated. None of this is visible from a screenshot; it only shows up as
 * a burst whose frames correlate more than real motion noise would allow.
 *
 * `HTMLVideoElement.requestVideoFrameCallback` exists precisely to fix this:
 * the browser guarantees it fires once per newly PRESENTED decoded frame,
 * never for a repaint with nothing new, and hands back the frame's own
 * `mediaTime` — the video's internal clock, not the display's. Where it is
 * unavailable (older WebViews), the fallback polls via `requestAnimationFrame`
 * but GUARDS on `video.currentTime`: a tick that reads the same currentTime as
 * the previous one is a repaint, not a frame, and is silently re-polled
 * rather than handed to the caller.
 *
 * ── WHY THIS IS INJECTED, LIKE EVERY OTHER BROWSER OBJECT HERE ──────────────
 * Same reason `attachCameraPreview` takes its timer functions and `camera.js`
 * takes `mediaDevices` (CLAUDE.md item 14): the path that matters is the
 * FALLBACK path — the browser with no `requestVideoFrameCallback` — and a
 * fallback nothing can execute under `node --test` is a fallback nobody has
 * run. `video` itself is injectable too, so a fake with neither method still
 * drives a deterministic test of the dedupe guard.
 */

/**
 * Schedule callbacks for DISTINCT decoded video frames only.
 *
 * @param {Object} video an HTMLVideoElement, or a fake exposing the same
 *   shape: optionally `requestVideoFrameCallback`/`cancelVideoFrameCallback`,
 *   and always `currentTime` for the fallback path.
 * @param {{raf?:Function, caf?:Function}} [deps] injected requestAnimationFrame
 *   / cancelAnimationFrame, used only on the fallback path.
 * @returns {{schedule:Function, stop:Function, usesVideoFrameCallback:boolean}}
 */
export function createFrameScheduler(video, {
  raf = (typeof requestAnimationFrame === "function" ? requestAnimationFrame : null),
  caf = (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : null),
} = {}) {
  if (!video) throw new TypeError("createFrameScheduler requires a video element");

  const usesVideoFrameCallback = typeof video.requestVideoFrameCallback === "function";
  let stopped = false;
  let pendingRvfcHandle = null;
  let pendingRafHandle = null;
  let lastMediaTime = null;

  /**
   * One outstanding schedule at a time, matching how both capture loops call
   * this: the callback itself re-schedules the next frame as its last act
   * (CLAUDE.md item 50's re-schedule-last discipline), so there is never a
   * second `schedule()` call in flight.
   */
  function schedule(callback) {
    if (stopped) return;

    if (usesVideoFrameCallback) {
      pendingRvfcHandle = video.requestVideoFrameCallback((now, metadata) => {
        pendingRvfcHandle = null;
        if (stopped) return;
        callback({
          now,
          mediaTime: typeof metadata?.mediaTime === "number" ? metadata.mediaTime : null,
          presentedFrames: typeof metadata?.presentedFrames === "number" ? metadata.presentedFrames : null,
        });
      });
      return;
    }

    if (typeof raf !== "function") {
      throw new TypeError(
        "createFrameScheduler: no requestVideoFrameCallback and no requestAnimationFrame available",
      );
    }

    const poll = (now) => {
      pendingRafHandle = null;
      if (stopped) return;
      const mediaTime = video.currentTime;
      // The dedupe guard. A repaint with no new decoded frame reads the same
      // currentTime as the tick before it — on a 120Hz display, most ticks
      // will. Those are re-polled, never handed to the caller, so a duplicate
      // paint can never become a duplicate PROCESSED frame.
      if (typeof mediaTime === "number" && mediaTime === lastMediaTime) {
        pendingRafHandle = raf(poll);
        return;
      }
      lastMediaTime = typeof mediaTime === "number" ? mediaTime : lastMediaTime;
      callback({ now, mediaTime: typeof mediaTime === "number" ? mediaTime : null, presentedFrames: null });
    };
    pendingRafHandle = raf(poll);
  }

  function stop() {
    stopped = true;
    if (pendingRvfcHandle !== null && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(pendingRvfcHandle);
    }
    if (pendingRafHandle !== null && typeof caf === "function") {
      caf(pendingRafHandle);
    }
    pendingRvfcHandle = null;
    pendingRafHandle = null;
  }

  return { schedule, stop, usesVideoFrameCallback };
}
